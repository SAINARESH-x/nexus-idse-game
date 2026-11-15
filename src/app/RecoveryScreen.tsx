// RecoveryScreen: shown when the stored save cannot be read; never a white page.
import { useState } from 'react'
import { clearCorruptSave, corruptSave } from '../game/persistence'
import { useGameStore } from '../game/store'
import { NeonButton } from '../ui/NeonButton'
import { downloadText } from '../pages/Settings'

export function RecoveryScreen({ onResolved }: { onResolved: () => void }) {
  const [raw] = useState(() => corruptSave() ?? '')
  return (
    <main id="main" className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded border border-amber/50 bg-panel p-8" role="alert">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Save recovery</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-widest text-text">Save data unreadable</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          NEXUS found a saved campaign in this browser but could not read it. It has not been changed. Export the raw data
          to keep a copy, then reset to start again, or try loading once more.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <NeonButton data-testid="recovery-export" onClick={() => downloadText('nexus-save-raw.txt', raw, 'text/plain')}>
            Export raw data
          </NeonButton>
          <NeonButton
            variant="danger"
            data-testid="recovery-reset"
            onClick={() => {
              clearCorruptSave()
              useGameStore.getState().resetAll()
              onResolved()
            }}
          >
            Reset
          </NeonButton>
          <NeonButton variant="ghost" data-testid="recovery-retry" onClick={() => window.location.reload()}>
            Try again
          </NeonButton>
        </div>
      </div>
    </main>
  )
}
