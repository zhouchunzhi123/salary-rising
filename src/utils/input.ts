/**
 * 用户输入清洗工具，防止畸形数字进入计算。
 */

/**
 * 清洗工资类数字输入：
 * - 仅保留数字与一个小数点
 * - 去除多余前导零（但允许 "0." 开头）
 * - 限制整数位 12 位、小数位 4 位，避免超大数导致排版溢出
 * 返回可直接用于 input value 的字符串。
 */
export function sanitizeMoneyInput(raw: string): string {
  if (!raw) return ''
  // 1. 移除非数字与非小数点字符
  let v = raw.replace(/[^\d.]/g, '')
  // 2. 只保留第一个小数点
  const firstDot = v.indexOf('.')
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '')
  }
  // 3. 去掉前导零（但保留 "0" 和 "0."）
  if (v.length > 1 && v[0] === '0' && v[1] !== '.') {
    v = v.replace(/^0+/, '')
    if (v === '' || v[0] === '.') v = '0' + v
  }
  // 4. 限制整数位 12 位、小数位 4 位
  const [intPart, decPart = ''] = v.split('.')
  const intCapped = intPart.slice(0, 12)
  const decCapped = decPart.slice(0, 4)
  return v.includes('.') ? `${intCapped}.${decCapped}` : intCapped
}
