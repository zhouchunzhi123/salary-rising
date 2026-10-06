import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import { formatMoney } from '@/utils/format'

export interface ShareData {
  typeLabel: string
  salary: number
  earned: number
  perSecond: number
  remainingLabel: string
  symbol: string
}

interface ShareModalProps {
  open: boolean
  onClose: () => void
  data: ShareData
}

/** Canvas 圆角矩形兼容封装 */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const W = 900
const H = 1400
const FONT = `'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`

function drawCard(canvas: HTMLCanvasElement, data: ShareData) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = W
  canvas.height = H

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#ffe3ee')
  bg.addColorStop(0.55, '#ffd1e3')
  bg.addColorStop(1, '#ffc4dd')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(W - 80, 120, 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(60, H - 140, 150, 0, Math.PI * 2)
  ctx.fill()

  // 主卡片
  rr(ctx, 60, 90, W - 120, H - 260, 56)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // 顶部
  ctx.font = `700 64px ${FONT}`
  ctx.fillStyle = '#e03b78'
  ctx.fillText('我的工资正在涨', W / 2, 220)

  ctx.font = `400 30px ${FONT}`
  ctx.fillStyle = '#9a6b7d'
  ctx.fillText('虽然老板不会主动给你加工资', W / 2, 286)
  ctx.fillText('但至少这里的数字一直在涨', W / 2, 332)

  // 大金额
  ctx.font = `800 130px 'SF Pro Display',${FONT}`
  ctx.fillStyle = '#ef4f88'
  ctx.fillText(`${data.symbol} ${formatMoney(data.earned)}`, W / 2, 540)

  ctx.font = `500 34px ${FONT}`
  ctx.fillStyle = '#8a5a6b'
  ctx.fillText('今天已经赚了', W / 2, 620)

  // 分割线
  ctx.strokeStyle = '#f6d8e5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(150, 700)
  ctx.lineTo(W - 150, 700)
  ctx.stroke()

  // 信息行
  const rows: [string, string][] = [
    [data.typeLabel, `${data.symbol}${formatMoney(data.salary, 0)}`],
    ['每秒进账', `+${data.symbol}${formatMoney(data.perSecond, 4)} / 秒`],
    ['距离下班', data.remainingLabel],
  ]
  ctx.textAlign = 'left'
  rows.forEach(([k, v], i) => {
    const y = 800 + i * 110
    ctx.font = `400 32px ${FONT}`
    ctx.fillStyle = '#9a6b7d'
    ctx.fillText(k, 170, y)
    ctx.textAlign = 'right'
    ctx.font = `700 36px 'SF Pro Display',${FONT}`
    ctx.fillStyle = '#4a3340'
    ctx.fillText(v, W - 170, y)
    ctx.textAlign = 'left'
  })

  // 底部口号
  ctx.textAlign = 'center'
  rr(ctx, 150, 1120, W - 300, 110, 55)
  ctx.fillStyle = '#ff5c97'
  ctx.fill()
  ctx.font = `600 38px ${FONT}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText('你的工资现在是多少？', W / 2, 1192)

  ctx.font = `400 26px ${FONT}`
  ctx.fillStyle = '#a07183'
  ctx.fillText('我的工资在涨 · 打工人实时赚钱仪表盘', W / 2, 1290)
}

export function ShareModal({ open, onClose, data }: ShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!open || !canvasRef.current) return
    drawCard(canvasRef.current, data)
    setUrl(canvasRef.current.toDataURL('image/png'))
  }, [open, data])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} aria-label="关闭分享" />
      <div className="animate-pop-in relative z-10 flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <span className="font-bold">分享我的工资</span>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {url && (
            <img src={url} alt="分享卡片预览" className="w-full rounded-2xl border border-line/60" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          <p className="mt-3 text-center text-xs leading-relaxed text-faint">
            长按图片或点击按钮保存，发到微信 / 朋友圈 / 小红书 / 微博，
            <br />
            让工友们一起看看时间是如何变成钱的
          </p>
        </div>
        <div className="border-t border-line/60 p-4">
          <a href={url} download="我的工资在涨.png" className="btn-primary w-full">
            <Download size={18} />
            保存分享图片
          </a>
        </div>
      </div>
    </div>
  )
}
