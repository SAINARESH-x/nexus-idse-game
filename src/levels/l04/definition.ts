// Level 04 definition: DATA VAULT / THE PURGE, four stages, two side ops and three bonuses (one hidden).
import type { LevelDefinition } from '../../game/types'
import { ghostHunter, parOrBetter, zeroCasualties } from './bonuses'

export const LEVEL_4: LevelDefinition = {
  id: 4,
  title: 'DATA VAULT',
  syllabus: 'Pandas: tabular data, cleaning and validation',
  mission: 'THE PURGE',
  briefing:
    'The student records that broke NEXUS are sealed in the vault: copies, blanks, impossible ages, labels that disagree, and a few enrolments that never existed. Inspect the table, name every problem, repair it with real pandas operations, then prove the result in an integrity audit. Every click is a pandas command, and every decision is judged.',
  objectives: [
    'Inspect the table before touching it (shape and dtypes)',
    'File a corruption report: flag each problem with the right category',
    'Repair the data without deleting real students or inventing values',
    'Pass the integrity checks and submit for audit',
  ],
  stages: [
    {
      id: 'l4-stage-1',
      title: 'DATABASE BREACH',
      subtitle: 'Inspect before you edit',
      hints: [
        'Open the Dataset Info panel on the left. Shape and Dtypes are the first two things an analyst checks.',
        'df.dtypes shows attendance as object: numbers stored as text. Look for blanks (NaN) and values that cannot be true.',
        'Pick the FLAG tool and click any three suspicious cells, for example a NaN attendance, an age of 199 or a department written CS.',
      ],
    },
    {
      id: 'l4-stage-2',
      title: 'IDENTIFY THE CORRUPTION',
      subtitle: 'Name every problem',
      hints: [
        'Use a different brush for each kind: Missing for NaN, Duplicate for a repeated row, Inconsistent text for odd department labels.',
        'Wrong type is a column problem: with that brush, click the attendance column header. Invalid value is for impossible ages and cgpa above 10.',
        'df.duplicated() marks the SECOND copy of a row. Rows with attendance exactly 100 and cgpa exactly 10.0 deserve the Anomaly brush.',
      ],
    },
    {
      id: 'l4-stage-3',
      title: 'DATA RECONSTRUCTION',
      subtitle: 'Repair with a reason',
      hints: [
        'Order matters: standardise department text (strip, title, replace) before dropping duplicates, and remove the % before converting attendance.',
        'Fill blanks with the median instead of dropping rows; mask impossible values to NaN with df.loc[...] = np.nan, then fill them.',
        "The Builder can make: df['attendance'] = df['attendance'].str.replace('%', '').astype(float), then fillna(df['attendance'].median()).",
      ],
    },
    {
      id: 'l4-stage-4',
      title: 'INTEGRITY CHECK',
      subtitle: 'Prove the result',
      hints: [
        'Run the integrity checks: each one is a pandas command you could type yourself.',
        'If a check fails, go BACK to the tools; your work is preserved.',
        'Integrity rewards fixed issues, kept students and good decisions. Efficiency rewards reaching that with few operations.',
      ],
    },
  ],
  sideOps: [
    {
      id: 'l4-side-1',
      title: 'GHOST HUNT',
      blurb: 'Four enrolments never existed. Find them in the cleaned table without deleting real students.',
      hints: [
        'Sort by attendance and by cgpa. Real students are rarely perfect.',
        'Look for rows with attendance exactly 100 AND cgpa exactly 10.0.',
        'Every ghost also has dropped_out = 0. An outlier is unusual; a fabricated record is too perfect on every field.',
      ],
    },
    {
      id: 'l4-side-2',
      title: 'PIPELINE ORDER',
      blurb: 'Order six cleaning steps so every step runs on data that is ready for it.',
      hints: [
        'A step that needs numbers must run after the step that turns text into numbers.',
        'Near-duplicates only become exact copies once the text is standardised.',
        'Department first, then duplicates, then attendance type, then the fills.',
      ],
    },
  ],
  bonuses: [
    {
      id: 'l4-bonus-1',
      title: 'ZERO CASUALTIES',
      description: 'Keep every legitimate student and leave no bad decision in place.',
      hidden: false,
      evaluate: zeroCasualties,
    },
    {
      id: 'l4-bonus-2',
      title: 'PAR OR BETTER',
      description: 'Finish with no more history entries than the par for your clearance tier.',
      hidden: false,
      evaluate: parOrBetter,
    },
    {
      id: 'l4-bonus-hidden',
      title: 'GHOST HUNTER',
      description: 'Flag at least three of the four fabricated enrolments with the Anomaly brush.',
      hidden: true,
      evaluate: ghostHunter,
    },
  ],
  fragmentId: 'F4',
}
