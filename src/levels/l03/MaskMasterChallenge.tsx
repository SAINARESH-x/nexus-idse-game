// Side op 2: inspect a 6x6 sensor grid, calculate IQR fences, then tune strict thresholds and submit a detection.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, RotateCcw, ScanSearch, Target, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { Badge } from '../../ui/Badge'
import { NeonButton } from '../../ui/NeonButton'
import { Panel } from '../../ui/Panel'
import { cn } from '../../ui/cn'
import { array2d } from './nd'
import { ArrayGrid, formatNumber } from './ArrayGrid'
import type { CellTone } from './ArrayGrid'
import { L03_MASK_MASTER_ANOMALIES, L03_MASK_MASTER_VALUES } from './content'
import {
  MASK_COMPLETION_TARGET,
  MASK_MAX_READING,
  MASK_MIN_READING,
  MASK_THRESHOLD_MAX,
  MASK_THRESHOLD_MIN,
  MASK_THRESHOLD_STEP,
  INITIAL_EXPLORATION,
  calculateIqr,
  evaluateDetections,
  explorationComplete,
  judgeSubmission,
  parseReadingInput,
  recordExploration,
  thresholdFeedback,
} from './maskLogic'
import type { DetectionScore, ExplorationState, IqrStatistics } from './maskLogic'

const GRID_ROWS = L03_MASK_MASTER_VALUES.length
const GRID_COLS = L03_MASK_MASTER_VALUES[0].length

const cloneGrid = (grid: number[][]): number[][] => grid.map((row) => [...row])

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

/** Statistics and thresholds always use two decimals so values line up. */
const formatStat = (value: number): string => value.toFixed(2)

interface Thresholds {
  lower: number
  upper: number
}

const isSelectedCell = (selected: [number, number] | null, row: number, col: number): boolean =>
  selected !== null && selected[0] === row && selected[1] === col

function StatRow({ label, value, explanation }: { label: string; value: string; explanation: string }) {
  return (
    <div className="rounded border border-border bg-panel2/50 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</dt>
        <dd className="font-mono text-sm text-cyan">{value}</dd>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted">{explanation}</p>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-border bg-panel2/50 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-display text-xl text-cyan">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{detail}</p>
    </div>
  )
}

