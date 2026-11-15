// New game screen: callsign entry and campaign creation.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { CALLSIGN_MAX, CALLSIGN_MIN } from '../game/config'
import { isValidCallsign } from '../game/progression'
import { useGameStore } from '../game/store'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'

const HINT = `Use ${CALLSIGN_MIN} to ${CALLSIGN_MAX} characters. Letters, numbers, spaces, hyphens and underscores.`

export function NewGame() {
  const navigate = useNavigate()
  const newGame = useGameStore((state) => state.newGame)
  const [callsign, setCallsign] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = callsign.trim()
    if (!isValidCallsign(value)) {
      setError(HINT)
      return
    }
    setError('')
    newGame(value)
    navigate('/hub')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-6 py-12">
      <Panel eyebrow="Recruit intake" title="REGISTER CALLSIGN" tone="cyan">
        <p className="text-sm text-muted">
          NEXUS needs a name to bind this campaign to. Your callsign identifies your save on this device.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="callsign" className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
              Callsign
            </label>
            <input
              id="callsign"
              data-testid="input-callsign"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={CALLSIGN_MAX}
              value={callsign}
              onChange={(event) => {
                setCallsign(event.target.value)
                if (error) setError('')
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'callsign-error callsign-hint' : 'callsign-hint'}
              placeholder="e.g. Vega-7"
              className="mt-2 h-11 w-full rounded border border-border bg-panel2 px-3 font-mono text-sm text-text placeholder:text-muted/60 focus:border-cyan focus:outline-none"
            />
            <p id="callsign-hint" className="mt-2 text-xs text-muted">
              {HINT}
            </p>
            {error && (
              <p id="callsign-error" role="alert" className="mt-1 text-xs text-red">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <NeonButton type="submit" data-testid="btn-create-callsign">
              <UserPlus size={14} aria-hidden="true" />
              Initialize campaign
            </NeonButton>
            <NeonButton
              variant="ghost"
              data-testid="btn-back-title"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to title
            </NeonButton>
          </div>
        </form>
      </Panel>
    </main>
  )
}
