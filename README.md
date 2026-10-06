# 💰 我的工资在涨

> 虽然老板不会主动给你加工资，但至少这里的数字一直在涨。

一个面向上班族的轻娱乐网页应用：输入工资与作息，页面上的金额会**按真实时间戳每帧实时增长**。
它不是工资计算器，而是一块「打工人实时赚钱仪表盘」。

## 功能一览

- **实时赚钱主页**：requestAnimationFrame 每帧根据「当前时间 − 上下班时间」重算金额，切标签页 / 休眠 / 卡顿回来金额依然准确
- **四种工资类型**：月薪（按当月真实工作日折算，绝不是 ÷30）、年薪、日薪、时薪
- **完整作息设置**：上下班时间、午休扣减、跨午夜夜班、工作日自由开关
- **四种工作状态**：还没开工（可提前开始）/ 正在赚钱 / 午休暂停 / 下班结算；周末显示「今天不上班 😎」
- **工作进度条**：上班时间、当前进度、已工作时长、距离下班倒计时
- **里程碑正反馈**：赚到 100 / 200 / 500 / 1000 元时轻量 Toast + 金币雨，每天每档只触发一次
- **全屏赚钱模式**：沉浸式大数字，支持浏览器原生全屏，适合副屏 / 手机放桌面
- **摸鱼模式 +「老板来了」**：一键伪装成 Excel 季度报表（纯视觉彩蛋，Esc 或窗口 ✕ 返回）
- **老板视角**：输入人数与平均月薪，实时计算会议烧掉的人力成本
- **工资记录**：localStorage 结算，近 7 / 30 天柱状图（Recharts）+ 今天 / 昨天 / 本周 / 本月 / 今年汇总
- **分享卡片**：Canvas 生成竖版图片，一键保存 PNG
- **6 套主题**：少女粉（默认）/ 跟随系统 / 明亮 / 深色 / 治愈绿 / 赛博朋克
- **PWA**：Manifest + Service Worker，可添加到主屏幕、离线访问
- **移动端优先**：大触控区、等宽数字不抖动、无横向滚动、安全区适配

## 技术栈

React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts + lucide-react + vite-plugin-pwa + Vitest

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173
```

## 构建与测试

```bash
npm run build    # tsc --noEmit 类型检查 + 生产构建到 dist/
npm run preview  # 本地预览生产包
npm test         # 运行 Vitest（47 个用例）
```

## 目录结构

```
src/
├── main.tsx                  # 入口 + PWA 注册
├── App.tsx                   # 路由表
├── index.css                 # Tailwind 与 6 套 CSS 变量主题
├── types.ts                  # 全局类型（纯数据层）
├── utils/                    # 核心逻辑（框架无关，可移植小程序）
│   ├── time.ts               # 时间解析、工作日统计、格式化
│   ├── workTimeCalculator.ts # 当日时间轴、午休扣减、跨夜班、作息校验
│   ├── salaryCalculator.ts   # 月/年/日/时薪 → 日薪、秒薪
│   ├── earningsEngine.ts     # ★ 任意时刻收入快照、状态判定、周/月/年聚合
│   ├── milestones.ts         # 赚钱里程碑规则
│   ├── storage.ts            # localStorage 安全封装 + 默认值
│   └── format.ts / cn.ts
├── hooks/
│   ├── useSettings.tsx       # 设置 Context（自动持久化）
│   ├── useEarnings.ts        # ★ rAF 实时循环、里程碑、结算落库
│   ├── useRafNow.ts
│   ├── useRecords.ts
│   └── useTheme.ts
├── components/
│   ├── Money.tsx             # 超大等宽金额（跨分脉冲，不抖屏）
│   ├── ProgressBar.tsx / CoinRain.tsx / ToastStack.tsx / StatTile.tsx
│   ├── AppShell.tsx          # 顶栏 + 底部 Tab
│   ├── ShareModal.tsx        # Canvas 分享图
│   ├── StealthSheet.tsx      # 老板来了伪装 Excel
│   └── form/                 # SegmentedControl / Toggle / WeekdayPicker
└── pages/                    # Landing / Settings / Earning / Fullscreen / History / Boss
```

## 核心计算公式

```
日薪（月薪） = 月薪 ÷ 当月预计工作日（按用户工作日历逐天统计）
日薪（年薪） = 年薪 ÷ 12 ÷ 当月预计工作日
日薪（日薪） = 输入值
日薪（时薪） = 时薪 × 当日实际工作小时数（扣除午休）

当日工作秒数 = (下班 − 上班 − 午休) 换算为秒
每秒工资     = 日薪 ÷ 当日工作秒数
当前已赚     = 已计薪秒数 × 每秒工资   ← 每次 requestAnimationFrame 用真实时间戳重算
```

## 为什么金额永远准确

页面**不做** `setInterval(n => n + 每秒工资)` 这种累加（掉帧、切后台都会失真）。
每一帧都调用 `getDaySnapshot(new Date(), settings)`，由当前时间戳反推已计薪秒数。
因此 14:00 离开页面、14:30 回来，金额会直接跳到 14:30 的正确值 ——
**「时间决定工资，而不是动画决定工资。」**

## 数据与隐私

所有设置与每日记录仅保存在浏览器 `localStorage`（键前缀 `salary-rise:v1:`），无后端、无网络上报。
清除浏览器数据或在「记录」页点击清空即可删除。

## 后续可做

- 512×512 PNG 图标（当前为 SVG，现代 Chrome 可安装；iOS 桌面图标建议补 PNG）
- 法定节假日 / 调休日历
- 税后工资、五险一金档位
- 数据导出 CSV / 跨设备同步
- 包装为微信小程序（核心 `utils/` 已与 DOM/React 解耦，可直接复用）
