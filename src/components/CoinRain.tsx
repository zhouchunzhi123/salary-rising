import { useMemo } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { currencySymbol } from '@/utils/currencies'

interface CoinRainProps {
  count?: number
}

/**
 * 里程碑达成时的金币雨（纯 CSS 绘制，不使用 emoji）。
 * 金币上的符号跟随用户设置的货币，自然下落，不遮挡操作、自动结束。
 */
export function CoinRain({ count = 18 }: CoinRainProps) {
  const { settings } = useSettings()
  const symbol = currencySymbol(settings.currency)
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.6 + Math.random() * 2,
        size: 16 + Math.random() * 18,
        rot: Math.random() * 360,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {coins.map((c) => (
        <span
          key={c.id}
          className="absolute -top-10 grid place-items-center rounded-full font-bold text-white"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            fontSize: c.size * 0.5,
            backgroundImage:
              'linear-gradient(135deg, #ffd86b 0%, #f5b324 50%, #e08a12 100%)',
            boxShadow: '0 2px 8px rgba(224,138,18,0.45), inset 0 1px 2px rgba(255,255,255,0.6)',
            animation: `coin-fall ${c.duration}s linear ${c.delay}s forwards, coin-spin ${0.8 + Math.random() * 0.6}s ease-in-out ${c.delay}s infinite alternate`,
            transform: `rotate(${c.rot}deg)`,
          }}
        >
          {symbol}
        </span>
      ))}
      <style>{`
        @keyframes coin-spin {
          from { transform: rotateY(0deg) rotateX(0deg); }
          to { transform: rotateY(180deg) rotateX(20deg); }
        }
      `}</style>
    </div>
  )
}
