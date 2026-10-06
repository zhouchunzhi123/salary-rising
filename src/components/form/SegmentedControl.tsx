export interface SegmentOption<T extends string> {
  value: T
  label: string
  emoji?: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'md' | 'sm'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className="flex w-full gap-1 rounded-2xl bg-surface p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
              size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'
            } ${
              active
                ? 'bg-card text-primary shadow-card'
                : 'text-sub hover:text-ink'
            }`}
          >
            {opt.emoji ? `${opt.emoji} ` : ''}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
