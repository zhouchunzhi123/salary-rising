/**
 * 工资计算核心：
 *
 * 月薪 → 日薪 = 月薪 ÷ 当月预计工作日（按用户设置的工作日历真实统计，不是 /30）
 * 年薪 → 先 /12 转月薪，再按月薪规则
 * 日薪 → 直接使用
 * 时薪 → 日薪 = 时薪 × 当日实际工作小时数（扣除午休）
 *
 * 秒薪 = 日薪 ÷ 当日工作秒数
 */
import type { SalarySettings } from '@/types'
import { buildTimeline } from './workTimeCalculator'
import { countWorkdays } from './time'

/** 某个月内用户实际需要上班的天数 */
export function workdaysInMonth(date: Date, workdays: number[]): number {
  return countWorkdays(date.getFullYear(), date.getMonth(), workdays)
}

/**
 * 某班次归属日的日工资。
 * 注意：跨夜班凌晨时 anchorDate 是“开工那天”，月份也按那天计算。
 */
export function dailyPayFor(anchorDate: Date, sal: SalarySettings): number {
  if (!Number.isFinite(sal.salary) || sal.salary <= 0) return 0

  const timeline = buildTimeline(anchorDate, sal.schedule)
  if (timeline.totalWorkSeconds <= 0) return 0

  switch (sal.salaryType) {
    case 'monthly': {
      const days = Math.max(1, workdaysInMonth(anchorDate, sal.schedule.workdays))
      return sal.salary / days
    }
    case 'yearly': {
      const monthly = sal.salary / 12
      const days = Math.max(1, workdaysInMonth(anchorDate, sal.schedule.workdays))
      return monthly / days
    }
    case 'daily':
      return sal.salary
    case 'hourly':
      return sal.salary * (timeline.totalWorkSeconds / 3600)
    default:
      return 0
  }
}

/** 某一天的每秒工资（保留完整精度，展示层自行决定小数位） */
export function perSecondRateFor(anchorDate: Date, sal: SalarySettings): number {
  const timeline = buildTimeline(anchorDate, sal.schedule)
  if (timeline.totalWorkSeconds <= 0) return 0
  return dailyPayFor(anchorDate, sal) / timeline.totalWorkSeconds
}

/** 友好的工资类型中文名称 */
export const SALARY_TYPE_LABELS: Record<SalarySettings['salaryType'], string> = {
  monthly: '月薪',
  yearly: '年薪',
  daily: '日薪',
  hourly: '时薪',
}
