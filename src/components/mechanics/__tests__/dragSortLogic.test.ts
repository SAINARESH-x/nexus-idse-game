// Tests for DragSort placement, retry and validation logic.
import { describe, expect, it } from 'vitest'
import {
  attemptDrop,
  createDragSortState,
  firstTryCorrect,
  isSolved,
  remainingItems,
} from '../dragSortLogic'
import type { DragSortItem } from '../dragSortLogic'

const items: DragSortItem[] = [
  { id: 'a', label: '42', binId: 'int', explanation: 'A whole number is an int.' },
  { id: 'b', label: "'42'", binId: 'str', explanation: 'Quotes make a string.' },
]

describe('drag-sort validation', () => {
  it('places a correct item without a mistake', () => {
    const state = attemptDrop(createDragSortState(), items[0], 'int')
    expect(state.placements).toEqual({ a: 'int' })
    expect(state.mistakes).toBe(0)
    expect(state.feedback?.correct).toBe(true)
  })

  it('rejects a wrong drop, explains it and leaves the item available', () => {
    const state = attemptDrop(createDragSortState(), items[0], 'str')
    expect(state.placements).toEqual({})
    expect(state.mistakes).toBe(1)
    expect(state.mistakesByItem.a).toBe(1)
    expect(state.feedback?.correct).toBe(false)
    expect(state.feedback?.message).toBe('A whole number is an int.')
    expect(remainingItems(state, items)).toHaveLength(2)
  })

  it('increments mistakes on every wrong retry', () => {
    const first = attemptDrop(createDragSortState(), items[1], 'int')
    const second = attemptDrop(first, items[1], 'bool')
    expect(second.mistakes).toBe(2)
    expect(second.mistakesByItem.b).toBe(2)
  })

  it('ignores a drop for an already placed item', () => {
    const placed = attemptDrop(createDragSortState(), items[0], 'int')
    const again = attemptDrop(placed, items[0], 'str')
    expect(again).toBe(placed)
  })

  it('detects a solved board and counts first-try items', () => {
    let state = attemptDrop(createDragSortState(), items[0], 'int')
    state = attemptDrop(state, items[1], 'bool')
    state = attemptDrop(state, items[1], 'str')
    expect(isSolved(state, items)).toBe(true)
    expect(firstTryCorrect(state, items)).toBe(1)
    expect(remainingItems(state, items)).toHaveLength(0)
  })

  it('uses a fallback explanation when an item has none', () => {
    const plain: DragSortItem = { id: 'c', label: 'None', binId: 'none' }
    const state = attemptDrop(createDragSortState(), plain, 'str')
    expect(state.feedback?.message).toContain('is not a str')
  })
})
