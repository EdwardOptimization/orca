// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest'
import { containWorkerDockWheel, workerDockWheelAtEdge } from './worker-dock-wheel'

afterEach(() => {
  document.body.replaceChildren()
})

function scroller(scrollHeight: number, clientHeight: number, overflowY = 'auto') {
  const element = document.createElement('div')
  element.style.overflowY = overflowY
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight })
  return element
}

// The chat transcript scrolls; the dock below it holds a list that scrolls on its own.
function layout() {
  const transcript = scroller(2000, 400)
  const frame = scroller(300, 300, 'hidden')
  const list = scroller(600, 160)
  const row = document.createElement('button')
  list.append(row)
  frame.append(list)
  transcript.append(frame)
  document.body.append(transcript)
  return { transcript, frame, list, row }
}

function wheel(target: Element, deltaY: number) {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event.defaultPrevented
}

it('keeps the wheel in the list at its top and bottom so the transcript never moves', () => {
  const { transcript, frame, list, row } = layout()
  const release = containWorkerDockWheel(frame)
  transcript.scrollTop = 700
  list.scrollTop = 0
  expect(wheel(row, -40)).toBe(true)
  list.scrollTop = 600 - 160
  expect(wheel(row, 40)).toBe(true)
  expect(transcript.scrollTop).toBe(700)
  release?.()
})

it('lets the list scroll itself between its edges', () => {
  const { frame, list, row } = layout()
  const release = containWorkerDockWheel(frame)
  list.scrollTop = 120
  expect(wheel(row, 40)).toBe(false)
  expect(wheel(row, -40)).toBe(false)
  list.scrollTop = 0
  expect(wheel(row, 40)).toBe(false)
  release?.()
})

it('passes the wheel through where nothing in the dock scrolls', () => {
  const { frame, row } = layout()
  const short = scroller(100, 100)
  const button = document.createElement('button')
  short.append(button)
  frame.append(short)
  expect(workerDockWheelAtEdge(button, frame, 40)).toBe(false)
  expect(workerDockWheelAtEdge(row, frame, 0)).toBe(false)
  expect(workerDockWheelAtEdge(document.body, frame, 40)).toBe(false)
})
