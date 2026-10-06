import { useCallback, useEffect, useState } from 'react'
import type { RecordMap } from '@/types'
import { loadRecords } from '@/utils/storage'

/** 读取每日结算记录，并在回到页面 / 每 15 秒自动刷新（跨标签同步） */
export function useRecords(): { records: RecordMap; refresh: () => void } {
  const [records, setRecords] = useState<RecordMap>(() => loadRecords())

  const refresh = useCallback(() => {
    setRecords(loadRecords())
  }, [])

  useEffect(() => {
    const onVisible = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(refresh, 15000)
    window.addEventListener('storage', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', refresh)
      window.clearInterval(id)
    }
  }, [refresh])

  return { records, refresh }
}
