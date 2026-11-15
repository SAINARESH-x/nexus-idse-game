// Level 04 runtime: custom main mission, briefing actions and debrief; side ops run in the shared MissionShell.
import { createElement } from 'react'
import type { LevelRuntime } from '../../game/levels/runtime'
import type { ChallengeProps } from '../../game/types'
import { BriefingActions } from './BriefingActions'
import { GhostHuntChallenge } from './GhostHuntChallenge'
import { L04Debrief } from './L04Debrief'
import { L04Mission } from './L04Mission'
import { PipelineOrderChallenge } from './PipelineOrderChallenge'

function renderL04Challenge(challengeId: string, props: ChallengeProps) {
  if (challengeId === 'l4-side-1') return createElement(GhostHuntChallenge, props)
  if (challengeId === 'l4-side-2') return createElement(PipelineOrderChallenge, props)
  return null
}

export const L04_RUNTIME: LevelRuntime = {
  MainMission: L04Mission,
  BriefingActions,
  Debrief: L04Debrief,
  renderChallenge: renderL04Challenge,
  sideObjectives: {
    'l4-side-1': [{ id: 'l4-side-1-obj', label: 'Select the fabricated enrolments (F1 of at least 75%)' }],
    'l4-side-2': [{ id: 'l4-side-2-obj', label: 'Order the six steps so the pipeline reaches integrity 85 with clean checks' }],
  },
}
