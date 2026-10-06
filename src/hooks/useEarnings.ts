import { useCallback, useEffect, useRef, useState } from 'react'
import type { DaySnapshot, SalarySettings } from '@/types'
import { getDaySnapshot, resolveAnchorDate } from '@/utils/earningsEngine'
import { dateKey } from '@/utils/time'
import {
  addFiredMilestone,
  clearManualStart,
  loadFiredMilestones,
  loadManualStart,
  saveManualStart,
  upsertRecord,
} from '@/utils/storage'
import { crossedMilestone, type Milestone } from '@/utils/milestones'

interface UseEarningsResult {
  snapshot: DaySnapshot
  milestone: Milestone | null
  earlyStarted: boolean
  setEarlyStart: () => void
  cancelEarlyStart: () => void
  /** 立即把当前快照写入今日记录（切后台 / 关页面前调用） */
  persistNow: () => void
}

/**
 * 实时赚钱引擎（React 绑定）。
 *
 * 每一帧都调用 getDaySnapshot(真实时间戳)，金额永远由时间推导：
 * - 切换标签页回来，金额直接跳到正确值；
 * - 电脑休眠 / rAF 被暂停，恢复后依然准确；
 * - 里程碑 Toast 每天每档只触发一次。
 */
export function useEarnings(sal: SalarySettings): UseEarningsResult {
  const salRef = useRef(sal)
  salRef.current = sal

  // 先声明所有 ref，避免被 useState 初始化函数提前访问（TDZ）
  const initialAnchor = dateKey(resolveAnchorDate(new Date(), sal.schedule))
  const anchorKeyRef = useRef(initialAnchor)
  const firedRef = useRef<string[]>(loadFiredMilestones(initialAnchor))
  const manualStartRef = useRef<Date | null>(loadManualStart(initialAnchor))
  const prevEarnedRef = useRef(0)
  const lastSaveRef = useRef(0)
  const savedAfterRef = useRef(false)
  const latestRef = useRef<DaySnapshot | null>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)

  const computeSnapshot = useCallback((now: Date): DaySnapshot => {
    const anchor = resolveAnchorDate(now, salRef.current.schedule)
    const key = dateKey(anchor)
    if (key !== anchorKeyRef.current) {
      // 跨天了：重新读取当天的“提前开始”与里程碑记录
      anchorKeyRef.current = key
      firedRef.current = loadFiredMilestones(key)
      manualStartRef.current = loadManualStart(key)
      savedAfterRef.current = false
    }
    return getDaySnapshot(now, salRef.current, manualStartRef.current)
  }, [])

  const [snapshot, setSnapshot] = useState<DaySnapshot>(() => {
    const s = computeSnapshot(new Date())
    latestRef.current = s
    prevEarnedRef.current = s.earned
    return s
  })
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [earlyStarted, setEarlyStartedState] = useState<boolean>(
    () => !!loadManualStart(initialAnchor),
  )

  const persist = useCallback((snap: DaySnapshot) => {
    const key = dateKey(snap.anchorDate)
    const earned = snap.status === 'after' ? snap.dailyPay : snap.earned
    upsertRecord({
      date: key,
      earned,
      seconds: Math.round(snap.earnedSeconds),
      updatedAt: Date.now(),
    })
  }, [])

  const persistNow = useCallback(() => {
    if (latestRef.current) persist(latestRef.current)
  }, [persist])

  const setEarlyStart = useCallback(() => {
    const now = new Date()
    const key = dateKey(resolveAnchorDate(now, salRef.current.schedule))
    saveManualStart(key, now)
    manualStartRef.current = now
    setEarlyStartedState(true)
  }, [])

  const cancelEarlyStart = useCallback(() => {
    clearManualStart()
    manualStartRef.current = null
    setEarlyStartedState(false)
  }, [])

  useEffect(() => {
    let raf = 0

    const frame = () => {
      const now = new Date()
      const snap = computeSnapshot(now)
      latestRef.current = snap
      setSnapshot(snap)

      const key = dateKey(snap.anchorDate)

      // 里程碑（仅在真实计薪增长时判定）
      if (snap.status === 'working') {
        const hit = crossedMilestone(prevEarnedRef.current, snap.earned, firedRef.current)
        if (hit) {
          firedRef.current.push(hit.id)
          addFiredMilestone(key, hit.id)
          setMilestone(hit)
          window.clearTimeout(toastTimerRef.current)
          toastTimerRef.current = window.setTimeout(() => setMilestone(null), 4200)
        }
      }
      prevEarnedRef.current = snap.earned

      // 节流写入今日记录（约每 10 秒一次）
      const t = now.getTime()
      if ((snap.status === 'working' || snap.status === 'lunch') && t - lastSaveRef.current > 10000) {
        lastSaveRef.current = t
        persist(snap)
      }
      // 下班瞬间结算一次全天工资
      if (snap.status === 'after' && !savedAfterRef.current) {
        savedAfterRef.current = true
        persist(snap)
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    const onHide = () => {
      if (latestRef.current) persist(latestRef.current)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      window.clearTimeout(toastTimerRef.current)
    }
  }, [computeSnapshot, persist])

  return { snapshot, milestone, earlyStarted, setEarlyStart, cancelEarlyStart, persistNow }
}
