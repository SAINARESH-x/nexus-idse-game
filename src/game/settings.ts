// Player settings (pure helpers + DOM application): sound, volume, reduced motion, text size and accent theme.
export type MotionSetting = 'auto' | 'on' | 'off'
export type TextSize = 100 | 115

export interface Settings {
  volume: number
  reducedMotion: MotionSetting
  textSize: TextSize
}

export const DEFAULT_SETTINGS: Settings = { volume: 0.6, reducedMotion: 'auto', textSize: 100 }

export function normalizeSettings(raw: unknown): Settings {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const volume =
    typeof value.volume === 'number' && Number.isFinite(value.volume)
      ? Math.min(1, Math.max(0, value.volume))
      : DEFAULT_SETTINGS.volume
  const reducedMotion: MotionSetting =
    value.reducedMotion === 'on' || value.reducedMotion === 'off' || value.reducedMotion === 'auto'
      ? value.reducedMotion
      : DEFAULT_SETTINGS.reducedMotion
  const textSize: TextSize = value.textSize === 115 ? 115 : 100
  return { volume, reducedMotion, textSize }
}

/** Accent themes: id -> RGB triplet for the --nx-cyan-rgb variable. 'nexus' (cyan) is free. */
export const THEME_ACCENTS: Record<string, { name: string; rgb: string }> = {
  nexus: { name: 'NEXUS Cyan', rgb: '0 229 255' },
  'theme-magenta': { name: 'Magenta Grid', rgb: '255 43 214' },
  'theme-amber': { name: 'Amber Terminal', rgb: '255 176 32' },
  'theme-matrix': { name: 'Matrix Green', rgb: '61 255 154' },
}

let motionOverride: MotionSetting = 'auto'

/** True when animations should show final values immediately. */
export function motionReduced(): boolean {
  if (motionOverride === 'on') return true
  if (motionOverride === 'off') return false
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  } catch {
    return false
  }
}

/** Applies settings and theme to the document root (no-op outside a browser). */
export function applySettings(settings: Settings, theme: string): void {
  motionOverride = settings.reducedMotion
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('nx-reduce-motion', motionReduced())
  root.style.fontSize = settings.textSize === 115 ? '115%' : ''
  const accent = THEME_ACCENTS[theme] ?? THEME_ACCENTS.nexus
  root.style.setProperty('--nx-cyan-rgb', accent.rgb)
  root.style.setProperty('--nx-cyan', `rgb(${accent.rgb})`)
}
