// Level 07 challenge registry: maps stage and side-op ids to playable components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { ForecastStage } from './ForecastStage'
import { LineFitLab } from './LineFitLab'
import { ModelWorkshop } from './ModelWorkshop'
import { OutlierInfluence } from './OutlierInfluence'
import { ResidualReading } from './ResidualReading'

export function renderL07Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l7-stage-1':
      return <LineFitLab {...props} />
    case 'l7-stage-2':
      return <ModelWorkshop {...props} />
    case 'l7-stage-3':
      return <ForecastStage {...props} />
    case 'l7-side-1':
      return <OutlierInfluence {...props} />
    case 'l7-side-2':
      return <ResidualReading {...props} />
    default:
      return null
  }
}
