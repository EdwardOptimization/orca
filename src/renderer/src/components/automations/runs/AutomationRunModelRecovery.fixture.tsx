import { useState } from 'react'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import type { AutomationRun } from '../../../../../shared/automations/history/automation-run'
import type { Bot } from '../../../../../shared/bot-types'
import { toRuntimeExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { makeAutomation, makeRun } from '../automations-page-fixtures'
import { AutomationEditorDialog } from '../authoring/AutomationEditorDialog'
import { buildAutomationEditDraft } from '../authoring/automation-edit-draft'
import { AutomationRunDetailsPage } from './AutomationRunDetailsPage'
import { AutomationRunModelSelect, type AutomationRunModelPicker } from './AutomationRunModelPicker'
import { botTargetWithModel, fixAutomationRunModel } from './automation-run-model-fix'
import type { SelectedAutomationRunHistoryOutcome } from './use-selected-automation-run-history'

const NOW = Date.UTC(2026, 10, 20, 19, 0)
const HOUR = 60 * 60 * 1000
const noop = (): void => {}

// A bot automation whose run could not use its model: fix it from the banner, or Edit.
const botAutomation = makeAutomation({
  id: 'a-2',
  name: 'Weekly digest',
  prompt: 'Summarize this week’s sample notes.',
  agentId: 'codex',
  bot: { botId: 'bot-1', runsIn: 'new', resultsTo: 'chat' }
})
const fixtureBot: Bot = {
  id: 'bot-1',
  name: 'Digest Owl',
  agent: 'codex',
  launch: { model: 'model-alpha-preview-long-name' },
  hostId: 'local',
  folder: 'digest-owl',
  folderWorkspaceId: 'digest-folder',
  avatar: null,
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  chatSessionId: null,
  linear: null,
  github: null,
  createdAt: 1,
  updatedAt: 1
}
const MODELS = [
  { id: 'model-alpha-preview-long-name', label: 'model-alpha-preview-long-name' },
  { id: 'model-beta', label: 'Model Beta' },
  { id: 'model-gamma', label: 'Model Gamma' }
]
const at = NOW - 3 * HOUR
const failedAt = { scheduledFor: at, startedAt: at, dispatchedAt: at, createdAt: at }
const scenarios: Record<string, AutomationRun> = {
  modelFailed: makeRun({
    id: 'run-7',
    automationId: 'a-2',
    runNumber: 7,
    status: 'dispatch_failed',
    sessionKind: 'chat',
    error: "Codex couldn't use model-alpha-preview-long-name.",
    errorCode: 'agentModelUnavailable',
    errorParams: { agent: 'codex', model: 'model-alpha-preview-long-name' },
    ...failedAt
  }),
  otherFailed: makeRun({
    id: 'run-7',
    automationId: 'a-2',
    runNumber: 7,
    status: 'dispatch_failed',
    sessionKind: 'chat',
    error: 'API Error: 503 Service unavailable',
    ...failedAt
  }),
  completed: makeRun({
    id: 'run-7',
    automationId: 'a-2',
    runNumber: 7,
    status: 'completed',
    sessionKind: 'chat',
    outputSnapshot: {
      format: 'plain_text',
      content: 'Three pull requests merged this week.',
      capturedAt: at,
      truncated: false
    },
    ...failedAt
  }),
  // After picking Model Beta: the new run, started from the saved automation.
  afterPick: makeRun({
    id: 'run-8',
    automationId: 'a-2',
    runNumber: 8,
    status: 'dispatched',
    trigger: 'manual',
    sessionKind: 'chat',
    scheduledFor: NOW,
    startedAt: NOW,
    dispatchedAt: NOW,
    createdAt: NOW
  })
}

function fixedPicker(open: boolean, options = MODELS): typeof AutomationRunModelPicker {
  return function FixedPicker({ savedModel, disabled, onPick }) {
    return (
      <AutomationRunModelSelect
        options={options}
        value={savedModel}
        disabled={disabled}
        defaultOpen={open}
        onPick={onPick}
      />
    )
  }
}

const closedPicker = fixedPicker(false)
const openPicker = fixedPicker(true)
const longPicker = fixedPicker(false, [
  ...MODELS,
  ...Array.from({ length: 20 }, (_, index) => ({
    id: `model-sample-${index + 1}`,
    label: `Model Sample ${index + 1}`
  }))
])

function RunRecovery({
  initialRun,
  open,
  remote
}: {
  initialRun: AutomationRun
  open: boolean
  remote: boolean
}) {
  const [run, setRun] = useState(initialRun)
  const [automation, setAutomation] = useState(() => {
    const target = botAutomation.bot
    const saved =
      initialRun === scenarios.afterPick && target
        ? botTargetWithModel(target, fixtureBot, 'codex', 'model-beta')
        : null
    return saved ? { ...botAutomation, bot: saved } : botAutomation
  })
  const [draft, setDraft] = useState(() => buildAutomationEditDraft(botAutomation))
  const [editorOpen, setEditorOpen] = useState(false)
  const [workspaceOpened, setWorkspaceOpened] = useState(false)
  const bot = remote
    ? { ...fixtureBot, hostId: toRuntimeExecutionHostId('sample-runtime') }
    : fixtureBot
  const history: SelectedAutomationRunHistoryOutcome = {
    automationId: botAutomation.id,
    rowKey: null,
    ownerKey: null,
    authority: null,
    navigation: null,
    reloadToken: 0,
    runs: [run],
    notice: null
  }
  return (
    <div className="bg-background text-foreground" style={{ minHeight: open ? 320 : undefined }}>
      <AutomationRunDetailsPage
        nav={null}
        automation={automation}
        run={run}
        runs={[run]}
        history={history}
        relativeNow={NOW}
        hostLabel={remote ? 'Sample server' : 'This computer'}
        workspaceName="Sample workspace"
        workspaceActionLabel="Open workspace"
        canRerun
        isRerunPending={false}
        onRerun={() => setRun(scenarios.afterPick)}
        bot={bot}
        onEdit={() => {
          setDraft(buildAutomationEditDraft(automation))
          setEditorOpen(true)
        }}
        onPickModel={(agent, model) =>
          fixAutomationRunModel(
            {
              reread: async () => automation,
              bot: () => bot,
              save: async (target) => {
                if (remote) {
                  await new Promise((resolve) => setTimeout(resolve, 150))
                }
                setAutomation({ ...automation, bot: target })
                return true
              },
              rerun: async () => scenarios.afterPick.id,
              showRun: () => setRun(scenarios.afterPick),
              notify: { success: noop, error: noop }
            },
            agent,
            model
          )
        }
        modelPicker={remote ? longPicker : open ? openPicker : closedPicker}
        onOpenWorkspace={() => setWorkspaceOpened(true)}
        onReviewSetup={noop}
        onSelectRun={noop}
      />
      {workspaceOpened ? <p role="status">Sample workspace opened</p> : null}
      {editorOpen ? (
        <AutomationEditorDialog
          open={editorOpen}
          isEditing
          isSaving={false}
          canSave
          repos={[]}
          projectHostSetups={[]}
          automationYamlHooksByRepoKey={{}}
          getAutomationHooksCacheKey={(repoId) => repoId}
          repoMap={new Map()}
          worktrees={[]}
          settings={null}
          draft={draft}
          bots={[bot]}
          onProjectChange={noop}
          onOpenChange={setEditorOpen}
          onDraftChange={setDraft}
          onSetupDecisionTouched={noop}
          onApplyTemplate={noop}
          onSave={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  )
}

function renderBotRun(run: AutomationRun, open = false, remote = false) {
  return <RunRecovery initialRun={run} open={open} remote={remote} />
}

export const modelFailed360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.modelFailed)
})
export const modelFailed520 = defineFixture({
  width: 520,
  render: () => renderBotRun(scenarios.modelFailed)
})
export const modelFailed720 = defineFixture({
  width: 720,
  render: () => renderBotRun(scenarios.modelFailed)
})
export const otherFailed360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.otherFailed)
})
export const otherFailed520 = defineFixture({
  width: 520,
  render: () => renderBotRun(scenarios.otherFailed)
})
export const otherFailed720 = defineFixture({
  width: 720,
  render: () => renderBotRun(scenarios.otherFailed)
})
export const completed360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.completed)
})
export const completed520 = defineFixture({
  width: 520,
  render: () => renderBotRun(scenarios.completed)
})
export const completed720 = defineFixture({
  width: 720,
  render: () => renderBotRun(scenarios.completed)
})
export const pickerOpen360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.modelFailed, true)
})
export const pickerOpen520 = defineFixture({
  width: 520,
  render: () => renderBotRun(scenarios.modelFailed, true)
})
export const pickerOpen720 = defineFixture({
  width: 720,
  render: () => renderBotRun(scenarios.modelFailed, true)
})
export const afterPick360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.afterPick)
})
export const afterPick520 = defineFixture({
  width: 520,
  render: () => renderBotRun(scenarios.afterPick)
})
export const afterPick720 = defineFixture({
  width: 720,
  render: () => renderBotRun(scenarios.afterPick)
})
export const remoteModelFailed360 = defineFixture({
  width: 360,
  render: () => renderBotRun(scenarios.modelFailed, false, true)
})
