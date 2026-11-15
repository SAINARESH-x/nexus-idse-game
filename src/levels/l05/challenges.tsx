// Level 05 challenge registry: maps stage and side-op ids to analysis-desk components.
import type { ReactNode } from 'react'
import type { ChallengeProps } from '../../game/types'
import { SummaryDesk } from './SummaryDesk'
import { ChartStudio } from './ChartStudio'
import { PatternHunt } from './PatternHunt'
import { MisleadingChart } from './MisleadingChart'
import { OutlierHunt } from './OutlierHunt'

export function renderL05Challenge(challengeId: string, props: ChallengeProps): ReactNode | null {
  switch (challengeId) {
    case 'l5-stage-1':
      return <SummaryDesk {...props} />
    case 'l5-stage-2':
      return <ChartStudio {...props} />
    case 'l5-stage-3':
      return <PatternHunt {...props} />
    case 'l5-side-1':
      return <MisleadingChart {...props} />
    case 'l5-side-2':
      return <OutlierHunt {...props} />
    default:
      return null
  }
}
