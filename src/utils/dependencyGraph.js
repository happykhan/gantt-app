const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function splitDependencies(value) {
  if (typeof value !== 'string') return []
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function taskLabel(task) {
  return task?.name?.trim() || task?.id || 'Unnamed task'
}

/**
 * Validate task identifiers and dependency edges without mutating the input.
 * Consumers use renderEdges for safe O(V + E) rendering, even when the source
 * contains malformed or cyclic references.
 */
export function validateDependencyGraph(tasks) {
  const source = Array.isArray(tasks) ? tasks : []
  const errors = []
  const idToTask = new Map()
  const idToIndex = new Map()
  const duplicateIds = new Set()

  source.forEach((task, taskIndex) => {
    const id = typeof task?.id === 'string' ? task.id.trim() : ''
    if (!id) {
      errors.push({
        code: 'missing-task-id', taskIndex, taskId: '',
        message: `Task ${taskIndex + 1} needs an ID.`,
      })
      return
    }
    if (idToTask.has(id)) {
      duplicateIds.add(id)
      errors.push({
        code: 'duplicate-task-id', taskIndex, taskId: id,
        message: `Task ID “${id}” duplicates task ${idToIndex.get(id) + 1}.`,
      })
      return
    }
    idToTask.set(id, task)
    idToIndex.set(id, taskIndex)
  })

  const adjacency = new Map([...idToTask.keys()].map(id => [id, []]))
  const indegree = new Map([...idToTask.keys()].map(id => [id, 0]))
  const dependencyIdsByTask = new Map()
  const validEdges = []

  source.forEach((task, taskIndex) => {
    const taskId = typeof task?.id === 'string' ? task.id.trim() : ''
    if (!taskId) return
    const ambiguousTask = duplicateIds.has(taskId) && idToIndex.get(taskId) !== taskIndex

    const seen = new Set()
    const accepted = []
    splitDependencies(task.dependencies).forEach(predecessorId => {
      if (predecessorId === taskId) {
        errors.push({
          code: 'self-dependency', taskIndex, taskId, predecessorId,
          message: `Task “${taskLabel(task)}” cannot depend on itself.`,
        })
        return
      }
      if (seen.has(predecessorId)) {
        errors.push({
          code: 'duplicate-dependency', taskIndex, taskId, predecessorId,
          message: `Dependency “${predecessorId}” is repeated for “${taskLabel(task)}”.`,
        })
        return
      }
      seen.add(predecessorId)
      if (!idToTask.has(predecessorId)) {
        errors.push({
          code: 'missing-dependency', taskIndex, taskId, predecessorId,
          message: `Dependency “${predecessorId}” for “${taskLabel(task)}” does not match a task ID.`,
        })
        return
      }
      if (ambiguousTask) return

      accepted.push(predecessorId)
      adjacency.get(predecessorId).push(taskId)
      indegree.set(taskId, (indegree.get(taskId) || 0) + 1)
      validEdges.push({
        predecessorId,
        predecessor: idToTask.get(predecessorId),
        predecessorIndex: idToIndex.get(predecessorId),
        taskId,
        task,
        taskIndex,
      })
    })
    if (!ambiguousTask) dependencyIdsByTask.set(taskId, accepted)
  })

  // Kahn's algorithm provides a linear-time DAG check for large plans.
  const queue = []
  indegree.forEach((degree, id) => { if (degree === 0) queue.push(id) })
  let queueIndex = 0
  while (queueIndex < queue.length) {
    const id = queue[queueIndex++]
    for (const dependentId of adjacency.get(id) || []) {
      const nextDegree = indegree.get(dependentId) - 1
      indegree.set(dependentId, nextDegree)
      if (nextDegree === 0) queue.push(dependentId)
    }
  }

  const residual = new Set([...indegree].filter(([, degree]) => degree > 0).map(([id]) => id))
  const cycleTaskIds = new Set()
  const reportedCycles = new Set()

  // Iterative DFS identifies the actual cycles without risking call-stack
  // overflow on a large imported plan. Residual descendants are not reported.
  const colour = new Map()
  for (const startId of residual) {
    if (colour.get(startId)) continue
    const path = []
    const pathIndex = new Map()
    const stack = [{ id: startId, next: 0, entered: false, neighbours: null }]
    while (stack.length) {
      const frame = stack[stack.length - 1]
      if (!frame.entered) {
        frame.entered = true
        colour.set(frame.id, 1)
        pathIndex.set(frame.id, path.length)
        path.push(frame.id)
        frame.neighbours = (adjacency.get(frame.id) || []).filter(id => residual.has(id))
      }

      if (frame.next < frame.neighbours.length) {
        const nextId = frame.neighbours[frame.next++]
        if (!colour.get(nextId)) {
          stack.push({ id: nextId, next: 0, entered: false, neighbours: null })
        } else if (colour.get(nextId) === 1) {
          const cycle = path.slice(pathIndex.get(nextId))
          const key = [...cycle].sort().join('\u0000')
          if (!reportedCycles.has(key)) {
            reportedCycles.add(key)
            cycle.forEach(id => cycleTaskIds.add(id))
            const labels = [...cycle, cycle[0]].map(id => taskLabel(idToTask.get(id)))
            errors.push({
              code: 'dependency-cycle',
              taskIndex: idToIndex.get(cycle[0]),
              taskId: cycle[0],
              cycle,
              message: `Dependency cycle: ${labels.join(' → ')}.`,
            })
          }
        }
        continue
      }

      colour.set(frame.id, 2)
      pathIndex.delete(frame.id)
      path.pop()
      stack.pop()
    }
  }

  const renderEdges = validEdges.filter(edge => !(
    cycleTaskIds.has(edge.predecessorId) && cycleTaskIds.has(edge.taskId)
  ))
  const renderDependencies = new Map()
  renderEdges.forEach(edge => {
    renderDependencies.set(edge.taskId, [
      ...(renderDependencies.get(edge.taskId) || []),
      edge.predecessorId,
    ])
  })

  const scheduleWarnings = source.flatMap((task, taskIndex) => {
    const taskId = typeof task?.id === 'string' ? task.id.trim() : ''
    if (!taskId || !ISO_DATE.test(task.start || '')) return []
    const predecessors = (renderDependencies.get(taskId) || [])
      .map(id => idToTask.get(id))
      .filter(predecessor => ISO_DATE.test(predecessor?.end || ''))
    const earlyPredecessors = predecessors.filter(predecessor => task.start < predecessor.end)
    if (!earlyPredecessors.length) return []

    const earliestValidStart = predecessors.reduce(
      (latest, predecessor) => predecessor.end > latest ? predecessor.end : latest,
      task.start,
    )
    const predecessorNames = earlyPredecessors.map(taskLabel)
    const names = predecessorNames.length === 1
      ? predecessorNames[0]
      : `${predecessorNames.slice(0, -1).join(', ')} and ${predecessorNames.at(-1)}`
    return [{
      taskId,
      taskIndex,
      taskName: taskLabel(task),
      predecessorIds: earlyPredecessors.map(predecessor => predecessor.id),
      predecessorNames,
      earliestValidStart,
      message: `“${taskLabel(task)}” starts before ${names} ends. Earliest valid start: ${earliestValidStart}.`,
    }]
  })

  return {
    valid: errors.length === 0,
    errors,
    edges: validEdges,
    renderEdges,
    dependencyIdsByTask,
    scheduleWarnings,
  }
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

export function moveTaskAfterPredecessors(tasks, taskId) {
  const warning = validateDependencyGraph(tasks).scheduleWarnings.find(item => item.taskId === taskId)
  if (!warning) return tasks
  return tasks.map(task => {
    if (task.id !== taskId) return task
    const duration = Math.max(0, Math.round(
      (new Date(`${task.end}T00:00:00Z`) - new Date(`${task.start}T00:00:00Z`)) / 86400000,
    ))
    return {
      ...task,
      start: warning.earliestValidStart,
      end: addDays(warning.earliestValidStart, duration),
    }
  })
}

export function removeTaskFromGraph(tasks, taskId) {
  return tasks
    .filter(task => task.id !== taskId)
    .map(task => {
      const dependencies = splitDependencies(task.dependencies)
      if (!dependencies.includes(taskId)) return task
      return { ...task, dependencies: dependencies.filter(id => id !== taskId).join(', ') }
    })
}
