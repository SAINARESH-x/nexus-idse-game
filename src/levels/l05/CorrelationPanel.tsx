// Stage 3 correlation desk: Pearson r for any two numeric columns and the study_hours confounder check.
import { useMemo } from 'react'
import type { CohortStudent } from '../../engine/cohort'
import { Scatter } from '../../components/charts'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'
import { Panel, Stat } from '../../ui'
import { NUMERIC_COLUMNS, fmt } from './data'
import type { NumericColumn } from './data'
import { corrCode, describeR, pairCorr, stratCode, weakens, withinBandCorr } from './correlation'
import type { Stage3State } from './state'
import { CodeLine, GoalCard, Select } from './deskUi'

export interface CorrelationPanelProps {
  rows: readonly CohortStudent[]
  s: Stage3State
  update: (patch: Partial<Stage3State>) => void
  onMistake: () => void
}

const isLibraryPair = (x: string, y: string) => (x === 'library_visits' && y === 'cgpa') || (x === 'cgpa' && y === 'library_visits')

export function CorrelationPanel({ rows, s, update, onMistake }: CorrelationPanelProps) {
  const r = useMemo(() => pairCorr(rows, s.corrX, s.corrY), [rows, s.corrX, s.corrY])
  const strat = useMemo(() => withinBandCorr(rows, 'library_visits', 'cgpa', 'study_hours', s.bands), [rows, s.bands])
  const ready = s.seenLibrary && s.bands >= 3 && weakens(strat)
  const pick = (patch: { corrX?: NumericColumn; corrY?: NumericColumn }) => {
    const x = patch.corrX ?? s.corrX
    const y = patch.corrY ?? s.corrY
    update({ ...patch, ...(isLibraryPair(x, y) ? { seenLibrary: true } : {}) })
  }
  const scenario: ChoiceScenario = {
    id: 'library',
    title: 'WHAT DOES THE LIBRARY r MEAN?',
    prompt: `Raw r(library_visits, cgpa) = ${fmt(strat.raw)}. Inside ${s.bands} study_hours bands the weighted r is ${fmt(strat.within)}. A dean proposes mandatory library visits to raise grades.`,
    options: [
      { id: 'cause', label: 'Library visits raise cgpa: mandate them', correct: false,
        simulate: () => ({ ok: true, output: `Within students who study about the same hours, r falls to ${fmt(strat.within)}. Forcing visits does not add study time.` }),
        explanation: 'Correlation alone never shows cause; here the association mostly travels through study_hours.' },
      { id: 'confound', label: 'Association, not causation: study time drives both', correct: true,
        simulate: () => ({ ok: true, output: `raw r = ${fmt(strat.raw)} -> within-band r = ${fmt(strat.within)}. Holding study_hours roughly fixed removes most of the link.` }),
        explanation: 'Students who study more also visit the library more. study_hours is a confounder: control for it and the library effect shrinks.' },
      { id: 'none', label: 'r is near zero, so there is no relationship at all', correct: false,
        simulate: () => ({ ok: true, output: `The raw r is ${fmt(strat.raw)}: ${describeR(strat.raw)}. It is a real association, just not a causal one.` }),
        explanation: 'The raw association exists; the question is what explains it.' },
    ],
  }
  return (
    <Panel eyebrow="Desk D" title="CORRELATION CHECK">
      <div className="grid grid-cols-2 gap-2">
        <Select<NumericColumn> label="column a" value={s.corrX} options={NUMERIC_COLUMNS} onChange={(corrX) => pick({ corrX })} testId="corr-x" />
        <Select<NumericColumn> label="column b" value={s.corrY} options={NUMERIC_COLUMNS} onChange={(corrY) => pick({ corrY })} testId="corr-y" />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Stat label="Pearson r" value={<span data-testid="corr-r">{fmt(r, 3)}</span>} hint={describeR(r)} />
        <CodeLine code={corrCode(s.corrX, s.corrY)} />
      </div>
      <Scatter points={rows.map((row) => ({ x: row[s.corrX], y: row[s.corrY] }))} xLabel={s.corrX} yLabel={s.corrY} />
      <GoalCard testId="goal-corr" done={s.interpretOk} label="Check library_visits vs cgpa for a confounder, then interpret it">
        <p className="text-xs text-muted">{s.seenLibrary ? 'library_visits vs cgpa inspected.' : 'Select library_visits and cgpa above.'}</p>
        <label className="block font-mono text-[11px] text-muted">study_hours bands: {s.bands}
          <input type="range" min={1} max={6} value={s.bands} aria-label="study_hours bands" data-testid="corr-bands" className="ml-2 align-middle accent-cyan"
            onChange={(e) => update({ bands: Number(e.target.value) })} />
        </label>
        <table className="w-full font-mono text-[11px]" aria-label="within-band correlations">
          <tbody>
            {strat.bands.map((b) => <tr key={b.label}><td className="text-muted">study_hours {b.label}</td><td>n={b.n}</td><td className="text-cyan">r={fmt(b.r)}</td></tr>)}
          </tbody>
        </table>
        <p className="text-xs" data-testid="corr-within">raw r {fmt(strat.raw)} → within-band r {fmt(strat.within)}</p>
        <CodeLine code={stratCode('library_visits', 'cgpa', 'study_hours', s.bands)} />
        {s.interpretOk ? (
          <p className="text-xs text-green">Interpreted: an association explained by study time, not a cause.</p>
        ) : ready ? (
          <ChoiceSimulator scenarios={[scenario]} onChoice={(_sc, _o, ok) => { if (!ok) onMistake() }} onComplete={() => update({ interpretOk: true })} />
        ) : (
          <p className="text-xs text-muted">Inspect the pair and split into at least 3 bands to unlock the interpretation.</p>
        )}
      </GoalCard>
    </Panel>
  )
}
