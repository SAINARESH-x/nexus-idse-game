// Stage 3 challenge: run five collection choices and watch the consequences.
import { useRef } from 'react'
import { ChoiceSimulator } from '../../components/mechanics/ChoiceSimulator'
import type { ChoiceScenario, ChoiceSummary } from '../../components/mechanics/ChoiceSimulator'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { L01_CHOICE_SCENARIOS } from './choices'
import type { ChoiceOption } from '../../components/mechanics/ChoiceSimulator'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function ChoiceChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])

  const choose = (scenario: ChoiceScenario, option: ChoiceOption, correct: boolean) => {
    decisions.current.push({
      label: `${option.label} for ${scenario.title}`,
      good: correct,
      explanation: option.explanation,
    })
    ui.log({
      title: correct ? `${scenario.title}: choice holds` : `${scenario.title}: choice breaks`,
      detail: option.explanation,
      tone: correct ? 'good' : 'bad',
    })
  }

  const complete = (summary: ChoiceSummary) => {
    const attempts = summary.firstTryCorrect + summary.mistakes
    ui.completeObjective('l1-obj-file')
    ui.log({
      title: 'Evidence filed',
      detail: `${L01_CHOICE_SCENARIOS.length} collection choices resolved.`,
      tone: 'good',
    })
    onComplete({
      id,
      accuracy: clamp01(summary.firstTryCorrect / L01_CHOICE_SCENARIOS.length),
      decisionQuality: clamp01(summary.firstTryCorrect / Math.max(1, attempts)),
      efficiency: Math.min(
        1,
        Math.max(
          0.3,
          L01_CHOICE_SCENARIOS.length / Math.max(1, L01_CHOICE_SCENARIOS.length + summary.mistakes),
        ),
      ),
      hintsUsed: 0,
      mistakes: summary.mistakes,
      decisions: decisions.current,
      extra: { firstTryCorrect: summary.firstTryCorrect },
    })
  }

  return <ChoiceSimulator scenarios={L01_CHOICE_SCENARIOS} onChoice={choose} onComplete={complete} />
}
