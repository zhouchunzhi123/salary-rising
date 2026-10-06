import { beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// jsdom 不提供 requestAnimationFrame 时的兜底（用 setTimeout 模拟一帧）
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 16) as unknown as number
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id)
}

// 每个用例前清空本地存储
beforeEach(() => {
  window.localStorage.clear()
})
