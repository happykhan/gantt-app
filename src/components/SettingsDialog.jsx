import { PALETTES } from '../config/palettes'
import Modal from './Modal'

export default function SettingsDialog({ density, onDensity, chartFont, onChartFont, fontSize, onFontSize, exportScale, onExportScale, onPalette, onClose }) {
  return (
    <Modal titleId="settings-title" onClose={onClose} backdropZIndex={130} dialogZIndex={131} className="app-dialog settings-dialog">
        <header className="dialog-header">
          <h3 id="settings-title">Display settings</h3>
          <button onClick={onClose} className="dialog-close" aria-label="Close settings">×</button>
        </header>

        <div className="settings-group">
          <div className="settings-label">Row density</div>
          <div className="segmented-control">
            {['compact', 'normal', 'spacious'].map(value => (
              <button key={value} onClick={() => onDensity(value)} className={density === value ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}>{value}</button>
            ))}
          </div>
        </div>

        <label className="settings-group">
          <span className="settings-label">Chart font</span>
          <select value={chartFont} onChange={event => onChartFont(event.target.value)} className="settings-select">
            <option value="inherit">Default (theme)</option>
            <option value="Inter, system-ui, sans-serif">Inter</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
          </select>
        </label>

        <div className="settings-group">
          <div className="settings-label">Font size</div>
          <div className="number-control">
            <button onClick={() => onFontSize(Math.max(6, fontSize - 1))} className="gx-btn gx-btn-secondary">−</button>
            <input type="number" min={6} max={32} value={fontSize} aria-label="Chart font size" onChange={event => {
              const value = parseInt(event.target.value, 10)
              if (value >= 6 && value <= 32) onFontSize(value)
            }} />
            <button onClick={() => onFontSize(Math.min(32, fontSize + 1))} className="gx-btn gx-btn-secondary">+</button>
            <span>px</span>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-label">Colour palette</div>
          <div className="palette-list">
            {Object.entries(PALETTES).map(([name, colours]) => (
              <button key={name} onClick={() => onPalette(name)} className="palette-option">
                <span>{name === 'default' ? 'Default' : name.charAt(0).toUpperCase() + name.slice(1)}</span>
                <span className="palette-swatches">
                  {colours.slice(0, 8).map(colour => <i key={colour} style={{ backgroundColor: colour }} />)}
                </span>
              </button>
            ))}
          </div>
          <small>Overwrites current WP colours</small>
        </div>

        <div className="settings-group">
          <div className="settings-label">PNG export resolution</div>
          <div className="segmented-control export-scale-control">
            {[['1×', 'screen'], ['2×', 'Word'], ['3×', 'sharp'], ['4×', 'print']].map(([label, note], index) => {
              const scale = index + 1
              return <button key={scale} onClick={() => onExportScale(scale)} className={exportScale === scale ? 'gx-btn gx-btn-primary' : 'gx-btn gx-btn-secondary'}><strong>{label}</strong><small>{note}</small></button>
            })}
          </div>
        </div>

        <button onClick={onClose} className="gx-btn gx-btn-secondary dialog-done">Done</button>
    </Modal>
  )
}
