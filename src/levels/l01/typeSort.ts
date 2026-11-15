// Stage 1 content: twelve raw values and the seven Python type bins.
import type { DragSortBin, DragSortItem } from '../../components/mechanics/dragSortLogic'

export const L01_TYPE_BINS: DragSortBin[] = [
  { id: 'int', label: 'int', hint: 'Whole numbers' },
  { id: 'float', label: 'float', hint: 'Decimals and scientific notation' },
  { id: 'str', label: 'str', hint: 'Quoted text' },
  { id: 'bool', label: 'bool', hint: 'True or False' },
  { id: 'none', label: 'None', hint: 'NoneType' },
  { id: 'list', label: 'list', hint: 'Ordered and mutable' },
  { id: 'dict', label: 'dict', hint: 'Keyed records' },
]

export const L01_TYPE_ITEMS: DragSortItem[] = [
  {
    id: 'value-str-42',
    label: "'42'",
    binId: 'str',
    explanation: "Quotes make it a string. int('42') converts it, but the literal itself is str.",
  },
  {
    id: 'value-int-42',
    label: '42',
    binId: 'int',
    explanation: 'A whole number without a decimal point is an int.',
  },
  {
    id: 'value-float-sci',
    label: '4.2e1',
    binId: 'float',
    explanation: 'Scientific notation always produces a float, even though its value is 42.0.',
  },
  {
    id: 'value-true',
    label: 'True',
    binId: 'bool',
    explanation: "type(True) is bool. It is a boolean, not the string 'True'.",
  },
  {
    id: 'value-str-true',
    label: "'True'",
    binId: 'str',
    explanation: "Quoted, so it is a string. bool('True') is True only because any non-empty string is truthy.",
  },
  {
    id: 'value-none',
    label: 'None',
    binId: 'none',
    explanation: 'None is the single NoneType value, not a string and not zero.',
  },
  {
    id: 'value-empty-str',
    label: "''",
    binId: 'str',
    explanation: 'An empty string is still a string; its length is zero.',
  },
  {
    id: 'value-list',
    label: '[1, 2]',
    binId: 'list',
    explanation: 'Square brackets create a list. Order is preserved and values can be changed.',
  },
  {
    id: 'value-dict',
    label: "{'a': 1}",
    binId: 'dict',
    explanation: 'Braces with key: value pairs create a dict.',
  },
  {
    id: 'value-float-3',
    label: '3.0',
    binId: 'float',
    explanation: 'A decimal point makes it a float, even when the fraction is zero.',
  },
  {
    id: 'value-str-0',
    label: "'0'",
    binId: 'str',
    explanation: 'A string containing the character zero. It is not numeric until converted.',
  },
  {
    id: 'value-int-0',
    label: '0',
    binId: 'int',
    explanation: 'Integer zero. No quotes and no decimal point.',
  },
]
