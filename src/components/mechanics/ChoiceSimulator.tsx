// ChoiceSimulator: runs each choice and shows the real consequence, not a quiz answer.
import { useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, Play, XCircle } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'

export interface SimulationResult {
  /** Whether the operation completed; a useful correct answer may still raise. */
  ok: boolean
  output: string
  state?: string
}

export interface ChoiceOption {
  id: string
  label: string
  code?: string
  correct: boolean
  simulate: () => SimulationResult
  explanation: string
}

export interface ChoiceScenario {
  id: string
  title: string
  prompt: string
  options: ChoiceOption[]
}

export interface ChoiceSummary {
  mistakes: number
  firstTryCorrect: number
  solved: number
}

export interface ChoiceSimulatorProps {
  scenarios: ChoiceScenario[]
  onChoice?: (scenario: ChoiceScenario, option: ChoiceOption, correct: boolean) => void
  onComplete?: (summary: ChoiceSummary) => void
}

interface ActiveOutcome {
  optionId: string
  result: SimulationResult
  correct: boolean
}

export function ChoiceSimulator({ scenarios, onChoice, onComplete }: ChoiceSimulatorProps) {
  const [index, setIndex] = useState(0)
  const [outcome, setOutcome] = useState<ActiveOutcome | null>(null)
  const [solved, setSolved] = useState<Record<string, boolean>>({})
  const [wrongOptions, setWrongOptions] = useState<Record<string, string[]>>({})
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [mistakes, setMistakes] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const completed = useRef(false)

  const scenario = scenarios[index]
  if (!scenario) return null
  const isSolved = Boolean(solved[scenario.id])

  const choose = (option: ChoiceOption) => {
    if (isSolved) return
    if ((wrongOptions[scenario.id] ?? []).includes(option.id)) return

    const attempt = (attempts[scenario.id] ?? 0) + 1
    setAttempts((current) => ({ ...current, [scenario.id]: attempt }))

    let result: SimulationResult
    try {
      result = option.simulate()
    } catch (error) {
      result = {
        ok: false,
        output: error instanceof Error ? `${error.name}: ${error.message}` : 'Simulation failed.',
      }
    }

    setOutcome({ optionId: option.id, result, correct: option.correct })
    onChoice?.(scenario, option, option.correct)

    if (option.correct) {
      setSolved((current) => ({ ...current, [scenario.id]: true }))
      if (attempt === 1) setFirstTry((current) => current + 1)
    } else {
      setMistakes((current) => current + 1)
      setWrongOptions((current) => ({
        ...current,
        [scenario.id]: [...(current[scenario.id] ?? []), option.id],
      }))
    }
  }

  const advance = () => {
    if (!isSolved) return
    if (index + 1 < scenarios.length) {
      setIndex((current) => current + 1)
      setOutcome(null)
      return
    }
    if (completed.current) return
    completed.current = true
    onComplete?.({
      mistakes,
      firstTryCorrect: firstTry,
      solved: scenarios.length,
    })
  }

  const solvedCount = Object.values(solved).filter(Boolean).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
          Scenario {index + 1}/{scenarios.length}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {solvedCount} resolved
        </p>
      </div>

      <div className="rounded border border-border bg-panel2/60 p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.14em] text-text">{scenario.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{scenario.prompt}</p>
      </div>

      <div className="grid gap-2">
        {scenario.options.map((option) => {
          const wasWrong = (wrongOptions[scenario.id] ?? []).includes(option.id)
          const chosen = outcome?.optionId === option.id
          return (
            <button
              key={option.id}
              type="button"
              disabled={isSolved || wasWrong}
              onClick={() => choose(option)}
              data-testid={`choice-${scenario.id}-${option.id}`}
              className={cn(
                'rounded border p-3 text-left transition-colors',
                wasWrong
                  ? 'cursor-not-allowed border-red/40 bg-red/[0.04] opacity-70'
                  : chosen && option.correct
                    ? 'border-green/60 bg-green/[0.06]'
                    : 'border-border bg-panel/70 hover:border-cyan/60',
                isSolved && !option.correct && 'opacity-50',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-xs uppercase tracking-[0.14em] text-text">
                  {option.label}
                </span>
                {wasWrong && <XCircle size={14} className="text-red" aria-hidden="true" />}
                {chosen && option.correct && <CheckCircle2 size={14} className="text-green" aria-hidden="true" />}
              </span>
              {option.code && (
                <code className="mt-1 block break-all font-mono text-[11px] text-cyan/90">{option.code}</code>
              )}
            </button>
          )
        })}
      </div>

      {outcome && (
        <div
          aria-live="polite"
          className={cn(
            'rounded border p-3',
            outcome.correct ? 'border-green/40 bg-green/[0.05]' : 'border-amber/50 bg-amber/[0.06]',
          )}
        >
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <Play size={11} aria-hidden="true" />
            Simulation output
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded border border-border bg-bg/70 p-3 font-mono text-xs text-text">
            {outcome.result.output}
            {outcome.result.state ? `\n${outcome.result.state}` : ''}
          </pre>
          <p className="mt-2 flex items-start gap-2 text-xs text-muted">
            {outcome.correct ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
            ) : (
              <XCircle size={14} className="mt-0.5 shrink-0 text-red" aria-hidden="true" />
            )}
            <span>{scenarios[index]?.options.find((item) => item.id === outcome.optionId)?.explanation}</span>
          </p>
        </div>
      )}

      {isSolved && (
        <NeonButton onClick={advance} data-testid="choice-continue">
          {index + 1 < scenarios.length ? 'Next scenario' : 'Finish'}
          <ChevronRight size={14} aria-hidden="true" />
        </NeonButton>
      )}
    </div>
  )
}
