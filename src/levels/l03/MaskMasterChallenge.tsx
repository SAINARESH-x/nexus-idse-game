// Side op 2: set thresholds to isolate the anomalous sensor readings, scored by precision and recall.
import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Play, Target, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { SENSOR_COLS, SENSOR_GRID, L03_ANOMALIES } from './content'
import { ArrayGrid } from './ArrayGrid'
import type { CellTone } from './ArrayGrid'
import { isPerfectMask, scoreMask } from './maskLogic'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function MaskMasterChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [min, setMin] = useState(18)
  const [max, setMax] = useState(28)
  const [checks, setChecks] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const finished = useRef(false)

  const score = useMemo(() => scoreMask(min, max, L03_ANOMALIES), [min, max])
  const selectedKeys = useMemo(
    () => new Set(score.selected.map(([row, col]) => `${row},${col}`)),
    [score.selected],
  )

  const cellTone = (row: number, col: number): CellTone => {
    const key = `${row},${col}`
    if (selectedKeys.has(key)) return 'cyan'
    return 'default'
  }

  const check = () => {
    const nextChecks = checks + 1
    setChecks(nextChecks)
    if (isPerfectMask(score, L03_ANOMALIES.length)) {
      setFeedback('Perfect isolation: every anomaly caught, no false alarms.')
      decisions.current.push({
        label: 'Anomalies isolated exactly',
        good: true,
        explanation: `Thresholds (${min}, ${max}) selected ${score.selected.length} cells: precision ${(score.precision * 100).toFixed(0)}%, recall ${(score.recall * 100).toFixed(0)}%.`,
      })
      ui.log({
        title: 'Mask master solved',
        detail: `Thresholds (${min}, ${max}) isolated all ${L03_ANOMALIES.length} anomalies.`,
        tone: 'good',
      })
      if (finished.current) return
      finished.current = true
      ui.completeObjective('l3-side-2-obj')
      onComplete({
        id,
        accuracy: 1,
        decisionQuality: clamp01(1 / (1 + Math.max(0, nextChecks - 1))),
        efficiency: clamp01(Math.max(0.3, 2 / (2 + Math.max(0, nextChecks - 1)))),
        hintsUsed: 0,
        mistakes: Math.max(0, nextChecks - 1),
        decisions: decisions.current,
        extra: {
          maskChecks: nextChecks,
          maskPrecision: Math.round(score.precision * 100),
          maskRecall: Math.round(score.recall * 100),
        },
      })
      return
    }
    setFeedback(
      `Selected ${score.selected.length} cell(s): ${score.truePositives} anomaly(ies), ${score.falsePositives} false alarm(s), ${score.falseNegatives} missed.`,
    )
    decisions.current.push({
      label: 'Mask did not isolate the anomalies exactly',
      good: false,
      explanation: `At (${min}, ${max}) precision is ${(score.precision * 100).toFixed(0)}% and recall is ${(score.recall * 100).toFixed(0)}%.`,
    })
    ui.log({ title: 'Mask needs another look', detail: `(${min}, ${max})`, tone: 'bad' })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Set a lower and upper threshold. A reading is isolated when its value is below the lower bound or above the
        upper bound. Isolate exactly the anomalous readings: precision punishes false alarms, recall punishes misses.
      </p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded border border-border bg-panel2/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Sensor grid · mask preview</p>
            <Badge tone="cyan">{score.selected.length} selected</Badge>
          </div>
          <div className="mt-2">
            <ArrayGrid
              array={SENSOR_GRID}
              label="Mask preview"
              tone={cellTone}
              cellLabel={(row, col) =>
                `row ${row}, column ${col}, value ${SENSOR_GRID.data[row * SENSOR_COLS + col]}${selectedKeys.has(`${row},${col}`) ? ', isolated' : ''}`
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded border border-border bg-panel2/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">Thresholds</p>
            <label className="mt-2 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              lower bound: {min}
              <input
                type="range"
                min={10}
                max={25}
                step={0.5}
                value={min}
                onChange={(event) => setMin(Number(event.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <label className="mt-2 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              upper bound: {max}
              <input
                type="range"
                min={24}
                max={32}
                step={0.5}
                value={max}
                onChange={(event) => setMax(Number(event.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <code className="mt-2 block rounded border border-border bg-bg/70 p-2 font-mono text-[11px] text-cyan">
              arr[(arr &lt; {min}) | (arr &gt; {max})]
            </code>
          </div>

          <div className="rounded border border-border bg-panel2/50 p-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
              <Target size={12} aria-hidden="true" />
              Score
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className={cn('rounded border p-2', score.precision === 1 ? 'border-green/50 bg-green/[0.05]' : 'border-border bg-panel2/50')}>
                <p className="font-display text-base text-text">{(score.precision * 100).toFixed(0)}%</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">precision</p>
              </div>
              <div className={cn('rounded border p-2', score.recall === 1 ? 'border-green/50 bg-green/[0.05]' : 'border-border bg-panel2/50')}>
                <p className="font-display text-base text-text">{(score.recall * 100).toFixed(0)}%</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted">recall</p>
              </div>
            </div>
            <NeonButton size="sm" className="mt-2" onClick={check} data-testid="btn-mask-check">
              <Play size={12} aria-hidden="true" />
              Check mask
            </NeonButton>
          </div>
        </div>
      </div>

      {feedback && (
        <p
          className={cn(
            'flex items-start gap-1.5 rounded border p-2 text-[11px]',
            isPerfectMask(score, L03_ANOMALIES.length)
              ? 'border-green/40 bg-green/[0.05] text-green'
              : 'border-amber/40 bg-amber/[0.05] text-amber',
          )}
          aria-live="polite"
        >
          {isPerfectMask(score, L03_ANOMALIES.length) ? (
            <CheckCircle2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          {feedback}
        </p>
      )}
    </div>
  )
}