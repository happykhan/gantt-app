import { useState, useRef, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { NavBar } from '@genomicx/ui'
import { toPng, toSvg } from 'html-to-image'
import CustomGantt from './components/CustomGantt'
import BottomSheet from './components/BottomSheet'
import ImportModal from './components/ImportModal'
import TaskTable from './components/TaskTable'
import { generateSampleData } from './utils/parseInput'

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
  } catch {}
  return {
    tasks: generateSampleData().map(t => ({ ...t, id: t.id || makeId() })),
    chartTitle: '',
    categoryColors: {},
  }
}

function GanttPage({ tasks, setTasks, chartTitle, setChartTitle, categoryColors, setCategoryColors }) {
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('gantt-viewMode') || (window.innerWidth < 768 ? 'Year' : 'Quarter') } catch { return 'Quarter' }
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('gantt-labelMode', labelMode) } catch {}
  }, [labelMode])
  useEffect(() => {
    try { localStorage.setItem('gantt-viewMode', viewMode) } catch {}
  }, [labelMode])
  useEffect(() => {
    try { localStorage.setItem('gantt-density', displayDensity) } catch {}
  }, [displayDensity])
  useEffect(() => {
    try { localStorage.setItem('gantt-zoom', zoom) } catch {}
  }, [zoom])
  useEffect(() => {
    try { localStorage.setItem('gantt-font', chartFont) } catch {}
  }, [chartFont])
  useEffect(() => {
    try { localStorage.setItem('gantt-fontsize', chartFontSize) } catch {}
  }, [chartFontSize])
  useEffect(() => {
    try { localStorage.setItem('gantt-exportScale', exportScale) } catch {}
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
  const [showTable, setShowTable] = useState(() => window.innerWidth >= 768)
  const [tableHeight, setTableHeight] = useState(() => {
    try { return parseInt(localStorage.getItem('gantt-tableHeight'), 10) || 240 } catch { return 240 }
  })
  const ganttAreaRef = useRef()
  const ganttExportRef = useRef()
  const ganttScrollRef = useRef()

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))]
  const selectedTask = tasks.find(t => t.id === selectedId)

  // Keyboard shortcuts for selected task
  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedId) return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
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
  }, [selectedId])

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
  function handleDelete(id) {
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
  }
  function handleMoveTask(id, dir) {
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
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    const newTask = { id: makeId(), name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 }
    setTasks(prev => [...prev, newTask])
    setSelectedId(newTask.id)
  }
  function handleImport(newTasks) {
    setTasks(newTasks.map(t => ({ ...t, id: t.id || makeId() })))
  }
  function handleClear() {
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
  }
  function loadProject(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const { tasks: loaded, chartTitle: loadedTitle, categoryColors: loadedColors } = JSON.parse(e.target.result)
        if (Array.isArray(loaded) && loaded.length) setTasks(loaded)
        if (loadedTitle) setChartTitle(loadedTitle)
        if (loadedColors && typeof loadedColors === 'object') setCategoryColors(loadedColors)
      } catch { /* ignore */ }
    }
    reader.readAsText(file)
  }
  async function captureExport(fn, filename) {
    const outer = ganttExportRef.current
    if (!outer) return

    // Find every element inside outer that clips overflow, not just the known refs.
    // This handles both inline and classic layouts without hardcoding specific refs.
    const CLIP = new Set(['hidden', 'auto', 'scroll', 'clip'])
    const clips = [outer, ...outer.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el)
      // Never expand text-truncation elements — they use overflow:hidden to drive
      // the ellipsis and must stay clipped so text doesn't overflow in the export
      if (s.textOverflow === 'ellipsis') return false
      return CLIP.has(s.overflow) || CLIP.has(s.overflowX) || CLIP.has(s.overflowY)
    })

    const saved = clips.map(el => ({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
    }))
    clips.forEach(el => {
      el.style.overflow = 'visible'
      el.style.overflowX = 'visible'
      el.style.overflowY = 'visible'
      el.style.maxHeight = 'none'
      // Only clear height when it's not an explicit pixel value.
      // Pixel heights on the bar container / individual bars are load-bearing —
      // clearing them collapses absolutely-positioned children and hides the bars.
      const inlineH = el.style.height
      if (!inlineH || inlineH === 'auto' || inlineH.endsWith('%')) {
        el.style.height = 'auto'
      }
    })

    // Measure full size after expanding
    const w = outer.scrollWidth
    const h = outer.scrollHeight

    try {
      const isSvg = filename.endsWith('.svg')
      const PIXEL_RATIO = isSvg ? 1 : exportScale
      const MAX_W = 4800
      const opts = { backgroundColor: '#ffffff', width: w, height: h }
      if (!isSvg) opts.pixelRatio = PIXEL_RATIO
      const raw = await fn(outer, opts)

      let finalUrl = raw
      if (!isSvg) {
        const renderedW = w * PIXEL_RATIO
        if (renderedW > MAX_W) {
          const scale = MAX_W / renderedW
          const img = new Image()
          img.src = raw
          await new Promise(r => { img.onload = r })
          const canvas = document.createElement('canvas')
          canvas.width = MAX_W
          canvas.height = Math.round(h * PIXEL_RATIO * scale)
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          finalUrl = canvas.toDataURL('image/png')
        }
      }

      const a = document.createElement('a'); a.href = finalUrl; a.download = filename; a.click()
    } catch (e) { console.error(e); alert('Export failed — try zooming to 100% first.') }
    finally {
      saved.forEach(({ el, overflow, overflowX, overflowY, height, maxHeight }) => {
        el.style.overflow = overflow
        el.style.overflowX = overflowX
        el.style.overflowY = overflowY
        el.style.height = height
        el.style.maxHeight = maxHeight
      })
    }
  }
  async function exportPNG() { await captureExport(toPng, 'gantt.png') }
  async function exportSVG() { await captureExport(toSvg, 'gantt.svg') }

  function startTableResize(e) {
    const startY = e.clientY
    const startH = tableHeight
    let lastH = startH
    function onMove(ev) {
      lastH = Math.max(80, Math.min(600, startH - (ev.clientY - startY)))
      setTableHeight(lastH)
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      try { localStorage.setItem('gantt-tableHeight', lastH) } catch {}
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    e.preventDefault()
  }

  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.5, ZOOM_MAX = 2
  const settingsLabel = { fontSize: 11, fontWeight: 700, color: 'var(--gx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }
  const selectStyle = { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gx-border)', borderRadius: 8, background: 'var(--gx-surface)', color: 'var(--gx-text)', outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-surface)', flexShrink: 0 }}>
        {['Week','Month','Quarter','Year'].map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={viewMode === m ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}
            style={{ fontSize: 12, padding: '3px 8px' }}>{isMobile ? m.charAt(0) : m}</button>
        ))}
        <span style={{ width: 4 }} />
        <button onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>−</button>
        <span style={{ fontSize: 12, color: 'var(--gx-text-muted)', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX}
          className="gx-btn gx-btn-secondary" style={{ fontSize: 16, padding: '1px 8px', lineHeight: 1 }}>+</button>
        <div style={{ flex: 1 }} />

        {isMobile ? (
          <button onClick={() => setShowMore(s => !s)} className="gx-btn gx-btn-secondary"
            style={{ fontSize: 18, padding: '1px 12px', lineHeight: 1 }} title="More options">⋯</button>
        ) : (
          <>
            <button onClick={() => setLabelMode(m => m === 'inline' ? 'classic' : 'inline')}
              className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>
              {labelMode === 'inline' ? 'Classic' : 'Inline'}
            </button>
            <button onClick={() => setShowSettings(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>⚙ Settings</button>
            <button onClick={() => setShowTable(s => !s)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>
              {showTable ? '▲ Table' : '▼ Table'}
            </button>
            <button onClick={() => setShowImport(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Import</button>
            <button onClick={saveProject} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Save</button>
            <label className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px', cursor: 'pointer', margin: 0 }}>
              Load<input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { loadProject(e.target.files[0]); e.target.value = '' }} />
            </label>
            <button onClick={exportPNG} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>PNG</button>
            <button onClick={exportSVG} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>SVG</button>
            <button onClick={() => setConfirmClear(true)} className="gx-btn gx-btn-secondary" style={{ fontSize: 12, padding: '3px 8px' }}>Clear</button>
          </>
        )}

        {/* Mobile overflow menu */}
        {isMobile && showMore && (
          <>
            <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
            <div style={{
              position: 'absolute', right: 8, top: '100%', zIndex: 99,
              background: 'var(--gx-surface)', border: '1px solid var(--gx-border)',
              borderRadius: 10, boxShadow: '0 6px 28px rgba(0,0,0,0.22)',
              minWidth: 200, padding: '6px 0', marginTop: 4,
            }}>
              {[
                [labelMode === 'inline' ? 'Classic layout' : 'Inline layout', () => setLabelMode(m => m === 'inline' ? 'classic' : 'inline')],
                [showTable ? 'Hide table' : 'Show table', () => setShowTable(s => !s)],
                ['Settings', () => setShowSettings(true)],
                ['Import…', () => setShowImport(true)],
                ['Save project', saveProject],
                ['Export PNG', exportPNG],
                ['Export SVG', exportSVG],
              ].map(([label, action]) => (
                <button key={label} onClick={() => { action(); setShowMore(false) }}
                  style={{ display: 'block', width: '100%', padding: '12px 16px', fontSize: 14, textAlign: 'left', background: 'none', border: 'none', color: 'var(--gx-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
              <label style={{ display: 'block', width: '100%', padding: '12px 16px', fontSize: 14, background: 'none', color: 'var(--gx-text)', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                Load project
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => { loadProject(e.target.files[0]); e.target.value = ''; setShowMore(false) }} />
              </label>
              <div style={{ height: 1, background: 'var(--gx-border)', margin: '4px 0' }} />
              <button onClick={() => { setConfirmClear(true); setShowMore(false) }}
                style={{ display: 'block', width: '100%', padding: '12px 16px', fontSize: 14, textAlign: 'left', background: 'none', border: 'none', color: 'var(--gx-error)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* Gantt chart area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          {/* Chart title */}
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--gx-border)', background: 'var(--gx-surface)', flexShrink: 0 }}>
            {editingTitle ? (
              <input autoFocus value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false) }}
                placeholder="Enter chart title…"
                style={{ width: '100%', fontSize: 15, fontWeight: 600, border: 'none', borderBottom: '2px solid var(--gx-accent)', outline: 'none', background: 'transparent', color: 'var(--gx-text)', padding: '2px 0' }} />
            ) : (
              <div onClick={() => setEditingTitle(true)} title="Tap to set chart title"
                style={{ fontSize: 15, fontWeight: 600, color: chartTitle ? 'var(--gx-text)' : 'var(--gx-text-muted)', cursor: 'text', minHeight: 24 }}>
                {chartTitle || 'Tap to add chart title…'}
              </div>
            )}
          </div>

          <div ref={ganttAreaRef} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
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
                onTaskClick={id => setSelectedId(prev => prev === id ? null : id)}
                onRenameCategory={handleRenameCategory}
                exportRef={ganttExportRef}
                scrollExportRef={ganttScrollRef}
              />
            </div>
          </div>

          {/* FAB: Add task */}
          <button onClick={handleAddNew}
            style={{
              position: 'absolute', bottom: 20, right: 20,
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--gx-accent)', color: '#fff',
              border: 'none', fontSize: 26, lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }} title="Add task">+</button>
        </main>

        {/* Task table (collapsible + resizable) */}
        {showTable && (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Resize handle */}
            <div
              onMouseDown={startTableResize}
              style={{
                height: 6, cursor: 'row-resize', flexShrink: 0,
                background: 'var(--gx-border)',
                borderTop: '1px solid var(--gx-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 32, height: 2, borderRadius: 1, background: 'var(--gx-text-muted)', opacity: 0.4 }} />
            </div>
            <TaskTable
              tasks={tasks}
              categories={categories}
              onUpdate={handleTaskChange}
              onDelete={handleDelete}
              onAdd={handleAddNew}
              onMove={handleMoveTask}
              tableHeight={tableHeight}
            />
          </div>
        )}
      </div>

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
                {['compact', 'normal', 'spacious'].map(d => (
                  <button key={d} onClick={() => setDisplayDensity(d)}
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
                  { scale: 1, label: '1×', note: 'screen' },
                  { scale: 2, label: '2×', note: 'Word' },
                  { scale: 3, label: '3×', note: 'sharp' },
                  { scale: 4, label: '4×', note: 'print' },
                ].map(({ scale, label, note }) => (
                  <button key={scale} onClick={() => setExportScale(scale)}
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

      {/* Bottom sheet (mobile task editor) */}
      {selectedTask && (
        <BottomSheet
          task={selectedTask}
          tasks={tasks}
          categories={categories}
          categoryColors={categoryColors}
          onColorChange={handleColorChange}
          onUpdate={handleTaskChange}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
          onMoveUp={tasks.indexOf(selectedTask) > 0 ? () => handleMoveTask(selectedId, -1) : null}
          onMoveDown={tasks.indexOf(selectedTask) < tasks.length - 1 ? () => handleMoveTask(selectedId, 1) : null}
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

  // Autosave
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ tasks, chartTitle, categoryColors }))
    } catch {}
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
        />

        <footer style={{ borderTop: '1px solid var(--gx-border)', padding: '6px 16px', fontSize: 12, color: 'var(--gx-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, background: 'var(--gx-surface)', flexShrink: 0 }}>
          <span>Gantt Builder v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} — autosaved in your browser</span>
          <a href="https://github.com/happykhan/gantt-app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gx-accent)', textDecoration: 'none' }}>GitHub</a>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
