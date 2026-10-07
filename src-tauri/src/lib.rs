// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

// ────────────────────────────── 常量 ──────────────────────────────
const MAIN_WINDOW_LABEL: &str = "main";
const WIDGET_WINDOW_LABEL: &str = "widget";
const WIDGET_WIDTH: f64 = 300.0;
const WIDGET_HEIGHT: f64 = 160.0;

// ────────────────────────────── 托盘菜单 ──────────────────────────────
fn build_tray_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let show_widget = MenuItem::with_id(app, "show_widget", "显示小组件", true, None::<&str>)?;
    let hide_widget = MenuItem::with_id(app, "hide_widget", "隐藏小组件", true, None::<&str>)?;
    let open_main = MenuItem::with_id(app, "open_main", "打开主窗口", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let always_on_top =
        MenuItem::with_id(app, "toggle_always_on_top", "始终置顶", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &show_widget,
            &hide_widget,
            &open_main,
            &separator1,
            &always_on_top,
            &separator2,
            &quit,
        ],
    )
}

// ────────────────────────────── 窗口控制 ──────────────────────────────
/// 创建小组件窗口（无边框、透明、置顶）
fn create_widget_window<R:Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    // 如果已经存在则直接显示
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        win.show()?;
        win.set_focus()?;
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(
        app,
        WIDGET_WINDOW_LABEL,
        WebviewUrl::App("widget.html".into()),
    )
    .title("")
    .inner_size(WIDGET_WIDTH, WIDGET_HEIGHT)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(true)
    .visible(false) // 构建时先隐藏，定位完成后立即 show
    .shadow(false);

    // 首次打开（没有保存过位置）默认放到主显示器右上角，留 16px 边距
    if let Some(monitor) = app.primary_monitor()? {
        let screen = monitor.size();
        let scale = monitor.scale_factor();
        let margin = 16.0 * scale;
        let x = (screen.width as f64 - WIDGET_WIDTH * scale - margin).max(margin) as i32;
        let y = margin as i32;
        builder = builder.position(x as f64, y as f64);
    }

    let win = builder.build()?;
    log::info!("[widget] build 完成，show 前可见性: {}", win.is_visible().unwrap_or(false));

    // 创建完成后立即显示并聚焦
    win.show()?;
    log::info!("[widget] show 后可见性: {}", win.is_visible().unwrap_or(false));
    win.set_focus()?;
    log::info!("[widget] focus 后可见性: {}", win.is_visible().unwrap_or(false));

    // 监听窗口事件
    let app_handle = app.clone();
    win.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(p) = event {
            let _ = app_handle.emit_to(
                WIDGET_WINDOW_LABEL,
                "widget://position-changed",
                serde_json::json!({ "x": p.x, "y": p.y }),
            );
        }
    });

    Ok(())
}

/// 切换小组件显示/隐藏。
///
/// 关键：必须是 **async 命令**。Tauri v2 中同步命令运行在主线程，
/// 若在同步命令里调用 WebviewWindowBuilder::build()，WebView2 的异步
/// 初始化完成事件需要主线程消息循环处理 → 双方互锁、永久阻塞。
/// async 命令中 build() 以协作方式等待，主线程保持空闲。
#[tauri::command]
async fn toggle_widget_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    match app.get_webview_window(WIDGET_WINDOW_LABEL) {
        Some(win) => {
            if win.is_visible().unwrap_or(false) {
                win.hide().map_err(|e| e.to_string())?;
            } else {
                win.show().map_err(|e| e.to_string())?;
                win.set_focus().map_err(|e| e.to_string())?;
            }
            Ok(())
        }
        None => {
            create_widget_window(&app).map_err(|e| e.to_string())?;
            Ok(())
        }
    }
}

/// 设置小组件透明度
#[tauri::command]
fn set_widget_opacity<R: Runtime>(app: AppHandle<R>, opacity: f64) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        let _ = win.emit("widget://set-opacity", opacity);
    }
    Ok(())
}

/// 设置小组件置顶
#[tauri::command]
fn set_widget_always_on_top<R: Runtime>(app: AppHandle<R>, on_top: bool) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        win.set_always_on_top(on_top)?;
    }
    Ok(())
}

/// 设置小组件尺寸
#[tauri::command]
fn resize_widget<R: Runtime>(app: AppHandle<R>, width: f64, height: f64) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        win.set_size(tauri::LogicalSize::new(width, height))?;
    }
    Ok(())
}

/// 拖动小组件（通过 start_dragging 实现无边框窗口拖动）
#[tauri::command]
fn start_dragging_widget<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        win.start_dragging()?;
    }
    Ok(())
}

