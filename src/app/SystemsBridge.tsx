// SystemsBridge: applies settings and theme, configures sound, toasts achievements and storage problems.
import { useEffect, useRef } from 'react'
import { achievementsFor } from '../game/achievements'
import { LEVELS } from '../game/levels/registry'
import { onStorageError, storageAvailable } from '../game/persistence'
import { applySettings, normalizeSettings } from '../game/settings'
import { configureSound, playSound, unlockAudio } from '../game/sound'
import { useGameStore } from '../game/store'
import { useToast } from '../ui/Toast'

export function SystemsBridge() {
  const { push } = useToast()
  const settings = useGameStore((state) => state.settings)
  const theme = useGameStore((state) => state.profile.theme)
  const soundOn = useGameStore((state) => state.profile.soundOn)
  const recent = useGameStore((state) => state.recentAchievements)
  const clearRecent = useGameStore((state) => state.clearRecentAchievements)
  const quotaWarned = useRef(false)

  useEffect(() => {
    const normalized = normalizeSettings(settings)
    applySettings(normalized, theme)
    configureSound({ enabled: soundOn, volume: normalized.volume })
  }, [settings, soundOn, theme])

  useEffect(() => {
    if (recent.length === 0) return
    const titles = new Map(achievementsFor(LEVELS).map((item) => [item.id, item.title]))
    for (const id of recent) push({ message: `ACHIEVEMENT UNLOCKED: ${titles.get(id) ?? id}`, tone: 'success', duration: 5000 })
    playSound('achievement')
    clearRecent()
  }, [clearRecent, push, recent])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    const stop = onStorageError((kind) => {
      if (kind === 'quota' && !quotaWarned.current) {
        quotaWarned.current = true
        push({ message: 'Browser storage is full: recent progress may not be saved.', tone: 'warning', duration: 0 })
      }
    })
    return () => {
      stop()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [push])

  return storageAvailable() ? null : (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] border-b border-amber/50 bg-amber/15 px-4 py-1.5 text-center text-xs text-amber" data-testid="storage-banner">
      Progress will not be saved in this browser mode.
    </div>
  )
}
