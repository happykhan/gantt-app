export const STORAGE_KEY = 'gantt-app-v1'

export const twoTaskProject = {
  chartTitle: 'Regression plan',
  categoryColors: { Planning: '#0d9488', Delivery: '#6366f1' },
  tasks: [
    {
      id: 'planning',
      name: 'Protocol design',
      start: '2026-01-05',
      end: '2026-02-20',
      category: 'Planning',
      dependencies: '',
      progress: 35,
    },
    {
      id: 'delivery',
      name: 'Fieldwork and analysis',
      start: '2026-02-23',
      end: '2026-05-15',
      category: 'Delivery',
      dependencies: 'planning',
      progress: 10,
    },
  ],
}

function isoDate(year, month, day) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

export function largeProject() {
  const categories = Array.from({ length: 30 }, (_, index) => `Programme ${String(index + 1).padStart(2, '0')}`)
  const tasks = Array.from({ length: 250 }, (_, index) => {
    const startYear = 2000 + Math.floor(index / 7)
    const start = isoDate(startYear, index % 12, 1 + (index % 20))
    const end = isoDate(Math.min(startYear + (index % 11 === 0 ? 3 : 0), 2045), (index + 3) % 12, 20)
    return {
      id: `large-${index + 1}`,
      name: index === 0
        ? 'A deliberately long task name that remains discoverable while describing recruitment, sequencing, analysis, dissemination and stakeholder engagement across the complete programme'
        : `Workstream ${String(index + 1).padStart(3, '0')}`,
      start,
      end: end > start ? end : isoDate(startYear + 1, (index + 3) % 12, 20),
      category: categories[index % categories.length],
      dependencies: index === 0 ? 'large-2' : index === 1 ? 'large-1' : index % 5 === 0 ? `large-${index}` : '',
      progress: index % 101,
    }
  })
  return {
    chartTitle: 'Large cyclic programme, 2000 to 2045',
    categoryColors: Object.fromEntries(categories.map((category, index) => [category, `hsl(${index * 12} 65% 45%)`])),
    tasks,
  }
}

export async function openEmpty(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-initialised')) return
    localStorage.clear()
    sessionStorage.setItem('e2e-initialised', 'true')
  })
  await page.goto('/')
}

export async function openProject(page, project) {
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem('e2e-initialised')) return
    localStorage.clear()
    localStorage.setItem(key, JSON.stringify(value))
    sessionStorage.setItem('e2e-initialised', 'true')
  }, { key: STORAGE_KEY, value: project })
  await page.goto('/')
}

export async function expectTheme(expect, page, projectName) {
  const dark = await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)
  expect(dark).toBe(projectName.endsWith('-dark'))
}
