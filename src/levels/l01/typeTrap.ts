// Side op 1 data: six expressions with a precomputed, explained result table.
export interface TypeTrapQuestion {
  id: string
  expression: string
  /** Normalised canonical answer. */
  answer: string
  display: string
  accepted: string[]
  kind: 'value' | 'error'
  explanation: string
}

export const L01_TYPE_TRAP: TypeTrapQuestion[] = [
  {
    id: 'trap-1',
    expression: "'5' + '5'",
    answer: '55',
    display: "'55'",
    accepted: ['55'],
    kind: 'value',
    explanation: "Both operands are strings, so + concatenates them into '55', not 10.",
  },
  {
    id: 'trap-2',
    expression: "5 + '5'",
    answer: 'typeerror',
    display: 'TypeError',
    accepted: ['typeerror', 'type error'],
    kind: 'error',
    explanation: 'Python does not add an int to a str. It raises TypeError; convert one side first.',
  },
  {
    id: 'trap-3',
    expression: "int('3.7')",
    answer: 'valueerror',
    display: 'ValueError',
    accepted: ['valueerror', 'value error'],
    kind: 'error',
    explanation: "int() parses whole-number strings. Use int(float('3.7')) to get 3, or float('3.7') for 3.7.",
  },
  {
    id: 'trap-4',
    expression: "bool('False')",
    answer: 'true',
    display: 'True',
    accepted: ['true'],
    kind: 'value',
    explanation: "A non-empty string is truthy. bool('False') is True; compare the text to 'False' instead.",
  },
  {
    id: 'trap-5',
    expression: '7 // 2',
    answer: '3',
    display: '3',
    accepted: ['3'],
    kind: 'value',
    explanation: 'Floor division returns an int: 7 // 2 is 3. True division 7 / 2 is 3.5.',
  },
  {
    id: 'trap-6',
    expression: 'len([[1, 2], [3, 4, 5]])',
    answer: '2',
    display: '2',
    accepted: ['2'],
    kind: 'value',
    explanation: 'len() counts the two outer elements. It does not flatten the nested lists.',
  },
]

export function normalizeTypeAnswer(input: string): string {
  const text = input.trim().toLowerCase().replace(/`/g, '').replace(/\s+/g, ' ')
  if (text.startsWith('typeerror') || text === 'type error') return 'typeerror'
  if (text.startsWith('valueerror') || text === 'value error') return 'valueerror'
  const quoted = /^(['"])(.*)\1$/.exec(text)
  return quoted ? quoted[2] : text
}

export function checkTypeAnswer(question: TypeTrapQuestion, input: string): boolean {
  const value = normalizeTypeAnswer(input)
  return question.accepted.some((answer) => normalizeTypeAnswer(answer) === value)
}
