const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16']

export default function TaskEditor({ tasks, onUpdate, onDelete, onAdd, categories }) {
  function handleField(id, field, value) {
    onUpdate(id, { [field]: value })
  }

  function handleAddRow() {
    const last = tasks[tasks.length - 1]
    const start = last?.end || new Date().toISOString().substring(0, 10)
    const end = new Date(new Date(start).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    onAdd({ name: 'New task', start, end, category: last?.category || '', dependencies: '', progress: 0 })
  }

  return (
    <div className="flex flex-col gap-0 overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_120px_100px_32px] gap-1 px-2 py-1.5 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
        <span>Task</span>
        <span>Start</span>
        <span>End</span>
        <span>Category</span>
        <span />
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-gray-100">
        {tasks.map((task) => {
          const catIdx = categories.indexOf(task.category)
          const catColor = catIdx >= 0 ? CAT_COLORS[catIdx % CAT_COLORS.length] : '#94a3b8'
          return (
            <div
              key={task.id}
              className="grid grid-cols-[1fr_120px_120px_100px_32px] gap-1 px-2 py-1.5 hover:bg-blue-50 items-center group"
            >
              {/* Name */}
              <input
                type="text"
                value={task.name}
                onChange={e => handleField(task.id, 'name', e.target.value)}
                className="w-full text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 outline-none"
              />
              {/* Start */}
              <input
                type="date"
                value={task.start}
                onChange={e => handleField(task.id, 'start', e.target.value)}
                className="text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 outline-none w-full"
              />
              {/* End */}
              <input
                type="date"
                value={task.end}
                min={task.start}
                onChange={e => handleField(task.id, 'end', e.target.value)}
                className="text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 outline-none w-full"
              />
              {/* Category */}
              <div className="relative">
                <input
                  type="text"
                  value={task.category}
                  list={`cats-${task.id}`}
                  onChange={e => handleField(task.id, 'category', e.target.value)}
                  placeholder="WP1…"
                  className="w-full text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-300 rounded pl-5 pr-1 py-0.5 outline-none"
                />
                <datalist id={`cats-${task.id}`}>
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
                <span
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-sm pointer-events-none"
                  style={{ background: catColor }}
                />
              </div>
              {/* Delete */}
              <button
                onClick={() => onDelete(task.id)}
                title="Delete task"
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg leading-none transition-opacity"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Add row */}
      <button
        onClick={handleAddRow}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-200 w-full text-left transition-colors"
      >
        <span className="text-lg leading-none">+</span> Add task
      </button>
    </div>
  )
}
