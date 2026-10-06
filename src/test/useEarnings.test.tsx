import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEarnings } from '@/hooks/useEarnings'
import type { SalarySettings, WorkSchedule } from '@/types'
import { pad2 } from '@/utils/time'

/**
 * 构造一个「现在一定在工作时间内」的作息表，
 * 保证测试无论几点运行，rAF 引擎都会观察到金额增长。
 */
function alwaysWorkingSchedule(): WorkSchedule {
  const now = new Date()
  const h = now.getHours()
  const startH = (h + 22) % 24 // now - 2h（含跨夜）
  const endH = (h + 2) % 24 // now + 2h（含跨夜）
  const overnight = endH <= startH
  return {
    startTime: `${pad2(startH)}:00`,
    endTime: `${pad2(endH)}:00`,
    overnight,
    lunchEnabled: false,
    lunchStart: '12:00',
    lunchEnd: '13:00',
    workdays: [0, 1, 2, 3, 4, 5, 6],
  }
}

describe('useEarnings（requestAnimationFrame 实时增长）', () => {
  it('每一帧根据真实时间戳重算，金额持续单调增长', async () => {
    const settings: SalarySettings = {
      salaryType: 'daily',
      salary: 500,
      schedule: alwaysWorkingSchedule(),
    }

    const { result } = renderHook(() => useEarnings(settings))

    // 等待若干帧（setup 中 rAF 被 polyfill 为 16ms 的 setTimeout）
    await waitFor(() => expect(result.current.snapshot.status).toBe('working'))
    const first = result.current.snapshot.earned

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })
    const second = result.current.snapshot.earned

    expect(second).toBeGreaterThan(first)
    // 增长幅度与流逝时间一致：8 小时 500 元
    const perSecond = 500 / 28800
    expect(second - first).toBeGreaterThan(perSecond * 0.01)
  })
})
