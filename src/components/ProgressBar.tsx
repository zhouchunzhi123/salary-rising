interface ProgressBarProps {
  /** 0~1 */
  progress: number
  className?: string
  shimmer?: boolean
}

/** 工作进度条：渐变填充 + 微光扫过 */
export function ProgressBar({ progress, className = '', shimmer = true }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100
  return (
    <div
      className={`relative h-3 w-full overflow-hidden rounded-full bg-primary/10 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="relative h-full rounded-full transition-[width] duration-300 ease-linear"
        style={{
          width: `${pct}%`,
          backgroundImage:
            'linear-gradient(90deg, hsl(var(--c-money)), hsl(var(--c-primary)))',
        }}
      >
        {shimmer && pct > 4 && pct < 99 && (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="absolute top-0 h-full w-1/3 animate-shimmer bg-white/40 blur-md" />
          </div>
        )}
      </div>
    </div>
  )
}
