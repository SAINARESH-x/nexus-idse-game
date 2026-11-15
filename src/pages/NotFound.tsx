// NotFound: themed 404 screen.
import { Link } from 'react-router-dom'
import { GlitchTitle } from '../ui/GlitchTitle'
import { NeonButton } from '../ui/NeonButton'

export function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-magenta">Route not found</p>
      <div className="mt-3">
        <GlitchTitle size="md">404</GlitchTitle>
      </div>
      <h1 className="mt-4 font-display text-xl uppercase tracking-[0.2em] text-text">Sector does not exist</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        This corridor was never built. The map ends here, recruit.
      </p>
      <div className="mt-8">
        <Link to="/">
          <NeonButton>Return to title</NeonButton>
        </Link>
      </div>
    </main>
  )
}
