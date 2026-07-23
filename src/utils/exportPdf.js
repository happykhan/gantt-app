import { rasteriseSvg } from './exportBrowser'

const MARGIN_MM = 10

function pageArea(pdf) {
  return {
    width: pdf.internal.pageSize.getWidth() - MARGIN_MM * 2,
    height: pdf.internal.pageSize.getHeight() - MARGIN_MM * 2,
  }
}

async function addFittedPage(pdf, chart, landscapeOnly) {
  const png = await rasteriseSvg(chart.svg, chart.width, chart.height, 2)
  const area = pageArea(pdf)
  const ratio = chart.width / chart.height
  const imageWidth = Math.min(area.width, area.height * ratio)
  const imageHeight = imageWidth / ratio
  const x = MARGIN_MM + (area.width - imageWidth) / 2
  const y = MARGIN_MM + (area.height - imageHeight) / 2
  pdf.addImage(png, 'PNG', x, y, imageWidth, imageHeight, undefined, 'FAST')
  if (landscapeOnly) pdf.setProperties({ subject: 'Landscape chart export' })
}

export function createPdfTilePlan(width, height, pageWidth, pageHeight, pixelsPerMillimetre = 5) {
  const tileWidth = Math.floor(pageWidth * pixelsPerMillimetre)
  const tileHeight = Math.floor(pageHeight * pixelsPerMillimetre)
  const columns = Math.ceil(width / tileWidth)
  const rows = Math.ceil(height / tileHeight)
  const tiles = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      tiles.push({
        x: column * tileWidth,
        y: row * tileHeight,
        width: Math.min(tileWidth, width - column * tileWidth),
        height: Math.min(tileHeight, height - row * tileHeight),
      })
    }
  }
  return tiles
}

async function addTiledPages(pdf, chart) {
  const area = pageArea(pdf)
  const pixelsPerMillimetre = 5
  const tiles = createPdfTilePlan(chart.width, chart.height, area.width, area.height, pixelsPerMillimetre)
  let page = 0

  for (const crop of tiles) {
    if (page > 0) pdf.addPage('a4', 'landscape')
    page += 1
    const png = await rasteriseSvg(chart.svg, chart.width, chart.height, 1, crop)
    const imageWidth = crop.width / pixelsPerMillimetre
    const imageHeight = crop.height / pixelsPerMillimetre
    pdf.addImage(png, 'PNG', MARGIN_MM, MARGIN_MM, imageWidth, imageHeight, undefined, 'FAST')
    pdf.setFontSize(8)
    pdf.setTextColor(100)
    pdf.text(`Page ${page} of ${tiles.length}`, pdf.internal.pageSize.getWidth() - MARGIN_MM, pdf.internal.pageSize.getHeight() - 4, { align: 'right' })
  }
}

export async function saveChartPdf(chart, filename, mode = 'fit') {
  const { jsPDF } = await import('jspdf')
  const autoLandscape = chart.width > chart.height
  const landscape = mode === 'landscape' || mode === 'tiled' || (mode === 'fit' && autoLandscape)
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true })

  if (mode === 'tiled') await addTiledPages(pdf, chart)
  else await addFittedPage(pdf, chart, mode === 'landscape')

  pdf.save(filename)
}
