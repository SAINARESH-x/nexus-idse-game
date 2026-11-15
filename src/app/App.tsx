// App shell: HashRouter routes wrapped in an error boundary and toast provider.
import { HashRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { DevPanel } from './DevPanel'
import { GridBackground } from '../ui/GridBackground'
import { ToastProvider } from '../ui/Toast'
import { Title } from '../pages/Title'
import { NewGame } from '../pages/NewGame'
import { Hub } from '../pages/Hub'
import { Briefing } from '../pages/level/Briefing'
import { Debrief } from '../pages/level/Debrief'
import { LevelGate } from '../pages/level/LevelGate'
import { Play } from '../pages/level/Play'
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
            <Route path="/new" element={<NewGame />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/level/:id" element={<LevelGate />}>
              <Route index element={<Briefing />} />
              <Route path="play" element={<Play />} />
              <Route path="debrief" element={<Debrief />} />
            </Route>
            <Route path="/dev/ui" element={<DevUi />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <DevPanel />
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}
