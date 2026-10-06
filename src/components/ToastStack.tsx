import { Sparkles } from 'lucide-react'
import type { ToastItem } from '@/types'

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 safe-top">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in flex max-w-sm items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-soft"
        >
          <Sparkles size={16} className="text-primary shrink-0" />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}
