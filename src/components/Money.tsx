import { useSettings } from '@/hooks/useSettings'
import { formatMoney } from '@/utils/format'
import { currencySymbol } from '@/utils/currencies'

interface MoneyProps {
  value: number
  decimals?: number
  className?: string
  /** 覆盖默认货币符号，不传则取设置中的货币 */
  prefix?: string
}

/**
 * 超大实时金额。
 * - 货币符号与小数位跟随用户设置的币种
 * - Fraunces 衬线字体赋予金额庄重的"钱在增长"质感
 * - tabular-nums 保证数字等宽，位数变化时页面不抖动
 * - 数值本身每帧由真实时间戳推导，天然连续平滑
 *
 * 注意：不使用 memo。金额每帧都在变，memo 无收益；
 * 且货币切换时需立即反映最新符号，避免 memo 与 context 更新产生感知延迟。
 */
export function Money({ value, decimals, className = '', prefix }: MoneyProps) {
  const { settings } = useSettings()
  const symbol = prefix ?? currencySymbol(settings.currency)
  const safe = Number.isFinite(value) ? value : 0
  return (
    <span
      className={`tnum font-display font-extrabold tracking-tight text-gradient-money ${className}`}
      aria-label={`${symbol}${formatMoney(safe, decimals)}`}
    >
      {symbol}
      {formatMoney(safe, decimals)}
    </span>
  )
}
