import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from '@/hooks/useSettings'
import { AppShell } from '@/components/AppShell'
import Landing from '@/pages/Landing'
import SettingsPage from '@/pages/Settings'
import EarningPage from '@/pages/Earning'
import HistoryPage from '@/pages/History'
import SavingsPage from '@/pages/Savings'
import FullscreenPage from '@/pages/Fullscreen'

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/earn" element={<EarningPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/savings" element={<SavingsPage />} />
          </Route>
          <Route path="/fullscreen" element={<FullscreenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  )
}
