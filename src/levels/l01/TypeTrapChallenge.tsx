// Side op 1 challenge: type a predicted output; the table executes and explains it.
import { useRef, useState } from 'react'
import { CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { NeonButton } from '../../ui/NeonButton'
import { cn } from '../../ui/cn'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { checkTypeAnswer, L01_TYPE_TRAP } from './typeTrap'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

interface Feedback {
  questionId: string
  correct: boolean
}

export function TypeTrapChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [mistakes, setMistakes] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const decisions = useRef<Decision[]>([])
  const completed = useRef(false)

  const question = L01_TYPE_TRAP[index]
  const answered = feedback?.questionId === question.id
  const isCorrect = answered && feedback?.correct === true

  const submit = () => {
    if (!input.trim() || isCorrect) return
    const attempt = (attempts[question.id] ?? 0) + 1
    setAttempts((current) => ({ ...current, [question.id]: attempt }))
    const correct = checkTypeAnswer(question, input)
    setFeedback({ questionId: question.id, correct })
    decisions.current.push({
      label: `Predicted ${question.expression}`,
      good: correct,
      explanation: question.explanation,
    })
    if (correct) {
      if (attempt === 1) setFirstTry((current) => current + 1)
      ui.log({ title: 'Prediction correct', detail: question.explanation, tone: 'good' })
    } else {
      setMistakes((current) => current + 1)
      ui.log({ title: 'Prediction failed', detail: question.explanation, tone: 'bad' })
    }
  }

  const advance = () => {
    if (!isCorrect) return
    if (index + 1 < L01_TYPE_TRAP.length) {
      setIndex((current) => current + 1)
      setInput('')
      setFeedback(null)
      return
    }
    if (completed.current) return
    completed.current = true
    ui.completeObjective('l1-side-1-obj')
    ui.log({ title: 'Type trap cleared', detail: 'All six expression outputs predicted.', tone: 'good' })
    onComplete({
      id,
      accuracy: clamp01(firstTry / L01_TYPE_TRAP.length),
      decisionQuality: clamp01(firstTry / Math.max(1, firstTry + mistakes)),
      efficiency: Math.min(
        1,
        Math.max(0.3, L01_TYPE_TRAP.length / Math.max(1, L01_TYPE_TRAP.length + mistakes)),
      ),
      hintsUsed: 0,
      mistakes,
      decisions: decisions.current,
      extra: { firstTryCorrect: firstTry },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
          Expression {index + 1}/{L01_TYPE_TRAP.length}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {firstTry} first-try correct
        </p>
      </div>

      <div className="rounded border border-border bg-panel2/70 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Predict the output</p>
        <pre className="mt-2 overflow-x-auto rounded border border-border bg-bg/70 p-3 font-mono text-sm text-cyan">
          {question.expression}
        </pre>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <label className="min-w-[180px] flex-1 text-[10px] uppercase tracking-[0.14em] text-muted">
            Your answer
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isCorrect}
              placeholder={question.kind === 'error' ? 'e.g. TypeError' : 'e.g. 3.5'}
              data-testid="type-trap-input"
              className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-text disabled:opacity-60"
            />
          </label>
          <NeonButton type="submit" disabled={!input.trim() || isCorrect} data-testid="type-trap-submit">
            Execute prediction
          </NeonButton>
        </form>
      </div>

      {answered && (
        <div
          aria-live="polite"
          className={cn(
            'rounded border p-3 text-sm',
            isCorrect ? 'border-green/50 bg-green/[0.06]' : 'border-amber/50 bg-amber/[0.06]',
          )}
        >
          <p className={cn('flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]', isCorrect ? 'text-green' : 'text-amber')}>
            {isCorrect ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : (
              <XCircle size={13} aria-hidden="true" />
            )}
            {isCorrect ? `Output confirmed: ${question.display}` : 'Not the output this expression produces'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{question.explanation}</p>
          {isCorrect && (
            <NeonButton className="mt-3" size="sm" onClick={advance} data-testid="type-trap-next">
              {index + 1 < L01_TYPE_TRAP.length ? 'Next expression' : 'Finish side op'}
              <ChevronRight size={13} aria-hidden="true" />
            </NeonButton>
          )}
        </div>
      )}
    </div>
  )
}
