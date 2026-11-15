// Level 07 objectives shown in the mission checklist.
import type { MissionObjectiveDef } from '../../shell/useObjectives'

export const L07_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l7-obj-line', label: 'Fit study_hours vs cgpa within 15 percent of the least-squares SSE' },
  { id: 'l7-obj-model', label: 'Build a leak-free model within 5 percent of the best legitimate test r2' },
  { id: 'l7-obj-forecast', label: 'Pick the validation degree and submit the final forecast' },
]

export const L07_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l7-side-1': [{ id: 'l7-side-1-obj', label: 'Measure the leave-one-out slope change and decide on removal' }],
  'l7-side-2': [{ id: 'l7-side-2-obj', label: 'Diagnose and fix all three residual plots' }],
}
