/**
 * Tauri API 桥接 —— 在纯浏览器环境（非 Tauri）下安全降级，
 * 所有方法都不会抛出异常。
 */

// 检测是否在 Tauri 环境中
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// 动态导入 Tauri API，避免在非 Tauri 环境下报错
async function getTauriApi() {
  if (!isTauri) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return { invoke }
  } catch {
    return null
  }
}

async function getTauriWindow() {
  if (!isTauri) return null
  try {
    const win = await import('@tauri-apps/api/window')
    return win
  } catch {
    return null
  }
}

async function getTauriEvent() {
  if (!isTauri) return null
  try {
    const ev = await import('@tauri-apps/api/event')
    return ev
  } catch {
    return null
  }
}

// ────────────────────────────── 窗口控制 ──────────────────────────────

export async function toggleWidgetWindow(): Promise<void> {
  const api = await getTauriApi()
  if (!api) throw new Error('当前不在桌面应用环境中')
  // 不吞掉错误，让调用方能展示给用户
  await api.invoke('toggle_widget_window')
}

export async function startDraggingWidget(): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('start_dragging_widget').catch(() => {})
}

export async function openMainWindow(): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('open_main_window').catch(() => {})
}

export async function closeMainWindow(): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('close_main_window').catch(() => {})
}

export async function setWidgetOpacity(opacity: number): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('set_widget_opacity', { opacity }).catch(() => {})
}

export async function setWidgetAlwaysOnTop(onTop: boolean): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('set_widget_always_on_top', { onTop }).catch(() => {})
}

export async function resizeWidget(width: number, height: number): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('resize_widget', { width, height }).catch(() => {})
}

export async function snapWidgetToEdge(): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('snap_widget_to_edge').catch(() => {})
}

export async function getWidgetState(): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const api = await getTauriApi()
  if (!api) return null
  try {
    return (await api.invoke('get_widget_state')) as { x: number; y: number; width: number; height: number } | null
  } catch {
    return null
  }
}

export async function restoreWidgetPosition(x: number, y: number, width: number, height: number): Promise<void> {
  const api = await getTauriApi()
  if (api) await api.invoke('restore_widget_position', { x, y, width, height }).catch(() => {})
}

// ────────────────────────────── 开机启动 ──────────────────────────────

export async function enableAutostart(): Promise<void> {
  if (!isTauri) return
  try {
    const { enable } = await import('@tauri-apps/plugin-autostart')
    await enable()
  } catch { /* ignore */ }
}

export async function disableAutostart(): Promise<void> {
  if (!isTauri) return
  try {
    const { disable } = await import('@tauri-apps/plugin-autostart')
    await disable()
  } catch { /* ignore */ }
}

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri) return false
  try {
    const { isEnabled } = await import('@tauri-apps/plugin-autostart')
    return await isEnabled()
  } catch {
    return false
  }
}

// ────────────────────────────── 全局快捷键 ──────────────────────────────

export async function registerGlobalShortcut(shortcut: string): Promise<void> {
  if (!isTauri) return
  try {
    const { register } = await import('@tauri-apps/plugin-global-shortcut')
    await register(shortcut, () => {
      toggleWidgetWindow()
    })
  } catch { /* ignore */ }
}

export async function unregisterGlobalShortcut(shortcut: string): Promise<void> {
  if (!isTauri) return
  try {
    const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
    await unregister(shortcut)
  } catch { /* ignore */ }
}

// ────────────────────────────── 事件监听 ──────────────────────────────

export async function listenWidgetOpacity(callback: (opacity: number) => void): Promise<(() => void) | null> {
  const ev = await getTauriEvent()
  if (!ev) return null
  try {
    return await ev.listen<number>('widget://set-opacity', (e) => callback(e.payload))
  } catch {
    return null
  }
}

// ────────────────────────────── 窗口 API ──────────────────────────────

export async function getCurrentWindow() {
  const win = await getTauriWindow()
  if (!win) return null
  try {
    return win.getCurrentWindow()
  } catch {
    return null
  }
}
