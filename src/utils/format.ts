/** 数字与文案格式化 */

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** 1234.5 → "1,234.50" */
export function formatMoney(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return (0).toFixed(decimals)
  const formatter =
    decimals === 2
      ? moneyFormatter
      : new Intl.NumberFormat('zh-CN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
  return formatter.format(value)
}

/** ¥1,234.50 */
export function formatYuan(value: number, decimals = 2): string {
  return `¥${formatMoney(value, decimals)}`
}

/** 12345 → "1.2万" */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return compactFormatter.format(value)
}
