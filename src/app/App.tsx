// App shell: HashRouter routes wrapped in an error boundary and toast provider.
import { HashRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { GridBackground } from '../ui/GridBackground'
import { ToastProvider } from '../ui/Toast'
import { Title } from '../pages/Title'
import { Hub } from '../pages/Hub'
import { DevUi } from '../pages/DevUi'
import { NotFound } from '../pages/NotFound'

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <HashRouter>
          <GridBackground />
          <Routes>
            <Route path="/" element={<Title />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/dev/ui" element={<DevUi />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
