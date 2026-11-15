// Pure placement rules for DragSort: correct drops stick, wrong drops explain.
export interface DragSortBin {
  id: string
  label: string
  hint?: string
}

export interface DragSortItem {
  id: string
  label: string
  binId: string
  /** Shown when the item is dropped into the wrong bin. */
  explanation?: string
  note?: string
}

export interface DragSortFeedback {
  itemId: string
  binId: string
  correct: boolean
  message: string
}

export interface DragSortState {
  placements: Record<string, string>
  mistakes: number
  mistakesByItem: Record<string, number>
  feedback: DragSortFeedback | null
}

export function createDragSortState(): DragSortState {
  return { placements: {}, mistakes: 0, mistakesByItem: {}, feedback: null }
}

export function attemptDrop(
  state: DragSortState,
  item: DragSortItem,
  binId: string,
): DragSortState {
  if (state.placements[item.id]) return state

  if (item.binId === binId) {
    return {
      ...state,
      placements: { ...state.placements, [item.id]: binId },
      feedback: {
        itemId: item.id,
        binId,
        correct: true,
        message: `${item.label} belongs in ${binId}.`,
      },
    }
  }

  return {
    ...state,
    mistakes: state.mistakes + 1,
    mistakesByItem: {
      ...state.mistakesByItem,
      [item.id]: (state.mistakesByItem[item.id] ?? 0) + 1,
    },
    feedback: {
      itemId: item.id,
      binId,
      correct: false,
      message:
        item.explanation ??
        `${item.label} is not a ${binId}. Check the value, then retry.`,
    },
  }
}

export function isSolved(state: DragSortState, items: DragSortItem[]): boolean {
  return items.length > 0 && items.every((item) => state.placements[item.id] === item.binId)
}

export function remainingItems(state: DragSortState, items: DragSortItem[]): DragSortItem[] {
  return items.filter((item) => !state.placements[item.id])
}

/** Items that never landed in a wrong bin, useful for an honest accuracy score. */
export function firstTryCorrect(state: DragSortState, items: DragSortItem[]): number {
  return items.filter((item) => !state.mistakesByItem[item.id]).length
}
