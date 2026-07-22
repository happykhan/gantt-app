export const HISTORY_LIMIT = 30

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function isEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function createHistory(initialPresent) {
  return { past: [], present: clone(initialPresent) }
}

export function historyReducer(history, action) {
  if (action.type === 'replace') {
    const next = action.update(history.present)
    if (isEqual(next, history.present)) return history
    return { ...history, present: clone(next) }
  }

  if (action.type === 'transact') {
    const next = action.update(history.present)
    if (isEqual(next, history.present)) return history
    return {
      past: [...history.past.slice(-(HISTORY_LIMIT - 1)), clone(history.present)],
      present: clone(next),
    }
  }

  if (action.type === 'undo') {
    if (history.past.length === 0) return history
    return {
      past: history.past.slice(0, -1),
      present: clone(history.past.at(-1)),
    }
  }

  return history
}

