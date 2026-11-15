// Level 06 challenge registry: maps stage and side-op ids to the lab bench components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { CoverageCasino } from './CoverageCasino'
import { DistributionDetective } from './DistributionDetective'
import { ProbabilityLab } from './ProbabilityLab'
import { SamplingLab } from './SamplingLab'
import { VerdictLab } from './VerdictLab'

export function renderL06Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l6-stage-1':
      return <ProbabilityLab {...props} />
    case 'l6-stage-2':
      return <SamplingLab {...props} />
    case 'l6-stage-3':
      return <VerdictLab {...props} />
    case 'l6-side-1':
      return <DistributionDetective {...props} />
    case 'l6-side-2':
      return <CoverageCasino {...props} />
    default:
      return null
  }
}
