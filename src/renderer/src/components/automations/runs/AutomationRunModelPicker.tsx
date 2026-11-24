// The failure banner's model picker: the models the editor's Agent field offers for this agent.
import React from 'react'
import { useBotAgentMenu } from '@/components/bots/use-bot-agent-choices'
import { useAgentLaunchPickerInventory } from '@/components/agent/use-agent-launch-picker-inventory'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslate } from '@/i18n/use-translate'
import { agentPickerModels } from '../../../../../shared/agent-launch/picker/agent-launch-picker-catalog'
import type { AgentPickerEntry } from '../../../../../shared/agent-launch/picker/agent-launch-picker'
import type { Bot, BotAgent } from '../../../../../shared/bot-types'
import { folderWorkspaceKey } from '../../../../../shared/workspace/identity/workspace-scope'

export type AutomationRunModelOption = { id: string; label: string }

/** What the picker lists, or null while it can't say (still reading, failed, or nothing offered):
 *  then the banner shows no picker and Edit is the way to change the model. */
export function automationRunModelOptions(
  entries: readonly AgentPickerEntry[],
  agent: BotAgent
): AutomationRunModelOption[] | null {
  const entry = entries.find((candidate) => candidate.agent === agent)
  if (
    !entry ||
    !entry.surfaces.includes('chat') ||
    (entry.catalogRead !== undefined && entry.catalogRead !== 'settled')
  ) {
    return null
  }
  const models = agentPickerModels(entry, 'chat')
    .filter((model) => !model.hidden)
    .map((model) => ({ id: model.id, label: model.label || model.id }))
  return models.length ? models : null
}

function useAutomationRunModelOptions(
  bot: Pick<Bot, 'hostId' | 'folderWorkspaceId'>,
  agent: BotAgent
): AutomationRunModelOption[] | null {
  // As the editor's bot Agent field reads them: the bot's host menu, in the bot's folder workspace.
  const menu = useBotAgentMenu(bot.hostId, true, agent)
  const entries = useAgentLaunchPickerInventory(
    folderWorkspaceKey(bot.folderWorkspaceId),
    menu.model,
    true,
    agent
  )
  return menu.choices.includes(agent) ? automationRunModelOptions(entries, agent) : null
}

export function AutomationRunModelSelect({
  options,
  value,
  disabled,
  defaultOpen,
  onPick
}: {
  options: readonly AutomationRunModelOption[]
  /** Fixtures show the list open. */
  defaultOpen?: boolean
  /** The automation's saved model; none shows a placeholder. */
  value: string | undefined
  disabled: boolean
  onPick: (model: string) => void
}): React.JSX.Element {
  const t = useTranslate()
  const listed = value === undefined || options.some((option) => option.id === value)
  return (
    <Select
      value={value ?? ''}
      disabled={disabled}
      defaultOpen={defaultOpen}
      onValueChange={(next) => {
        if (next && next !== value) {
          onPick(next)
        }
      }}
    >
      <SelectTrigger
        size="xs"
        aria-label={t('automations.runModelFix.model', 'Model')}
        className="max-w-[45%] min-w-0 shrink-0 border-destructive/30 bg-background text-foreground dark:bg-background *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate @max-[25rem]:max-w-[28%]"
      >
        <SelectValue placeholder={t('automations.runModelFix.pickModel', 'Pick a model')} />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" align="end">
        {/* A saved model the list no longer offers still shows as the current value. */}
        {listed ? null : (
          <SelectItem value={value} disabled>
            {value}
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AutomationRunModelPicker({
  bot,
  agent,
  savedModel,
  disabled,
  onPick
}: {
  bot: Pick<Bot, 'hostId' | 'folderWorkspaceId'>
  agent: BotAgent
  savedModel: string | undefined
  disabled: boolean
  onPick: (model: string) => void
}): React.JSX.Element | null {
  const options = useAutomationRunModelOptions(bot, agent)
  return options ? (
    <AutomationRunModelSelect
      options={options}
      value={savedModel}
      disabled={disabled}
      onPick={onPick}
    />
  ) : null
}
