// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { WorkerDockResizeHandle } from './WorkerDockResizeHandle'
import { setWorkerDockListHeight, workerDockListHeight } from './worker-dock-list-height'
import { workerDockRosterBudget } from './worker-dock-roster-budget'

afterEach(() => {
  cleanup()
  setWorkerDockListHeight(null, true)
})

const KEY = 'orca.nativeChat.workerDock.listHeight'

function setup(range = { height: 160, min: 160, max: 600 }) {
  const viewport = document.createElement('div')
  Object.defineProperty(viewport, 'clientHeight', { configurable: true, value: 160 })
  const pane = document.createElement('div')
  pane.setAttribute('data-native-chat-root', '')
  pane.getBoundingClientRect = () => ({ height: 1000 }) as DOMRect
  pane.append(viewport)
  document.body.append(pane)
  render(<WorkerDockResizeHandle viewport={{ current: viewport }} {...range} />)
  return screen.getByRole('separator', { name: 'Resize workers' })
}

it('drags the list taller up to 60% of the pane, saves once on release, resets on double-click', () => {
  const handle = setup()
  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientY: 500 })
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 })
  expect(workerDockListHeight()).toBe(260)
  expect(localStorage.getItem(KEY)).toBeNull()
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: -2000 })
  expect(workerDockListHeight()).toBe(600)
  fireEvent.pointerUp(handle, { pointerId: 1 })
  expect(localStorage.getItem(KEY)).toBe('600')
  fireEvent.doubleClick(handle)
  expect(workerDockListHeight()).toBeNull()
  expect(localStorage.getItem(KEY)).toBeNull()
})

it('treats a drag below the default as the default across drag, render and reload', () => {
  const handle = setup()
  fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientY: 100 })
  fireEvent.pointerMove(handle, { pointerId: 2, clientY: 900 })
  fireEvent.pointerUp(handle, { pointerId: 2 })
  expect(localStorage.getItem(KEY)).toBe('0')
  expect(workerDockRosterBudget(null, true, false, workerDockListHeight())).toBe(
    workerDockRosterBudget(null, true, false, null)
  )
})

it('never draws the list shorter than its default height', () => {
  expect(workerDockRosterBudget(null, false, false, 40)).toBe(
    workerDockRosterBudget(null, false, false, null)
  )
  expect(workerDockRosterBudget(null, false, false, 400)).toBe(400)
})

it('announces the drawn height between the default and the cap to assistive tech', () => {
  const handle = setup({ height: 312.4, min: 160, max: 600 })
  expect(handle).toHaveAttribute('aria-valuenow', '312')
  expect(handle).toHaveAttribute('aria-valuemin', '160')
  expect(handle).toHaveAttribute('aria-valuemax', '600')
})
