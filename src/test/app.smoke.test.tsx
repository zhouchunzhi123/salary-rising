import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/App'

describe('整站冒烟测试', () => {
  it('应用可挂载，首屏展示核心文案与实时金额', async () => {
    render(<App />)
    expect(await screen.findByText(/你的工资/)).toBeTruthy()
    expect(screen.getByText(/每一秒都在增长/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /开始赚钱|继续赚钱/ })).toBeTruthy()
  })
})
