import { useCallback } from 'react'
import { downloadBlob, rasteriseSvg } from '../utils/exportBrowser'
import { exportFilename, readExportTheme, renderChartSvg } from '../utils/exportChart'
import { saveChartPdf } from '../utils/exportPdf'

function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

export function useChartExport({
  tasks,
  chartTitle,
  viewMode,
  rowHeight,
  chartFont,
  chartFontSize,
  categoryColors,
  exportScale,
  notify,
}) {
  const prepareChart = useCallback(() => renderChartSvg({
    tasks,
    title: chartTitle,
    viewMode,
    rowHeight,
    fontSize: chartFontSize,
    fontFamily: chartFont === 'inherit' ? 'system-ui, sans-serif' : chartFont,
    categoryColors,
    theme: readExportTheme(),
  }), [categoryColors, chartFont, chartFontSize, chartTitle, rowHeight, tasks, viewMode])

  const runExport = useCallback(async (label, action) => {
    notify(`Preparing ${label}…`, 'progress')
    try {
      await action()
      notify(`${label} exported`)
    } catch (error) {
      notify(error instanceof Error ? error.message : `${label} export failed.`, 'error')
    }
  }, [notify])

  const exportPng = useCallback(() => runExport('PNG', async () => {
    const chart = prepareChart()
    const png = await rasteriseSvg(chart.svg, chart.width, chart.height, exportScale)
    triggerDownload(png, exportFilename(chartTitle, tasks, 'png'))
  }), [chartTitle, exportScale, prepareChart, runExport, tasks])

  const exportSvg = useCallback(() => runExport('SVG', async () => {
    const chart = prepareChart()
    downloadBlob(
      new Blob([chart.svg], { type: 'image/svg+xml;charset=utf-8' }),
      exportFilename(chartTitle, tasks, 'svg'),
    )
  }), [chartTitle, prepareChart, runExport, tasks])

  const exportPdf = useCallback(() => runExport('PDF', async () => {
    const chart = prepareChart()
    await saveChartPdf(chart, exportFilename(chartTitle, tasks, 'pdf'), 'fit')
  }), [chartTitle, prepareChart, runExport, tasks])

  return { exportPng, exportSvg, exportPdf }
}
