/**
 * 全局类型定义 —— 纯数据层，不依赖任何 DOM / 框架，可直接移植到小程序端。
 */

/** 工资类型 */
export type SalaryType = 'monthly' | 'yearly' | 'daily' | 'hourly'

/** 货币类型 */
export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'KRW'

/** 主题：system 跟随系统；其余为固定主题 */
export type ThemeName = 'system' | 'pink' | 'light' | 'dark' | 'mint' | 'cyber'

/** 实际生效的主题（system 解析后） */
export type ResolvedTheme = 'pink' | 'light' | 'dark' | 'mint' | 'cyber'

/** 工作日历与作息 */
export interface WorkSchedule {
  /** 上班时间 HH:mm */
  startTime: string
  /** 下班时间 HH:mm */
  endTime: string
  /** 是否跨午夜（夜班：下班时间落在第二天） */
  overnight: boolean
  /** 是否启用午休 */
  lunchEnabled: boolean
  /** 午休开始 HH:mm */
  lunchStart: string
  /** 午休结束 HH:mm */
  lunchEnd: string
  /** 工作日，0=周日 … 6=周六 */
  workdays: number[]
}

/** 工资相关设置 */
export interface SalarySettings {
  salaryType: SalaryType
  /** 税前工资数额（按 salaryType 对应的周期计） */
  salary: number
  /** 货币（计算逻辑不关心货币，仅用于展示） */
  currency?: Currency
  schedule: WorkSchedule
}

/** 存钱计划设置 */
export interface SavingsSettings {
  /** 是否开启存钱计划 */
  enabled: boolean
  /** 存钱目标金额 */
  goal: number
  /** 开启存钱计划的日期（YYYY-MM-DD），从这天起的收入计入已存 */
  startDate: string
}

/** 完整应用设置（含外观与引导状态） */
export interface AppSettings extends SalarySettings {
  currency: Currency
  theme: ThemeName
  /** 是否已完成首次设置 */
  onboarded: boolean
  /** 存钱计划 */
  savings: SavingsSettings
}

/** 一天的工作状态 */
export type WorkStatus =
  | 'rest' // 今天不上班
  | 'before' // 还没开工
  | 'working' // 正在赚钱
  | 'lunch' // 午休中
  | 'after' // 已下班
  | 'invalid' // 作息配置有误

/** 某一天的实时收入快照（全部由当前时间戳推导） */
export interface DaySnapshot {
  /** 快照时间 */
  now: Date
  /** 班次归属日期（跨夜班时可能是“昨天”） */
  anchorDate: Date
  status: WorkStatus
  /** 扣除午休后的工作总秒数 */
  totalSeconds: number
  /** 已经计薪的秒数 */
  earnedSeconds: number
  /** 今天预计能赚到的工资 */
  dailyPay: number
  /** 每秒工资（保持完整精度） */
  perSecond: number
  /** 当前已赚金额 */
  earned: number
  /** 工作进度 0~1 */
  progress: number
  /** 从打卡到现在经过的钟表秒数（含午休） */
  clockElapsedSeconds: number
  /** 距离下班的钟表秒数 */
  clockRemainingSeconds: number
  /** 距离下一个状态（开工 / 午休结束 / 下班）的秒数 */
  nextEventSeconds: number
  invalidReason?: string
}

/** 每日结算记录（localStorage 持久化） */
export interface DailyRecord {
  /** YYYY-MM-DD（本地时区） */
  date: string
  /** 当天最终 / 最新累计收入 */
  earned: number
  /** 计薪秒数 */
  seconds: number
  updatedAt: number
}

export type RecordMap = Record<string, DailyRecord>

/** 聚合统计 */
export interface EarningsStats {
  today: number
  yesterday: number
  week: number
  month: number
  year: number
}

export interface ToastItem {
  id: number
  text: string
  icon?: string
}
