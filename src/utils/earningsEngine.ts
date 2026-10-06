/**
 * 实时收入引擎 —— 全站最重要的模块。
 *
 * 核心原则：「时间决定工资，而不是动画决定工资。」
 * 任何时刻调用 getDaySnapshot(now) 都会根据当前时间戳重新计算收入，
 * 因此切换标签页、电脑休眠、浏览器暂停 rAF 后回来，金额依然准确。
 */
import type {
  DailyRecord,
  DaySnapshot,
  EarningsStats,
  RecordMap,
  SalarySettings,
  WorkSchedule,
  WorkStatus,
} from '@/types'
import { buildTimeline, paidMsAt, validateSchedule, type DayTimeline } from './workTimeCalculator'
import { dailyPayFor, perSecondRateFor } from './salaryCalculator'
import {
  dateKey,
  isWorkday,
  minutesOfDay,
  mondayOf,
  parseHM,
  startOfDay,
  DAY_MS,
} from './time'

/**
 * 解析当前时刻的班次归属日。
 * 跨夜班在凌晨收尾时，归属“昨天开工”的那一天。
 */
export function resolveAnchorDate(now: Date, schedule: WorkSchedule): Date {
  if (!schedule.overnight) return startOfDay(now)
  try {
    const endMin = parseHM(schedule.endTime)
    if (minutesOfDay(now) <= endMin) {
      const yesterday = startOfDay(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (isWorkday(yesterday, schedule.workdays)) return yesterday
    }
  } catch {
    /* 配置非法时按今天处理，后续状态会给出 invalid */
  }
  return startOfDay(now)
}

function emptySnapshot(
  now: Date,
  anchorDate: Date,
  status: WorkStatus,
  invalidReason?: string,
): DaySnapshot {
  return {
    now,
    anchorDate,
    status,
    totalSeconds: 0,
    earnedSeconds: 0,
    dailyPay: 0,
    perSecond: 0,
    earned: 0,
    progress: 0,
    clockElapsedSeconds: 0,
    clockRemainingSeconds: 0,
    nextEventSeconds: 0,
    invalidReason,
  }
}

/**
 * 计算某一时刻的实时收入快照。
 * @param manualStartAt 用户点击「提前开始」后的实际开工时间（仅当天有效）
 */
export function getDaySnapshot(
  now: Date,
  sal: SalarySettings,
  manualStartAt?: Date | null,
): DaySnapshot {
  const schedule = sal.schedule
  const anchorDate = resolveAnchorDate(now, schedule)
  const anchorKey = dateKey(anchorDate)

  const issues = validateSchedule(schedule)
  if (issues.length) {
    return emptySnapshot(now, anchorDate, 'invalid', issues[0]?.message)
  }

  if (!isWorkday(anchorDate, schedule.workdays)) {
    return emptySnapshot(now, anchorDate, 'rest')
  }

  const timeline: DayTimeline = buildTimeline(anchorDate, schedule)
  if (timeline.totalWorkSeconds <= 0) {
    return emptySnapshot(now, anchorDate, 'invalid', '今天的工作时长为 0，请检查作息设置')
  }

  // “提前开始”：仅当与班次归属日同一天且早于原定上班时间时生效
  let segments = timeline.segments
  if (manualStartAt) {
    const ms = manualStartAt.getTime()
    if (
      dateKey(manualStartAt) === anchorKey &&
      ms < timeline.segments[0].start.getTime() &&
      ms > timeline.segments[0].start.getTime() - 4 * 60 * 60 * 1000
    ) {
      segments = [
        { start: manualStartAt, end: timeline.segments[0].end },
        ...timeline.segments.slice(1),
      ]
    }
  }

  const effectiveTimeline: DayTimeline = { ...timeline, segments }
  const nowMs = now.getTime()
  const firstStart = segments[0].start.getTime()
  const lastEnd = segments[segments.length - 1].end.getTime()

  const totalSeconds = timeline.totalWorkSeconds
  const dailyPay = dailyPayFor(anchorDate, sal)
  const perSecond = perSecondRateFor(anchorDate, sal)

  const paidMs = paidMsAt(effectiveTimeline, nowMs)
  const earnedSeconds = paidMs / 1000
  const earned = earnedSeconds * perSecond

  let status: WorkStatus
  if (nowMs < firstStart) status = 'before'
  else if (nowMs >= lastEnd) status = 'after'
  else if (
    timeline.lunch &&
    nowMs >= timeline.lunch.start.getTime() &&
    nowMs < timeline.lunch.end.getTime()
  )
    status = 'lunch'
  else status = 'working'

  const clockElapsedSeconds = Math.max(0, (nowMs - firstStart) / 1000)
  const clockRemainingSeconds = Math.max(0, (lastEnd - nowMs) / 1000)

  let nextEventSeconds = 0
  if (status === 'before') nextEventSeconds = (firstStart - nowMs) / 1000
  else if (status === 'lunch' && timeline.lunch)
    nextEventSeconds = (timeline.lunch.end.getTime() - nowMs) / 1000
  else if (status === 'working') {
    if (timeline.lunch && nowMs < timeline.lunch.start.getTime()) {
      nextEventSeconds = (timeline.lunch.start.getTime() - nowMs) / 1000
    } else {
      nextEventSeconds = clockRemainingSeconds
    }
  }

  const progress = totalSeconds > 0 ? Math.min(1, earnedSeconds / totalSeconds) : 0

  return {
    now,
    anchorDate,
    status,
    totalSeconds,
    earnedSeconds,
    dailyPay,
    perSecond,
    earned,
    progress,
    clockElapsedSeconds,
    clockRemainingSeconds,
    nextEventSeconds,
  }
}

/**
 * 聚合统计（今天 / 昨天 / 本周 / 本月 / 今年）。
 * liveToday 为当前实时收入，优先于存储记录。
 */
export function aggregateStats(
  records: RecordMap,
  now: Date,
  liveToday?: number,
): EarningsStats {
  const todayKey = dateKey(now)
  const yesterday = startOfDay(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = dateKey(yesterday)
  const weekStartMs = mondayOf(now).getTime()

  let week = 0
  let month = 0
  let year = 0
  let storedToday = 0

  for (const [key, rec] of Object.entries(records)) {
    const d = parseKeySafe(key)
    if (!d) continue
    const amount = Number.isFinite(rec.earned) ? rec.earned : 0
    if (key === todayKey) storedToday = amount
    if (d.getFullYear() === now.getFullYear()) {
      year += amount
      if (d.getMonth() === now.getMonth()) month += amount
      const dm = startOfDay(d).getTime()
      if (dm >= weekStartMs && dm < weekStartMs + 7 * DAY_MS) week += amount
    }
  }

  const today = liveToday ?? storedToday
  // 用实时值替换今天的已存记录
  if (liveToday !== undefined) {
    week += liveToday - storedToday
    month += liveToday - storedToday
    year += liveToday - storedToday
  }

  return {
    today,
    yesterday: records[yesterdayKey]?.earned ?? 0,
    week: Math.max(0, week),
    month: Math.max(0, month),
    year: Math.max(0, year),
  }
}

function parseKeySafe(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** 取最近 n 天的记录（含今天，没有记录则金额为 0），用于图表 */
export function recentDailyRecords(records: RecordMap, now: Date, days: number): DailyRecord[] {
  const result: DailyRecord[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(now)
    d.setDate(d.getDate() - i)
    const key = dateKey(d)
    result.push(
      records[key] ?? {
        date: key,
        earned: 0,
        seconds: 0,
        updatedAt: 0,
      },
    )
  }
  return result
}
