import { describe, expect, it } from 'vitest'
import { EXPORT_THEME, exportFilename, renderChartSvg } from './exportChart'

const exportFixture = {
  title: 'Grant & delivery plan',
  viewMode: 'Quarter',
  rowHeight: 52,
  fontSize: 11,
  fontFamily: 'Arial, sans-serif',
  categoryColors: { Planning: '#2563eb', Delivery: '#f59e0b' },
  theme: EXPORT_THEME.light,
  tasks: [
    { id: 'plan', name: 'Plan <scope>', start: '2026-01-01', end: '2026-04-15', category: 'Planning', progress: 40, dependencies: '' },
    { id: 'review', name: 'Review', start: '2026-03-01', end: '2026-03-01', category: 'Planning', progress: 0, dependencies: 'deliver' },
    { id: 'deliver', name: 'Deliver work', start: '2026-04-15', end: '2027-12-31', category: 'Delivery', progress: 10, dependencies: 'plan' },
  ],
}

describe('vector chart export', () => {
  it('renders a deterministic, self-contained vector fixture', () => {
    const first = renderChartSvg(exportFixture)
    const second = renderChartSvg(exportFixture)

    expect(first).toEqual(second)
    expect(first.svg).toMatch(/^<\?xml/)
    expect(first.svg).not.toMatch(/<image\b|data:image\/(png|jpeg)/i)
    expect(first.svg).toContain('Grant &amp; delivery plan')
    expect(first.svg).toContain('Plan &lt;scope&gt;')
    expect(first.svg).toContain('Deliver work')
    expect(first.svg).toContain('Planning')
    expect(first.svg).toContain('Delivery')
  })

  it('keeps every task and dependency arrow inside an unclipped root SVG', () => {
    const { svg, width, height } = renderChartSvg(exportFixture)
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const root = document.documentElement
    const arrows = [...document.querySelectorAll('path[marker-end]')]

    expect(root.getAttribute('viewBox')).toBe(`0 0 ${width} ${height}`)
    expect(document.querySelector('parsererror')).toBeNull()
    expect(document.querySelector('clipPath')).toBeNull()
    expect(arrows).toHaveLength(2)
    expect(document.querySelectorAll('rect, path').length).toBeGreaterThan(exportFixture.tasks.length)
  })

  it('uses the selected light or dark export palette without CSS variables', () => {
    const light = renderChartSvg(exportFixture).svg
    const dark = renderChartSvg({ ...exportFixture, theme: EXPORT_THEME.dark }).svg

    expect(light).toContain(`fill="${EXPORT_THEME.light.background}"`)
    expect(dark).toContain(`fill="${EXPORT_THEME.dark.background}"`)
    expect(dark).not.toContain('var(--')
  })

  it('builds stable project and date-range filenames', () => {
    expect(exportFilename(exportFixture.title, exportFixture.tasks, 'svg'))
      .toBe('grant-delivery-plan_2026-01-01_to_2027-12-31.svg')
  })
})
