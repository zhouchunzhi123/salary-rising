interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

/**
 * 开关按钮。
 * 使用 left 定位而非 translate-x，避免在 flex / transform 上下文里出现位置漂移。
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-primary' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}
