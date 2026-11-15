// Level 01 content: mission stages, side operations, objectives and transmissions.
import type { SideOpDef, StageDef } from '../../game/types'
import type { MissionObjectiveDef } from '../../shell/useObjectives'

export const L01_STAGES: StageDef[] = [
  {
    id: 'l1-stage-1',
    title: 'INTAKE SORTING',
    subtitle: 'Name the primitive before NEXUS can reason about it',
    hints: [
      'Quotes decide strings: \'42\' is text, 42 is an integer.',
      'A decimal point makes a float, even in 3.0 or 4.2e1.',
      'True and False are booleans. None has its own type, NoneType.',
    ],
  },
  {
    id: 'l1-stage-2',
    title: 'DECODE THE TRANSMISSION',
    subtitle: 'Build a string pipeline and read the live result',
    hints: [
      'Chain strip() before splitting so padding does not pollute the fields.',
      "After split('|'), index 0 is the user field, 1 is the date and 2 is the status.",
      'The username is after the colon; the status is after STATUS=. Lowercase the status last.',
    ],
  },
  {
    id: 'l1-stage-3',
    title: 'FILE THE EVIDENCE',
    subtitle: 'Choose the collection that survives the mission',
    hints: [
      'Order matters for routes; uniqueness matters for visitor IDs.',
      'Tuples are immutable: assigning to an element raises TypeError.',
      'A dict maps a key to a record; .get() supplies a fallback for missing keys.',
    ],
  },
]

export const L01_SIDE_OPS: SideOpDef[] = [
  {
    id: 'l1-side-1',
    title: 'TYPE TRAP',
    blurb: 'Predict what six Python expressions actually return. Quotes, coercions and integer division are waiting.',
    hints: [
      "Quotes around digits make a string; + concatenates strings.",
      "int('3.7') fails because int() does not parse a decimal from a string.",
      "bool('False') is True: any non-empty string is truthy.",
    ],
  },
  {
    id: 'l1-side-2',
    title: 'DICT DETECTIVE',
    blurb: 'Eight student records are nested in one dict. Build the access chains that retrieve four exact answers.',
    hints: [
      'Start at d, then chain one key or index per access.',
      'Marks is a list, so use an integer index on it.',
      ".get('email', 'not found') returns the fallback when the key is absent.",
    ],
  },
]

export const L01_OBJECTIVES: MissionObjectiveDef[] = [
  { id: 'l1-obj-classify', label: 'Classify all twelve intake values by Python type' },
  { id: 'l1-obj-decode', label: 'Decode a transmission line with a string pipeline' },
  { id: 'l1-obj-file', label: 'File the evidence under the right collection type' },
]

export const L01_SIDE_OBJECTIVES: Record<string, MissionObjectiveDef[]> = {
  'l1-side-1': [{ id: 'l1-side-1-obj', label: 'Predict all six expression outputs' }],
  'l1-side-2': [{ id: 'l1-side-2-obj', label: 'Complete four dictionary access chains' }],
}

export interface TransmissionLine {
  id: string
  raw: string
  username: string
  date: string
  /** Canonical lowercase status target. */
  status: string
  easterEgg?: boolean
}

export const L01_TRANSMISSIONS: TransmissionLine[] = [
  {
    id: 'l1-line-1',
    raw: '  usr:ARJUN_k | 2025-03-07 | STATUS=ok  ',
    username: 'ARJUN_k',
    date: '2025-03-07',
    status: 'ok',
  },
  {
    id: 'l1-line-2',
    raw: ' usr:MEI_LIN|2025-03-08|STATUS=DELAYED ',
    username: 'MEI_LIN',
    date: '2025-03-08',
    status: 'delayed',
  },
  {
    id: 'l1-line-3',
    raw: 'usr:ZARA_9 | 2025-03-09 | STATUS=OK',
    username: 'ZARA_9',
    date: '2025-03-09',
    status: 'ok',
  },
  {
    id: 'l1-line-4',
    raw: '  usr:OMAR_X | 2025-03-10 | STATUS=FAILED   ',
    username: 'OMAR_X',
    date: '2025-03-10',
    status: 'failed',
  },
  {
    id: 'l1-line-5',
    raw: 'usr:PRIYA_R|2025-03-11|STATUS=ok',
    username: 'PRIYA_R',
    date: '2025-03-11',
    status: 'ok',
  },
  {
    id: 'l1-line-6',
    raw: '  usr:NEXUS_ZERO | 2025-03-00 | STATUS=ghost  ',
    username: 'NEXUS_ZERO',
    date: '2025-03-00',
    status: 'ghost',
    easterEgg: true,
  },
]

export type TransmissionGoalId = 'username' | 'date' | 'status'

export interface TransmissionGoal {
  id: TransmissionGoalId
  label: string
  target: string
}

export function goalsForLine(line: TransmissionLine): TransmissionGoal[] {
  return [
    { id: 'username', label: 'Extract the username', target: line.username },
    { id: 'date', label: 'Extract the date', target: line.date },
    { id: 'status', label: 'Status in lowercase', target: line.status },
  ]
}
