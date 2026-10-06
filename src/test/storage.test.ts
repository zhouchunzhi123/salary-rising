import { describe, expect, it } from 'vitest'
import {
  addFiredMilestone,
  clearManualStart,
  clearRecords,
  DEFAULT_SETTINGS,
  loadFiredMilestones,
  loadManualStart,
  loadRecords,
  loadSettings,
  saveManualStart,
  saveSettings,
  upsertRecord,
} from '@/utils/storage'

describe('localStorage 持久化', () => {
  it('设置保存后可完整读回', () => {
    const s = { ...DEFAULT_SETTINGS, salary: 23333, onboarded: true }
    saveSettings(s)
    const loaded = loadSettings()
    expect(loaded.salary).toBe(23333)
    expect(loaded.onboarded).toBe(true)
    expect(loaded.schedule.startTime).toBe('09:00')
  })

  it('脏数据自动回退默认值，不抛异常', () => {
    window.localStorage.setItem('salary-rise:v1:settings', '{not-json')
    const loaded = loadSettings()
    expect(loaded.salary).toBe(15000)
    expect(loaded.theme).toBe('light')
  })

  it('旧版本缺失字段用默认值补齐', () => {
    window.localStorage.setItem(
      'salary-rise:v1:settings',
      JSON.stringify({ salary: 9999 }),
    )
    const loaded = loadSettings()
    expect(loaded.salary).toBe(9999)
    expect(loaded.schedule.workdays).toEqual([1, 2, 3, 4, 5])
  })

  it('每日记录写入与读取', () => {
    upsertRecord({ date: '2026-10-05', earned: 681.81, seconds: 28800, updatedAt: 1 })
    upsertRecord({ date: '2026-10-06', earned: 700, seconds: 28800, updatedAt: 2 })
    const records = loadRecords()
    expect(Object.keys(records)).toHaveLength(2)
    expect(records['2026-10-05'].earned).toBeCloseTo(681.81, 2)
  })

  it('clearRecords 只清记录，保留设置', () => {
    saveSettings({ ...DEFAULT_SETTINGS, salary: 12345 })
    upsertRecord({ date: '2026-10-05', earned: 1, seconds: 1, updatedAt: 1 })
    clearRecords()
    expect(Object.keys(loadRecords())).toHaveLength(0)
    expect(loadSettings().salary).toBe(12345)
  })

  it('提前开始时间按日期存取', () => {
    const now = new Date(2026, 9, 5, 8, 30)
    saveManualStart('2026-10-05', now)
    expect(loadManualStart('2026-10-05')?.getTime()).toBe(now.getTime())
    expect(loadManualStart('2026-10-06')).toBeNull()
    clearManualStart()
    expect(loadManualStart('2026-10-05')).toBeNull()
  })

  it('里程碑每天独立记录且去重', () => {
    addFiredMilestone('2026-10-05', 'm-100')
    addFiredMilestone('2026-10-05', 'm-100')
    addFiredMilestone('2026-10-05', 'm-200')
    expect(loadFiredMilestones('2026-10-05').sort()).toEqual(['m-100', 'm-200'])
    expect(loadFiredMilestones('2026-10-06')).toEqual([])
  })
})
