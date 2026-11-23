import { useSyncExternalStore } from 'react'

// The worker list height the user dragged to, shared by every chat and kept across restarts.
const KEY = 'orca.nativeChat.workerDock.listHeight'
const listeners = new Set<() => void>()
let current: number | null | undefined

function read(): number | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    const value = raw === null ? Number.NaN : Number(raw)
    // A drag below the default saves a small number; readers floor it at the default height.
    return Number.isFinite(value) && value >= 0 ? value : null
  } catch {
    return null
  }
}

/** The dragged height in CSS pixels; null keeps the default. */
export function workerDockListHeight(): number | null {
  if (current === undefined) {
    current = read()
  }
  return current
}

/** Mid-drag updates skip storage; the drag's end (or a reset) saves once. */
export function setWorkerDockListHeight(value: number | null, persist: boolean): void {
  current = value === null ? null : Math.round(value)
  if (persist) {
    try {
      if (current === null) {
        window.localStorage.removeItem(KEY)
      } else {
        window.localStorage.setItem(KEY, String(current))
      }
    } catch {
      // Blocked storage keeps the height for this session only.
    }
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorkerDockListHeight(): number | null {
  return useSyncExternalStore(subscribe, workerDockListHeight, () => null)
}
