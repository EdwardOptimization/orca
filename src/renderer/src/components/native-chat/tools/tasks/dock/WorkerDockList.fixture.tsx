import { defineFixture } from '../../../../../component-fixtures/component-fixture'
import { nativeChatAppearanceStyle } from '../../../appearance/native-chat-appearance-style'
import { NativeChatBackgroundTasksStatus } from '../NativeChatBackgroundTasksStatus'
import { NativeChatWorkerDockFrame } from './NativeChatWorkerDockFrame'
import { WorkerDockResultDialog } from './WorkerDockResultDialog'
import { setWorkerDockListHeight } from './worker-dock-list-height'
import type { WorkerDockRowView } from './WorkerDockRow'
import type { WorkerDockResult } from '../../../../../../../shared/orchestration/dock/worker-dock'

// Invented data: a chat that started eleven workers, most of which hit a slow worktree.
const SOURCE = '0d1c2b3a-4f5e-4a6b-8c7d-9e0f1a2b3c4d'
const minutes = (count: number) => Date.now() - count * 60_000

// A worker named after its own prompt, cut at 80 characters the way the dock names them.
const PROMPT =
  'You are a read-only audit worker for the billing release checklist. Change nothing, push no...'
const ERROR =
  'Creating the worktree took longer than 180 seconds, so Orca stopped Git. To allow more time, set ORCA_WORKTREE_ADD_TIMEOUT_MS (milliseconds, up to 1800000) in the environment that starts Orca on the machine running Git (the remote host for SSH or `orca serve` workspaces), then restart Orca there.'

function worker(
  index: number,
  name: string,
  state: WorkerDockRowView['state'],
  ago: number,
  extra: Partial<WorkerDockRowView> = {}
): WorkerDockRowView {
  return {
    kind: 'worker',
    id: `list:${index}`,
    dispatchId: `ctx_list_${index}`,
    source: SOURCE,
    name,
    title: name,
    model: null,
    state,
    changedAt: minutes(ago),
    startedAt: minutes(ago + 5),
    reason: null,
    settlement: null,
    resultId: null,
    stoppable: state === 'running',
    ownerActionsAvailable: true,
    ...extra
  }
}

const failedPrompts = [
  PROMPT,
  'Draft release notes for the payments dashboard from the merged changes this week',
  'Check every settings page for missing translations and list the keys',
  'Reproduce the flaky upload test on a clean checkout and report the seed',
  'Compare the two pricing table layouts and recommend one with reasons',
  'Summarize open review threads on the search ranking change'
]
const unavailablePrompts = [
  'Index the docs site and report broken anchors',
  'Profile the cold start of the desktop app',
  'Audit image sizes on the marketing pages',
  'Collect crash signatures from the last nightly'
]

const reported: WorkerDockRowView[] = [
  ...failedPrompts.map((name, index) =>
    worker(index, name, 'unexpected', 58 + index * 3, {
      reason: ERROR,
      settlement: `settled:${index}`,
      resultId: `result:${index}`
    })
  ),
  worker(10, 'Rename the export menu items to match the new copy', 'running', 4, {
    stoppable: true
  }),
  ...unavailablePrompts.map((name, index) =>
    worker(20 + index, name, 'unavailable', 20 + index, { changedAt: null })
  )
]

function dock(list: readonly WorkerDockRowView[]) {
  return (
    <NativeChatWorkerDockFrame>
      <NativeChatBackgroundTasksStatus
        sessionId={SOURCE}
        tasks={[]}
        settledTasks={[]}
        supportsTaskStop
        offersStopAll={false}
        stoppingTaskIds={new Set()}
        stoppingAll={false}
        indicatorActive
        isVisible
        expanded
        onExpandedChange={() => {}}
        onStop={() => {}}
        workerRows={new Map(list.map((row) => [row.id, row]))}
        workerIdentities={list.map(
          ({ id, state, changedAt, settlement, ownerActionsAvailable }) => ({
            id,
            state,
            changedAt,
            settlement,
            ownerActionsAvailable
          })
        )}
      />
    </NativeChatWorkerDockFrame>
  )
}

// A chat pane: a transcript that scrolls on its own above the composer and its worker list.
function chat(list: readonly WorkerDockRowView[] = reported) {
  return (
    <div
      data-native-chat-root=""
      className="native-chat-appearance flex h-[640px] flex-col bg-chat-canvas"
      style={nativeChatAppearanceStyle({})}
    >
      <div
        data-fixture-transcript=""
        className="scrollbar-sleek min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm text-chat-foreground"
      >
        {Array.from({ length: 14 }, (_, index) => (
          <p key={index}>
            Update {index + 1}: the audit workers are queued behind the worktree step; I will report
            back once they settle.
          </p>
        ))}
      </div>
      <div className="m-3 mt-0 rounded-xl border border-chat-composer-border bg-chat-composer-surface p-1.5 shadow-xs">
        {dock(list)}
        <p className="px-2 py-2 text-sm text-muted-foreground">
          Ask anything, / for commands, @ for context
        </p>
      </div>
    </div>
  )
}

