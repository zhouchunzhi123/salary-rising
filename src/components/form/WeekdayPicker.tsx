import { WEEKDAY_SHORT } from '@/utils/time'

interface WeekdayPickerProps {
  value: number[]
  onChange: (days: number[]) => void
}

/** 周一…周日 选择器（内部按 1..6,0 展示，值仍是 0=周日…6=周六） */
export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const order = [1, 2, 3, 4, 5, 6, 0]

  const toggle = (day: number) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day))
    } else {
      onChange([...value, day].sort((a, b) => a - b))
    }
  }

  return (
    <div className="flex justify-between gap-1.5">
      {order.map((day) => {
        const active = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            aria-pressed={active}
            className={`flex h-11 flex-1 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all active:scale-90 ${
              active
                ? 'bg-primary text-primary-contrast shadow-glow'
                : 'bg-surface text-faint hover:text-sub'
            }`}
          >
            {WEEKDAY_SHORT[day]}
          </button>
        )
      })}
    </div>
  )
}
