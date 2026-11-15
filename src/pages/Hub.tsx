// Hub placeholder: campaign map arrives in a later phase.
import { Link } from 'react-router-dom'
import { Panel } from '../ui/Panel'
import { Badge } from '../ui/Badge'
import { NeonButton } from '../ui/NeonButton'

export function Hub() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
      <Panel eyebrow="Campaign hub" title="HUB" action={<Badge tone="amber">Offline</Badge>}>
        <p className="text-sm text-muted">
          The mission map is under construction. Level selection, XP and story fragments arrive in later phases.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/">
            <NeonButton variant="ghost" size="sm">
              Return to title
            </NeonButton>
          </Link>
          <Link to="/dev/ui">
            <NeonButton size="sm">Open style guide</NeonButton>
          </Link>
        </div>
      </Panel>
    </main>
  )
}
