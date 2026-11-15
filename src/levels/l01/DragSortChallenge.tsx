// Stage 1 challenge: place twelve raw values into the seven Python type bins.
import { useRef } from 'react'
import { DragSort } from '../../components/mechanics/DragSort'
import type { DragSortSummary } from '../../components/mechanics/DragSort'
import type { DragSortBin, DragSortItem } from '../../components/mechanics/dragSortLogic'
import type { ChallengeProps, Decision } from '../../game/types'
import { useMissionUi } from '../../shell/MissionUi'
import { L01_TYPE_BINS, L01_TYPE_ITEMS } from './typeSort'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function DragSortChallenge({ id, onComplete }: ChallengeProps) {
  const ui = useMissionUi()
  const decisions = useRef<Decision[]>([])

  const place = (item: DragSortItem, bin: DragSortBin, correct: boolean, message: string) => {
    if (correct) return
    decisions.current.push({
      label: `Dropped ${item.label} into ${bin.id}`,
      good: false,
      explanation: message,
    })
    ui.log({ title: `${item.label} rejected from ${bin.id}`, detail: message, tone: 'bad' })
  }

  const complete = (summary: DragSortSummary) => {
    const accuracy = clamp01(summary.firstTryCorrect / L01_TYPE_ITEMS.length)
    const efficiency = Math.min(
      1,
      Math.max(0.3, L01_TYPE_ITEMS.length / Math.max(1, L01_TYPE_ITEMS.length + summary.mistakes)),
    )
    decisions.current.push({
      label: 'Classified every intake value',
      good: true,
      explanation:
        'Each literal now has a Python type. Quotes create strings, decimal points create floats, and collections have their own constructors.',
    })
    ui.completeObjective('l1-obj-classify')
    ui.log({
      title: 'Intake sorted',
      detail: `${L01_TYPE_ITEMS.length} values classified with ${summary.mistakes} wrong drop(s).`,
      tone: 'good',
    })
    onComplete({
      id,
      accuracy,
      decisionQuality: accuracy,
      efficiency,
      hintsUsed: 0,
      mistakes: summary.mistakes,
      decisions: decisions.current,
      extra: { firstTryCorrect: summary.firstTryCorrect },
    })
  }

  return (
    <DragSort
      items={L01_TYPE_ITEMS}
      bins={L01_TYPE_BINS}
      onPlace={place}
      onComplete={complete}
      label="Raw intake values"
    />
  )
}
