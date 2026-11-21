// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AutomationRunDetailsPage } from './AutomationRunDetailsPage'
import type { AutomationRunModelPicker } from './AutomationRunModelPicker'
import { makeAutomation, makeRun } from '../automations-page-fixtures'
import type { AutomationRun } from '../../../../../shared/automations/history/automation-run'
import type { SelectedAutomationRunHistoryOutcome } from './use-selected-automation-run-history'

afterEach(cleanup)

const BOT = {
  agent: 'codex' as const,
  launch: { model: 'model-a' },
  hostId: 'local' as const,
  folderWorkspaceId: 'w1'
}
const automation = makeAutomation({
  agentId: 'codex',
  bot: { botId: 'bot-1', runsIn: 'new', resultsTo: 'chat' }
})
const MODEL_FAILED = makeRun({
  status: 'dispatch_failed',
  sessionKind: 'chat',
  error: "Codex couldn't use model-a.",
  errorCode: 'agentModelUnavailable',
  errorParams: { agent: 'codex', model: 'model-a' }
})

/** Stands in for the host's live menu: one button that picks model-b. */
const FakePicker: typeof AutomationRunModelPicker = ({ disabled, onPick }) => (
  <button type="button" disabled={disabled} onClick={() => onPick('model-b')}>
    pick-model
  </button>
)

function renderPage(
  run: AutomationRun,
  props: Partial<React.ComponentProps<typeof AutomationRunDetailsPage>> = {}
) {
  const history: SelectedAutomationRunHistoryOutcome = {
    automationId: automation.id,
    rowKey: null,
    ownerKey: null,
    authority: null,
    navigation: null,
    reloadToken: 0,
    runs: [run],
    notice: null
  }
  return render(
    <TooltipProvider>
      <AutomationRunDetailsPage
        nav={null}
        automation={automation}
        run={run}
        runs={[run]}
        history={history}
        relativeNow={20}
        hostLabel="Test host"
        workspaceName={null}
        workspaceActionLabel={null}
        canRerun
        isRerunPending={false}
        onRerun={() => {}}
        bot={BOT}
        onEdit={() => {}}
        onPickModel={async () => {}}
        modelPicker={FakePicker}
        onOpenWorkspace={() => {}}
        onReviewSetup={() => {}}
        onSelectRun={() => {}}
        {...props}
      />
    </TooltipProvider>
  )
}

describe('AutomationRunDetailsPage', () => {
  it('offers a picker within the classified failure banner', () => {
    renderPage(MODEL_FAILED)

    const banner = screen.getByRole('alert')
    expect(banner.contains(screen.getByRole('button', { name: 'pick-model' }))).toBe(true)
  })

  it('picks once: the picker is disabled until the save and rerun settle', async () => {
    let settle: () => void = () => {}
    const onPickModel = vi.fn(() => new Promise<void>((resolve) => (settle = resolve)))
    renderPage(MODEL_FAILED, { onPickModel })

    const picker = screen.getByRole('button', { name: 'pick-model' })
    fireEvent.click(picker)
    fireEvent.click(picker)

    expect(onPickModel).toHaveBeenCalledTimes(1)
    expect(onPickModel).toHaveBeenCalledWith('codex', 'model-b')
    expect((picker as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Rerun' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => settle())
    expect((picker as HTMLButtonElement).disabled).toBe(false)
  })

  it('disables the picker while a rerun is already running', () => {
    renderPage(MODEL_FAILED, { isRerunPending: true })

    expect((screen.getByRole('button', { name: 'pick-model' }) as HTMLButtonElement).disabled).toBe(
      true
    )
  })
})
