/**
 * localStorage 封装：
 * - 全部操作安全降级（隐私模式 / 配额满 / 脏数据都不会炸页面）
 * - 统一前缀与版本号，未来升级数据结构方便迁移
 */
import type { AppSettings, Currency, DailyRecord, RecordMap, ThemeName, WorkSchedule } from '@/types'
import { isValidCurrency } from '@/utils/currencies'

const PREFIX = 'salary-rise:v1:'
const KEY_SETTINGS = PREFIX + 'settings'
const KEY_RECORDS = PREFIX + 'records'
const KEY_MANUAL_START = PREFIX + 'manual-start'
const KEY_MILESTONES = (date: string) => `${PREFIX}milestones:${date}`

export const DEFAULT_SCHEDULE: WorkSchedule = {
  startTime: '09:00',
  endTime: '18:00',
  overnight: false,
  lunchEnabled: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workdays: [1, 2, 3, 4, 5],
}

export const DEFAULT_SETTINGS: AppSettings = {
  salaryType: 'monthly',
  salary: 15000,
  currency: 'CNY',
  schedule: DEFAULT_SCHEDULE,
  theme: 'light',
  onboarded: false,
  savings: { enabled: false, goal: 50000, startDate: '' },
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** 深度合并已存设置与默认值，缺失字段自动补齐 */
export function loadSettings(): AppSettings {
  const raw = safeGet(KEY_SETTINGS)
  if (!raw) return structuredClone(DEFAULT_SETTINGS)
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      schedule: {
        ...structuredClone(DEFAULT_SCHEDULE),
        ...(parsed.schedule ?? {}),
      },
      theme: isValidTheme(parsed.theme) ? parsed.theme : 'light',
      currency: isValidCurrency(parsed.currency) ? (parsed.currency as Currency) : 'CNY',
      savings: {
        enabled: typeof parsed.savings?.enabled === 'boolean' ? parsed.savings.enabled : false,
        goal: Number.isFinite(parsed.savings?.goal) && (parsed.savings?.goal as number) > 0
          ? Number(parsed.savings?.goal)
          : 50000,
        startDate:
          typeof parsed.savings?.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.savings.startDate)
            ? parsed.savings.startDate
            : '',
      },
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function saveSettings(settings: AppSettings): void {
  safeSet(KEY_SETTINGS, JSON.stringify(settings))
}

export function loadRecords(): RecordMap {
  const raw = safeGet(KEY_RECORDS)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: RecordMap = {}
    for (const [k, v] of Object.entries(parsed as RecordMap)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(v?.earned)) {
        result[k] = {
          date: k,
          earned: Math.max(0, v.earned),
          seconds: Math.max(0, v.seconds ?? 0),
          updatedAt: v.updatedAt ?? 0,
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveRecords(records: RecordMap): void {
  safeSet(KEY_RECORDS, JSON.stringify(records))
}

/** 写入 / 更新一天的记录（仅当金额变大或状态推进时覆盖） */
export function upsertRecord(record: DailyRecord): RecordMap {
  const records = loadRecords()
  const old = records[record.date]
  if (!old || record.earned >= old.earned || record.seconds > old.seconds) {
    records[record.date] = record
    saveRecords(records)
  }
  return records
}

/** 仅清空每日记录（保留工资 / 主题设置） */
export function clearRecords(): void {
  safeRemove(KEY_RECORDS)
}

export function clearAllData(): void {
  safeRemove(KEY_SETTINGS)
  safeRemove(KEY_RECORDS)
  safeRemove(KEY_MANUAL_START)
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(`${PREFIX}milestones:`)) keys.push(k)
    }
    keys.forEach(safeRemove)
  } catch {
    /* ignore */
  }
}

/** “提前开始”时间，按日期隔离 */
export function saveManualStart(dateKey: string, at: Date): void {
  safeSet(KEY_MANUAL_START, JSON.stringify({ date: dateKey, ts: at.getTime() }))
}

export function loadManualStart(dateKey: string): Date | null {
  const raw = safeGet(KEY_MANUAL_START)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { date?: string; ts?: number }
    if (parsed.date === dateKey && typeof parsed.ts === 'number') return new Date(parsed.ts)
  } catch {
    /* ignore */
  }
  return null
}

export function clearManualStart(): void {
  safeRemove(KEY_MANUAL_START)
}

/** 当天已触发过的里程碑 */
export function loadFiredMilestones(dateKey: string): string[] {
  const raw = safeGet(KEY_MILESTONES(dateKey))
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function addFiredMilestone(dateKey: string, id: string): void {
  const list = loadFiredMilestones(dateKey)
  if (!list.includes(id)) {
    list.push(id)
    safeSet(KEY_MILESTONES(dateKey), JSON.stringify(list))
  }
}

function isValidTheme(v: unknown): v is ThemeName {
  return typeof v === 'string' && ['system', 'pink', 'light', 'dark', 'mint', 'cyber'].includes(v)
}
