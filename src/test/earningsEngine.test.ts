import { describe, expect, it } from 'vitest'
import type { RecordMap, SalarySettings, WorkSchedule } from '@/types'
import { aggregateStats, getDaySnapshot, recentDailyRecords, resolveAnchorDate } from '@/utils/earningsEngine'
import { DEFAULT_SCHEDULE } from '@/utils/storage'
import { crossedMilestone } from '@/utils/milestones'

const at = (day: number, h: number, min = 0) => new Date(2026, 9, day, h, min, 0)

const sal = (patch: Partial<SalarySettings> = {}): SalarySettings => ({
  salaryType: 'monthly',
  salary: 15000,
  schedule: DEFAULT_SCHEDULE,
  ...patch,
})

describe('实时收入引擎 earningsEngine（时间决定工资）', () => {
  it('上班前（周一 08:30）：before，已赚 0，倒计时 30 分钟', () => {
    const snap = getDaySnapshot(at(5, 8, 30), sal())
    expect(snap.status).toBe('before')
    expect(snap.earned).toBe(0)
    expect(snap.nextEventSeconds).toBeCloseTo(30 * 60, 5)
    expect(snap.progress).toBe(0)
  })

  it('工作中（周一 10:00）：已计薪 1 小时', () => {
    const snap = getDaySnapshot(at(5, 10), sal())
    expect(snap.status).toBe('working')
    expect(snap.earnedSeconds).toBe(3600)
    expect(snap.earned).toBeCloseTo(snap.perSecond * 3600, 8)
    expect(snap.progress).toBeCloseTo(0.125, 5)
    expect(snap.clockRemainingSeconds).toBe(8 * 3600)
  })

  it('午休（12:30）：lunch，工资冻结在 3 小时', () => {
    const snap = getDaySnapshot(at(5, 12, 30), sal())
    expect(snap.status).toBe('lunch')
    expect(snap.earnedSeconds).toBe(3 * 3600)
    expect(snap.nextEventSeconds).toBeCloseTo(30 * 60, 5)
  })

  it('下班后（18:30）：after，赚满全天工资', () => {
    const snap = getDaySnapshot(at(5, 18, 30), sal())
    expect(snap.status).toBe('after')
    expect(snap.earnedSeconds).toBe(28800)
    expect(snap.progress).toBe(1)
    expect(snap.earned).toBeCloseTo(15000 / 22, 6)
  })

  it('切走标签页 30 分钟再回来：14:00 金额直接跳到正确值（已计薪 4 小时）', () => {
    // 模拟 10:00 离开、14:00 回来 —— 引擎只认时间戳
    const before = getDaySnapshot(at(5, 10), sal())
    const after = getDaySnapshot(at(5, 14), sal())
    expect(after.earnedSeconds).toBe(4 * 3600)
    expect(after.earned - before.earned).toBeCloseTo(before.perSecond * 3 * 3600, 6)
  })

  it('周末（2026-10-10 周六）：rest，工资不增长', () => {
    const snap = getDaySnapshot(at(10, 14), sal())
    expect(snap.status).toBe('rest')
    expect(snap.earned).toBe(0)
    expect(snap.perSecond).toBe(0)
  })

  it('“提前开始”：08:30 手动开工，08:45 已计薪 15 分钟', () => {
    const snap = getDaySnapshot(at(5, 8, 45), sal(), at(5, 8, 30))
    expect(snap.status).toBe('working')
    expect(snap.earnedSeconds).toBeCloseTo(15 * 60, 4)
  })

  it('跨夜班：周二凌晨 02:00 归属周一晚的班次，已计薪 4 小时', () => {
    const night: WorkSchedule = {
      startTime: '22:00',
      endTime: '06:00',
      overnight: true,
      lunchEnabled: false,
      lunchStart: '02:00',
      lunchEnd: '03:00',
      workdays: [1, 2, 3, 4, 5],
    }
    expect(resolveAnchorDate(at(6, 2), night).getDate()).toBe(5)
    const snap = getDaySnapshot(at(6, 2), sal({ schedule: night }))
    expect(snap.status).toBe('working')
    expect(snap.earnedSeconds).toBe(4 * 3600)
  })

  it('跨夜班下班后（周二 07:00）：当天状态为 before 而非继续计薪', () => {
    const night: WorkSchedule = {
      startTime: '22:00',
      endTime: '06:00',
      overnight: true,
      lunchEnabled: false,
      lunchStart: '02:00',
      lunchEnd: '03:00',
      workdays: [1, 2, 3, 4, 5],
    }
    const snap = getDaySnapshot(at(6, 7), sal({ schedule: night }))
    expect(snap.status).toBe('before')
  })

  it('日期切换：23:59 → 00:00 后锚点更新到新的一天', () => {
    const late = getDaySnapshot(at(5, 23, 59), sal())
    expect(late.status).toBe('after')
    const midnight = getDaySnapshot(at(6, 0, 0), sal())
    expect(midnight.anchorDate.getDate()).toBe(6)
    expect(midnight.status).toBe('before')
  })

  it('配置非法时返回 invalid 与中文原因，而不是 NaN', () => {
    const snap = getDaySnapshot(
      at(5, 10),
      sal({ schedule: { ...DEFAULT_SCHEDULE, endTime: '09:00', overnight: false } }),
    )
    expect(snap.status).toBe('invalid')
    expect(snap.invalidReason).toBeTruthy()
    expect(Number.isNaN(snap.earned)).toBe(false)
  })
})

describe('聚合统计 aggregateStats', () => {
  const now = at(5, 10) // 2026-10-05 周一
  const records: RecordMap = {
    '2026-10-05': { date: '2026-10-05', earned: 100, seconds: 3600, updatedAt: 0 },
    '2026-10-06': { date: '2026-10-06', earned: 300, seconds: 0, updatedAt: 0 },
    '2026-09-30': { date: '2026-09-30', earned: 50, seconds: 0, updatedAt: 0 },
    '2025-10-05': { date: '2025-10-05', earned: 70, seconds: 0, updatedAt: 0 },
  }

  it('按周 / 月 / 年正确分桶', () => {
    const s = aggregateStats(records, now)
    expect(s.week).toBe(400)
    expect(s.month).toBe(400)
    expect(s.year).toBe(450)
    expect(s.today).toBe(100)
  })

  it('实时收入覆盖今天的存储记录', () => {
    const s = aggregateStats(records, now, 110)
    expect(s.today).toBe(110)
    expect(s.week).toBe(410)
    expect(s.month).toBe(410)
    expect(s.year).toBe(460)
  })

  it('recentDailyRecords 返回升序的最近 n 天（无记录补 0）', () => {
    const list = recentDailyRecords(records, now, 7)
    expect(list).toHaveLength(7)
    expect(list[0].date).toBe('2026-09-29')
    expect(list[6].date).toBe('2026-10-05')
    expect(list[0].earned).toBe(0)
    expect(list[6].earned).toBe(100)
  })
})

describe('里程碑', () => {
  it('金额跨过 100 元触发一次，重复帧不再触发', () => {
    expect(crossedMilestone(99.99, 100.01, [])?.id).toBe('m-100')
    expect(crossedMilestone(100.01, 100.5, ['m-100'])).toBeNull()
  })

  it('一次跳过多档时取最高档', () => {
    const hit = crossedMilestone(0, 600, [])
    expect(hit?.id).toBe('m-500')
  })
})
