import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST_DIR = new URL('../dist/', import.meta.url)
const KIB = 1024
const budgets = {
  largestJavaScriptGzip: 230 * KIB,
  totalJavaScriptGzip: 480 * KIB,
  totalCssGzip: 10 * KIB,
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory.pathname, entry.name)
    return entry.isDirectory() ? collectFiles(new URL(`${entry.name}/`, directory)) : path
  }))
  return files.flat()
}

function format(bytes) {
  return `${(bytes / KIB).toFixed(1)} KiB`
}

const files = await collectFiles(DIST_DIR)
const assets = await Promise.all(files.map(async path => {
  const gzipBytes = gzipSync(await readFile(path)).length
  return {
    path: relative(DIST_DIR.pathname, path),
    extension: extname(path),
    gzipBytes,
  }
}))

const javascript = assets.filter(asset => asset.extension === '.js')
const css = assets.filter(asset => asset.extension === '.css')
const largestJavaScript = javascript.reduce((largest, asset) =>
  asset.gzipBytes > largest.gzipBytes ? asset : largest
, { path: 'none', gzipBytes: 0 })
const totalJavaScriptGzip = javascript.reduce((total, asset) => total + asset.gzipBytes, 0)
const totalCssGzip = css.reduce((total, asset) => total + asset.gzipBytes, 0)

const measurements = [
  ['Largest JavaScript asset', largestJavaScript.gzipBytes, budgets.largestJavaScriptGzip, largestJavaScript.path],
  ['Total JavaScript', totalJavaScriptGzip, budgets.totalJavaScriptGzip, 'all JavaScript assets'],
  ['Total CSS', totalCssGzip, budgets.totalCssGzip, 'all CSS assets'],
]

let overBudget = false
for (const [label, actual, budget, detail] of measurements) {
  const passes = actual <= budget
  console.log(`${passes ? '✓' : '✗'} ${label}: ${format(actual)} / ${format(budget)} (${detail})`)
  overBudget ||= !passes
}

if (overBudget) {
  console.error('Bundle-size budget exceeded. Reduce the bundle or deliberately revise the documented budget.')
  process.exitCode = 1
}
