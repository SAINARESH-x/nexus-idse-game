// Floating developer controls for local and production demo workflows.

import { useLocation, useNavigate } from 'react-router-dom'
import { Bug, CheckCircle2, Eye, EyeOff, Gift, RotateCcw, Unlock, Zap } from 'lucide-react'
import { DEV_DEMO_AGGREGATE, LEVEL_IDS } from '../game/config'
import { LEVELS, parseLevelId } from '../game/levels/registry'
import { rankForXp } from '../game/progression'
import { useGameStore } from '../game/store'
import { NeonButton } from '../ui/NeonButton'
import { useToast } from '../ui/Toast'

export function DevPanel({ onHide }: { onHide: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { push } = useToast()

  const levels = useGameStore((state) => state.levels)
  const unlockAll = useGameStore((state) => state.unlockAll)
  const addXp = useGameStore((state) => state.addXp)
  const resetAll = useGameStore((state) => state.resetAll)
  const completeMission = useGameStore((state) => state.completeMission)
  const completeSideOp = useGameStore((state) => state.completeSideOp)
  const completeBonus = useGameStore((state) => state.completeBonus)
  const recordStats = useGameStore((state) => state.recordStats)
  const completeAllLevels = useGameStore((state) => state.completeAllLevels)
  const addAdaptiveEntry = useGameStore((state) => state.addAdaptiveEntry)
  const history = useGameStore((state) => state.adaptive.history)

  const match = /^\/level\/(\d+)/.exec(location.pathname)
  const routeLevel = parseLevelId(match?.[1])
  const unlocked = LEVEL_IDS.filter((id) => levels[id].unlocked)
  const fallback =
    unlocked.find((id) => !levels[id].completed) ?? unlocked[unlocked.length - 1] ?? 1
  const currentLevel = routeLevel ?? fallback
  const hiddenBonusesRevealed = LEVEL_IDS.every(
    (id) => levels[id].stats.devRevealHiddenBonuses === true,
  )

  const buttonClass =
    'h-auto min-h-8 min-w-0 whitespace-normal px-2 py-2 text-center leading-tight'

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

  const handleCompleteAllLevels = () => {
    completeAllLevels()
    push({ message: 'All seven main missions completed.', tone: 'success' })
    navigate('/hub')
  }

  const handleCompleteAllSideOps = () => {
    let count = 0
    for (const level of LEVELS) {
      for (const sideOp of level.sideOps) {
        completeSideOp(level.id, sideOp.id)
        count += 1
      }
    }
    push({ message: `All ${count} side operations completed.`, tone: 'success' })
  }

  const handleCompleteAllBonuses = () => {
    let count = 0
    for (const level of LEVELS) {
      for (const bonus of level.bonuses) {
        completeBonus(level.id, bonus.id)
        count += 1
      }
    }
    push({ message: `All ${count} bonuses completed, including hidden bonuses.`, tone: 'success' })
  }

  const handleToggleHiddenBonuses = () => {
    const reveal = !hiddenBonusesRevealed
    for (const id of LEVEL_IDS) {
      recordStats(id, { devRevealHiddenBonuses: reveal })
    }
    push({
      message: reveal ? 'Hidden bonus descriptions revealed.' : 'Hidden bonus descriptions concealed.',
      tone: 'info',
    })
  }

  const addL4Run = (strong: boolean) => {
    const last = [...history].reverse().find((entry) => entry.levelId === 4)
    addAdaptiveEntry({
      levelId: 4,
      tier: last?.tier ?? 'assisted',
      composite: strong ? 92 : 40,
      hintsUsed: strong ? 0 : 5,
      mistakes: strong ? 0 : 6,
    })
    push({ message: `L4 adaptive: ${strong ? 'strong' : 'weak'} run added.`, tone: 'info' })
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
      className="fixed bottom-4 left-4 z-40 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded border border-magenta/50 bg-panel/95 p-3 shadow-glow-magenta backdrop-blur sm:w-80"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-magenta">
          <Bug size={12} aria-hidden="true" />
          Dev panel
        </span>
        <span className="font-mono text-[10px] text-muted">L{currentLevel}</span>
      </div>

      <div className="space-y-3">
        <section className="space-y-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Campaign</p>
          <div className="flex flex-col gap-1.5">
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-unlock-all" onClick={handleUnlockAll}>
              <Unlock size={12} aria-hidden="true" /> Unlock all levels
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-add-xp" onClick={handleAddXp}>
              <Zap size={12} aria-hidden="true" /> Add 500 XP
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-complete-level" onClick={handleComplete}>
              <CheckCircle2 size={12} aria-hidden="true" /> Complete current level
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-complete-all" onClick={handleCompleteAllLevels}>
              <CheckCircle2 size={12} aria-hidden="true" /> Complete all main missions
            </NeonButton>
          </div>
        </section>

        <section className="space-y-1.5 border-t border-white/10 pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Objectives and rewards</p>
          <div className="flex flex-col gap-1.5">
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-complete-all-side-ops" onClick={handleCompleteAllSideOps}>
              <CheckCircle2 size={12} aria-hidden="true" /> Complete all side operations
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-complete-all-bonuses" onClick={handleCompleteAllBonuses}>
              <Gift size={12} aria-hidden="true" /> Complete all bonus missions
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-reveal-hidden-bonuses" onClick={handleToggleHiddenBonuses}>
              {hiddenBonusesRevealed ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
              {hiddenBonusesRevealed ? 'Hide hidden bonus descriptions' : 'Reveal hidden bonus descriptions'}
            </NeonButton>
          </div>
        </section>

        <section className="space-y-1.5 border-t border-white/10 pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Adaptive testing · Level 4</p>
          <div className="grid grid-cols-2 gap-1.5">
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-l4-strong" onClick={() => addL4Run(true)}>
              L4 strong
            </NeonButton>
            <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-l4-weak" onClick={() => addL4Run(false)}>
              L4 weak
            </NeonButton>
          </div>
        </section>

        <section className="space-y-1.5 border-t border-white/10 pt-3">
          <NeonButton className={buttonClass} fullWidth size="sm" variant="danger" data-testid="dev-reset" onClick={handleReset}>
            <RotateCcw size={12} aria-hidden="true" /> Reset save
          </NeonButton>
          <NeonButton className={buttonClass} fullWidth size="sm" variant="ghost" data-testid="dev-hide" onClick={onHide}>
            <EyeOff size={12} aria-hidden="true" /> Hide panel
          </NeonButton>
        </section>
      </div>
    </aside>
  )
}
