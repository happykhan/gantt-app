function loadSvg(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  const image = new Image()
  image.decoding = 'async'
  return new Promise((resolve, reject) => {
    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The chart image could not be prepared.'))
    }
    image.src = url
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function rasteriseSvg(svg, width, height, requestedScale = 1, crop = null) {
  const source = crop || { x: 0, y: 0, width, height }
  const maxCanvasSide = 8192
  const scale = Math.max(0.1, Math.min(requestedScale, maxCanvasSide / source.width, maxCanvasSide / source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is not supported by this browser.')

  const { image, url } = await loadSvg(svg)
  try {
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}
