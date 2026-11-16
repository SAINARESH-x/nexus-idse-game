// App shell: HashRouter routes, per-route error boundary, save recovery gate, systems bridge and toasts.
import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { corruptSave } from '../game/persistence'
import { GridBackground } from '../ui/GridBackground'
import { ToastProvider } from '../ui/Toast'
import { Achievements } from '../pages/Achievements'
import { Ending } from '../pages/Ending'
import { Hub } from '../pages/Hub'
import { Briefing } from '../pages/level/Briefing'
import { Debrief } from '../pages/level/Debrief'
import { LevelGate } from '../pages/level/LevelGate'
import { Play } from '../pages/level/Play'
import { NewGame } from '../pages/NewGame'
import { NotFound } from '../pages/NotFound'
import { Settings } from '../pages/Settings'
import { Title } from '../pages/Title'
import { ToolBay } from '../pages/ToolBay'
import { ErrorBoundary } from './ErrorBoundary'
import { RecoveryScreen } from './RecoveryScreen'
import { SmallScreenNotice } from './SmallScreenNotice'
import { SystemsBridge } from './SystemsBridge'

// DEV_ONLY: developer tools are code-split and only referenced in dev builds, so production bundles exclude them.
const DevPanel = lazy(() => import('./DevPanel').then((m) => ({ default: m.DevPanel })))
const DevUi = import.meta.env.DEV ? lazy(() => import('../pages/DevUi').then((m) => ({ default: m.DevUi }))) : null
const DevEngine = import.meta.env.DEV ? lazy(() => import('../pages/DevEngine').then((m) => ({ default: m.DevEngine }))) : null

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'NEXUS'],
  [/^\/new/, 'New game · NEXUS'],
  [/^\/hub/, 'Campaign hub · NEXUS'],
  [/^\/level\/(\d)\/play/, 'Mission · NEXUS'],
  [/^\/level\/(\d)\/debrief/, 'Debrief · NEXUS'],
  [/^\/level\/(\d)/, 'Briefing · NEXUS'],
  [/^\/achievements/, 'Achievements · NEXUS'],
  [/^\/settings/, 'Settings · NEXUS'],
  [/^\/toolbay/, 'Tool Bay · NEXUS'],
  [/^\/ending/, 'Finale · NEXUS'],
]

function RoutedApp() {
  const location = useLocation()
  useEffect(() => {
    const match = TITLES.find(([pattern]) => pattern.test(location.pathname))
    document.title = match ? match[1] : 'NEXUS'
  }, [location.pathname])

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <div key={location.pathname} className="nx-route">
        <Routes>
          <Route path="/" element={<Title />} />
          <Route path="/new" element={<NewGame />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/level/:id" element={<LevelGate />}>
            <Route index element={<Briefing />} />
            <Route path="play" element={<Play />} />
            <Route path="debrief" element={<Debrief />} />
          </Route>
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/toolbay" element={<ToolBay />} />
          <Route path="/ending" element={<Ending />} />
          {DevUi && (
            // DEV_ONLY
            <Route path="/dev/ui" element={<Suspense fallback={null}><DevUi /></Suspense>} />
          )}
          {DevEngine && (
            // DEV_ONLY
            <Route path="/dev/engine" element={<Suspense fallback={null}><DevEngine /></Suspense>} />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export function App() {
  const [recovering, setRecovering] = useState(() => corruptSave() !== null)
  const [showDevPanel, setShowDevPanel] = useState(import.meta.env.DEV)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.metaKey &&
        event.key.toLowerCase() === 'd' &&
        !event.repeat
      ) {
        event.preventDefault()
        setShowDevPanel((current) => !current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  return (
    <ErrorBoundary>
      <ToastProvider>
        <a
          href="#main"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('main')?.focus()
            document.querySelector('main')?.scrollIntoView()
          }}
          className="sr-only z-[80] rounded bg-panel px-3 py-2 text-cyan focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>
        <SystemsBridge />
        <SmallScreenNotice />
        {recovering ? (
          <RecoveryScreen onResolved={() => setRecovering(false)} />
        ) : (
          <HashRouter>
            <GridBackground />
            <RoutedApp />
            {showDevPanel && (
              <Suspense fallback={null}>
                <DevPanel onHide={() => setShowDevPanel(false)} />
              </Suspense>
            )}
          </HashRouter>
        )}
      </ToastProvider>
    </ErrorBoundary>
  )
}