/// 打开主窗口
#[tauri::command]
fn open_main_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        win.show()?;
        win.set_focus()?;
    }
    Ok(())
}

/// 关闭主窗口（最小化到托盘）
#[tauri::command]
fn close_main_window<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        win.hide()?;
    }
    Ok(())
}

/// 获取小组件当前位置与尺寸
#[tauri::command]
fn get_widget_state<R: Runtime>(app: AppHandle<R>) -> tauri::Result<serde_json::Value> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        let pos = win.outer_position()?;
        let size = win.outer_size()?;
        return Ok(serde_json::json!({
            "x": pos.x,
            "y": pos.y,
            "width": size.width,
            "height": size.height,
        }));
    }
    Ok(serde_json::json!(null))
}

/// 恢复小组件到指定位置
#[tauri::command]
fn restore_widget_position<R: Runtime>(
    app: AppHandle<R>,
    x: i32,
    y: i32,
    width: f64,
    height: f64,
) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        win.set_size(tauri::LogicalSize::new(width, height))?;
        win.set_position(tauri::PhysicalPosition::new(x, y))?;
        win.show()?;
    }
    Ok(())
}

/// 边缘吸附：将小组件吸附到最近的屏幕边缘
#[tauri::command]
fn snap_widget_to_edge<R: Runtime>(app: AppHandle<R>) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
        let monitor = win.current_monitor()?.ok_or(tauri::Error::from(std::io::Error::new(std::io::ErrorKind::NotFound, "no monitor")))?;
        let screen = monitor.size();
        let pos = win.outer_position()?;
        let size = win.outer_size()?;

        let snap_margin = 20i32; // 吸附阈值 20px
        let mut new_x = pos.x;
        let mut new_y = pos.y;

        // 左边缘吸附
        if pos.x < snap_margin {
            new_x = 0;
        }
        // 右边缘吸附
        if pos.x + size.width as i32 > screen.width as i32 - snap_margin {
            new_x = (screen.width as i32 - size.width as i32).max(0);
        }
        // 顶部吸附
        if pos.y < snap_margin {
            new_y = 0;
        }
        // 底部吸附
        if pos.y + size.height as i32 > screen.height as i32 - snap_margin {
            new_y = (screen.height as i32 - size.height as i32).max(0);
        }

        if new_x != pos.x || new_y != pos.y {
            win.set_position(tauri::PhysicalPosition::new(new_x, new_y))?;
        }
    }
    Ok(())
}

// ────────────────────────────── 应用入口 ──────────────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {
            // 单实例：重复启动时聚焦已有窗口
            if let Some(win) = _app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new().with_handler(|app, shortcut, event| {
                // Ctrl + Shift + W：显示/隐藏小组件
                if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed
                    && shortcut.matches(
                        tauri_plugin_global_shortcut::Modifiers::CONTROL
                            | tauri_plugin_global_shortcut::Modifiers::SHIFT,
                        tauri_plugin_global_shortcut::Code::KeyW,
                    )
                {
                    // 在异步运行时中调用 async 命令，避免阻塞主线程
                    let a = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = toggle_widget_window(a).await;
                    });
                }
            }).build(),
        )
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .invoke_handler(tauri::generate_handler![
            toggle_widget_window,
            set_widget_opacity,
            set_widget_always_on_top,
            resize_widget,
            start_dragging_widget,
            open_main_window,
            close_main_window,
            get_widget_state,
            restore_widget_position,
            snap_widget_to_edge,
        ])
        .setup(|app| {
            // 构建托盘
            let menu = build_tray_menu(app.handle())?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("我的工资在涨")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show_widget" => {
                        // 经异步运行时创建，避免主线程同步 build 死锁
                        let a = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = toggle_widget_window(a).await;
                        });
                    }
                    "hide_widget" => {
                        if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
                            let _ = win.hide();
                        }
                    }
                    "open_main" => {
                        if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "toggle_always_on_top" => {
                        if let Some(win) = app.get_webview_window(WIDGET_WINDOW_LABEL) {
                            let current = win.is_always_on_top().unwrap_or(false);
                            let _ = win.set_always_on_top(!current);
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // 左键点击托盘图标 → 显示主窗口
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 主窗口关闭时最小化到托盘，而不是退出
            if let Some(main_win) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let main_win_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_win_clone.hide();
                    }
                });
            }

            // 注册全局快捷键 Ctrl+Shift+W（失败不阻断启动，可能被其他软件占用）
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            if let Err(e) = app
                .global_shortcut()
                .register("CommandOrControl+Shift+W")
            {
                log::warn!("全局快捷键注册失败: {e}");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
