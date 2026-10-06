import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
}

export function StatTile({ label, value, hint, icon }: StatTileProps) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </span>
      <span className="tnum font-num text-lg font-bold text-ink">{value}</span>
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  )
}
