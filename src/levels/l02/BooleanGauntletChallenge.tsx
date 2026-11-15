// Side op: choose one gate expression per circuit so every row matches its target truth table.
import { useRef, useState } from 'react'
import { CheckCircle2, Lightbulb, Play, XCircle } from 'lucide-react'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import { BOOLEAN_ROWS, evalBooleanOption } from './engine'
import type { BooleanOption } from './engine'
import { L02_BOOLEAN_OPTIONS, L02_BOOLEAN_PUZZLES } from './content'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function BooleanGauntletChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])
  const [selected, setSelected] = useState<Record<string, BooleanOption | null>>({})
  const [wrongTests, setWrongTests] = useState(0)
  const [solved, setSolved] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const choose = (puzzleId: string, option: BooleanOption) => {
    setSelected((current) => ({ ...current, [puzzleId]: option }))
    setSolved(false)
    setFeedback(null)
  }

  const powerTest = () => {
    const missing = L02_BOOLEAN_PUZZLES.some((puzzle) => !selected[puzzle.id])
    if (missing) {
      setFeedback('Every gate needs an expression before the power test.')
      return
    }
    const wrong = L02_BOOLEAN_PUZZLES.filter((puzzle) => {
      const option = selected[puzzle.id]
      if (!option) return true
      return BOOLEAN_ROWS.some(
        (row, index) => evalBooleanOption(option, row.a, row.b) !== puzzle.target[index],
      )
    })
    if (wrong.length === 0) {
      setSolved(true)
      setFeedback('All three truth tables match. The circuit holds.')
      decisions.current.push({
        label: 'All three boolean gates matched',
        good: true,
        explanation:
          'AND lights only the both-true row, OR lights whenever either input is true, and A and not B lights only the A-only row.',
      })
      ui.log({ title: 'Boolean gauntlet powered', detail: 'Three truth tables matched.', tone: 'good' })
      return
    }
    const nextWrong = wrongTests + 1
    setWrongTests(nextWrong)
    const names = wrong.map((puzzle) => puzzle.title).join(', ')
    setFeedback(`These gates still disagree with their target: ${names}.`)
    decisions.current.push({
      label: `${wrong.length} gate(s) mismatched the truth table`,
      good: false,
      explanation: `Mismatched: ${names}. Compare each target row with the lamp output.`,
    })
    ui.log({ title: 'Power test failed', detail: `Mismatched: ${names}.`, tone: 'bad' })
  }

  const finish = () => {
    if (!solved) return
    onComplete({
      id,
      accuracy: 1,
      decisionQuality: clamp01(1 / (1 + wrongTests)),
      efficiency: clamp01(Math.max(0.3, 3 / (3 + wrongTests))),
      hintsUsed: 0,
      mistakes: wrongTests,
      decisions: decisions.current,
      extra: { wrongTests },
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted">
        Each circuit has two input switches (A and B) and four possible gate expressions. Pick the expression whose
        output matches the target truth table on every row. A lamp is lit when the expression evaluates to True.
      </p>

      {L02_BOOLEAN_PUZZLES.map((puzzle) => {
        const option = selected[puzzle.id]
        return (
          <div key={puzzle.id} className="rounded border border-border bg-panel2/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-xs uppercase tracking-[0.14em] text-text">{puzzle.title}</p>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                target: {puzzle.target.map((value) => (value ? '1' : '0')).join(' ')}
              </span>
            </div>

            <div className="mt-2 overflow-auto rounded border border-border">
              <table className="w-full min-w-[320px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-panel/70 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                    <th className="px-2 py-1">A</th>
                    <th className="px-2 py-1">B</th>
                    <th className="px-2 py-1">target</th>
                    <th className="px-2 py-1">your gate</th>
                    <th className="px-2 py-1">lamp</th>
                  </tr>
                </thead>
                <tbody>
                  {BOOLEAN_ROWS.map((row, index) => {
                    const actual = option ? evalBooleanOption(option, row.a, row.b) : null
                    const target = puzzle.target[index]
                    return (
                      <tr key={`${puzzle.id}-${index}`} className="border-b border-border/40 font-mono text-[11px]">
                        <td className="px-2 py-1 text-muted">{row.a ? '1' : '0'}</td>
                        <td className="px-2 py-1 text-muted">{row.b ? '1' : '0'}</td>
                        <td className="px-2 py-1 text-cyan">{target ? '1' : '0'}</td>
                        <td
                          className={cn(
                            'px-2 py-1',
                            actual === null ? 'text-muted' : actual === target ? 'text-green' : 'text-red',
                          )}
                        >
                          {actual === null ? '—' : actual ? '1' : '0'}
                        </td>
                        <td className="px-2 py-1">
                          {actual ? (
                            <Lightbulb size={13} className="text-amber" aria-label="lamp on" />
                          ) : (
                            <Lightbulb size={13} className="text-border" aria-label="lamp off" />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {L02_BOOLEAN_OPTIONS.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => choose(puzzle.id, candidate.id)}
                  aria-pressed={option === candidate.id}
                  className={cn(
                    'rounded border px-2 py-1 font-mono text-[10px] transition-colors',
                    option === candidate.id
                      ? 'border-cyan bg-cyan/10 text-cyan'
                      : 'border-border bg-panel text-muted hover:border-cyan/50 hover:text-cyan',
                  )}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2">
        <NeonButton onClick={powerTest} data-testid="btn-power-test">
          <Play size={13} aria-hidden="true" />
          Power test
        </NeonButton>
        <NeonButton variant="ghost" onClick={finish} disabled={!solved} data-testid="btn-log-boolean">
          Log circuits
        </NeonButton>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {wrongTests} failed test(s)
        </span>
      </div>

      {feedback && (
        <p
          aria-live="polite"
          className={cn(
            'flex items-start gap-2 rounded border p-3 text-xs',
            solved ? 'border-green/40 bg-green/[0.05] text-green' : 'border-amber/40 bg-amber/[0.05] text-amber',
          )}
        >
          {solved ? (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback}</span>
        </p>
      )}
    </div>
  )
}
