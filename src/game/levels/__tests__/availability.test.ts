// Availability tests: the final build ships all seven levels as playable.
import { describe, expect, it } from 'vitest'
import { LEVEL_IDS } from '../../config'
import { PLAYABLE_LEVEL_IDS, isLevelInDevelopment } from '../availability'

describe('level availability', () => {
  it('marks every level playable', () => {
    expect(PLAYABLE_LEVEL_IDS).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(LEVEL_IDS.filter(isLevelInDevelopment)).toEqual([])
  })
})
