import { useRef, type RefObject } from 'react'
import { useTranslate } from '@/i18n/use-translate'
import {
  setWorkerDockListHeight,
  useWorkerDockListHeight,
  workerDockListHeight
} from './worker-dock-list-height'

const KEY_STEP = 36

/** The list's top edge, between it and the transcript: drag up for a taller list, double-click to
 *  reset. A thin bar shows on hover only. */
export function WorkerDockResizeHandle({
  viewport,
  height,
  min,
  max
}: {
  viewport: RefObject<HTMLDivElement | null>
  /** The list's drawn max height after the default floor and the pane cap, in CSS pixels. */
  height: number
  min: number
  max: number
}) {
  const t = useTranslate()
  const preferred = useWorkerDockListHeight()
  const drag = useRef<{ pointerId: number; y: number; height: number } | null>(null)
  const limit = (value: number) => {
    const pane =
      viewport.current?.closest('[data-native-chat-root]')?.getBoundingClientRect().height ??
      innerHeight
    return Math.max(0, Math.min(value, pane * 0.6))
  }
  const currentHeight = () => viewport.current?.clientHeight ?? 0
  const end = (pointerId: number) => {
    if (drag.current?.pointerId !== pointerId) {
      return
    }
    drag.current = null
    setWorkerDockListHeight(workerDockListHeight(), true)
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(height)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(Math.max(min, max))}
      aria-label={t('components.native-chat.workerDock.resize', 'Resize workers')}
      tabIndex={0}
      data-worker-dock-resize=""
      data-resized={preferred === null ? undefined : ''}
      className="group/resize absolute inset-x-0 top-0 z-20 flex h-1.5 cursor-ns-resize touch-none justify-center focus-visible:outline-none"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return
        }
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        drag.current = {
          pointerId: event.pointerId,
          y: event.clientY,
          height: currentHeight()
        }
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (current?.pointerId === event.pointerId) {
          setWorkerDockListHeight(limit(current.height + current.y - event.clientY), false)
        }
      }}
      onPointerUp={(event) => end(event.pointerId)}
      onPointerCancel={(event) => end(event.pointerId)}
      onDoubleClick={() => setWorkerDockListHeight(null, true)}
      onKeyDown={(event) => {
        const base = currentHeight()
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          setWorkerDockListHeight(
            limit(base + (event.key === 'ArrowUp' ? KEY_STEP : -KEY_STEP)),
            true
          )
        } else if (event.key === 'Home') {
          event.preventDefault()
          setWorkerDockListHeight(null, true)
        }
      }}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 h-1 w-10 rounded-full bg-muted-foreground/50 opacity-0 transition-opacity group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 group-active/resize:opacity-100"
      />
    </div>
  )
}
