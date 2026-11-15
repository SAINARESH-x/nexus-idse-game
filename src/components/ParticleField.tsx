// ParticleField: cheap deterministic canvas starfield that pauses when the tab is hidden.
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: 'cyan' | 'magenta'
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let running = true
    let last = performance.now()

    const rebuild = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const random = mulberry32(0x17e5)
      const count = Math.min(90, Math.max(30, Math.round((width * height) / 22000)))
      particles = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        vx: (random() - 0.5) * 12,
        vy: (random() - 0.5) * 12,
        r: 0.6 + random() * 1.4,
        hue: random() > 0.82 ? 'magenta' : 'cyan',
      }))
      draw()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        if (!p) continue
        for (let j = i + 1; j < particles.length; j += 1) {
          const q = particles[j]
          if (!q) continue
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.hypot(dx, dy)
          if (dist < 110) {
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - dist / 110) * 0.12})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
      }
      for (const p of particles) {
        ctx.fillStyle = p.hue === 'cyan' ? 'rgba(0, 229, 255, 0.65)' : 'rgba(255, 43, 214, 0.55)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = (now: number) => {
      if (!running) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10
      }
      draw()
      frame = requestAnimationFrame(step)
    }

    const start = () => {
      if (reduced || running) return
      running = true
      last = performance.now()
      frame = requestAnimationFrame(step)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    rebuild()
    if (!reduced) frame = requestAnimationFrame(step)

    window.addEventListener('resize', rebuild)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      window.removeEventListener('resize', rebuild)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />
}
