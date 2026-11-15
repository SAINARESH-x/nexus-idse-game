// Title screen: NEXUS wordmark, animated background and campaign entry points.
import { useNavigate } from 'react-router-dom'
import { Radio, Settings } from 'lucide-react'
import { ParticleField } from '../components/ParticleField'
import { Badge } from '../ui/Badge'
import { GlitchTitle } from '../ui/GlitchTitle'
import { NeonButton } from '../ui/NeonButton'
import { Tooltip } from '../ui/Tooltip'

export function Title() {
  const navigate = useNavigate()

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <ParticleField className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,7,13,0.55)_70%,rgba(5,7,13,0.9)_100%)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan/50 bg-cyan/10 text-cyan">
            <Radio size={16} aria-hidden="true" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">Nexus terminal</span>
        </div>
        <Badge tone="green">System standby</Badge>
      </header>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.42em] text-cyan/80">
          Campus intelligence restored
        </p>
        <GlitchTitle size="xl">NEXUS</GlitchTitle>
        <p className="mt-6 max-w-xl text-balance text-sm text-muted sm:text-base">
          Introduction to Data Science for Engineers
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted/70">
          Seven systems · one shattered mind
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
          <NeonButton
            size="lg"
            fullWidth
            data-testid="btn-new-game"
            onClick={() => navigate('/hub')}
            aria-label="Start a new game"
          >
            New game
          </NeonButton>
          <Tooltip label="No saved game" className="w-full">
            <NeonButton
              size="lg"
              variant="ghost"
              fullWidth
              disabled
              tooltip="No saved game"
              data-testid="btn-continue"
            >
              Continue
            </NeonButton>
          </Tooltip>
          <Tooltip label="Settings unlock in a later phase" className="w-full">
            <NeonButton
              size="md"
              variant="ghost"
              fullWidth
              disabled
              tooltip="Settings unlock in a later phase"
              data-testid="btn-settings"
            >
              <Settings size={14} aria-hidden="true" />
              Settings
            </NeonButton>
          </Tooltip>
        </div>
      </section>

      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 border-t border-border/60 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:flex-row sm:px-10">
        <span>Semester 5 - IDSE</span>
        <span className="text-muted/60">Build 0.1 · offline-ready</span>
      </footer>
    </main>
  )
}
