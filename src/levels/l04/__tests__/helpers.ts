// Shared Level 04 test helpers: the golden 9-command script and a save unlocked up to Level 4.
import { DEV_DEMO_AGGREGATE } from '../../../game/config'
import { useGameStore } from '../../../game/store'

export const SCRIPT = [
  'df = df.drop_duplicates()',
  "df['department'] = df['department'].str.strip().str.title()",
  "df['department'] = df['department'].replace({'Cs': 'Computer Science', 'Comp Sci': 'Computer Science', 'Mech': 'Mechanical'})",
  "df['attendance'] = df['attendance'].str.replace('%', '').astype(float)",
  "df['attendance'] = df['attendance'].fillna(df['attendance'].median())",
  "df.loc[(df['age'] < 16) | (df['age'] > 40), 'age'] = np.nan",
  "df['age'] = df['age'].fillna(df['age'].median())",
  "df.loc[(df['cgpa'] < 0) | (df['cgpa'] > 10), 'cgpa'] = np.nan",
  "df['cgpa'] = df['cgpa'].fillna(df['cgpa'].median())",
]

export function unlockTo4() {
  useGameStore.getState().newGame('Tester')
  for (const id of [1, 2, 3] as const) useGameStore.getState().completeMission(id, DEV_DEMO_AGGREGATE)
}

