import { useEffect, useRef, useState } from 'react'

export default function WorkflowMenu({ label, children, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.querySelector('[role="menuitem"]')?.focus()
    })
    function closeOnOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        window.requestAnimationFrame(() => triggerRef.current?.focus())
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="workflow-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`gx-btn gx-btn-secondary workflow-menu-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
      >
        {label}<span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div
          className={`workflow-menu-popover align-${align}`}
          role="menu"
          aria-label={`${label} menu`}
          onClick={event => {
            if (!event.target.closest('[role="menuitem"]')) return
            triggerRef.current?.focus()
            setOpen(false)
          }}
          onKeyDown={event => {
            const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]')].filter(item => !item.disabled)
            const index = items.indexOf(document.activeElement)
            let nextIndex = null
            if (event.key === 'ArrowDown') nextIndex = index < items.length - 1 ? index + 1 : 0
            if (event.key === 'ArrowUp') nextIndex = index > 0 ? index - 1 : items.length - 1
            if (event.key === 'Home') nextIndex = 0
            if (event.key === 'End') nextIndex = items.length - 1
            if (event.key === 'Tab') setOpen(false)
            if (nextIndex !== null && items[nextIndex]) {
              event.preventDefault()
              items[nextIndex].focus()
            }
          }}
        >
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