const resetHeight = () => setWorkerDockListHeight(null, false)
const tallHeight = () => setWorkerDockListHeight(360, false)

export const reportedList = defineFixture({ width: 720, setup: resetHeight, render: () => chat() })

export const reportedListNarrow = defineFixture({
  width: 320,
  setup: resetHeight,
  render: () => chat()
})

export const draggedTaller = defineFixture({ width: 720, setup: tallHeight, render: () => chat() })

export const draggedTallerNarrow = defineFixture({
  width: 320,
  setup: tallHeight,
  render: () => chat()
})

// Keyboard focus on a row: the row shows its background and inset ring, nothing else moves.
export const reportedListRowFocus = defineFixture({
  width: 720,
  setup: resetHeight,
  render: () => chat(),
  interact: (frame) => {
    frame.querySelector<HTMLElement>('[data-worker-dock-open]')?.focus()
  }
})

// Keyboard focus on the drag bar: the thin bar shows on focus, the same as on hover.
export const reportedListHandleFocus = defineFixture({
  width: 720,
  setup: resetHeight,
  render: () => chat(),
  interact: (frame) => {
    frame.querySelector<HTMLElement>('[data-worker-dock-resize]')?.focus()
  }
})

const failedResult: WorkerDockResult = {
  id: 'result:0',
  dispatchId: 'ctx_list_0',
  name: PROMPT,
  title: PROMPT,
  outcome: 'unexpected',
  body: ERROR,
  at: minutes(58),
  settlement: 'settled:0',
  acknowledged: false,
  ownerActionsAvailable: true
}

function card(result: WorkerDockResult) {
  return (
    <div className="h-[420px] bg-background">
      <WorkerDockResultDialog
        result={result}
        error={null}
        onClose={() => {}}
        onOpen={() => {}}
        onRestore={() => {}}
        ownerActionsAvailable
      />
    </div>
  )
}

async function expandDetails() {
  document.querySelector<HTMLButtonElement>('[data-worker-dock-details]')?.click()
  await new Promise((resolve) => setTimeout(resolve, 100))
}

export const cardFailed = defineFixture({ width: 720, render: () => card(failedResult) })

export const cardFailedDetails = defineFixture({
  width: 720,
  render: () => card(failedResult),
  interact: expandDetails
})

// The card is a modal over the window, not inside the pane, so a 320px window leaves it the
// 288px left after the 2rem gutter. The fixture clamps the portaled card to that width.
function clampCardToNarrowWindow() {
  const card = document.querySelector<HTMLElement>('[data-worker-dock-card]')
  if (card) {
    card.style.width = '288px'
  }
}

export const cardFailedNarrow = defineFixture({
  width: 320,
  render: () => card(failedResult),
  interact: clampCardToNarrowWindow
})

export const cardFailedNarrowDetails = defineFixture({
  width: 320,
  render: () => card(failedResult),
  interact: async () => {
    clampCardToNarrowWindow()
    await expandDetails()
  }
})

export const cardFinished = defineFixture({
  width: 720,
  render: () =>
    card({
      ...failedResult,
      name: 'Release notes',
      title: 'Draft release notes for the payments dashboard from the merged changes this week',
      outcome: 'succeeded',
      body: '**Done.** Drafted notes for 12 merged changes, grouped into Fixes and Improvements.'
    })
})

// The list inside a chat that scrolls as one page, the layout where a wheel at the list's edge
// would otherwise carry on into the chat.
export const scrollContainment = defineFixture({
  width: 720,
  setup: resetHeight,
  render: () => (
    <div
      data-native-chat-root=""
      data-fixture-outer=""
      className="native-chat-appearance scrollbar-sleek h-[560px] overflow-y-auto bg-chat-canvas p-3"
      style={nativeChatAppearanceStyle({})}
    >
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} className="mb-3 text-sm text-chat-foreground">
          Update {index + 1}: the audit workers are queued behind the worktree step.
        </p>
      ))}
      <div className="rounded-xl border border-chat-composer-border bg-chat-composer-surface p-1.5">
        {dock(reported)}
        <p className="px-2 py-2 text-sm text-muted-foreground">Ask anything</p>
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <p key={index} className="mt-3 text-sm text-chat-foreground">
          Later note {index + 1}.
        </p>
      ))}
    </div>
  )
})
