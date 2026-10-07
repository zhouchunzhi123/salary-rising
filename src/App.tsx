import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/hooks/useSettings'
import { AppShell } from '@/components/AppShell'
import Landing from '@/pages/Landing'
import SettingsPage from '@/pages/Settings'
import EarningPage from '@/pages/Earning'
import HistoryPage from '@/pages/History'
import SavingsPage from '@/pages/Savings'
import FullscreenPage from '@/pages/Fullscreen'
import DownloadPage from '@/pages/Download'

// 检测是否在 Tauri 桌面环境中
declare const __TAURI_INTERNALS__: unknown
const isTauri = typeof __TAURI_INTERNALS__ !== 'undefined'

// Tauri 中使用 HashRouter（tauri://localhost 协议不支持 BrowserRouter history）
const Router = isTauri ? HashRouter : BrowserRouter

export default function App() {
  return (
    <SettingsProvider>
      <Router basename={isTauri ? undefined : import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/earn" element={<EarningPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/savings" element={<SavingsPage />} />
            <Route path="/download" element={<DownloadPage />} />
          </Route>
          <Route path="/fullscreen" element={<FullscreenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </SettingsProvider>
  )
}
