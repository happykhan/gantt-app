import { useCallback } from 'react'
import { toPng } from 'html-to-image'

const MAX_EXPORT_WIDTH = 4800

function waitForImage(image) {
  return new Promise(resolve => { image.onload = resolve })
}

function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

export function useChartExport({ exportRef, chartTitle, chartFont, exportScale, notify }) {
  const capturePng = useCallback(async () => {
    const outer = exportRef.current
    if (!outer) return null
    let titleElement = null

    if (chartTitle) {
      titleElement = document.createElement('div')
      titleElement.className = 'export-chart-title'
      titleElement.style.fontFamily = chartFont === 'inherit' ? 'system-ui, sans-serif' : chartFont
      titleElement.textContent = chartTitle
      outer.insertBefore(titleElement, outer.firstChild)
    }

    const clippingValues = new Set(['hidden', 'auto', 'scroll', 'clip'])
    const clippedElements = [outer, ...outer.querySelectorAll('*')].filter(element => {
      const styles = getComputedStyle(element)
      if (styles.textOverflow === 'ellipsis') return false
      return clippingValues.has(styles.overflow) || clippingValues.has(styles.overflowX) || clippingValues.has(styles.overflowY)
    })
    const originalStyles = clippedElements.map(element => ({
      element,
      overflow: element.style.overflow,
      overflowX: element.style.overflowX,
      overflowY: element.style.overflowY,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
    }))
    clippedElements.forEach(element => {
      element.style.overflow = 'visible'
      element.style.overflowX = 'visible'
      element.style.overflowY = 'visible'
      element.style.maxHeight = 'none'
      if (!element.style.height || element.style.height === 'auto' || element.style.height.endsWith('%')) element.style.height = 'auto'
    })

    const width = outer.scrollWidth
    const height = outer.scrollHeight
    try {
      const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--gx-bg').trim() || '#ffffff'
      let pngUrl = await toPng(outer, { backgroundColor, pixelRatio: exportScale, width, height })
      if (width * exportScale > MAX_EXPORT_WIDTH) {
        const scale = MAX_EXPORT_WIDTH / (width * exportScale)
        const image = new Image()
        image.src = pngUrl
        await waitForImage(image)
        const canvas = document.createElement('canvas')
        canvas.width = MAX_EXPORT_WIDTH
        canvas.height = Math.round(height * exportScale * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        pngUrl = canvas.toDataURL('image/png')
      }
      return pngUrl
    } catch (error) {
      console.error(error)
      notify('Export failed. Try Reset zoom, then export again.', 'error')
      return null
    } finally {
      originalStyles.forEach(({ element, overflow, overflowX, overflowY, height: originalHeight, maxHeight }) => {
        element.style.overflow = overflow
        element.style.overflowX = overflowX
        element.style.overflowY = overflowY
        element.style.height = originalHeight
        element.style.maxHeight = maxHeight
      })
      titleElement?.remove()
    }
  }, [chartFont, chartTitle, exportRef, exportScale, notify])

  const exportPng = useCallback(async () => {
    notify('Preparing PNG…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    triggerDownload(pngUrl, 'gantt.png')
    notify('PNG exported')
  }, [capturePng, notify])

  const exportSvg = useCallback(async () => {
    notify('Preparing SVG…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    const image = new Image()
    image.src = pngUrl
    await waitForImage(image)
    const width = image.naturalWidth
    const height = image.naturalHeight
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n  <image xlink:href="${pngUrl}" x="0" y="0" width="${width}" height="${height}"/>\n</svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    triggerDownload(url, 'gantt.svg')
    URL.revokeObjectURL(url)
    notify('SVG exported')
  }, [capturePng, notify])

  const exportPdf = useCallback(async () => {
    notify('Preparing PDF…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    const [{ jsPDF }, image] = await Promise.all([
      import('jspdf'),
      new Promise(resolve => {
        const loaded = new Image()
        loaded.onload = () => resolve(loaded)
        loaded.src = pngUrl
      }),
    ])
    const landscape = image.naturalWidth > image.naturalHeight
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const availableWidth = pageWidth - 20
    const availableHeight = pageHeight - 20
    const aspect = image.naturalWidth / image.naturalHeight
    const imageWidth = availableWidth / aspect <= availableHeight ? availableWidth : availableHeight * aspect
    const imageHeight = imageWidth / aspect
    pdf.addImage(pngUrl, 'PNG', 10 + (availableWidth - imageWidth) / 2, 10 + (availableHeight - imageHeight) / 2, imageWidth, imageHeight)
    pdf.save('gantt.pdf')
    notify('PDF exported')
  }, [capturePng, notify])

  return { exportPng, exportSvg, exportPdf }
}
