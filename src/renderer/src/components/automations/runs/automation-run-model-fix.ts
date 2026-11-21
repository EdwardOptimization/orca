// A run that failed because its agent couldn't use its model: which runs can be fixed from the
// failure banner, and the fix, which saves the model to the automation and then reruns it.
import { translate } from '@/i18n/i18n'
import type {
  Automation,
  AutomationBotTarget
} from '../../../../../shared/automations/automation-definition'
import type { AutomationRun } from '../../../../../shared/automations/history/automation-run'
import type { Bot, BotAgent } from '../../../../../shared/bot-types'
import { botAutomationSetup } from '../../../../../shared/bots/bot-agent-setup'

export const AUTOMATION_RUN_MODEL_UNAVAILABLE_CODE = 'agentModelUnavailable'

export type AutomationRunModelFix = {
  agent: BotAgent
  /** The automation's saved model now, which may already differ from the one that failed. */
  savedModel: string | undefined
}

/**
 * Only a run the host classified as a model failure, of a bot automation whose runs start their
 * own conversation (a run in a chat continues that chat's agent and model, which the automation
 * doesn't own), on the agent the automation still starts on, and only while it can be rerun.
 */
export function automationRunModelFix({
  run,
  automation,
  bot,
  canRerun
}: {
  run: Pick<AutomationRun, 'status' | 'errorCode' | 'errorParams'>
  automation: Pick<Automation, 'bot'> | null
  bot: Pick<Bot, 'agent' | 'launch'> | null
  canRerun: boolean
}): AutomationRunModelFix | null {
  const target = automation?.bot
  if (
    run.status !== 'dispatch_failed' ||
    run.errorCode !== AUTOMATION_RUN_MODEL_UNAVAILABLE_CODE ||
    !canRerun ||
    !target ||
    !bot ||
    target.runsIn !== 'new'
  ) {
    return null
  }
  const setup = botAutomationSetup(target, bot)
  if (run.errorParams?.agent !== setup.agent) {
    return null
  }
  return { agent: setup.agent, savedModel: setup.launch?.model }
}

/**
 * The bot target with `model` as its runs' model. The launch is what runs start on today (the
 * automation's own, else the bot's), copied whole, so only the model changes. Null when the
 * automation no longer starts on `agent`: it changed since the page showed the failure.
 */
export function botTargetWithModel(
  target: AutomationBotTarget,
  bot: Pick<Bot, 'agent' | 'launch'>,
  agent: BotAgent,
  model: string
): AutomationBotTarget | null {
  if (target.runsIn !== 'new') {
    return null
  }
  const setup = botAutomationSetup(target, bot)
  if (setup.agent !== agent) {
    return null
  }
  return { ...target, agentSetup: { agent, launch: { ...setup.launch, model } } }
}

export type AutomationRunModelFixDeps = {
  /** The automation as its host has it now, so the save never reverts another edit. */
  reread: () => Promise<Automation | null>
  bot: (botId: string) => Pick<Bot, 'agent' | 'launch'> | null
  /** Resolves once the owning host acknowledged the save. */
  save: (bot: AutomationBotTarget) => Promise<boolean>
  /** Runs the automation as saved; the new run's id, or null when it didn't start. */
  rerun: () => Promise<string | null>
  showRun: (runId: string) => void
  notify: { error: (message: string) => void; success: (message: string) => void }
}

/** Save first; rerun only once the host acknowledged it, so the rerun uses the new model. */
export async function fixAutomationRunModel(
  deps: AutomationRunModelFixDeps,
  agent: BotAgent,
  model: string
): Promise<void> {
  const saveFailed = (): void =>
    deps.notify.error(
      translate('automations.runModelFix.saveFailed', "Couldn't save the model. Nothing was rerun.")
    )
  const latest = await deps.reread().catch(() => null)
  if (!latest) {
    saveFailed()
    return
  }
  const bot = latest.bot ? deps.bot(latest.bot.botId) : null
  const next = latest.bot && bot ? botTargetWithModel(latest.bot, bot, agent, model) : null
  if (!next) {
    deps.notify.error(
      translate(
        'automations.runModelFix.changed',
        "This automation changed, so the model wasn't saved. Use Edit to change it."
      )
    )
    return
  }
  const saved = await deps.save(next).catch(() => false)
  if (!saved) {
    saveFailed()
    return
  }
  const runId = await deps.rerun().catch(() => null)
  if (!runId) {
    deps.notify.error(
      translate(
        'automations.runModelFix.rerunFailed',
        'Model set to {{model}} for this automation, but the rerun didn’t start.',
        { model }
      )
    )
    return
  }
  deps.notify.success(
    translate('automations.runModelFix.saved', 'Model set to {{model}} for this automation.', {
      model
    })
  )
  deps.showRun(runId)
}
