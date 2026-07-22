import { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import { toPng } from 'html-to-image'
import CustomGantt from './components/CustomGantt'
import BottomSheet from './components/BottomSheet'
import ImportModal from './components/ImportModal'
import TaskTable from './components/TaskTable'
import WorkflowMenu, { MenuButton, MenuDivider, MenuLabel } from './components/WorkflowMenu'
import { generateSampleData } from './utils/parseInput'
import { chooseResponsiveViewMode, clampZoom } from './utils/viewDefaults'

let idCounter = 0
function makeId() { return `task-${Date.now()}-${++idCounter}` }
function addDays(str, n) { const d = new Date(str + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().substring(0, 10) }

const LS_KEY = 'gantt-app-v1'

function loadInitial() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved.tasks) && saved.tasks.length)
        return { tasks: saved.tasks, chartTitle: saved.chartTitle || '', categoryColors: saved.categoryColors || {} }
    }
  } catch { /* Local storage may be unavailable or contain invalid data. */ }
  return { tasks: [], chartTitle: '', categoryColors: {} }
}

function GanttPage({ tasks, setTasks, chartTitle, setChartTitle, categoryColors, setCategoryColors, autosaveStatus }) {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('gantt-viewMode') || chooseResponsiveViewMode(tasks, window.innerWidth) } catch { return chooseResponsiveViewMode(tasks, window.innerWidth) }
  })
  const [labelMode, setLabelMode] = useState(() => {
    try { return localStorage.getItem('gantt-labelMode') || 'inline' } catch { return 'inline' }
  })
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(() => {
    try { return parseFloat(localStorage.getItem('gantt-zoom')) || 1 } catch { return 1 }
  })
  const [editingTitle, setEditingTitle] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [displayDensity, setDisplayDensity] = useState(() => {
    try { return localStorage.getItem('gantt-density') || 'normal' } catch { return 'normal' }
  })
  const [chartFont, setChartFont] = useState(() => {
    try { return localStorage.getItem('gantt-font') || 'inherit' } catch { return 'inherit' }
  })
  const [chartFontSize, setChartFontSize] = useState(() => {
    try { return parseInt(localStorage.getItem('gantt-fontsize'), 10) || 11 } catch { return 11 }
  })
  const [exportScale, setExportScale] = useState(() => {
    try { return parseInt(localStorage.getItem('gantt-exportScale'), 10) || 2 } catch { return 2 }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth)
      setIsMobile(window.innerWidth < 900)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('gantt-labelMode', labelMode) } catch { /* Preferences are best-effort. */ }
  }, [labelMode])
  useEffect(() => {
    try { localStorage.setItem('gantt-viewMode', viewMode) } catch { /* Preferences are best-effort. */ }
  }, [viewMode])
  useEffect(() => {
    try { localStorage.setItem('gantt-density', displayDensity) } catch { /* Preferences are best-effort. */ }
  }, [displayDensity])
  useEffect(() => {
    try { localStorage.setItem('gantt-zoom', zoom) } catch { /* Preferences are best-effort. */ }
  }, [zoom])
  useEffect(() => {
    try { localStorage.setItem('gantt-font', chartFont) } catch { /* Preferences are best-effort. */ }
  }, [chartFont])
  useEffect(() => {
    try { localStorage.setItem('gantt-fontsize', chartFontSize) } catch { /* Preferences are best-effort. */ }
  }, [chartFontSize])
  useEffect(() => {
    try { localStorage.setItem('gantt-exportScale', exportScale) } catch { /* Preferences are best-effort. */ }
  }, [exportScale])

  const DENSITY_ROW = { compact: 34, normal: 52, spacious: 68 }
  const rowHeight = DENSITY_ROW[displayDensity] || 52
  const barFontSize = chartFontSize

  const PALETTES = {
    default:     ['#0d9488','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#6366f1','#ec4899','#14b8a6','#84cc16'],
    bold:        ['#e63946','#457b9d','#2d6a4f','#f4a261','#6d6875','#264653','#e9c46a','#f3722c','#90be6d','#277da1'],
    pastel:      ['#a8dadc','#ffd6a5','#c8b6ff','#ffafcc','#b7e4c7','#ffc8a2','#b5ead7','#c7ceea','#e2f0cb','#ffdac1'],
    earth:       ['#6b4226','#a0785a','#c8a97e','#7c9a7e','#4a7c59','#c4722a','#8b6245','#5c8374','#a3705f','#d4a853'],
    viridis:     ['#440154','#31688e','#35b779','#fde725','#443983','#21908d','#8fd744','#b5de2b','#1f9e89','#482878'],
    monochrome:  ['#1a1a1a','#444444','#666666','#888888','#aaaaaa','#333333','#555555','#777777','#999999','#bbbbbb'],
  }

  function applyPalette(name) {
    const palette = PALETTES[name]
    if (!palette) return
    const cats = [...new Set(tasks.map(t => t.category).filter(Boolean))]
    const next = {}
    cats.forEach((cat, i) => { next[cat] = palette[i % palette.length] })
    setCategoryColors(next)
  }
  const [showTable, setShowTable] = useState(() => window.innerWidth >= 900)
  const [tableHeight, setTableHeight] = useState(() => {
    try { return parseInt(localStorage.getItem('gantt-tableHeight'), 10) || 240 } catch { return 240 }
  })
  const ganttAreaRef = useRef()
  const ganttExportRef = useRef()
  const ganttScrollRef = useRef()
  const undoStack = useRef([])

  const [canUndo, setCanUndo] = useState(false)
  const pushUndo = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-29), tasks]
    setCanUndo(true)
  }, [tasks])
  const undo = useCallback(() => {
    if (!undoStack.current.length) return
    const prev = undoStack.current[undoStack.current.length - 1]
    undoStack.current = undoStack.current.slice(0, -1)
    setTasks(prev)
    setCanUndo(undoStack.current.length > 0)
  }, [setTasks])

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const selectedTask = tasks.find(t => t.id === selectedId)
  const editingTask = tasks.find(t => t.id === editingTaskId)

  const notify = useCallback((message, tone = 'success') => {
    setFeedback({ message, tone, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  function handleColorChange(cat, color) {
    setCategoryColors(prev => ({ ...prev, [cat]: color }))
  }
  function handleRenameCategory(oldCat, newCat) {
    const trimmed = newCat.trim()
    if (!trimmed || trimmed === oldCat) return
    setTasks(prev => prev.map(t => t.category === oldCat ? { ...t, category: trimmed } : t))
    setCategoryColors(prev => {
      const next = { ...prev }
      if (next[oldCat] !== undefined) { next[trimmed] = next[oldCat]; delete next[oldCat] }
      return next
    })
  }
  function handleTaskChange(id, changes) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }
  const handleDelete = useCallback((id) => {
    pushUndo()
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      return next.map(t => ({
        ...t,
        dependencies: t.dependencies
          ? t.dependencies.split(',').map(s => s.trim()).filter(d => d !== id).join(', ')
          : ''
      }))
    })
    if (selectedId === id) setSelectedId(null)
  }, [pushUndo, selectedId, setTasks])

  // Keyboard shortcuts for selected task
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        undo(); e.preventDefault(); return
      }
      if (!selectedId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete(selectedId)
      } else if (e.key === 'Escape') {
        setSelectedId(null)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const days = e.shiftKey ? 7 : 1
        const delta = e.key === 'ArrowLeft' ? -days : days
        setTasks(prev => prev.map(t => t.id === selectedId
          ? { ...t, start: addDays(t.start, delta), end: addDays(t.end, delta) }
          : t))
        e.preventDefault()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setTasks(prev => {
          const idx = prev.findIndex(t => t.id === selectedId)
          const next = idx + (e.key === 'ArrowUp' ? -1 : 1)
          if (next < 0 || next >= prev.length) return prev
          const arr = [...prev];
          [arr[idx], arr[next]] = [arr[next], arr[idx]]
          return arr
        })
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDelete, selectedId, setTasks, undo])
  function handleMoveTask(id, dir) {
    pushUndo()
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }
  function handleAddNew() {
    pushUndo()
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    const newTask = { id: makeId(), name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 }
    setTasks(prev => [...prev, newTask])
    setSelectedId(newTask.id)
    setEditingTaskId(newTask.id)
  }
  function handleImport(newTasks) {
    pushUndo()
    const imported = newTasks.map(t => ({ ...t, id: t.id || makeId() }))
    setTasks(imported)
    setViewMode(chooseResponsiveViewMode(imported, viewportWidth))
    setShowTable(viewportWidth >= 600)
    notify(`Imported ${imported.length} ${imported.length === 1 ? 'task' : 'tasks'}`)
  }
  function handleClear() {
    pushUndo()
    setTasks([])
    setChartTitle('')
    setCategoryColors({})
    setSelectedId(null)
    setConfirmClear(false)
  }

  function saveProject() {
    const blob = new Blob([JSON.stringify({ tasks, chartTitle, categoryColors }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'gantt-project.json'
    a.click()
    URL.revokeObjectURL(a.href)
    notify('Project file saved')
  }
  function loadProject(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const { tasks: loaded, chartTitle: loadedTitle, categoryColors: loadedColors } = JSON.parse(e.target.result)
        if (Array.isArray(loaded) && loaded.length) {
          setTasks(loaded)
          setViewMode(chooseResponsiveViewMode(loaded, viewportWidth))
        }
        if (loadedTitle) setChartTitle(loadedTitle)
        if (loadedColors && typeof loadedColors === 'object') setCategoryColors(loadedColors)
        notify(`Project loaded with ${loaded?.length || 0} tasks`)
      } catch { notify('That project file could not be loaded', 'error') }
    }
    reader.readAsText(file)
  }
  // Shared: expand overflow, inject title, capture PNG, restore — returns data URL or null
  async function capturePng() {
    const outer = ganttExportRef.current
    if (!outer) return null

    let titleEl = null
    if (chartTitle) {
      titleEl = document.createElement('div')
      const ff = chartFont === 'inherit' ? 'system-ui, sans-serif' : chartFont
      titleEl.style.cssText = `padding: 10px 16px 8px; font-size: 18px; font-weight: 700; color: #1e293b; background: #ffffff; flex-shrink: 0; font-family: ${ff};`
      titleEl.textContent = chartTitle
      outer.insertBefore(titleEl, outer.firstChild)
    }

    const CLIP = new Set(['hidden', 'auto', 'scroll', 'clip'])
    const clips = [outer, ...outer.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el)
      if (s.textOverflow === 'ellipsis') return false
      return CLIP.has(s.overflow) || CLIP.has(s.overflowX) || CLIP.has(s.overflowY)
    })
    const saved = clips.map(el => ({
      el, overflow: el.style.overflow, overflowX: el.style.overflowX, overflowY: el.style.overflowY,
      height: el.style.height, maxHeight: el.style.maxHeight,
    }))
    clips.forEach(el => {
      el.style.overflow = 'visible'; el.style.overflowX = 'visible'; el.style.overflowY = 'visible'
      el.style.maxHeight = 'none'
      const inlineH = el.style.height
      if (!inlineH || inlineH === 'auto' || inlineH.endsWith('%')) el.style.height = 'auto'
    })

    const w = outer.scrollWidth
    const h = outer.scrollHeight

    try {
      const MAX_W = 4800
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--gx-bg').trim() || '#ffffff'
      let pngUrl = await toPng(outer, { backgroundColor: bgColor, pixelRatio: exportScale, width: w, height: h })
      if (w * exportScale > MAX_W) {
        const scale = MAX_W / (w * exportScale)
        const img = new Image(); img.src = pngUrl
        await new Promise(r => { img.onload = r })
        const canvas = document.createElement('canvas')
        canvas.width = MAX_W
        canvas.height = Math.round(h * exportScale * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        pngUrl = canvas.toDataURL('image/png')
      }
      return pngUrl
    } catch (e) {
      console.error(e); notify('Export failed. Try Reset zoom, then export again.', 'error'); return null
    } finally {
      saved.forEach(({ el, overflow, overflowX, overflowY, height, maxHeight }) => {
        el.style.overflow = overflow; el.style.overflowX = overflowX; el.style.overflowY = overflowY
        el.style.height = height; el.style.maxHeight = maxHeight
      })
      if (titleEl) outer.removeChild(titleEl)
    }
  }

  async function exportPNG() {
    notify('Preparing PNG…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    const a = document.createElement('a'); a.href = pngUrl; a.download = 'gantt.png'; a.click()
    notify('PNG exported')
  }

  async function exportSVG() {
    notify('Preparing SVG…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    const img = new Image(); img.src = pngUrl
    await new Promise(r => { img.onload = r })
    const pw = img.naturalWidth, ph = img.naturalHeight
    const svgStr = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}">`,
      `  <image xlink:href="${pngUrl}" x="0" y="0" width="${pw}" height="${ph}"/>`,
      '</svg>',
    ].join('\n')
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'gantt.svg'; a.click(); URL.revokeObjectURL(url)
    notify('SVG exported')
  }

  async function exportPDF() {
    notify('Preparing PDF…', 'progress')
    const pngUrl = await capturePng()
    if (!pngUrl) return
    const { jsPDF } = await import('jspdf')
    const img = new Image(); img.src = pngUrl
    await new Promise(r => { img.onload = r })
    const pw = img.naturalWidth, ph = img.naturalHeight
    const landscape = pw > ph
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 10
    const availW = pageW - 2 * margin
    const availH = pageH - 2 * margin
    const aspect = pw / ph
    let imgW, imgH
    if (availW / aspect <= availH) { imgW = availW; imgH = availW / aspect }
    else { imgH = availH; imgW = availH * aspect }
    const x = margin + (availW - imgW) / 2
    const y = margin + (availH - imgH) / 2
    pdf.addImage(pngUrl, 'PNG', x, y, imgW, imgH)
    pdf.save('gantt.pdf')
    notify('PDF exported')
  }

  function startTableResize(e) {
    const isTouch = e.type === 'touchstart'
    const startY = isTouch ? e.touches[0].clientY : e.clientY
    const startH = tableHeight
    let lastH = startH
    function onMove(ev) {
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY
      lastH = Math.max(80, Math.min(600, startH - (y - startY)))
      setTableHeight(lastH)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      try { localStorage.setItem('gantt-tableHeight', lastH) } catch { /* Preferences are best-effort. */ }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    e.preventDefault()
  }

  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.4, ZOOM_MAX = 2
  function fitProject() {
    const scroller = ganttScrollRef.current
    if (!scroller?.scrollWidth || !scroller.clientWidth) return
    setZoom(clampZoom((scroller.clientWidth - 8) / scroller.scrollWidth, ZOOM_MIN, ZOOM_MAX))
    scroller.scrollTo?.({ left: 0, top: 0, behavior: 'smooth' })
    notify('Project fitted to the available width')
  }

  function resetZoom() {
    setZoom(1)
    ganttScrollRef.current?.scrollTo?.({ left: 0, top: 0, behavior: 'smooth' })
    notify('Zoom reset to 100%')
  }
  const settingsLabel = { fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
  const selectStyle = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gx-border)', borderRadius: 8, background: 'var(--gx-surface)', color: 'var(--gx-text)', outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="workflow-toolbar" aria-label="Project workflow">
        <div className="workflow-primary-actions">
          <button onClick={handleAddNew} className="gx-btn gx-btn-primary workflow-action">
            <span aria-hidden="true">＋</span><span>{tasks.length ? 'Task' : 'Create task'}</span>
          </button>
          <button onClick={() => setShowImport(true)} className="gx-btn gx-btn-secondary workflow-action">
            Import
          </button>
          <button
            onClick={() => setShowTable(value => !value)}
            className={`gx-btn gx-btn-secondary workflow-action${showTable ? ' is-active' : ''}`}
            aria-pressed={showTable}
          >
            Edit tasks
          </button>
          <button
            onClick={() => {
              if (selectedId) setEditingTaskId(selectedId)
              else notify('Select a task to add dependencies', 'progress')
            }}
            className="gx-btn gx-btn-secondary workflow-action dependencies-action"
            disabled={!tasks.length}
            aria-label="Dependencies"
          >
            <span className="desktop-action-label">Dependencies</span><span className="mobile-action-label">Deps</span>
          </button>
        </div>

        <div className="workflow-secondary-actions">
          <button onClick={undo} disabled={!canUndo} className="gx-btn gx-btn-secondary icon-action" title="Undo (Ctrl+Z)" aria-label="Undo">↩</button>
          <WorkflowMenu label="View" align="left">
            <MenuLabel>Timeline scale</MenuLabel>
            <div className="view-mode-grid">
              {['Week', 'Month', 'Quarter', 'Year'].map(mode => (
                <MenuButton key={mode} className={viewMode === mode ? 'is-selected' : ''} onClick={() => setViewMode(mode)}>{mode}</MenuButton>
              ))}
            </div>
            <MenuDivider />
            <MenuButton onClick={fitProject}>Fit to project</MenuButton>
            <MenuButton onClick={resetZoom}>Reset zoom <span>{Math.round(zoom * 100)}%</span></MenuButton>
            <div className="zoom-menu-row" onClick={event => event.stopPropagation()}>
              <button onClick={() => setZoom(value => clampZoom(value - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out">−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(value => clampZoom(value + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in">＋</button>
            </div>
            <MenuDivider />
            <MenuButton onClick={() => setLabelMode(mode => mode === 'inline' ? 'classic' : 'inline')}>
              {labelMode === 'inline' ? 'Show label column' : 'Show labels in bars'}
            </MenuButton>
            <MenuButton onClick={() => setShowSettings(true)}>Display settings</MenuButton>
          </WorkflowMenu>

          <WorkflowMenu label="Project">
            <MenuButton onClick={saveProject}>Save project file</MenuButton>
            <label className="workflow-menu-item file-menu-item" role="menuitem">
              Open project file
              <input type="file" accept=".json" onChange={event => { loadProject(event.target.files[0]); event.target.value = '' }} />
            </label>
            <MenuDivider />
            <MenuButton onClick={() => setShowHelp(true)}>Help and shortcuts</MenuButton>
            <MenuButton danger onClick={() => setConfirmClear(true)}>Clear project</MenuButton>
          </WorkflowMenu>

          <WorkflowMenu label="Export">
            <MenuLabel>Share your finished chart</MenuLabel>
            <MenuButton onClick={exportPNG}>PNG image</MenuButton>
            <MenuButton onClick={exportSVG}>SVG image</MenuButton>
            <MenuButton onClick={exportPDF}>PDF document</MenuButton>
          </WorkflowMenu>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Gantt chart area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          {/* Chart title */}
          <div className="chart-heading">
            {editingTitle ? (
              <input autoFocus value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false) }}
                aria-label="Project title"
                placeholder="Add project title"
                style={{ width: '100%', fontSize: 15, fontWeight: 600, border: 'none', borderBottom: '2px solid var(--gx-accent)', outline: 'none', background: 'transparent', color: 'var(--gx-text)', padding: '2px 0' }} />
            ) : (
              <div onClick={() => setEditingTitle(true)} title="Select to set the project title"
                style={{ fontSize: 15, fontWeight: 600, color: chartTitle ? 'var(--gx-text)' : 'var(--gx-text-muted)', cursor: 'text', minHeight: 24 }}>
                {chartTitle || 'Add project title'}
              </div>
            )}
            {tasks.length > 0 && (
              <span className="chart-heading-hint">
                {selectedTask ? `Selected: ${selectedTask.name}` : isMobile ? 'Tap a task to edit' : 'Select a task to edit dates and dependencies'}
              </span>
            )}
          </div>

          {tasks.length === 0 ? (
            /* ── Empty state ──────────────────────────────────────────────── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 4 }}>📊</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--gx-text)' }}>Build your Gantt chart</h2>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--gx-text-muted)', maxWidth: 380, lineHeight: 1.6 }}>
                Create a project timeline, edit the details, connect dependencies, then save or export. Everything stays in your browser.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                <button onClick={handleAddNew} className="gx-btn gx-btn-primary" style={{ fontSize: 15, padding: '12px 24px' }}>
                  Create first task
                </button>
                <button onClick={() => {
                  const { tasks: sample } = { tasks: generateSampleData().map(t => ({ ...t, id: t.id || makeId() })) }
                  setTasks(sample)
                }} className="gx-btn gx-btn-secondary" style={{ fontSize: 15, padding: '12px 24px' }}>
                  Load example
                </button>
                <button onClick={() => setShowImport(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 15, padding: '12px 24px' }}>
                  Import project data
                </button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--gx-text-muted)' }}>
                Start from scratch, an example, or an existing spreadsheet.
              </p>
            </div>
          ) : (
            <div ref={ganttAreaRef} className="gantt-viewport">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${(100/zoom).toFixed(1)}%`, height: `${(100/zoom).toFixed(1)}%` }}>
                <CustomGantt
                  tasks={tasks}
                  viewMode={viewMode}
                  labelMode={labelMode}
                  rowHeight={rowHeight}
                  barFontSize={barFontSize}
                  chartFont={chartFont}
                  categoryColors={categoryColors}
                  onColorChange={handleColorChange}
                  onTaskChange={handleTaskChange}
                  onTaskClick={id => {
                    setSelectedId(id)
                    setEditingTaskId(id)
                  }}
                  onRenameCategory={handleRenameCategory}
                  exportRef={ganttExportRef}
                  scrollExportRef={ganttScrollRef}
                  isMobile={isMobile}
                  selectedId={selectedId}
                  availableWidth={Math.max(320, viewportWidth - (labelMode === 'classic' ? (isMobile ? 124 : 190) : 16))}
                />
              </div>
            </div>
          )}

          {/* FAB: Add task */}
          {tasks.length > 0 && (
          <button onClick={handleAddNew}
            style={{
              position: 'absolute', bottom: 20, right: 20,
              minWidth: 52, height: 52, borderRadius: 26, padding: '0 18px',
              background: 'var(--gx-accent)', color: '#fff',
              border: 'none', lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 10,
              fontSize: 14, fontWeight: 700,
            }} title="Add task"><span style={{ fontSize: 24 }}>+</span><span className="fab-label">Task</span></button>
          )}
        </main>

        {/* Task table (collapsible + resizable) */}
        {showTable && tasks.length > 0 && (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Resize handle */}
            <div
              onMouseDown={startTableResize}
              onTouchStart={startTableResize}
              style={{
                height: isMobile ? 20 : 8, cursor: 'row-resize', flexShrink: 0,
                background: 'var(--gx-border)',
                borderTop: '1px solid var(--gx-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: isMobile ? 48 : 32, height: isMobile ? 4 : 2, borderRadius: 2, background: 'var(--gx-text-muted)', opacity: 0.5 }} />
            </div>
            <TaskTable
              tasks={tasks}
              categories={categories}
              onUpdate={handleTaskChange}
              onDelete={handleDelete}
              onAdd={handleAddNew}
              onMove={handleMoveTask}
              tableHeight={tableHeight}
              compact={viewportWidth < 600}
              onEdit={id => { setSelectedId(id); setEditingTaskId(id) }}
            />
          </div>
        )}
      </div>

      {(feedback || autosaveStatus === 'saving') && (
        <div className={`workflow-feedback ${feedback?.tone || 'progress'}`} role="status" aria-live="polite">
          <span className="feedback-dot" />
          {feedback?.message || 'Saving changes…'}
        </div>
      )}

      {/* Import modal */}
      {showImport && <ImportModal onLoad={handleImport} onClose={() => setShowImport(false)} />}

      {/* Confirm clear modal */}
      {confirmClear && (
        <>
          <div onClick={() => setConfirmClear(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, background: 'var(--gx-surface)', borderRadius: 12, padding: '28px 28px 24px', width: 320, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--gx-text)' }}>Clear all tasks?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--gx-text-muted)', lineHeight: 1.5 }}>This will remove all tasks and the chart title. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleClear} style={{ flex: 1, padding: '10px', fontSize: 14, background: 'var(--gx-error)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Clear all</button>
              <button onClick={() => setConfirmClear(false)} className="gx-btn gx-btn-secondary" style={{ flex: 1, padding: '10px', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {/* Settings modal */}
      {showSettings && (
        <>
          <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, background: 'var(--gx-surface)', borderRadius: 12, padding: '24px 24px 20px', width: 340, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gx-text)' }}>Display settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--gx-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Row density */}
            <div style={{ marginBottom: 18 }}>
              <div style={settingsLabel}>Row density</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { d: 'compact',  tip: 'Compact: smaller rows, fits more tasks on screen' },
                  { d: 'normal',   tip: 'Normal: default row height' },
                  { d: 'spacious', tip: 'Spacious: taller rows, easier to click on touch devices' },
                ].map(({ d, tip }) => (
                  <button key={d} onClick={() => setDisplayDensity(d)} title={tip}
                    className={displayDensity === d ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
                    style={{ flex: 1, padding: '8px 4px', fontSize: 12, textTransform: 'capitalize' }}>{d}</button>
                ))}
              </div>
            </div>

            {/* Font family */}
            <div style={{ marginBottom: 18 }}>
              <div style={settingsLabel}>Chart font</div>
              <select value={chartFont} onChange={e => setChartFont(e.target.value)} style={selectStyle}>
                <option value="inherit">Default (theme)</option>
                <option value="Inter, system-ui, sans-serif">Inter</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>

            {/* Font size */}
            <div style={{ marginBottom: 18 }}>
              <div style={settingsLabel}>Font size</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setChartFontSize(s => Math.max(6, s - 1))} className="gx-btn gx-btn-secondary" style={{ padding: '6px 12px', fontSize: 16, lineHeight: 1 }}>−</button>
                <input
                  type="number" min={6} max={32}
                  value={chartFontSize}
                  onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 6 && v <= 32) setChartFontSize(v) }}
                  style={{ ...selectStyle, width: 64, textAlign: 'center', padding: '8px 6px' }}
                />
                <button onClick={() => setChartFontSize(s => Math.min(32, s + 1))} className="gx-btn gx-btn-secondary" style={{ padding: '6px 12px', fontSize: 16, lineHeight: 1 }}>+</button>
                <span style={{ fontSize: 12, color: 'var(--gx-text-muted)' }}>px</span>
              </div>
            </div>

            {/* Colour palette */}
            <div style={{ marginBottom: 20 }}>
              <div style={settingsLabel}>Colour palette</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(PALETTES).map(([name, colours]) => (
                  <button
                    key={name}
                    onClick={() => applyPalette(name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', borderRadius: 7, cursor: 'pointer',
                      background: 'var(--gx-bg-alt)', border: '1px solid var(--gx-border)',
                      textAlign: 'left', width: '100%', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gx-accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gx-border)'}
                  >
                    <span style={{ fontSize: 12, color: 'var(--gx-text)', width: 72, flexShrink: 0, textTransform: 'capitalize' }}>{name === 'default' ? 'Default' : name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                      {colours.slice(0, 8).map((c, i) => (
                        <span key={i} style={{ flex: 1, height: 16, borderRadius: 3, background: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'var(--gx-text-muted)', marginTop: 5, display: 'block' }}>Overwrites current WP colours</span>
            </div>

            {/* PNG export resolution */}
            <div style={{ marginBottom: 20 }}>
              <div style={settingsLabel}>PNG export resolution</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { scale: 1, label: '1×', note: 'screen',  tip: '1× — screen resolution, smallest file' },
                  { scale: 2, label: '2×', note: 'Word',    tip: '2× — good for Word and PowerPoint' },
                  { scale: 3, label: '3×', note: 'sharp',   tip: '3× — crisp on high-DPI displays' },
                  { scale: 4, label: '4×', note: 'print',   tip: '4× — best for print, largest file' },
                ].map(({ scale, label, note, tip }) => (
                  <button key={scale} onClick={() => setExportScale(scale)} title={tip}
                    className={exportScale === scale ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
                    style={{ flex: 1, padding: '8px 4px', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  >
                    <span style={{ fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 10, opacity: 0.75 }}>{note}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setShowSettings(false)} className="gx-btn gx-btn-secondary" style={{ width: '100%', padding: '10px', fontSize: 14 }}>Done</button>
          </div>
        </>
      )}

      {/* Help modal */}
      {showHelp && (
        <>
          <div onClick={() => setShowHelp(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 50, background: 'var(--gx-surface)', borderRadius: 12, padding: '24px 24px 20px', width: 400, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--gx-text)' }}>Help &amp; shortcuts</h3>
              <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--gx-text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {[
              {
                heading: 'Keyboard shortcuts',
                note: 'Click a task bar first to select it',
                rows: [
                  ['Delete / Backspace', 'Remove selected task'],
                  ['Escape', 'Deselect task'],
                  ['← →', 'Nudge task ±1 day'],
                  ['Shift + ← →', 'Nudge task ±7 days'],
                  ['↑ ↓', 'Reorder task up / down'],
                  ['Double-click bar', 'Rename task inline'],
                ],
              },
              {
                heading: 'Chart',
                rows: [
                  ['Click bar', 'Select task (opens editor on mobile)'],
                  ['Click chart title', 'Edit the chart title'],
                  ['Drag label column edge', 'Resize the task name column'],
                  ['Zoom − / +', 'Shrink or expand the time axis'],
                  ['Week / Month / Quarter / Year', 'Change time scale'],
                  ['Classic / Inline', 'Labels in a column vs. inside bars'],
                ],
              },
              {
                heading: 'Task table',
                rows: [
                  ['Click any cell', 'Edit task name, category, or progress'],
                  ['Click date', 'Open date picker'],
                  ['Click Deps cell (✎)', 'Choose predecessor tasks'],
                  ['Drag column header edge', 'Resize column'],
                  ['Drag resize handle', 'Adjust table height'],
                  ['↑ ↓ buttons', 'Reorder tasks'],
                ],
              },
              {
                heading: 'Files',
                rows: [
                  ['Save', 'Download .json (tasks + colours)'],
                  ['Load', 'Restore a saved .json project'],
                  ['Import', 'Load tasks from CSV, Excel or JSON'],
                  ['Export → PNG', 'Raster image for Word / slides'],
                  ['Export → SVG', 'Vector image for Inkscape'],
                  ['Export → PDF', 'A4 PDF for print / sharing'],
                ],
              },
            ].map(({ heading, note, rows }) => (
              <div key={heading} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: note ? 2 : 8 }}>{heading}</div>
                {note && <div style={{ fontSize: 11, color: 'var(--gx-text-muted)', marginBottom: 8 }}>{note}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
                  {rows.map(([key, desc]) => (
                    <>
                      <span key={key + '-k'} style={{ fontSize: 12, fontFamily: 'monospace', background: 'var(--gx-bg-alt)', border: '1px solid var(--gx-border)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', alignSelf: 'center', color: 'var(--gx-text)' }}>{key}</span>
                      <span key={key + '-d'} style={{ fontSize: 12, color: 'var(--gx-text-muted)', alignSelf: 'center' }}>{desc}</span>
                    </>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={() => setShowHelp(false)} className="gx-btn gx-btn-secondary" style={{ width: '100%', padding: '10px', fontSize: 14 }}>Close</button>
          </div>
        </>
      )}

      {/* Bottom sheet (mobile task editor) */}
      {editingTask && (
        <BottomSheet
          key={editingTask.id}
          task={editingTask}
          tasks={tasks}
          categories={categories}
          categoryColors={categoryColors}
          onColorChange={handleColorChange}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onClose={() => setEditingTaskId(null)}
          onMoveUp={tasks.indexOf(editingTask) > 0 ? () => handleMoveTask(editingTaskId, -1) : null}
          onMoveDown={tasks.indexOf(editingTask) < tasks.length - 1 ? () => handleMoveTask(editingTaskId, 1) : null}
        />
      )}
    </div>
  )
}

function App() {
  const initial = loadInitial()
  const [tasks, setTasks] = useState(initial.tasks)
  const [chartTitle, setChartTitle] = useState(initial.chartTitle)
  const [categoryColors, setCategoryColors] = useState(initial.categoryColors)
  const [autosaveStatus, setAutosaveStatus] = useState('saved')

  // Autosave
  useEffect(() => {
    let savedTimer
    const savingTimer = window.setTimeout(() => {
      setAutosaveStatus('saving')
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ tasks, chartTitle, categoryColors }))
        savedTimer = window.setTimeout(() => setAutosaveStatus('saved'), 450)
      } catch {
        setAutosaveStatus('unavailable')
      }
    }, 120)
    return () => {
      window.clearTimeout(savingTimer)
      window.clearTimeout(savedTimer)
    }
  }, [tasks, chartTitle, categoryColors])

  return (
    <BrowserRouter>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--gx-bg)', overflow: 'hidden' }}>
        <NavBar
          appName="Gantt Builder"
          appSubtitle="Grant timeline maker"
          githubUrl="https://github.com/happykhan/gantt-app"
          icon={
            <svg viewBox="0 0 64 64" style={{ width: 32, height: 32 }}>
              <rect width="64" height="64" rx="12" fill="#0f172a"/>
              <line x1="20" y1="10" x2="20" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <line x1="36" y1="10" x2="36" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <line x1="52" y1="10" x2="52" y2="54" stroke="#fff" strokeOpacity="0.08" strokeWidth="1"/>
              <rect x="12" y="13" width="26" height="7" rx="2" fill="#0d9488"/>
              <rect x="20" y="24" width="32" height="7" rx="2" fill="#0d9488" opacity="0.7"/>
              <rect x="30" y="35" width="22" height="7" rx="2" fill="#6366f1"/>
              <rect x="38" y="46" width="14" height="7" rx="2" fill="#f59e0b"/>
              <line x1="36" y1="10" x2="36" y2="54" stroke="#2dd4bf" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="3 2"/>
            </svg>
          }
        />

        <GanttPage
          tasks={tasks} setTasks={setTasks}
          chartTitle={chartTitle} setChartTitle={setChartTitle}
          categoryColors={categoryColors} setCategoryColors={setCategoryColors}
          autosaveStatus={autosaveStatus}
        />

        <footer className="app-footer">
          <span className={`autosave-indicator is-${autosaveStatus}`}>
            <span className="feedback-dot" />
            {autosaveStatus === 'saving' ? 'Saving…' : autosaveStatus === 'unavailable' ? 'Browser save unavailable' : 'All changes saved in this browser'}
          </span>
          <span className="app-version">Gantt Builder v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gx-accent)', textDecoration: 'none' }}>GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
