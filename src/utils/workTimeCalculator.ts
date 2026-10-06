/**
 * 作息时间计算：根据工作设置构建某一天的时间轴（支持跨午夜、午休扣减）。
 */
import type { WorkSchedule } from '@/types'
import { DAY_MS, parseHM } from './time'

export interface Segment {
  start: Date
  end: Date
}

export interface DayTimeline {
  /** 班次归属日期 */
  anchorDate: Date
  /** 扣除午休后的实际工作时间段（可能被午休切成两段） */
  segments: Segment[]
  /** 午休时间段 */
  lunch: Segment | null
  /** 实际工作总秒数 */
  totalWorkSeconds: number
}

export interface ScheduleIssue {
  field: string
  message: string
}

const MIN = 60 * 1000

/**
 * 构建某一“班次归属日”的完整时间轴。
 * - 普通班：09:00–18:00，午休 12:00–13:00
 * - 跨夜班：22:00–次日 06:00（endTime + 24h）
 */
export function buildTimeline(anchorDate: Date, s: WorkSchedule): DayTimeline {
  const base = new Date(anchorDate)
  base.setHours(0, 0, 0, 0)
  const baseMs = base.getTime()

  const startMin = parseHM(s.startTime)
  let endMin = parseHM(s.endTime)
  if (s.overnight) endMin += 24 * 60

  const startAt = baseMs + startMin * MIN
  const endAt = baseMs + endMin * MIN

  if (endAt <= startAt) {
    return { anchorDate, segments: [], lunch: null, totalWorkSeconds: 0 }
  }

  let lunch: Segment | null = null
  let segments: Segment[] = [{ start: new Date(startAt), end: new Date(endAt) }]

  if (s.lunchEnabled) {
    let ls = parseHM(s.lunchStart)
    let le = parseHM(s.lunchEnd)
    // 夜班的凌晨午休自动顺延到第二天
    if (s.overnight && ls <= startMin) {
      ls += 24 * 60
      le += 24 * 60
    }
    const lStart = baseMs + ls * MIN
    const lEnd = baseMs + le * MIN
    if (lEnd > lStart && lStart >= startAt && lEnd <= endAt) {
      lunch = { start: new Date(lStart), end: new Date(lEnd) }
      segments = [
        { start: new Date(startAt), end: new Date(lStart) },
        { start: new Date(lEnd), end: new Date(endAt) },
      ]
    }
  }

  const totalWorkSeconds = segments.reduce(
    (acc, seg) => acc + (seg.end.getTime() - seg.start.getTime()) / 1000,
    0,
  )
  return { anchorDate, segments, lunch, totalWorkSeconds }
}

/** 校验作息设置，返回友好的中文错误（空数组表示通过） */
export function validateSchedule(s: WorkSchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = []

  if (!s.workdays.length) {
    issues.push({ field: 'workdays', message: '请至少选择一个工作日，不然你打算什么时候赚钱？' })
  }

  let startMin: number
  let endMin: number
  try {
    startMin = parseHM(s.startTime)
  } catch {
    issues.push({ field: 'startTime', message: '上班时间格式不正确，请使用 HH:mm' })
    return issues
  }
  try {
    endMin = parseHM(s.endTime)
  } catch {
    issues.push({ field: 'endTime', message: '下班时间格式不正确，请使用 HH:mm' })
    return issues
  }

  if (!s.overnight && endMin <= startMin) {
    issues.push({
      field: 'endTime',
      message: '下班时间早于（或等于）上班时间啦。若是夜班，请勾选「跨午夜下班」',
    })
  }

  if (s.lunchEnabled) {
    let ls: number
    let le: number
    try {
      ls = parseHM(s.lunchStart)
      le = parseHM(s.lunchEnd)
    } catch {
      issues.push({ field: 'lunch', message: '午休时间格式不正确，请使用 HH:mm' })
      return issues
    }
    const adjustedLs = s.overnight && ls <= startMin ? ls + 24 * 60 : ls
    const adjustedLe = s.overnight && le <= startMin ? le + 24 * 60 : le
    const adjustedEnd = s.overnight ? endMin + 24 * 60 : endMin

    if (adjustedLe <= adjustedLs) {
      issues.push({ field: 'lunch', message: '午休结束时间必须晚于开始时间' })
    } else if (adjustedLs < startMin || adjustedLe > adjustedEnd) {
      issues.push({ field: 'lunch', message: '午休时间需要在工作时间段内哦' })
    }
  }

  return issues
}

/** 计算纯工作时间轴在某个时刻已经历的计薪毫秒数（自动裁剪到区间内） */
export function paidMsAt(timeline: DayTimeline, nowMs: number): number {
  let paid = 0
  for (const seg of timeline.segments) {
    const s = seg.start.getTime()
    const e = seg.end.getTime()
    if (nowMs <= s) continue
    paid += Math.min(nowMs, e) - s
  }
  return Math.max(0, paid)
}

export { DAY_MS }
