import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// 检测是否在 Tauri 桌面环境中
declare const __TAURI_INTERNALS__: unknown
const isTauri = typeof __TAURI_INTERNALS__ !== 'undefined'

// PWA：仅在浏览器环境中注册 Service Worker，Tauri 中跳过
if (!isTauri) {
  registerSW({ immediate: true })
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('找不到 #root 挂载点')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
