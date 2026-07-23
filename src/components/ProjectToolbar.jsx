import WorkflowMenu, { MenuButton, MenuDivider, MenuLabel } from './WorkflowMenu'

const VIEW_MODES = ['Week', 'Month', 'Quarter', 'Year']

export default function ProjectToolbar({
  hasTasks,
  hasSelection,
  selectedTaskName,
  showTable,
  canUndo,
  viewMode,
  labelMode,
  zoom,
  onAdd,
  onImport,
  onToggleTable,
  onEditDependencies,
  onUndo,
  onViewMode,
  onFit,
  onResetZoom,
  onZoom,
  onToggleLabels,
  onSettings,
  onSaveProject,
  onOpenProject,
  onHelp,
  onClear,
  onExportPng,
  onExportSvg,
  onExportPdf,
}) {
  return (
    <div className="workflow-toolbar" aria-label="Project workflow">
      <div className="workflow-primary-actions">
        <button onClick={onAdd} className="gx-btn gx-btn-primary workflow-action">
          <span aria-hidden="true">＋</span><span>{hasTasks ? 'Task' : 'Create task'}</span>
        </button>
        <button onClick={onImport} className="gx-btn gx-btn-secondary workflow-action">Import</button>
        <button onClick={onToggleTable} className={`gx-btn gx-btn-secondary workflow-action${showTable ? ' is-active' : ''}`} aria-pressed={showTable}>
          Edit tasks
        </button>
        <button onClick={onEditDependencies} className="gx-btn gx-btn-secondary workflow-action dependencies-action" disabled={!hasTasks}
          aria-label={selectedTaskName ? `Edit dependencies for ${selectedTaskName}` : 'Dependencies: select a task first'}>
          <span className="desktop-action-label">Dependencies</span><span className="mobile-action-label">Deps</span>
        </button>
      </div>

      <div className="workflow-secondary-actions">
        <button onClick={onUndo} disabled={!canUndo} className="gx-btn gx-btn-secondary icon-action" title="Undo (Ctrl+Z)" aria-label="Undo">↩</button>
        <WorkflowMenu label="View" align="left">
          <MenuLabel>Timeline scale</MenuLabel>
          <div className="view-mode-grid">
            {VIEW_MODES.map(mode => (
              <MenuButton key={mode} className={viewMode === mode ? 'is-selected' : ''} onClick={() => onViewMode(mode)}>{mode}</MenuButton>
            ))}
          </div>
          <MenuDivider />
          <MenuButton onClick={onFit}>Fit to project</MenuButton>
          <MenuButton onClick={onResetZoom}>Reset zoom <span>{Math.round(zoom * 100)}%</span></MenuButton>
          <div className="zoom-menu-row" onClick={event => event.stopPropagation()}>
            <button onClick={() => onZoom(-0.25)} disabled={zoom <= 0.4} aria-label="Zoom out">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => onZoom(0.25)} disabled={zoom >= 2} aria-label="Zoom in">＋</button>
          </div>
          <MenuDivider />
          <MenuButton onClick={onToggleLabels}>{labelMode === 'inline' ? 'Show label column' : 'Show labels in bars'}</MenuButton>
          <MenuButton onClick={onSettings}>Display settings</MenuButton>
        </WorkflowMenu>

        <WorkflowMenu label="Project">
          <MenuButton onClick={onSaveProject}>Save project file</MenuButton>
          <label className="workflow-menu-item file-menu-item" role="menuitem" tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                event.currentTarget.querySelector('input')?.click()
              }
            }}>
            Open project file
            <input type="file" accept=".json" onChange={event => { onOpenProject(event.target.files[0]); event.target.value = '' }} />
          </label>
          <MenuDivider />
          <MenuButton onClick={onHelp}>Help and shortcuts</MenuButton>
          <MenuButton danger onClick={onClear}>Clear project</MenuButton>
        </WorkflowMenu>

        <WorkflowMenu label="Export">
          <MenuLabel>Share your finished chart</MenuLabel>
          <MenuButton onClick={onExportPng}>PNG image</MenuButton>
          <MenuButton onClick={onExportSvg}>SVG image</MenuButton>
          <MenuButton onClick={onExportPdf}>PDF document</MenuButton>
        </WorkflowMenu>
      </div>
      <span className="sr-only" aria-live="polite">{hasSelection ? 'A task is selected' : ''}</span>
    </div>
  )
}
