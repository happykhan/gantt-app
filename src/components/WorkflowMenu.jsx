import { useEffect, useRef, useState } from 'react'

export default function WorkflowMenu({ label, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function closeOnOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="workflow-menu" ref={rootRef}>
      <button
        type="button"
        className={`gx-btn gx-btn-secondary workflow-menu-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        {label}<span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className={`workflow-menu-popover align-${align}`} role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuButton({ children, danger = false, className = '', ...props }) {
  return (
    <button type="button" role="menuitem" className={`workflow-menu-item${danger ? ' is-danger' : ''}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </button>
  )
}

export function MenuLabel({ children }) {
  return <div className="workflow-menu-label">{children}</div>
}

export function MenuDivider() {
  return <div className="workflow-menu-divider" role="separator" />
}
