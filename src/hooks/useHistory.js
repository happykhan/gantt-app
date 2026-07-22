import { useCallback, useRef, useState } from 'react'

const MAX_HISTORY = 30

export function useHistory(value, onRestore) {
  const stack = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  const checkpoint = useCallback(() => {
    stack.current = [...stack.current.slice(-(MAX_HISTORY - 1)), structuredClone(value)]
    setCanUndo(true)
  }, [value])

  const undo = useCallback(() => {
    if (!stack.current.length) return
    const previous = stack.current.at(-1)
    stack.current = stack.current.slice(0, -1)
    onRestore(previous)
    setCanUndo(stack.current.length > 0)
  }, [onRestore])

  return { checkpoint, undo, canUndo }
}
