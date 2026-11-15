// LevelGate: validates the level route and redirects locked or in-development levels to the hub.
import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { inDevelopmentMessage, isLevelInDevelopment } from '../../game/levels/availability'
import { levelDefinition, parseLevelId } from '../../game/levels/registry'
import { useGameStore } from '../../game/store'
import type { LevelDefinition, LevelId } from '../../game/types'
import { useToast } from '../../ui/Toast'
import { NotFound } from '../NotFound'

export interface LevelContext {
  levelId: LevelId
  level: LevelDefinition
}

export function useLevelContext(): LevelContext {
  return useOutletContext<LevelContext>()
}

export function LevelGate() {
  const { id } = useParams()
  const levelId = parseLevelId(id)
  const navigate = useNavigate()
  const { push } = useToast()
  const hasSave = useGameStore((state) => state.profile.callsign.length > 0)
  const unlocked = useGameStore((state) => (levelId ? state.levels[levelId].unlocked : false))
  const inDevelopment = levelId !== null && isLevelInDevelopment(levelId)
  const notified = useRef(false)

  useEffect(() => {
    if (levelId === null || notified.current) return
    if (!hasSave) {
      notified.current = true
      push({ message: 'No active campaign. Create a callsign to begin.', tone: 'info' })
      navigate('/hub', { replace: true })
      return
    }
    // Checked before the XP lock so even a dev-unlocked save cannot enter unfinished levels.
    if (inDevelopment) {
      notified.current = true
      push({ message: inDevelopmentMessage(levelId), tone: 'info' })
      navigate('/hub', { replace: true })
      return
    }
    if (!unlocked) {
      notified.current = true
      push({
        message: `Level ${levelId} is locked. Complete Level ${levelId - 1} first.`,
        tone: 'warning',
      })
      navigate('/hub', { replace: true })
    }
  }, [hasSave, inDevelopment, levelId, navigate, push, unlocked])

  if (levelId === null) return <NotFound />

  if (!hasSave || inDevelopment || !unlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded border border-border bg-panel px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <Lock size={14} aria-hidden="true" />
          Verifying clearance…
        </div>
      </main>
    )
  }

  return <Outlet context={{ levelId, level: levelDefinition(levelId) } satisfies LevelContext} />
}
