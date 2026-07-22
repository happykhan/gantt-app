import { useCallback, useEffect, useState } from 'react'
import { loadStoredProject, saveStoredProject } from '../services/projectPersistence'

export function useProjectState() {
  const [project, setProject] = useState(loadStoredProject)
  const [autosaveStatus, setAutosaveStatus] = useState('saved')

  useEffect(() => {
    let savedTimer
    const savingTimer = window.setTimeout(() => {
      setAutosaveStatus('saving')
      try {
        saveStoredProject(project)
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

  const setTasks = useCallback(updater => {
    setProject(current => ({ ...current, tasks: typeof updater === 'function' ? updater(current.tasks) : updater }))
  }, [])
  const setChartTitle = useCallback(updater => {
    setProject(current => ({ ...current, chartTitle: typeof updater === 'function' ? updater(current.chartTitle) : updater }))
  }, [])
  const setCategoryColors = useCallback(updater => {
    setProject(current => ({ ...current, categoryColors: typeof updater === 'function' ? updater(current.categoryColors) : updater }))
  }, [])

  return { project, setProject, setTasks, setChartTitle, setCategoryColors, autosaveStatus }
}
