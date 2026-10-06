import { useEffect, useMemo, useState } from 'react'

interface StealthSheetProps {
  onClose: () => void
}

/**
 * 「老板来了 👀」彩蛋：一键伪装成正在认真做的 Excel 报表。
 * 纯静态视觉界面，无任何真实抓取 / 隐藏行为。
 * Esc 键或点击右上角窗口关闭按钮悄悄返回。
 */
export function StealthSheet({ onClose }: StealthSheetProps) {
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const id = window.setTimeout(() => setShowHint(false), 3200)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(id)
    }
  }, [onClose])

  const rows = useMemo(() => {
    const names = [
      '张伟', '王芳', '李娜', '刘洋', '陈静', '杨帆', '赵磊', '黄敏',
      '周杰', '吴婷', '徐强', '孙丽', '马超', '朱琳', '胡军', '郭倩',
      '林峰', '何雪',
    ]
    const depts = ['销售一部', '销售二部', '渠道组', '大客户部']
    return names.map((name, i) => {
      const q1 = 82000 + ((i * 13729) % 46000)
      const q2 = q1 + 4200 - ((i * 3317) % 9100)
      const q3 = q2 + 6800 - ((i * 5101) % 12300)
      const rate = Math.min(1.38, q3 / q1)
      return {
        id: `EMP${10248 + i}`,
        name,
        dept: depts[i % depts.length],
        q1,
        q2,
        q3,
        rate,
        total: q1 + q2 + q3,
      }
    })
  }, [])

  const cols = ['工号', '姓名', '部门', 'Q1（元）', 'Q2（元）', 'Q3（元）', '达成率', '合计（元）']

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white text-[13px] text-neutral-800">
      {/* 假窗口标题栏 */}
      <div className="flex h-9 items-center justify-between bg-[#217346] px-3 text-white">
        <div className="flex items-center gap-2 text-xs">
          <span className="grid h-5 w-5 place-items-center rounded bg-white/20 font-bold text-[11px]">
            X
          </span>
          <span>工作报表_2026Q3.xlsx - Excel</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="grid h-7 w-9 place-items-center text-sm hover:bg-white/15">—</span>
          <span className="grid h-7 w-9 place-items-center text-xs hover:bg-white/15">▢</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭窗口（返回工资页面）"
            className="grid h-7 w-9 place-items-center text-sm hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 假 Ribbon */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-5 bg-[#f3f9f5] px-3 pt-1 text-xs text-neutral-600">
          {['文件', '开始', '插入', '页面布局', '公式', '数据', '审阅', '视图'].map((t, i) => (
            <span
              key={t}
              className={`pb-1.5 ${i === 1 ? 'border-b-2 border-[#217346] font-semibold text-[#217346]' : ''}`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 px-3 py-1.5 text-[11px] text-neutral-600">
          <span className="rounded border border-neutral-300 px-2 py-0.5">
            等线 <span className="text-neutral-400">▾</span>
          </span>
          <span className="rounded border border-neutral-300 px-2 py-0.5">
            11 <span className="text-neutral-400">▾</span>
          </span>
          <span className="font-bold">B</span>
          <span className="italic">I</span>
          <span className="underline">U</span>
          <span className="text-neutral-300">|</span>
          <span>Σ 自动求和</span>
          <span>填充颜色</span>
          <span>条件格式</span>
        </div>
      </div>

      {/* 假编辑栏 */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-2 py-1">
        <span className="w-16 rounded border border-neutral-300 px-2 py-0.5 text-center text-xs">
          G7
        </span>
        <span className="italic text-neutral-400">fx</span>
        <span className="flex-1 truncate text-xs text-neutral-700">
          =ROUND(F7/D7,4)
        </span>
      </div>

      {/* 表格 */}
      <div className="relative flex-1 overflow-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-6 w-10 border border-neutral-300 bg-neutral-100" />
              {cols.map((c, i) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 h-6 min-w-[88px] border border-neutral-300 bg-neutral-100 font-normal text-neutral-600"
                >
                  {String.fromCharCode(66 + i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 h-6 w-10 border border-neutral-300 bg-neutral-100 text-center text-neutral-600">
                  {ri + 2}
                </td>
                <td className="border border-neutral-300 px-1.5 text-neutral-700">{r.id}</td>
                <td className="border border-neutral-300 px-1.5 text-neutral-700">{r.name}</td>
                <td className="border border-neutral-300 px-1.5 text-neutral-600">{r.dept}</td>
                <td className="tnum border border-neutral-300 px-1.5 text-right text-neutral-700">
                  {r.q1.toLocaleString('zh-CN')}
                </td>
                <td className="tnum border border-neutral-300 px-1.5 text-right text-neutral-700">
                  {r.q2.toLocaleString('zh-CN')}
                </td>
                <td className="tnum border border-neutral-300 px-1.5 text-right text-neutral-700">
                  {r.q3.toLocaleString('zh-CN')}
                </td>
                <td
                  className={`tnum border-2 px-1.5 text-right ${
                    ri === 5 ? 'border-[#217346] font-semibold text-[#217346]' : 'border-neutral-300 text-neutral-700'
                  }`}
                >
                  {(r.rate * 100).toFixed(1)}%
                </td>
                <td className="tnum border border-neutral-300 px-1.5 text-right font-medium text-neutral-800">
                  {r.total.toLocaleString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 假状态栏 */}
      <div className="flex h-7 items-center justify-between border-t border-neutral-200 bg-neutral-100 px-3 text-[11px] text-neutral-600">
        <span>就绪</span>
        <span className="tnum">
          平均值: ¥281,904　计数: 18　求和: ¥5,074,272
        </span>
        <span>100% ▣▣</span>
      </div>

      {showHint && (
        <div className="animate-toast-in pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-neutral-900/85 px-4 py-2 text-xs text-white">
          别慌，这是假的报表 😎 按 Esc 或点右上角 ✕ 悄悄返回
        </div>
      )}
    </div>
  )
}
