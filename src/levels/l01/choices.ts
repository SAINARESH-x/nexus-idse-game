// Stage 3 content: five collection scenarios whose consequences are simulated.
import type { ChoiceScenario } from '../../components/mechanics/ChoiceSimulator'

export const L01_CHOICE_SCENARIOS: ChoiceScenario[] = [
  {
    id: 'visitor-ids',
    title: 'UNIQUE VISITOR IDS',
    prompt:
      'Three pings arrive: 101, 102, 101. The dashboard needs the number of unique visitors, not the number of pings.',
    options: [
      {
        id: 'list',
        label: 'Use a list',
        code: 'ids = [101, 102, 101]',
        correct: false,
        simulate: () => ({
          ok: true,
          output: '[101, 102, 101]',
          state: 'len(ids) == 3',
        }),
        explanation: 'The duplicate remains, so a count of 3 overstates unique visitors.',
      },
      {
        id: 'set',
        label: 'Use a set',
        code: 'ids = {101, 102, 101}',
        correct: true,
        simulate: () => ({
          ok: true,
          output: '{101, 102}',
          state: 'len(ids) == 2',
        }),
        explanation: 'A set stores unique values. The duplicate disappears during construction.',
      },
    ],
  },
  {
    id: 'route-stops',
    title: 'ORDERED ROUTE STOPS',
    prompt:
      'Route B-17 visits Gate, Library then Lab. Dispatch needs the exact sequence, and a stop may repeat.',
    options: [
      {
        id: 'list',
        label: 'Use a list',
        code: "stops = ['Gate', 'Library', 'Lab']",
        correct: true,
        simulate: () => ({
          ok: true,
          output: "['Gate', 'Library', 'Lab']",
          state: "stops[0] == 'Gate'",
        }),
        explanation: 'A list preserves insertion order and supports duplicate stops.',
      },
      {
        id: 'set',
        label: 'Use a set',
        code: "stops = {'Gate', 'Library', 'Lab'}",
        correct: false,
        simulate: () => ({
          ok: false,
          output: "TypeError: 'set' object is not subscriptable",
          state: 'Order is not part of the contract.',
        }),
        explanation: 'Sets are unordered and reject indexing. Dispatch cannot rebuild the route from a set.',
      },
    ],
  },
  {
    id: 'gps-coordinate',
    title: 'FIXED GPS COORDINATE',
    prompt:
      'A campus gate has one fixed coordinate that must never be edited in place. Which container protects it?',
    options: [
      {
        id: 'tuple',
        label: 'Use a tuple',
        code: 'coord = (19.0760, 72.8777)',
        correct: true,
        simulate: () => ({
          ok: false,
          output: "TypeError: 'tuple' object does not support item assignment",
          state: 'coord still == (19.076, 72.8777)',
        }),
        explanation:
          'Tuples are immutable. A write attempt raises TypeError, which is exactly the protection a fixed coordinate needs.',
      },
      {
        id: 'list',
        label: 'Use a list',
        code: 'coord = [19.0760, 72.8777]',
        correct: false,
        simulate: () => ({
          ok: true,
          output: '[19.08, 72.8777]',
          state: 'coord was silently overwritten.',
        }),
        explanation: 'A list allows mutation. One careless assignment changes the gate position.',
      },
    ],
  },
  {
    id: 'student-lookup',
    title: 'STUDENT ID LOOKUP',
    prompt: 'You have a student ID such as s3 and need that student record without scanning every row.',
    options: [
      {
        id: 'dict',
        label: 'Use a dict',
        code: "records['s3']",
        correct: true,
        simulate: () => ({
          ok: true,
          output: "{'name': 'ZARA_9', 'marks': [72, 88, 95]}",
          state: 'One key lookup.',
        }),
        explanation: 'A dict maps a stable ID to its record. The key is the identifier, not a position.',
      },
      {
        id: 'list',
        label: 'Use a list',
        code: 'records[3]',
        correct: false,
        simulate: () => ({
          ok: true,
          output: "{'name': 'OMAR_X', 'marks': [64, 70, 81]}",
          state: 'Position 3 is not the same thing as ID s3.',
        }),
        explanation: 'A list position is not an ID. One inserted row shifts every record that follows.',
      },
    ],
  },
  {
    id: 'sensor-readings',
    title: 'DUPLICATE-PRONE READINGS',
    prompt:
      'Sensor S-4 logged 20, 21 and 20. The average needs every reading, including repeats. Which container keeps the evidence intact?',
    options: [
      {
        id: 'list',
        label: 'Use a list',
        code: 'readings = [20, 21, 20]',
        correct: true,
        simulate: () => ({
          ok: true,
          output: '[20, 21, 20]',
          state: 'mean == 20.33 (3 readings)',
        }),
        explanation: 'A list preserves every reading, so the sample size and the mean stay honest.',
      },
      {
        id: 'set',
        label: 'Use a set',
        code: 'readings = {20, 21, 20}',
        correct: false,
        simulate: () => ({
          ok: true,
          output: '{20, 21}',
          state: 'mean == 20.5 (2 readings, duplicate silently dropped)',
        }),
        explanation: 'A set silently drops the repeated reading and biases the mean. This is the trap.',
      },
    ],
  },
]
