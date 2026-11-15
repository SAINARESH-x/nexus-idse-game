// DevUi: style guide for every design-system component and the NEXUS palette.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Cpu, Database, ShieldCheck } from 'lucide-react'
import {
  Badge,
  GlitchTitle,
  Kbd,
  Modal,
  NeonButton,
  Panel,
  ProgressBar,
  Stat,
  Tabs,
  Tooltip,
  useToast,
} from '../ui'
import type { BadgeTone } from '../ui'

const palette = [
  { name: 'bg', hex: '#05070D', className: 'bg-bg' },
  { name: 'panel', hex: '#0B1020', className: 'bg-panel' },
  { name: 'panel2', hex: '#111830', className: 'bg-panel2' },
  { name: 'border', hex: '#1E2A4A', className: 'bg-border' },
  { name: 'text', hex: '#E6ECFF', className: 'bg-text' },
  { name: 'muted', hex: '#8A97B8', className: 'bg-muted' },
  { name: 'cyan', hex: '#00E5FF', className: 'bg-cyan' },
  { name: 'magenta', hex: '#FF2BD6', className: 'bg-magenta' },
  { name: 'amber', hex: '#FFB020', className: 'bg-amber' },
  { name: 'green', hex: '#3DFF9A', className: 'bg-green' },
  { name: 'red', hex: '#FF4D6D', className: 'bg-red' },
  { name: 'violet', hex: '#9B7BFF', className: 'bg-violet' },
] as const

const tones: BadgeTone[] = ['cyan', 'green', 'amber', 'red', 'magenta', 'violet', 'muted']

const tabs = [
  { id: 'overview', label: 'Overview', content: <p className="text-sm text-muted">Tab panels share one active state.</p> },
  { id: 'data', label: 'Data', content: <p className="text-sm text-muted">Arrow keys move between tabs.</p> },
  { id: 'notes', label: 'Notes', content: <p className="text-sm text-muted">Home and End jump to the edges.</p> },
]

export function DevUi() {
  const [modalOpen, setModalOpen] = useState(false)
  const { push } = useToast()

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan">Dev only · style guide</p>
          <h1 className="mt-2 font-display text-3xl uppercase tracking-[0.18em] text-text">UI Kit</h1>
        </div>
        <Link to="/">
          <NeonButton variant="ghost" size="sm">
            Back to title
          </NeonButton>
        </Link>
      </header>

      <Panel eyebrow="Identity" title="Wordmark and type">
        <GlitchTitle size="md">NEXUS</GlitchTitle>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.28em] text-muted">Orbitron · Inter · JetBrains Mono</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>Press</span>
          <Kbd>Esc</Kbd>
          <span>to close dialogs,</span>
          <Kbd>Tab</Kbd>
          <span>to move focus.</span>
        </div>
      </Panel>

      <Panel eyebrow="Palette" title="Colour tokens">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {palette.map((token) => (
            <div key={token.name} className="rounded border border-border bg-panel2 p-2">
              <div className={`h-10 rounded-sm border border-border ${token.className}`} />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-text">{token.name}</p>
              <p className="font-mono text-[10px] text-muted">{token.hex}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Actions" title="NeonButton">
          <div className="flex flex-wrap items-center gap-3">
            <NeonButton>Primary</NeonButton>
            <NeonButton variant="ghost">Ghost</NeonButton>
            <NeonButton variant="danger">Danger</NeonButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <NeonButton size="sm">Small</NeonButton>
            <NeonButton size="md">Medium</NeonButton>
            <NeonButton size="lg">Large</NeonButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Tooltip label="Disabled with explanation">
              <NeonButton disabled tooltip="Disabled with explanation">
                Disabled
              </NeonButton>
            </Tooltip>
            <Badge tone="amber">Hover the tooltip target</Badge>
          </div>
        </Panel>

        <Panel eyebrow="Status" title="Badges and meters">
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <ProgressBar value={72} label="Data integrity" />
            <ProgressBar value={41} label="Signal strength" tone="amber" />
            <ProgressBar value={93} label="Mission progress" tone="green" />
          </div>
        </Panel>

        <Panel eyebrow="Metrics" title="Stat blocks">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="XP" value="1,240" hint="Total earned" icon={<Cpu size={14} />} />
            <Stat label="Records" value="47" hint="Loaded rows" tone="green" icon={<Database size={14} />} />
            <Stat label="Integrity" value="86" hint="Out of 100" tone="amber" icon={<ShieldCheck size={14} />} />
            <Stat label="Alerts" value="3" hint="Open issues" tone="magenta" icon={<Bell size={14} />} />
          </div>
        </Panel>

        <Panel eyebrow="Panels" title="Nested surfaces and tabs">
          <Tabs items={tabs} />
          <div className="mt-4 rounded border border-border bg-panel2/60 p-3 text-xs text-muted">
            Nested panel surface using <span className="font-mono text-text">panel2</span>.
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Overlays" title="Modal and toast">
        <div className="flex flex-wrap gap-3">
          <NeonButton onClick={() => setModalOpen(true)}>Open modal</NeonButton>
          <NeonButton
            variant="ghost"
            onClick={() => push({ message: 'Operation queued.', tone: 'info' })}
          >
            Info toast
          </NeonButton>
          <NeonButton
            variant="ghost"
            onClick={() => push({ message: 'Dataset validated.', tone: 'success' })}
          >
            Success toast
          </NeonButton>
          <NeonButton
            variant="danger"
            onClick={() => push({ message: 'Three rows failed validation.', tone: 'warning' })}
          >
            Warning toast
          </NeonButton>
        </div>
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Focus trap demo"
        footer={
          <>
            <NeonButton variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </NeonButton>
            <NeonButton
              onClick={() => {
                setModalOpen(false)
                push({ message: 'Confirmed.', tone: 'success' })
              }}
            >
              Confirm
            </NeonButton>
          </>
        }
      >
        <p>
          Focus is trapped inside this panel. Press <Kbd>Esc</Kbd> or use the close button to return focus to the
          trigger.
        </p>
      </Modal>
    </main>
  )
}
