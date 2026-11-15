// DevPanel: floating developer controls gated by DEV or the nexus-dev flag.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bug, CheckCircle2, EyeOff, RotateCcw, Unlock, Zap } from 'lucide-react'
import { DEV_DEMO_AGGREGATE, LEVEL_IDS } from '../game/config'
import { parseLevelId } from '../game/levels/registry'
import { rankForXp } from '../game/progression'
import { useGameStore } from '../game/store'
import { NeonButton } from '../ui/NeonButton'
import { useToast } from '../ui/Toast'
import { isDevEnabled } from './dev'

export function DevPanel() {
  const [hidden, setHidden] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { push } = useToast()
  const levels = useGameStore((state) => state.levels)
  const unlockAll = useGameStore((state) => state.unlockAll)
  const addXp = useGameStore((state) => state.addXp)
  const resetAll = useGameStore((state) => state.resetAll)
  const completeMission = useGameStore((state) => state.completeMission)

  // DEV_ONLY: the whole panel is absent from production unless nexus-dev=1.
  if (!isDevEnabled() || hidden) return null

  const match = /^\/level\/(\d+)/.exec(location.pathname)
  const routeLevel = parseLevelId(match?.[1])
  const unlocked = LEVEL_IDS.filter((id) => levels[id].unlocked)
  const fallback =
    unlocked.find((id) => !levels[id].completed) ?? unlocked[unlocked.length - 1] ?? 1
  const currentLevel = routeLevel ?? fallback

  const handleUnlockAll = () => {
    unlockAll()
    push({ message: 'All seven levels unlocked.', tone: 'success' })
  }

  const handleAddXp = () => {
    addXp(500)
    const xp = useGameStore.getState().profile.xp
    push({ message: `+500 XP. Current rank: ${rankForXp(xp).name}.`, tone: 'success' })
  }

  const handleComplete = () => {
    const award = completeMission(currentLevel, DEV_DEMO_AGGREGATE)
    push({
      message:
        award.xpGained > 0
          ? `Level ${currentLevel} complete: +${award.xpGained} XP.`
          : `Level ${currentLevel} replayed: no XP improvement.`,
      tone: award.xpGained > 0 ? 'success' : 'info',
    })
    navigate(`/level/${currentLevel}/debrief`)
  }

  const handleReset = () => {
    navigate('/')
    resetAll()
    push({ message: 'Save cleared. Campaign reset.', tone: 'warning' })
  }

  return (
    <aside
      aria-label="Developer tools"
      data-testid="dev-panel"
      className="fixed bottom-4 left-4 z-40 w-60 rounded border border-magenta/50 bg-panel/95 p-3 shadow-glow-magenta backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-magenta">
          <Bug size={12} aria-hidden="true" />
          Dev panel
        </span>
        <span className="font-mono text-[10px] text-muted">L{currentLevel}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <NeonButton size="sm" variant="ghost" data-testid="dev-unlock-all" onClick={handleUnlockAll}>
          <Unlock size={12} aria-hidden="true" />
          Unlock all levels
        </NeonButton>
        <NeonButton size="sm" variant="ghost" data-testid="dev-add-xp" onClick={handleAddXp}>
          <Zap size={12} aria-hidden="true" />
          Add 500 XP
        </NeonButton>
        <NeonButton size="sm" variant="ghost" data-testid="dev-complete-level" onClick={handleComplete}>
          <CheckCircle2 size={12} aria-hidden="true" />
          Complete current level (dev)
        </NeonButton>
        <NeonButton size="sm" variant="danger" data-testid="dev-reset" onClick={handleReset}>
          <RotateCcw size={12} aria-hidden="true" />
          Reset save
        </NeonButton>
        <NeonButton size="sm" variant="ghost" data-testid="dev-hide" onClick={() => setHidden(true)}>
          <EyeOff size={12} aria-hidden="true" />
          Hide panel
        </NeonButton>
      </div>
    </aside>
  )
}
