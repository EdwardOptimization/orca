/** True when a wheel over the dock would spill into the chat: the list under the pointer is
 *  already at the edge it scrolls toward. A list with nothing to scroll lets the wheel through. */
export function workerDockWheelAtEdge(
  target: EventTarget | null,
  frame: HTMLElement,
  deltaY: number
): boolean {
  if (deltaY === 0 || !(target instanceof Element) || !frame.contains(target)) {
    return false
  }
  for (let node: Element | null = target; node; node = node === frame ? null : node.parentElement) {
    if (!(node instanceof HTMLElement)) {
      continue
    }
    const range = node.scrollHeight - node.clientHeight
    if (range <= 1) {
      continue
    }
    const { overflowY } = getComputedStyle(node)
    if (overflowY !== 'auto' && overflowY !== 'scroll') {
      continue
    }
    return deltaY < 0 ? node.scrollTop <= 0 : node.scrollTop >= range - 1
  }
  return false
}

/** Keep wheel and trackpad scrolling inside the worker list at both ends. */
export function containWorkerDockWheel(frame: HTMLElement | null): (() => void) | undefined {
  if (!frame) {
    return undefined
  }
  const wheel = (event: WheelEvent) => {
    if (!event.ctrlKey && workerDockWheelAtEdge(event.target, frame, event.deltaY)) {
      event.preventDefault()
    }
  }
  frame.addEventListener('wheel', wheel, { passive: false })
  return () => frame.removeEventListener('wheel', wheel)
}
