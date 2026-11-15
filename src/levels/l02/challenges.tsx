// Level 02 challenge registry: maps stage and side-op ids to playable components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { RuleBuilderChallenge } from './RuleBuilderChallenge'
import { LoopLabChallenge } from './LoopLabChallenge'
import { FunctionForgeChallenge } from './FunctionForgeChallenge'
import { OffByOneChallenge } from './OffByOneChallenge'
import { BooleanGauntletChallenge } from './BooleanGauntletChallenge'

export function renderL02Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l2-stage-1':
      return <RuleBuilderChallenge {...props} />
    case 'l2-stage-2':
      return <LoopLabChallenge {...props} />
    case 'l2-stage-3':
      return <FunctionForgeChallenge {...props} />
    case 'l2-side-1':
      return <OffByOneChallenge {...props} />
    case 'l2-side-2':
      return <BooleanGauntletChallenge {...props} />
    default:
      return null
  }
}
