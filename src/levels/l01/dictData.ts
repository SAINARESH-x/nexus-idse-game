// Side op 2 data: eight nested student records, chips and four retrieval tasks.
import type { AccessOp } from './dictAccess'

export interface StudentRecord {
  name: string
  marks: number[]
  city: string
  email?: string
}

export const L01_STUDENT_RECORDS: Record<string, StudentRecord> = {
  s1: { name: 'AARAV', marks: [78, 85, 91], city: 'Pune' },
  s2: { name: 'MEI_LIN', marks: [88, 92, 79], city: 'Singapore' },
  s3: { name: 'ZARA_9', marks: [72, 88, 95], city: 'Mumbai' },
  s4: { name: 'OMAR_X', marks: [64, 70, 81], city: 'Lucknow' },
  s5: { name: 'PRIYA_R', marks: [95, 91, 89], city: 'Chennai' },
  s6: { name: 'ARJUN_k', marks: [81, 77, 84], city: 'Hyderabad' },
  s7: { name: 'NOOR_S', marks: [69, 74, 88], city: 'Kolkata' },
  s8: { name: 'KAVI_M', marks: [90, 86, 93], city: 'Bengaluru' },
}

export interface AccessChip {
  id: string
  label: string
  op: AccessOp
}

const studentChips: AccessChip[] = Object.keys(L01_STUDENT_RECORDS).map((key) => ({
  id: `key-${key}`,
  label: `['${key}']`,
  op: { kind: 'key', key },
}))

export const L01_ACCESS_CHIPS: AccessChip[] = [
  ...studentChips,
  { id: 'field-name', label: "['name']", op: { kind: 'key', key: 'name' } },
  { id: 'field-marks', label: "['marks']", op: { kind: 'key', key: 'marks' } },
  { id: 'field-city', label: "['city']", op: { kind: 'key', key: 'city' } },
  { id: 'field-email', label: "['email']", op: { kind: 'key', key: 'email' } },
  { id: 'index-0', label: '[0]', op: { kind: 'index', index: 0 } },
  { id: 'index-1', label: '[1]', op: { kind: 'index', index: 1 } },
  { id: 'index-2', label: '[2]', op: { kind: 'index', index: 2 } },
  { id: 'get-email', label: ".get('email', 'not found')", op: { kind: 'get', key: 'email', fallback: 'not found' } },
  { id: 'keys', label: '.keys()', op: { kind: 'keys' } },
]

export interface DictTask {
  id: string
  prompt: string
  target: string
  explanation: string
  solution: AccessOp[]
}

export const L01_DICT_TASKS: DictTask[] = [
  {
    id: 'task-mark',
    prompt: "Read s3's second mark. Use the record key, then the marks list, then index 1.",
    target: '88',
    explanation: "d['s3']['marks'][1] reaches the second mark because Python lists are indexed from zero.",
    solution: [
      { kind: 'key', key: 's3' },
      { kind: 'key', key: 'marks' },
      { kind: 'index', index: 1 },
    ],
  },
  {
    id: 'task-city',
    prompt: "Read s7's city.",
    target: 'Kolkata',
    explanation: "d['s7']['city'] follows two keys: the student ID and the field name.",
    solution: [
      { kind: 'key', key: 's7' },
      { kind: 'key', key: 'city' },
    ],
  },
  {
    id: 'task-email',
    prompt: "Read s1's email, falling back to 'not found' when the key is absent.",
    target: 'not found',
    explanation: ".get('email', 'not found') returns the fallback instead of raising KeyError.",
    solution: [
      { kind: 'key', key: 's1' },
      { kind: 'get', key: 'email', fallback: 'not found' },
    ],
  },
  {
    id: 'task-keys',
    prompt: 'List every top-level student key in the dict.',
    target: 's1, s2, s3, s4, s5, s6, s7, s8',
    explanation: '.keys() returns a view of the keys; display turns it into the ordered list of student IDs.',
    solution: [{ kind: 'keys' }],
  },
]
