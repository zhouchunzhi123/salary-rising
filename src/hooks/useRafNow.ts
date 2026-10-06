import { useEffect, useRef, useState } from 'react'

/**
 * requestAnimationFrame 驱动的当前时间。
 * 每一帧都返回真实时间戳，组件据此重算数据 —— 而不是靠定时器“累加”。
 */
export function useRafNow(active = true): Date {
  const [now, setNow] = useState(() => new Date())
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const tick = () => {
      setNow(new Date())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  return now
}
