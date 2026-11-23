import { expect, it } from 'vitest'
import { workerDockDotState, workerDockResultDotState } from './worker-dock-status-dot'

it('maps every dock state to the glyph the sidebar and bot panel use', () => {
  expect(
    Object.fromEntries(
      (
        [
          'starting',
          'running',
          'stopping',
          'saving',
          'needs-you',
          'waiting',
          'coordinator',
          'idle',
          'failed',
          'unexpected',
          'unavailable'
        ] as const
      ).map((state) => [state, workerDockDotState(state)])
    )
  ).toEqual({
    starting: 'working',
    running: 'working',
    stopping: 'working',
    saving: 'working',
    'needs-you': 'waiting',
    waiting: 'waiting',
    coordinator: 'waiting',
    idle: 'idle',
    failed: 'failed',
    unexpected: 'failed',
    unavailable: null
  })
  expect(workerDockDotState('running', true)).toBe('done')
  expect(workerDockResultDotState('unexpected')).toBe('failed')
  expect(workerDockResultDotState('stopped')).toBe('interrupted')
  expect(workerDockResultDotState('succeeded')).toBe('done')
})
