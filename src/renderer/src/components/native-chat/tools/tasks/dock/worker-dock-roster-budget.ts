/** The strip's share of the chat pane; a list the user dragged taller may take 60%. */
export function workerDockFrameCap(paneHeight: number, grown: boolean): number {
  return Math.max(44, Math.min(paneHeight * (grown ? 0.6 : 0.4), paneHeight - 180))
}

/** The open roster's max height: a few rows by default, or the height the user dragged it to, kept
 *  inside a joined dock's share of the chat pane. It depends on the pane, the drag and the rows'
 *  layout only, never on the scroll position, so scrolling never resizes the list. The default is
 *  the floor for drag, render and restore alike, so dragging down at the default changes nothing. */
export function workerDockRosterBudget(
  root: HTMLElement | null,
  narrow: boolean,
  orderHeld: boolean,
  preferred: number | null = null
): number {
  const pane = root?.closest('[data-native-chat-root]')?.getBoundingClientRect()
  const paneHeight = pane?.height ?? globalThis.innerHeight
  const short = paneHeight < 520
  const nominal = narrow ? (short ? 120 : 200) : short ? 100 : 160
  const inDock = Boolean(root?.closest('[data-native-chat-worker-dock]'))
  // The strip's header, its order-held bar and its 1px top and bottom borders share the cap.
  const room = (grown: boolean) =>
    Math.max(
      44,
      workerDockFrameCap(paneHeight, grown) - (narrow ? 44 : 36) - (orderHeld ? 28 : 0) - 2
    )
  const fallback = inDock ? Math.min(nominal, room(false)) : nominal
  if (preferred === null) {
    return fallback
  }
  return Math.max(fallback, inDock ? Math.min(preferred, room(true)) : preferred)
}
