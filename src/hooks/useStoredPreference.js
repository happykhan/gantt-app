import { useEffect, useState } from 'react'

export function readPreference(key, fallback, parse = value => value) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null ? fallback : parse(stored)
  } catch {
    return fallback
  }
}

export function useStoredPreference(key, fallback, parse) {
  const [value, setValue] = useState(() => readPreference(key, fallback, parse))
  useEffect(() => {
    try { window.localStorage.setItem(key, String(value)) } catch { /* Preferences are best-effort. */ }
  }, [key, value])
  return [value, setValue]
}
