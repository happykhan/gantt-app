import { useCallback, useEffect, useState } from 'react'

export function useFeedback() {
  const [feedback, setFeedback] = useState(null)
  const notify = useCallback((message, tone = 'success') => {
    setFeedback({ message, tone, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), 3200)
    return () => window.clearTimeout(timer)
  }, [feedback])
  return { feedback, notify }
}
