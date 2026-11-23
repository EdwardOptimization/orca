import type { AgentDotState } from '@/components/agent/status/AgentStateDot'
import type {
  WorkerDockEntry,
  WorkerDockResult
} from '../../../../../../../shared/orchestration/dock/worker-dock'

/** The app-wide agent glyph for a dock state, so a running worker spins in the same amber as the
 *  sidebar and bot panel instead of a dock-only gray. Null when the state can't be read: the row
 *  draws no glyph rather than a guess. */
export function workerDockDotState(
  state: WorkerDockEntry['state'],
  retired = false
): AgentDotState | null {
  if (retired) {
    return 'done'
  }
  switch (state) {
    case 'starting':
    case 'running':
    case 'stopping':
    case 'saving':
      return 'working'
    case 'waiting':
    case 'coordinator':
    case 'needs-you':
      return 'waiting'
    case 'idle':
      return 'idle'
    case 'failed':
    case 'unexpected':
      return 'failed'
    case 'unavailable':
      return null
  }
}

export function workerDockResultDotState(
  outcome: WorkerDockResult['outcome'] | undefined
): AgentDotState {
  switch (outcome) {
    case 'failed':
    case 'unexpected':
      return 'failed'
    case 'stopped':
      return 'interrupted'
    default:
      return 'done'
  }
}
