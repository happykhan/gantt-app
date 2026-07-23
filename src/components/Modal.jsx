import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  titleId,
  descriptionId,
  onClose,
  initialFocusRef,
  children,
  className = '',
  style,
  backdropZIndex = 40,
  dialogZIndex = 50,
}) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusInitial = () => {
      const requested = initialFocusRef?.current
      const target = requested || dialog?.querySelector('[data-dialog-initial-focus]') || dialog?.querySelector(FOCUSABLE) || dialog
      target?.focus()
    }
    const frame = window.requestAnimationFrame(focusInitial)

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter(element => (
        !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0
      ))
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = oldOverflow
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus()
    }
  }, [initialFocusRef])

  return (
    <>
      <div
        className="modal-backdrop"
        aria-hidden="true"
        onMouseDown={event => { if (event.target === event.currentTarget) onClose?.() }}
        style={{ zIndex: backdropZIndex }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`accessible-dialog${className ? ` ${className}` : ''}`}
        style={{ ...style, zIndex: dialogZIndex }}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  )
}
