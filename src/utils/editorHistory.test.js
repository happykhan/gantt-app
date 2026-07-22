import { describe, expect, it } from 'vitest'
import { createHistory, HISTORY_LIMIT, historyReducer } from './editorHistory'

const initial = {
  tasks: [{ id: 'one', name: 'Original' }],
  chartTitle: 'Plan',
  categoryColors: { WP1: '#0d9488' },
  selectedId: 'one',
}

describe('editor history', () => {
  it('restores an exact editor snapshot for a transaction', () => {
    let history = createHistory(initial)
    history = historyReducer(history, {
      type: 'transact',
      update: () => ({ tasks: [], chartTitle: '', categoryColors: {}, selectedId: null }),
    })
    history = historyReducer(history, { type: 'undo' })

    expect(history.present).toEqual(initial)
  })

  it('records one snapshot per action and ignores no-op updates', () => {
    let history = createHistory(initial)
    history = historyReducer(history, { type: 'transact', update: state => state })
    history = historyReducer(history, {
      type: 'transact',
      update: state => ({ ...state, tasks: [{ ...state.tasks[0], name: 'Changed' }] }),
    })

    expect(history.past).toHaveLength(1)
  })

  it('bounds retained actions', () => {
    let history = createHistory(initial)
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history = historyReducer(history, {
        type: 'transact',
        update: state => ({ ...state, chartTitle: `Plan ${index}` }),
      })
    }

    expect(history.past).toHaveLength(HISTORY_LIMIT)
    for (let index = 0; index < HISTORY_LIMIT; index += 1) {
      history = historyReducer(history, { type: 'undo' })
    }
    expect(history.present.chartTitle).toBe('Plan 4')
  })
})
