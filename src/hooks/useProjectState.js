import { useCallback, useEffect, useReducer, useState } from 'react'
import { createHistory, historyReducer } from '../utils/editorHistory'
import { loadAutosave, saveAutosave } from '../utils/storage'

export function useProjectState() {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => createHistory(loadAutosave(localStorage)),
  )
  const project = history.present
  const [autosaveStatus, setAutosaveStatus] = useState('saved')

  useEffect(() => {
    let savedTimer
    const savingTimer = window.setTimeout(() => {
      setAutosaveStatus('saving')
      try {
        if (!saveAutosave(localStorage, project)) throw new Error('Project validation failed')
        savedTimer = window.setTimeout(() => setAutosaveStatus('saved'), 450)
      } catch {
        setAutosaveStatus('unavailable')
      }
    }, 120)
    return () => {
      window.clearTimeout(savingTimer)
      window.clearTimeout(savedTimer)
    }
  }, [project])

  const setProject = useCallback(updater => {
    dispatch({
      type: 'transact',
      update: current => typeof updater === 'function' ? updater(current) : updater,
    })
  }, [])
  const setTasks = useCallback(updater => {
    dispatch({
      type: 'transact',
      update: current => ({ ...current, tasks: typeof updater === 'function' ? updater(current.tasks) : updater }),
    })
  }, [])
  const setChartTitle = useCallback(updater => {
    dispatch({
      type: 'transact',
      update: current => ({ ...current, chartTitle: typeof updater === 'function' ? updater(current.chartTitle) : updater }),
    })
  }, [])
  const setCategoryColors = useCallback(updater => {
    dispatch({
      type: 'transact',
      update: current => ({ ...current, categoryColors: typeof updater === 'function' ? updater(current.categoryColors) : updater }),
    })
  }, [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])

  return {
    project,
    setProject,
    setTasks,
    setChartTitle,
    setCategoryColors,
    undo,
    canUndo: history.past.length > 0,
    autosaveStatus,
  }
}
