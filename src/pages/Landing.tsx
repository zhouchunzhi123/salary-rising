import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Download, WifiOff } from 'lucide-react'
import { Money } from '@/components/Money'
import { useSettings } from '@/hooks/useSettings'
import { useRafNow } from '@/hooks/useRafNow'
import { isTauri } from '@/utils/tauri'
import { currencySymbol } from '@/utils/currencies'
import { formatMoney } from '@/utils/format'

const DEMO_PER_SECOND = 15000 / 22 / 28800 // 月薪 15000、当月 22 个工作日、每天 8 小时
const DEMO_BASE = 250

export default function Landing() {
  const { settings } = useSettings()
  const cs = currencySymbol(settings.currency)
  const startRef = useRef(Date.now())
  const now = useRafNow()
  const demoEarned = DEMO_BASE + ((now.getTime() - startRef.current) / 1000) * DEMO_PER_SECOND

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center py-8 text-center">
      <div className="animate-fade-up w-full max-w-sm">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line/60 bg-card/60 px-4 py-1.5 text-xs font-semibold text-sub backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          打工人实时赚钱仪表盘
        </div>

        <h1 className="text-[2.2rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-[2.8rem]">
          你的工资，
          <br />
          <span className="text-gradient-money">每一秒都在增长</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-sub">
          输入工资，看看今天已经赚了多少钱。
          <br />
          <span className="text-faint">
            虽然老板不会主动给你加工资，但至少这里的数字一直在涨。
          </span>
        </p>
      </div>

      <div className="card animate-fade-up mt-8 w-full max-w-sm overflow-hidden p-6" style={{ animationDelay: '0.08s' }}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-faint">实时演示</div>
          <div className="badge badge-success">
            <span className="badge-dot" />
            赚钱中
          </div>
        </div>
        <div className="mt-2">
          <Money value={demoEarned} className="text-[2.8rem] sm:text-[3.4rem]" />
        </div>
        <div className="tnum mt-2 text-xs font-semibold text-success">
          +{cs}{formatMoney(DEMO_PER_SECOND, 4)} / 秒
        </div>
      </div>

      <Link
        to={settings.onboarded ? '/earn' : '/settings'}
        className="btn-primary animate-fade-up mt-7 w-full max-w-sm py-4 text-base"
        style={{ animationDelay: '0.16s' }}
      >
        {settings.onboarded ? '继续赚钱' : '开始赚钱'}
        <ArrowRight size={19} strokeWidth={2.4} />
      </Link>

      {!isTauri && (
        <Link
          to="/download"
          className="animate-fade-up mt-3 flex w-full max-w-sm items-center justify-between rounded-2xl border border-line/70 bg-card/80 px-4 py-3 text-left backdrop-blur transition-all hover:border-primary/50 hover:shadow-soft"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Download size={18} />
            </span>
            <div>
              <div className="text-sm font-bold text-ink">下载 Windows 桌面版</div>
              <div className="text-[11px] text-faint">桌面悬浮工资小组件 · 离线可用</div>
            </div>
          </div>
          <ArrowRight size={16} className="shrink-0 text-faint" />
        </Link>
      )}

      <div
        className="animate-fade-up mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-faint"
        style={{ animationDelay: '0.24s' }}
      >
        <span className="chip">
          <WifiOff size={13} /> 离线可用
        </span>
        <span className="chip">
          <BarChart3 size={13} /> 工资记录
        </span>
        <Link to="/savings" className="chip transition-colors hover:border-primary/50 hover:text-primary">
          存钱计划
        </Link>
        <span className="chip">数据仅存本机</span>
      </div>
    </div>
  )
}
