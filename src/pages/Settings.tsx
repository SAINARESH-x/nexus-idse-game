// Settings page: sound, motion, text size, accent theme, and save export / import / reset.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RotateCcw, Upload, Volume2, VolumeX } from 'lucide-react'
import { normalizeSettings, THEME_ACCENTS } from '../game/settings'
import type { MotionSetting } from '../game/settings'
import { useGameStore } from '../game/store'
import { availableThemes } from '../game/toolbay'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { NeonButton } from '../ui/NeonButton'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { cn } from '../ui/cn'

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  testId: string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            data-testid={`${testId}-${option.value}`}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors',
              value === option.value
                ? 'border-cyan/70 bg-cyan/10 text-cyan'
                : 'border-border bg-panel2/60 text-muted hover:border-cyan/40 hover:text-text',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Downloads text as a file through a Blob link (no network). */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch {
    // Downloads can be blocked; the paste box below is the fallback.
  }
}

export function Settings() {
  const navigate = useNavigate()
  const { push } = useToast()
  const profile = useGameStore((state) => state.profile)
  const settings = normalizeSettings(useGameStore((state) => state.settings))
  const owned = useGameStore((state) => state.owned ?? [])
  const updateSettings = useGameStore((state) => state.updateSettings)
  const setSoundOn = useGameStore((state) => state.setSoundOn)
  const setTheme = useGameStore((state) => state.setTheme)
  const exportSave = useGameStore((state) => state.exportSave)
  const importSave = useGameStore((state) => state.importSave)
  const resetAll = useGameStore((state) => state.resetAll)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetWord, setResetWord] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const hasSave = profile.callsign.length > 0

  const runImport = (json: string) => {
    const result = importSave(json)
    if (result.ok) {
      setImportError(null)
      setImportText('')
      push({ message: 'Save imported. Progress restored.', tone: 'success' })
    } else {
      setImportError(result.error ?? 'Import failed.')
    }
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    file
      .text()
      .then(runImport)
      .catch(() => setImportError('The file could not be read.'))
  }

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-10">
      <button
        type="button"
        onClick={() => navigate(hasSave ? '/hub' : '/')}
        className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted hover:text-cyan"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        {hasSave ? 'Back to hub' : 'Back to title'}
      </button>

      <div className="space-y-5">
        <Panel eyebrow="System" title="SETTINGS" tone="cyan">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Sound</p>
              <NeonButton
                variant={profile.soundOn ? 'primary' : 'ghost'}
                data-testid="toggle-sound"
                aria-pressed={profile.soundOn}
                onClick={() => setSoundOn(!profile.soundOn)}
              >
                {profile.soundOn ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
                {profile.soundOn ? 'Sound on' : 'Sound off'}
              </NeonButton>
              <label className="block text-xs text-muted" htmlFor="volume-slider">
                Volume <span className="font-mono text-cyan">{Math.round(settings.volume * 100)}%</span>
              </label>
              <input
                id="volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                disabled={!profile.soundOn}
                onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
                className="w-full accent-cyan"
              />
            </div>
            <div className="space-y-4">
              <Segmented<MotionSetting>
                label="Reduced motion"
                value={settings.reducedMotion}
                testId="motion"
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                onChange={(reducedMotion) => updateSettings({ reducedMotion })}
              />
              <Segmented<100 | 115>
                label="Text size"
                value={settings.textSize}
                testId="text-size"
                options={[
                  { value: 100, label: '100%' },
                  { value: 115, label: '115%' },
                ]}
                onChange={(textSize) => updateSettings({ textSize })}
              />
            </div>
          </div>
          <div className="mt-6">
            <Segmented<string>
              label="Accent theme (owned)"
              value={profile.theme in THEME_ACCENTS ? profile.theme : 'nexus'}
              testId="theme"
              options={availableThemes(owned).map((id) => ({ value: id, label: THEME_ACCENTS[id].name }))}
              onChange={setTheme}
            />
            <p className="mt-2 text-[11px] text-muted">More accents can be bought in the Tool Bay with mission credits.</p>
          </div>
        </Panel>

        <Panel eyebrow="Save data" title="EXPORT, IMPORT AND RESET" action={<Badge tone="muted">localStorage</Badge>}>
          <p className="text-xs leading-relaxed text-muted">
            Progress is stored only in this browser under keys starting with <code className="font-mono">nexus-</code>.
            Export a backup before clearing browser data or moving to another device.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <NeonButton
              data-testid="btn-export-save"
              disabled={!hasSave}
              tooltip={hasSave ? undefined : 'Start a campaign first'}
              onClick={() => downloadText(`nexus-save-${profile.callsign || 'empty'}.json`, exportSave())}
            >
              <Download size={14} aria-hidden="true" />
              Export save
            </NeonButton>
            <NeonButton variant="ghost" data-testid="btn-import-file" onClick={() => fileInput.current?.click()}>
              <Upload size={14} aria-hidden="true" />
              Import file
            </NeonButton>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Import save file"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <NeonButton variant="danger" data-testid="btn-reset-save" onClick={() => setResetOpen(true)}>
              <RotateCcw size={14} aria-hidden="true" />
              Reset save
            </NeonButton>
          </div>
          <label htmlFor="import-paste" className="mt-5 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            Or paste a save
          </label>
          <textarea
            id="import-paste"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded border border-border bg-bg p-2 font-mono text-[11px] text-text outline-none focus:border-cyan"
            placeholder='{"version":1,"data":{...}}'
          />
          <NeonButton
            size="sm"
            className="mt-2"
            data-testid="btn-import-paste"
            disabled={importText.trim().length === 0}
            tooltip={importText.trim().length === 0 ? 'Paste a save first' : undefined}
            onClick={() => runImport(importText)}
          >
            Import pasted save
          </NeonButton>
          {importError && (
            <p role="alert" className="mt-3 rounded border border-red/40 bg-red/10 px-3 py-2 text-xs text-red" data-testid="import-error">
              Import refused: {importError} Your current save was not changed.
            </p>
          )}
        </Panel>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all progress?">
        <p className="text-sm text-muted">
          This deletes the campaign save and every level session in this browser. Type <strong className="text-red">RESET</strong> to
          confirm.
        </p>
        <input
          aria-label="Type RESET to confirm"
          value={resetWord}
          onChange={(event) => setResetWord(event.target.value)}
          className="mt-3 w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-text outline-none focus:border-red"
          data-testid="input-reset-confirm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <NeonButton variant="ghost" onClick={() => setResetOpen(false)}>
            Cancel
          </NeonButton>
          <NeonButton
            variant="danger"
            data-testid="btn-confirm-reset"
            disabled={resetWord !== 'RESET'}
            tooltip={resetWord !== 'RESET' ? 'Type RESET first' : undefined}
            onClick={() => {
              resetAll()
              setResetOpen(false)
              setResetWord('')
              push({ message: 'Save cleared. Campaign reset.', tone: 'warning' })
              navigate('/')
            }}
          >
            Reset everything
          </NeonButton>
        </div>
      </Modal>
    </main>
  )
}
