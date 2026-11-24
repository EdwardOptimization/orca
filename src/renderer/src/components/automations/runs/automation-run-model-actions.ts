import { toast } from 'sonner'
import type { Bot, BotAgent } from '../../../../../shared/bot-types'
import { dispatchAutomationReread } from '../hosts/automation-row-action-dispatch'
import { showAutomationForTarget } from '../hosts/automation-host-client'
import { automationRowHostId } from '../automations-page-navigation'
import type { AutomationsPageController } from '../use-automations-page-controller'
import { fixAutomationRunModel } from './automation-run-model-fix'

export function createAutomationRunModelActions(
  {
    list: { selectedRow, selected },
    setup: { selectedAutomationRunPage },
    local: { runPageOrigin },
    store: { setPendingAutomationRunNavigation },
    destination,
    managementActions,
    runActions
  }: AutomationsPageController,
  bots: readonly Bot[]
) {
  const selectedHostId = automationRowHostId(selectedRow)
  const findRunBot = (botId: string) =>
    bots.find((bot) => bot.id === botId && bot.hostId === (selectedHostId ?? 'local')) ?? null
  const selectedBot = selected?.bot ? findRunBot(selected.bot.botId) : null
  const onPickModel = async (agent: BotAgent, model: string): Promise<void> => {
    const row = selectedRow
    const run = selectedAutomationRunPage
    if (!row || !run) {
      return
    }
    const automationId = row.automation.id
    await fixAutomationRunModel(
      {
        reread: async () => {
          const reread = await dispatchAutomationReread(
            destination.automationDispatchContext,
            { rowKey: row.key, automationId },
            () =>
              showAutomationForTarget(
                destination.automationHostTargetFor(row) ?? { kind: 'local' },
                automationId
              )
          )
          if (!reread.ok) {
            destination.reportOwnerAction(row.key, reread.notice)
          }
          return reread.ok ? reread.value : null
        },
        bot: findRunBot,
        save: (bot) => managementActions.updateAutomationRow(row, { bot }),
        rerun: () => runActions.rerunAutomationRun(row, run, { showToast: false }),
        showRun: (runId) =>
          setPendingAutomationRunNavigation({
            automationId,
            runId,
            hostId: selectedHostId,
            origin: runPageOrigin
          }),
        notify: { error: (message) => toast.error(message), success: (message) => toast(message) }
      },
      agent,
      model
    )
  }

  return { bot: selectedBot, onPickModel }
}
