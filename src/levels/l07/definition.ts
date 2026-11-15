// Level 07 definition: PREDICTION CORE / FINAL FORECAST (regression, evaluation, overfitting).
import type { LevelDefinition } from '../../game/types'
import { honestModel, leakDetector, minimalist } from './bonuses'

export const LEVEL_7: LevelDefinition = {
  id: 7,
  title: 'PREDICTION CORE',
  syllabus: 'Regression, model evaluation and overfitting',
  mission: 'FINAL FORECAST',
  briefing:
    'The Dean needs a forecast of student cgpa from habits before the semester starts, and the board will check it on students the model has never seen. Fit a line, build and evaluate a model, avoid the overfit trap and submit one honest forecast.',
  objectives: [
    'Fit a line by hand close to the least-squares minimum',
    'Build a model that matches the best legitimate model without leaking the answer',
    'Pick the degree validation prefers, then submit a final forecast on the sealed hold-out',
  ],
  stages: [
    {
      id: 'l7-stage-1',
      title: 'FIT THE LINE',
      subtitle: 'Least squares by hand',
      hints: [
        'Watch the residual segments: the best line makes them small on both sides.',
        'Adjust the intercept first to centre the cloud, then tilt with the slope.',
        'SSE only needs to be within 15 percent of the minimum; you do not need the exact line.',
      ],
    },
    {
      id: 'l7-stage-2',
      title: 'BUILD AND EVALUATE',
      subtitle: 'Features, split, metrics',
      hints: [
        'Judge models by TEST r2, not training r2.',
        'attendance and study_hours carry most of the signal; sleep_hours is the next useful feature.',
        'final_grade_points only exists after cgpa is known: that is a leak.',
      ],
    },
    {
      id: 'l7-stage-3',
      title: 'OVERFIT TRAP AND FINAL FORECAST',
      subtitle: 'Validation, then the sealed hold-out',
      hints: [
        'Training RMSE always falls as degree rises; follow the validation curve instead.',
        'Choose the final model with validation numbers only, then submit once.',
        'Only the first submission is scored; later ones mark the run as peeked.',
      ],
    },
  ],
  sideOps: [
    {
      id: 'l7-side-1',
      title: 'OUTLIER INFLUENCE',
      blurb: 'Move one extreme point and measure how much it bends the line.',
      hints: [
        'Move the extreme point and watch the slope change.',
        'Toggle EXCLUDE to see the leave-one-out slope.',
        'Removing a point is justified by evidence about the record, not by its influence.',
      ],
    },
    {
      id: 'l7-side-2',
      title: 'RESIDUAL READING',
      blurb: 'Diagnose three residual plots and apply the right fix.',
      hints: [
        'A healthy residual plot is a shapeless band around zero.',
        'A U or arch shape means a missing squared term.',
        'A funnel (spread grows with the fit) suggests a log transform of the target.',
      ],
    },
  ],
  bonuses: [
    {
      id: 'l7-bonus-1',
      title: 'HONEST MODEL',
      description: 'Scored hold-out r2 within 0.05 of validation r2, no peeking and no leak feature.',
      hidden: false,
      evaluate: honestModel,
    },
    {
      id: 'l7-bonus-2',
      title: 'MINIMALIST',
      description: 'Reach a test r2 within 10 percent of the best legitimate model using at most 2 features.',
      hidden: false,
      evaluate: minimalist,
    },
    {
      id: 'l7-bonus-hidden',
      title: 'LEAK DETECTOR',
      description: 'Report the column that could not exist before cgpa.',
      hidden: true,
      evaluate: leakDetector,
    },
  ],
  fragmentId: 'F7',
}
