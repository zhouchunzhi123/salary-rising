/**
 * 赚钱里程碑：金额跨过特定整数元时给一点轻量正反馈。
 * 每个里程碑每天只触发一次，不打断用户。
 */

export interface Milestone {
  id: string
  amount: number
  text: string
}

export const MILESTONES: Milestone[] = [
  { id: 'm-100', amount: 100, text: '今天已经赚到 100 块了，奶茶钱有了' },
  { id: 'm-200', amount: 200, text: '不错，200 块已经到手' },
  { id: 'm-500', amount: 500, text: '今天干得不错，500 块入账' },
  { id: 'm-1000', amount: 1000, text: '单日破千，今天的你闪闪发光' },
]

/**
 * 找到本次金额变化中新跨过的、尚未触发过的最高优先级里程碑。
 * @param prev 上一帧金额
 * @param next 当前帧金额
 * @param firedIds 今天已经触发过的 id
 */
export function crossedMilestone(
  prev: number,
  next: number,
  firedIds: string[],
): Milestone | null {
  let hit: Milestone | null = null
  for (const m of MILESTONES) {
    if (!firedIds.includes(m.id) && prev < m.amount && next >= m.amount) {
      if (!hit || m.amount > hit.amount) hit = m
    }
  }
  return hit
}
