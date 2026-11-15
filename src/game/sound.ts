// Sound: synthesised Web Audio tones (no audio files). Silent until the first user gesture and when sound is off.
export type SoundName = 'click' | 'success' | 'error' | 'rankUp' | 'achievement' | 'reveal'

interface ToneStep {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
}

const SOUNDS: Record<SoundName, ToneStep[]> = {
  click: [{ freq: 880, duration: 0.025, type: 'square', gain: 0.12 }],
  success: [
    { freq: 660, duration: 0.08 },
    { freq: 990, duration: 0.12 },
  ],
  error: [
    { freq: 220, duration: 0.12, type: 'sawtooth', gain: 0.25 },
    { freq: 165, duration: 0.16, type: 'sawtooth', gain: 0.25 },
  ],
  rankUp: [
    { freq: 523, duration: 0.1 },
    { freq: 659, duration: 0.1 },
    { freq: 784, duration: 0.1 },
    { freq: 1047, duration: 0.22 },
  ],
  achievement: [
    { freq: 784, duration: 0.09 },
    { freq: 1175, duration: 0.18 },
  ],
  reveal: [{ freq: 440, duration: 0.3, type: 'triangle', gain: 0.4 }],
}

let context: AudioContext | null = null
let unlocked = false
let enabled = true
let volume = 0.6

export function configureSound(options: { enabled: boolean; volume: number }): void {
  enabled = options.enabled
  volume = Math.min(1, Math.max(0, Number.isFinite(options.volume) ? options.volume : 0))
}

/** Marks that the user has interacted; the AudioContext may now be created. */
export function unlockAudio(): void {
  unlocked = true
}

function audioContext(): AudioContext | null {
  if (!unlocked) return null
  if (context) return context
  try {
    const Ctor =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined
    if (!Ctor) return null
    context = new Ctor()
    return context
  } catch {
    return null
  }
}

/** Plays a named tone. Never throws (missing AudioContext, jsdom, autoplay rules). */
export function playSound(name: SoundName): boolean {
  if (!enabled || volume === 0) return false
  const ctx = audioContext()
  if (!ctx) return false
  try {
    let at = ctx.currentTime
    for (const step of SOUNDS[name]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = step.type ?? 'sine'
      osc.frequency.value = step.freq
      const peak = 0.2 * volume * (step.gain ?? 1)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + step.duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(at)
      osc.stop(at + step.duration + 0.02)
      at += step.duration
    }
    return true
  } catch {
    return false
  }
}

/** Test helper. */
export function resetSoundForTest(): void {
  context = null
  unlocked = false
  enabled = true
  volume = 0.6
}
