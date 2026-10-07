import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  Monitor,
  ShieldAlert,
  MousePointerClick,
  Settings2,
  AppWindow,
  WifiOff,
  Database,
  Trash2,
  Info,
} from 'lucide-react'

const EXE_URL = `${import.meta.env.BASE_URL}dl/SalaryRising-Setup-0.1.0.exe`

const STEPS = [
  {
    icon: Download,
    title: '下载安装包',
    desc: '点击上方按钮下载，文件仅约 4.4 MB，几秒钟即可完成。',
  },
  {
    icon: MousePointerClick,
    title: '双击运行安装',
    desc: '双击 SalaryRising-Setup-0.1.0.exe，按提示一路下一步即可，无需管理员权限。',
  },
  {
    icon: ShieldAlert,
    title: '遇到蓝色安全提示？',
    desc: '若出现「Windows 已保护你的电脑」，点击「更多信息」→「仍要运行」。这是个人开发者未购买昂贵代码签名证书的正常现象，软件本身完全干净。',
    warn: true,
  },
  {
    icon: Settings2,
    title: '设置你的工资',
    desc: '首次启动会进入设置页，填好工资、上下班时间和工作日，点击「开始赚钱」。',
  },
  {
    icon: AppWindow,
    title: '打开桌面小组件',
    desc: '在设置页找到「Windows 桌面小组件」，点击「打开桌面小组件」，悬浮小窗就会出现在桌面上，拖到屏幕边缘即可。',
  },
]

const NOTES = [
  {
    icon: Monitor,
    title: '仅支持 Windows 10 / 11',
    desc: '目前只有 Windows 版本，Mac 版请直接使用网页版。',
  },
  {
    icon: WifiOff,
    title: '完全离线运行',
    desc: '不需要联网，没有服务器，锁屏、睡眠、断网都不影响工资计算——金额永远由当前时间重新推导。',
  },
  {
    icon: Database,
    title: '数据只存在本机',
    desc: '工资设置和记录全部保存在你自己的电脑上，不上传、不收集、不追踪。',
  },
  {
    icon: ShieldAlert,
    title: '杀毒软件误报怎么办',
    desc: '少数杀毒软件可能对未签名的个人软件误报，选择「添加信任 / 允许运行」即可。源码可在官网查看，绝无恶意行为。',
  },
  {
    icon: Trash2,
    title: '如何卸载',
    desc: 'Windows 设置 → 应用 → 已安装的应用 → 找到「工资跳动」→ 卸载，会完整移除。',
  },
]

export default function DownloadPage() {
  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-faint transition-colors hover:text-primary"
      >
        <ArrowLeft size={14} />
        返回首页
      </Link>

      {/* 下载主卡片 */}
      <section className="card overflow-hidden p-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary shadow-glow">
          <Monitor size={28} className="text-primary-contrast" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold">工资跳动 · Windows 桌面版</h1>
        <p className="mt-1 text-xs text-faint">
          把实时工资变成桌面悬浮小组件，上班时工资一直在眼前跳动
        </p>

        <a
          href={EXE_URL}
          download="工资跳动-Setup-0.1.0.exe"
          className="btn-primary mx-auto mt-5 w-full max-w-xs py-4 text-base"
        >
          <Download size={19} strokeWidth={2.4} />
          立即下载安装
        </a>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-faint">
          <span>版本 v0.1.0</span>
          <span className="h-3 w-px bg-line" />
          <span>约 4.4 MB</span>
          <span className="h-3 w-px bg-line" />
          <span>Windows 10 / 11</span>
        </div>
      </section>

      {/* 安装教程 */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">
            1
          </span>
          安装教程
        </div>
        <ol className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={i} className="flex gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    step.warn ? 'bg-warning/10 text-warning' : 'bg-primary-soft text-primary'
                  }`}
                >
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{step.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-sub">{step.desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* 注意事项 */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-contrast">
            2
          </span>
          注意事项
        </div>
        <ul className="space-y-3.5">
          {NOTES.map((note, i) => {
            const Icon = note.icon
            return (
              <li key={i} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sub">
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{note.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-faint">{note.desc}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 底部提示 */}
      <div className="flex items-start gap-2 rounded-2xl bg-primary-soft/60 px-4 py-3 text-xs leading-relaxed text-sub">
        <Info size={15} className="mt-0.5 shrink-0 text-primary" />
        <span>
          安装后网页版的功能在桌面版中全部保留，工资数据与网页版各自独立存储。
          使用中有任何问题，欢迎到
          <Link to="/settings" className="mx-1 font-semibold text-primary underline underline-offset-2">
            设置页底部联系作者
          </Link>
          反馈。
        </span>
      </div>
    </div>
  )
}
