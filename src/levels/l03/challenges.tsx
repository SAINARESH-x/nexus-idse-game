// Level 03 challenge registry: maps stage and side-op ids to playable components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { ArrayWorkbenchChallenge } from './ArrayWorkbenchChallenge'
import { SliceLabChallenge } from './SliceLabChallenge'
import { VectorLabChallenge } from './VectorLabChallenge'
import { ReshapeRushChallenge } from './ReshapeRushChallenge'
import { MaskMasterChallenge } from './MaskMasterChallenge'

export function renderL03Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l3-stage-1':
      return <ArrayWorkbenchChallenge {...props} />
    case 'l3-stage-2':
      return <SliceLabChallenge {...props} />
    case 'l3-stage-3':
      return <VectorLabChallenge {...props} />
    case 'l3-side-1':
      return <ReshapeRushChallenge {...props} />
    case 'l3-side-2':
      return <MaskMasterChallenge {...props} />
    default:
      return null
  }
}