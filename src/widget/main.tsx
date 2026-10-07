import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import WidgetApp from './WidgetApp'
import { SettingsProvider } from '@/hooks/useSettings'
import '../index.css'

const rootEl = document.getElementById('widget-root')
if (!rootEl) throw new Error('找不到 #widget-root 挂载点')

// React 渲染错误边界 → 红底显示错误堆栈
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            margin: 0,
            padding: 8,
            color: '#e11d48',
            background: '#fff1f2',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
          }}
        >
          {this.state.error.stack || this.state.error.message}
        </pre>
      )
    }
    return this.props.children
  }
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <WidgetApp />
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
)
