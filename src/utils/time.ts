/**
 * 时间工具：全部基于浏览器本地时间，不依赖服务器时间。
 */

export const DAY_MS = 24 * 60 * 60 * 1000
export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
export const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

/** 解析 HH:mm 为分钟数，非法格式抛出错误 */
export function parseHM(value: string): number {
  if (typeof value !== 'string') throw new Error('时间格式不正确')
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) throw new Error(`时间格式不正确：${value}`)
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error(`时间超出范围：${value}`)
  return h * 60 + min
}

/** 判断字符串是否为合法 HH:mm */
export function isValidHM(value: string): boolean {
  try {
    parseHM(value)
    return true
  } catch {
    return false
  }
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 当天 00:00 的 Date */
export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** 本地日期 key：YYYY-MM-DD */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 从 YYYY-MM-DD 还原本地 Date */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 当天处于一天中的第几分钟 */
export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function isWorkday(date: Date, workdays: number[]): boolean {
  return workdays.includes(date.getDay())
}

/** 某年某月（month 0-11）内，命中星期集合的天数 */
export function countWorkdays(year: number, month: number, workdays: number[]): number {
  if (!workdays.length) return 0
  const days = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    if (workdays.includes(new Date(year, month, d).getDay())) count++
  }
  return count
}

/** 区间 [start, endInclusive] 内命中星期集合的天数 */
export function countWorkdaysBetween(start: Date, endInclusive: Date, workdays: number[]): number {
  if (!workdays.length) return 0
  const s = startOfDay(start).getTime()
  const e = startOfDay(endInclusive).getTime()
  let count = 0
  for (let t = s; t <= e; t += DAY_MS) {
    if (workdays.includes(new Date(t).getDay())) count++
  }
  return count
}

/** 本周一 00:00 */
export function mondayOf(d: Date = new Date()): Date {
  const x = startOfDay(d)
  const w = x.getDay() // 0 周日
  const diff = w === 0 ? -6 : 1 - w
  x.setDate(x.getDate() + diff)
  return x
}

/** 秒数 → HH:MM:SS，支持小数秒（decimals=1 显示 0.1 秒，与金额更新同频） */
export function formatHMS(totalSeconds: number, decimals = 0): string {
  const clamped = Math.max(0, totalSeconds)
  const s = Math.floor(clamped)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (decimals <= 0) return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`
  const frac = clamped - s
  const fracStr = frac.toFixed(decimals).slice(1) // .5
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}${fracStr}`
}

/** 秒数 → 中文时长，如「5小时37分钟」「8分钟」 */
export function formatChineseDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h <= 0 && m <= 0) return '0分钟'
  const parts: string[] = []
  if (h > 0) parts.push(`${h}小时`)
  if (m > 0) parts.push(`${m}分钟`)
  return parts.join('')
}

/** 秒数 → 紧凑倒计时，如 30:00 或 1:02:03 */
export function formatCountdown(totalSeconds: number): string {
  return formatHMS(totalSeconds)
}

/** Date → HH:mm */
export function formatClockHM(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
