// Level 01 challenge registry: maps stage and side-op ids to playable components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { DragSortChallenge } from './DragSortChallenge'
import { StringLabChallenge } from './StringLabChallenge'
import { ChoiceChallenge } from './ChoiceChallenge'
import { TypeTrapChallenge } from './TypeTrapChallenge'
import { DictDetectiveChallenge } from './DictDetectiveChallenge'

export function renderL01Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l1-stage-1':
      return <DragSortChallenge {...props} />
    case 'l1-stage-2':
      return <StringLabChallenge {...props} />
    case 'l1-stage-3':
      return <ChoiceChallenge {...props} />
    case 'l1-side-1':
      return <TypeTrapChallenge {...props} />
    case 'l1-side-2':
      return <DictDetectiveChallenge {...props} />
    default:
      return null
  }
}
