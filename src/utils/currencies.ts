import type { Currency } from '@/types'

export interface CurrencyMeta {
  code: Currency
  label: string
  /** 符号，放在金额前面 */
  symbol: string
  /** ISO 4217 代码 */
  iso: string
  /** 小数位数（日元为 0） */
  decimals: number
  /** 数字格式化区域 */
  locale: string
}

/** 世界常用货币。切换后所有金额展示的符号与小数位会同步变化。 */
export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  CNY: { code: 'CNY', label: '人民币', symbol: '¥', iso: 'CNY', decimals: 2, locale: 'zh-CN' },
  USD: { code: 'USD', label: '美元', symbol: '$', iso: 'USD', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', label: '欧元', symbol: '€', iso: 'EUR', decimals: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', label: '英镑', symbol: '£', iso: 'GBP', decimals: 2, locale: 'en-GB' },
  JPY: { code: 'JPY', label: '日元', symbol: '¥', iso: 'JPY', decimals: 0, locale: 'ja-JP' },
  HKD: { code: 'HKD', label: '港币', symbol: 'HK$', iso: 'HKD', decimals: 2, locale: 'zh-HK' },
  KRW: { code: 'KRW', label: '韩元', symbol: '₩', iso: 'KRW', decimals: 0, locale: 'ko-KR' },
}

export const CURRENCY_LIST: CurrencyMeta[] = Object.values(CURRENCIES)

export function getCurrencyMeta(currency: Currency): CurrencyMeta {
  return CURRENCIES[currency] ?? CURRENCIES.CNY
}

export function currencySymbol(currency: Currency): string {
  return getCurrencyMeta(currency).symbol
}

export function isValidCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && v in CURRENCIES
}
