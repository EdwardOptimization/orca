import { readAgentSessionFailureFact } from '../../shared/agent-session/failures/agent-session-failure'
import { tuiAgentDisplayName } from '../../shared/agent-launch/catalog/tui-agent-display-names'
import {
  automationRunModelUnavailable,
  type AutomationRunFailure
} from '../../shared/automations/history/automation-run-failure-copy'
import type { Bot } from '../../shared/bot-types'
import { sanitizeCrashReportString } from '../../shared/crash-reporting/crash-report-redaction'
import type { BotTurnEnd } from './bot-run-turn-watch'

/** A run continuing a conversation has no launch setup of its own to name. */
export function botRunModelFailure(
  runBot: Pick<Bot, 'agent' | 'launch'> | undefined,
  ended: Extract<BotTurnEnd, { outcome: unknown }>
): AutomationRunFailure | null {
  const failure = ended.failure ?? readAgentSessionFailureFact(ended.refusal)
  if (failure?.kind !== 'modelUnavailable') {
    return null
  }
  const agent = runBot?.agent
  const model = failure.detail?.text ?? runBot?.launch?.model
  return automationRunModelUnavailable({
    ...(agent ? { agent, agentLabel: tuiAgentDisplayName(agent) ?? agent } : {}),
    ...(model ? { model: sanitizeCrashReportString(model) } : {})
  })
}