export function MaskMasterChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const finished = useRef(false)
  const [observed, setObserved] = useState<number[][]>(() => cloneGrid(L03_MASK_MASTER_VALUES))
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [stats, setStats] = useState<IqrStatistics | null>(null)
  const [thresholds, setThresholds] = useState<Thresholds | null>(null)
  const [failedSubmissions, setFailedSubmissions] = useState(0)
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null)
  const [needsRecalculation, setNeedsRecalculation] = useState(false)
  const [exploration, setExploration] = useState<ExplorationState>(INITIAL_EXPLORATION)

  const flatReadings = useMemo(() => observed.flat(), [observed])
  const observedGrid = useMemo(() => array2d(observed), [observed])
  const score = useMemo<DetectionScore | null>(() => {
    if (!stats || !thresholds) return null
    return evaluateDetections(
      flatReadings,
      GRID_ROWS,
      GRID_COLS,
      thresholds.lower,
      thresholds.upper,
      L03_MASK_MASTER_ANOMALIES,
      stats,
    )
  }, [flatReadings, stats, thresholds])

  // Live experiment log: remembers whether any setting caused a false alarm or a miss.
  useEffect(() => {
    if (score) setExploration((previous) => recordExploration(previous, score))
  }, [score])

  const flaggedKeys = useMemo(
    () => new Set((score?.selected ?? []).map(([row, col]) => `${row},${col}`)),
    [score],
  )

  const guidance = useMemo(() => (score && stats ? thresholdFeedback(score, stats) : null), [score, stats])
  const explored = explorationComplete(exploration)

  const selectCell = (row: number, col: number) => {
    setSelectedCell([row, col])
    setEditValue(String(observed[row][col]))
    setEditError(null)
  }

  const saveReading = () => {
    if (!selectedCell) return
    const parsed = parseReadingInput(editValue)
    if (!parsed.ok || parsed.value === undefined) {
      setEditError(parsed.error ?? 'Enter a valid reading.')
      return
    }

    const [row, col] = selectedCell
    const previous = observed[row][col]
    const next = parsed.value
    if (previous === next) {
      setEditError(null)
      return
    }

    setObserved((current) =>
      current.map((line, rowIndex) =>
        rowIndex === row ? line.map((cell, colIndex) => (colIndex === col ? next : cell)) : line,
      ),
    )
    // Detection stays live on the edited readings; the fences only refresh on CALCULATE IQR.
    setSubmitFeedback(null)
    if (stats) setNeedsRecalculation(true)
    setEditError(null)
    ui.log({
      title: `Sensor ${row},${col} edited`,
      detail: `Reading changed from ${formatNumber(previous)} to ${formatNumber(next)}. Detection updates now; press CALCULATE IQR to refresh the fences.`,
      tone: 'tip',
    })
  }

  const resetDataset = () => {
    setObserved(cloneGrid(L03_MASK_MASTER_VALUES))
    setSelectedCell(null)
    setEditValue('')
    setEditError(null)
    setStats(null)
    setThresholds(null)
    setSubmitFeedback(null)
    setNeedsRecalculation(false)
    ui.log({
      title: 'Sensor dataset restored',
      detail: 'The original 36 readings are back. Calculate IQR when ready.',
      tone: 'info',
    })
  }

  const calculateIqrNow = () => {
    const result = calculateIqr(flatReadings)
    if (!result.ok) {
      setStats(null)
      setThresholds(null)
      setSubmitFeedback(result.error)
      return
    }

    setStats(result.stats)
    setThresholds({ lower: result.stats.lowerFence, upper: result.stats.upperFence })
    setSubmitFeedback(null)
    setNeedsRecalculation(false)
    ui.log({
      title: 'IQR calculated',
      detail: `Q1 ${formatStat(result.stats.q1)}, Q3 ${formatStat(result.stats.q3)}, IQR ${formatStat(result.stats.iqr)}. Fences ${formatStat(result.stats.lowerFence)} to ${formatStat(result.stats.upperFence)}.`,
      tone: 'info',
    })
  }

  const changeLowerThreshold = (raw: string) => {
    if (!thresholds) return
    const next = Number(raw)
    const lower = Math.max(
      MASK_THRESHOLD_MIN,
      Math.min(next, thresholds.upper - MASK_THRESHOLD_STEP),
    )
    setThresholds({ lower, upper: thresholds.upper })
    setSubmitFeedback(null)
  }

  const changeUpperThreshold = (raw: string) => {
    if (!thresholds) return
    const next = Number(raw)
    const upper = Math.min(
      MASK_THRESHOLD_MAX,
      Math.max(next, thresholds.lower + MASK_THRESHOLD_STEP),
    )
    setThresholds({ lower: thresholds.lower, upper })
    setSubmitFeedback(null)
  }

  const resetFences = () => {
    if (!stats) return
    setThresholds({ lower: stats.lowerFence, upper: stats.upperFence })
    setSubmitFeedback(null)
  }

  const submitDetection = () => {
    if (!score || !stats || !thresholds || finished.current) return

    const verdict = judgeSubmission(score, exploration)
    if (!verdict.accepted && verdict.reason === 'explore') {
      setSubmitFeedback(
        'Experiment first: move the thresholds until you have seen at least one false positive and at least one missed anomaly, then choose your final band.',
      )
      return
    }

    if (verdict.accepted) {
      finished.current = true
      // The answer key is revealed only now, in the debrief decision list.
      const answerKey = L03_MASK_MASTER_ANOMALIES.map(
        ([row, col]) => `[${row},${col}] = ${formatNumber(L03_MASK_MASTER_VALUES[row][col])}`,
      ).join(', ')
      decisions.current.push({
        label: 'Explored the precision / recall trade-off',
        good: true,
        explanation:
          'You saw a threshold that raised false positives and one that missed a real anomaly before choosing your final band. Tight thresholds raise recall but cost precision; loose thresholds do the opposite.',
      })
      const decision: Decision = {
        label: 'Submitted IQR-based anomaly thresholds',
        good: true,
        explanation: `Your thresholds (${formatStat(thresholds.lower)} to ${formatStat(thresholds.upper)}) achieved ${formatPercent(score.precision)} precision and ${formatPercent(score.recall)} recall. TP ${score.truePositives}, FP ${score.falsePositives}, TN ${score.trueNegatives}, FN ${score.falseNegatives}. IQR fences were ${formatStat(stats.lowerFence)} to ${formatStat(stats.upperFence)}. Answer key (original anomalies): ${answerKey}.`,
      }
      decisions.current.push(decision)
      ui.log({
        title: 'Detection accepted',
        detail: `Precision ${formatPercent(score.precision)}, recall ${formatPercent(score.recall)}. Original anomalies: ${answerKey}.`,
        tone: 'good',
      })
      ui.completeObjective('l3-side-2-obj')
      onComplete({
        id,
        accuracy: score.f1,
        decisionQuality: clamp01(3 / (3 + failedSubmissions)),
        efficiency: clamp01(1 - 0.1 * failedSubmissions),
        hintsUsed: 0,
        mistakes: failedSubmissions,
        decisions: [...decisions.current],
        extra: {
          maskPrecision: Math.round(score.precision * 1000) / 10,
          maskRecall: Math.round(score.recall * 1000) / 10,
          maskTruePositives: score.truePositives,
          maskFalsePositives: score.falsePositives,
          maskTrueNegatives: score.trueNegatives,
          maskFalseNegatives: score.falseNegatives,
          maskQ1: stats.q1,
          maskQ3: stats.q3,
          maskIqr: stats.iqr,
          maskLowerFence: stats.lowerFence,
          maskUpperFence: stats.upperFence,
          maskLowerThreshold: thresholds.lower,
          maskUpperThreshold: thresholds.upper,
          maskSubmissions: failedSubmissions + 1,
        },
      })
      return
    }

    const nextFailures = failedSubmissions + 1
    setFailedSubmissions(nextFailures)
    decisions.current.push({
      label: 'Submitted thresholds missed the target',
      good: false,
      explanation: `Precision ${formatPercent(score.precision)} and recall ${formatPercent(score.recall)} did not both reach 80%. The detection produced ${score.falsePositives} false positive(s) and ${score.falseNegatives} false negative(s).`,
    })
    setSubmitFeedback(
      `Not accepted yet. ${thresholdFeedback(score, stats)} The completion target is at least ${formatPercent(MASK_COMPLETION_TARGET.precision)} precision and ${formatPercent(MASK_COMPLETION_TARGET.recall)} recall.`,
    )
    ui.log({
      title: 'Detection rejected',
      detail: `Precision ${formatPercent(score.precision)}, recall ${formatPercent(score.recall)}. Adjust the thresholds and submit again.`,
      tone: 'bad',
    })
  }

  const cellTone = (row: number, col: number): CellTone => {
    if (flaggedKeys.has(`${row},${col}`)) return 'red'
    if (isSelectedCell(selectedCell, row, col)) return 'cyan'
    return 'default'
  }

  const isEdited = (row: number, col: number): boolean => observed[row][col] !== L03_MASK_MASTER_VALUES[row][col]

  const cellMarker = (row: number, col: number): string | null => {
    const marks: string[] = []
    if (flaggedKeys.has(`${row},${col}`)) marks.push('FLAG')
    if (isEdited(row, col)) marks.push('EDIT')
    return marks.length > 0 ? marks.join(' ') : null
  }

  const cellLabel = (row: number, col: number): string => {
    const parts = [`row ${row}, column ${col}, reading ${formatNumber(observed[row][col])}`]
    if (flaggedKeys.has(`${row},${col}`)) parts.push('flagged by your thresholds')
    if (isEdited(row, col)) parts.push(`edited from ${formatNumber(L03_MASK_MASTER_VALUES[row][col])}`)
    if (isSelectedCell(selectedCell, row, col)) parts.push('selected for editing')
    return parts.join(', ')
  }

  // Static slider ranges keep the step grid aligned; the change handlers enforce lower < upper.
  const lowerSliderMax = MASK_THRESHOLD_MAX - MASK_THRESHOLD_STEP
  const upperSliderMin = MASK_THRESHOLD_MIN + MASK_THRESHOLD_STEP

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="SIDE OPERATION // SENSOR ANALYSIS"
        title="MASK MASTER"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            <Badge tone="cyan">6 x 6 GRID</Badge>
            <Badge tone="muted">36 READINGS</Badge>
            <Badge tone="violet">GROUND TRUTH LOCKED</Badge>
          </div>
        }
      >
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Inspect the sensor readings, edit them to experiment, then calculate the quartiles and IQR fences. Use
          your own lower and upper thresholds to flag suspicious readings. The original anomaly labels stay hidden
          and fixed, so every detection is scored against the same answer key.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <ArrayGrid
              array={observedGrid}
              label="Sensor readings"
              tone={cellTone}
              cellLabel={cellLabel}
              marker={cellMarker}
              selected={(row, col) => isSelectedCell(selectedCell, row, col)}
              onCell={(row, col) => selectCell(row, col)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="red">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                FLAGGED {score?.selected.length ?? 0}
              </Badge>
              <p className="font-mono text-[10px] leading-relaxed text-muted">
                {score && score.selected.length > 0
                  ? score.selected.map(([row, col]) => `[${row},${col}]`).join(' ')
                  : score
                    ? 'No cells flagged by the current thresholds.'
                    : 'Calculate IQR to activate threshold detection.'}
              </p>
            </div>
            {needsRecalculation && (
              <p className="rounded border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber" role="status">
                Readings changed. Detection already uses the edited values, but the fences shown below were
                calculated from the earlier data. Press CALCULATE IQR to refresh them.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded border border-border bg-panel2/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">EDIT SENSOR</p>
                <p className="mt-1 text-xs text-muted">
                  {selectedCell
                    ? `Editing row ${selectedCell[0]}, column ${selectedCell[1]}`
                    : 'Click a grid cell to change its observed reading.'}
                </p>
              </div>
              <NeonButton
                variant="ghost"
                size="sm"
                onClick={resetDataset}
                data-testid="btn-reset-dataset"
                tooltip="Restore the original 36 readings without changing the hidden answer key."
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                RESET DATASET
              </NeonButton>
            </div>

            {selectedCell ? (
              <div className="space-y-2">
                <label htmlFor="mask-reading-input" className="block text-xs text-text">
                  Reading for [{selectedCell[0]}, {selectedCell[1]}]
                </label>
                <input
                  id="mask-reading-input"
                  aria-label={`Edit reading row ${selectedCell[0]} column ${selectedCell[1]}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={editValue}
                  onChange={(event) => {
                    setEditValue(event.target.value)
                    setEditError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveReading()
                    }
                  }}
                  className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-text outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/40"
                />
                <p className="text-[11px] text-muted">
                  Finite numbers only, from {MASK_MIN_READING} to {MASK_MAX_READING}. Editing changes the observed
                  dataset, not the hidden anomaly labels.
                </p>
                {editError && (
                  <p className="text-xs text-red" role="alert">
                    {editError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <NeonButton size="sm" onClick={saveReading} data-testid="btn-save-reading">
                    SAVE READING
                  </NeonButton>
                  <NeonButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCell(null)
                      setEditValue('')
                      setEditError(null)
                    }}
                  >
                    CANCEL
                  </NeonButton>
                </div>
              </div>
            ) : (
              <p className="rounded border border-border bg-panel/60 px-3 py-3 text-xs text-muted">
                Select a cell to experiment with extreme or normal values. Recalculate IQR after any edit.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel eyebrow="QUARTILES" title="STATISTICAL FENCES" action={<ScanSearch className="h-5 w-5 text-cyan" aria-hidden="true" />}>
        {!stats ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              The calculation sorts all 36 observed readings, finds Q1 as the median of the lower half and Q3 as
              the median of the upper half, then derives the IQR and the 1.5 x IQR fences. Inspect the data first;
              the values stay hidden until you calculate them.
            </p>
            <div className="rounded border border-border bg-panel2/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">
              <p>Q1 = median(lower half)</p>
              <p>Q3 = median(upper half)</p>
              <p>IQR = Q3 - Q1</p>
              <p>Lower fence = Q1 - 1.5 x IQR</p>
              <p>Upper fence = Q3 + 1.5 x IQR</p>
            </div>
            <NeonButton onClick={calculateIqrNow} data-testid="btn-calculate-iqr">
              CALCULATE IQR
            </NeonButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                Median-of-halves convention across {stats.count} observed readings. Results come from the current
                edited dataset.
              </p>
              <NeonButton variant="ghost" size="sm" onClick={calculateIqrNow} data-testid="btn-calculate-iqr">
                CALCULATE IQR
              </NeonButton>
            </div>
            <dl className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <StatRow label="Q1" value={formatStat(stats.q1)} explanation="Median of the lower half of the sorted readings." />
              <StatRow label="Q3" value={formatStat(stats.q3)} explanation="Median of the upper half of the sorted readings." />
              <StatRow label="IQR" value={formatStat(stats.iqr)} explanation="Q3 - Q1: the spread of the middle 50%." />
              <StatRow
                label="Lower fence"
                value={formatStat(stats.lowerFence)}
                explanation="Q1 - 1.5 x IQR: a statistical low-outlier recommendation."
              />
              <StatRow
                label="Upper fence"
                value={formatStat(stats.upperFence)}
                explanation="Q3 + 1.5 x IQR: a statistical high-outlier recommendation."
              />
              <StatRow
                label="Readings"
                value={String(stats.count)}
                explanation="The current dataset has one reading per grid cell."
              />
            </dl>
            <p className="rounded border border-cyan/20 bg-cyan/5 px-3 py-2 text-[11px] leading-relaxed text-muted">
              The fences are a recommendation, not an automatic answer. You choose the thresholds below and see
              what your choice does to precision and recall.
            </p>
          </div>
        )}
      </Panel>

      {stats && thresholds && score && (
        <>
          <Panel
            eyebrow="THRESHOLD CONTROL"
            title="CHOOSE YOUR DETECTION BAND"
            action={<Target className="h-5 w-5 text-cyan" aria-hidden="true" />}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  IQR fences (statistical recommendation): lower {formatStat(stats.lowerFence)}, upper{' '}
                  {formatStat(stats.upperFence)}. The sliders are your own detection thresholds: move them away from
                  the fences and watch what happens.
                </p>
                <NeonButton variant="ghost" size="sm" onClick={resetFences} data-testid="btn-reset-fences">
                  RESET TO IQR FENCES
                </NeonButton>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="mask-lower-threshold" className="text-xs text-text">
                    Lower threshold
                  </label>
                  <span className="font-mono text-sm text-cyan">{formatStat(thresholds.lower)}</span>
                </div>
                <input
                  id="mask-lower-threshold"
                  data-testid="input-lower-threshold"
                  type="range"
                  min={MASK_THRESHOLD_MIN}
                  max={lowerSliderMax}
                  step={MASK_THRESHOLD_STEP}
                  value={thresholds.lower}
                  onChange={(event) => changeLowerThreshold(event.target.value)}
                  aria-valuetext={`Lower threshold ${formatStat(thresholds.lower)}`}
                  className="w-full accent-cyan"
                />
                <p className="text-[11px] text-muted">
                  Flag readings below this value. Equality is not flagged. It always stays below the upper threshold.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="mask-upper-threshold" className="text-xs text-text">
                    Upper threshold
                  </label>
                  <span className="font-mono text-sm text-cyan">{formatStat(thresholds.upper)}</span>
                </div>
                <input
                  id="mask-upper-threshold"
                  data-testid="input-upper-threshold"
                  type="range"
                  min={upperSliderMin}
                  max={MASK_THRESHOLD_MAX}
                  step={MASK_THRESHOLD_STEP}
                  value={thresholds.upper}
                  onChange={(event) => changeUpperThreshold(event.target.value)}
                  aria-valuetext={`Upper threshold ${formatStat(thresholds.upper)}`}
                  className="w-full accent-cyan"
                />
                <p className="text-[11px] text-muted">Flag readings above this value. Equality is not flagged.</p>
              </div>

              <div className="rounded border border-border bg-bg/60 px-3 py-2 font-mono text-xs text-cyan">
                flagged = reading &lt; {formatStat(thresholds.lower)} OR reading &gt; {formatStat(thresholds.upper)}
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel eyebrow="EVALUATION" title="CONFUSION MATRIX">
              <table className="w-full border-collapse text-center text-xs" data-testid="confusion-matrix">
                <caption className="sr-only">
                  Confusion matrix comparing your flagged readings with the hidden original anomaly labels.
                </caption>
                <thead>
                  <tr className="text-muted">
                    <th className="border border-border px-2 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
                      Your detection
                    </th>
                    <th className="border border-border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                      Actual anomaly
                    </th>
                    <th className="border border-border px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                      Actual normal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="border border-border px-2 py-3 text-left text-green">Flagged</th>
                    <td className="border border-border px-2 py-3 text-green" data-testid="cm-tp">
                      TP {score.truePositives}
                    </td>
                    <td className="border border-border px-2 py-3 text-red" data-testid="cm-fp">
                      FP {score.falsePositives}
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-border px-2 py-3 text-left text-amber">Not flagged</th>
                    <td className="border border-border px-2 py-3 text-red" data-testid="cm-fn">
                      FN {score.falseNegatives}
                    </td>
                    <td className="border border-border px-2 py-3 text-green" data-testid="cm-tn">
                      TN {score.trueNegatives}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                The labels on the right come from the original dataset and never change when you edit a reading.
                A normal cell edited to an extreme value becomes a false positive; an original anomaly edited to a
                normal value becomes a false negative.
              </p>
            </Panel>

            <Panel eyebrow="METRICS" title="PRECISION & RECALL">
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Precision"
                  value={formatPercent(score.precision)}
                  detail={
                    score.precisionDefined
                      ? `TP / (TP + FP) = ${score.truePositives} / ${score.truePositives + score.falsePositives}`
                      : 'TP + FP = 0: undefined, shown and scored as 0%'
                  }
                />
                <Metric
                  label="Recall"
                  value={formatPercent(score.recall)}
                  detail={
                    score.recallDefined
                      ? `TP / (TP + FN) = ${score.truePositives} / ${score.truePositives + score.falseNegatives}`
                      : 'TP + FN = 0: undefined, shown and scored as 0%'
                  }
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Precision asks how many flagged readings were real anomalies. Recall asks how many real anomalies
                you found. Raising a threshold usually trades one against the other. If no readings are flagged,
                precision is mathematically undefined; this mission displays and scores it as 0%.
              </p>
              <p className="mt-2 rounded border border-border bg-panel2/50 px-3 py-2 text-[11px] text-muted">
                Completion target: precision and recall must both be at least{' '}
                {formatPercent(MASK_COMPLETION_TARGET.precision)}. The target is checked only when you submit.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                IQR fences flag statistical outliers: values unusually far from the middle 50% of the data.
                Precision and recall are different: they compare your flags with known labels, which exist here
                only because this is a simulated exercise.
              </p>
              <ul className="mt-3 space-y-1 text-[11px]" aria-label="Experiment log" data-testid="experiment-log">
                <li className={cn('flex items-center gap-2', exploration.sawFalsePositive ? 'text-green' : 'text-muted')}>
                  {exploration.sawFalsePositive ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {exploration.sawFalsePositive ? 'Done:' : 'To do:'} find a setting that creates a false positive
                </li>
                <li className={cn('flex items-center gap-2', exploration.sawFalseNegative ? 'text-green' : 'text-muted')}>
                  {exploration.sawFalseNegative ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {exploration.sawFalseNegative ? 'Done:' : 'To do:'} find a setting that misses a real anomaly
                </li>
              </ul>
              <div className="mt-3">
                <NeonButton
                  fullWidth
                  onClick={submitDetection}
                  data-testid="btn-submit-detection"
                  disabled={finished.current || !explored}
                  tooltip={
                    explored
                      ? 'Check your thresholds against the hidden labels.'
                      : 'Complete both experiment-log items before submitting.'
                  }
                >
                  SUBMIT DETECTION
                </NeonButton>
              </div>
            </Panel>
          </div>

          {guidance && (
            <div
              className={cn(
                'rounded border px-4 py-3 text-xs leading-relaxed',
                score.precision === 1 && score.recall === 1
                  ? 'border-green/40 bg-green/10 text-green'
                  : 'border-amber/40 bg-amber/10 text-amber',
              )}
              role="status"
              aria-live="polite"
              data-testid="threshold-guidance"
            >
              <div className="flex items-start gap-2">
                {score.precision === 1 && score.recall === 1 ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{guidance}</span>
              </div>
            </div>
          )}

          {submitFeedback && (
            <div className="rounded border border-red/40 bg-red/10 px-4 py-3 text-xs leading-relaxed text-red" role="alert">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{submitFeedback}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
