export function makeLargeProject(taskCount = 250) {
  return Array.from({ length: taskCount }, (_, index) => {
    const month = String((index % 12) + 1).padStart(2, '0')
    const nextMonth = String(((index + 1) % 12) + 1).padStart(2, '0')
    const year = 2026 + Math.floor(index / 12)
    const endYear = nextMonth === '01' ? year + 1 : year
    return {
      id: `task-${index + 1}`,
      name: `Task ${index + 1}`,
      start: `${year}-${month}-01`,
      end: `${endYear}-${nextMonth}-01`,
      category: `WP${(index % 10) + 1}`,
      dependencies: index === 0 ? '' : `task-${index}`,
      progress: index % 101,
    }
  })
}
