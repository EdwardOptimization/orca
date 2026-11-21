import { describe, expect, it, vi } from 'vitest'
import type {
  Automation,
  AutomationBotTarget
} from '../../../../../shared/automations/automation-definition'
import type { Bot } from '../../../../../shared/bot-types'
import {
  automationRunModelFix,
  botTargetWithModel,
  fixAutomationRunModel,
  type AutomationRunModelFixDeps
} from './automation-run-model-fix'

const BOT: Pick<Bot, 'agent' | 'launch'> = {
  agent: 'codex',
  launch: { model: 'model-a', options: { effort: 'high' } }
}
const OWN: AutomationBotTarget = {
  botId: 'bot-1',
  runsIn: 'new',
  resultsTo: 'chat',
  agentSetup: { agent: 'claude', launch: { model: 'model-c' } }
}
const INHERITED: AutomationBotTarget = { botId: 'bot-1', runsIn: 'new', resultsTo: 'chat' }
const FAILED = {
  status: 'dispatch_failed' as const,
  errorCode: 'agentModelUnavailable',
  errorParams: { agent: 'codex', model: 'model-a' }
}

function gate(overrides: Partial<Parameters<typeof automationRunModelFix>[0]> = {}) {
  return automationRunModelFix({
    run: FAILED,
    automation: { bot: INHERITED },
    bot: BOT,
    canRerun: true,
    ...overrides
  })
}

describe('automationRunModelFix', () => {
  it("offers the fix on the automation's current agent, with its saved model", () => {
    expect(gate()).toEqual({ agent: 'codex', savedModel: 'model-a' })
  })

  it.each([
    ['the run has no model code', { run: { ...FAILED, errorCode: undefined } }],
    ['the run completed', { run: { ...FAILED, status: 'completed' as const } }],
    ['the automation is not a bot automation', { automation: { bot: undefined } }],
    ['the bot is not known here', { bot: null }],
    [
      'the run continues a chat',
      { automation: { bot: { ...INHERITED, runsIn: 'chat' as const } } }
    ],
    ['the automation now starts on another agent', { automation: { bot: OWN } }],
    ['the run named no agent', { run: { ...FAILED, errorParams: { model: 'model-a' } } }],
    ['the run cannot be rerun', { canRerun: false }]
  ])('offers nothing when %s', (_case, overrides) => {
    expect(gate(overrides)).toBeNull()
  })
})

describe('botTargetWithModel', () => {
  it("copies the bot's whole launch into the automation, changing only the model", () => {
    expect(botTargetWithModel(INHERITED, BOT, 'codex', 'model-b')).toEqual({
      ...INHERITED,
      agentSetup: { agent: 'codex', launch: { model: 'model-b', options: { effort: 'high' } } }
    })
  })

  it("changes the automation's own setup's model", () => {
    expect(botTargetWithModel(OWN, BOT, 'claude', 'model-d')).toEqual({
      ...OWN,
      agentSetup: { agent: 'claude', launch: { model: 'model-d' } }
    })
  })

  it('refuses when the automation no longer starts on that agent, or continues a chat', () => {
    expect(botTargetWithModel(OWN, BOT, 'codex', 'model-b')).toBeNull()
    expect(botTargetWithModel({ ...INHERITED, runsIn: 'chat' }, BOT, 'codex', 'm')).toBeNull()
  })
})

describe('fixAutomationRunModel', () => {
  function deps(overrides: Partial<AutomationRunModelFixDeps> = {}) {
    const order: string[] = []
    const latest = {
      id: 'auto-1',
      name: 'Renamed elsewhere',
      bot: { ...INHERITED, resultsTo: 'none' }
    } as Automation
    const base: AutomationRunModelFixDeps = {
      reread: vi.fn(async () => {
        order.push('reread')
        return latest
      }),
      bot: () => BOT,
      save: vi.fn(async () => {
        order.push('save')
        return true
      }),
      rerun: vi.fn(async () => {
        order.push('rerun')
        return 'run-2'
      }),
      showRun: vi.fn((runId: string) => order.push(`show:${runId}`)),
      notify: { error: vi.fn(), success: vi.fn() }
    }
    return { order, deps: { ...base, ...overrides } }
  }

  it('saves onto the automation as its host has it now, then reruns and shows the new run', async () => {
    const { order, deps: d } = deps()

    await fixAutomationRunModel(d, 'codex', 'model-b')

    expect(order).toEqual(['reread', 'save', 'rerun', 'show:run-2'])
    // Another edit made since the page loaded (resultsTo) survives the save.
    expect(d.save).toHaveBeenCalledWith({
      ...INHERITED,
      resultsTo: 'none',
      agentSetup: { agent: 'codex', launch: { model: 'model-b', options: { effort: 'high' } } }
    })
    expect(d.notify.success).toHaveBeenCalledWith('Model set to model-b for this automation.')
  })

  it('does not rerun until the save has resolved', async () => {
    let resolveSave: (saved: boolean) => void = () => {}
    const { deps: d } = deps({
      save: vi.fn(() => new Promise<boolean>((resolve) => (resolveSave = resolve)))
    })

    const fixing = fixAutomationRunModel(d, 'codex', 'model-b')
    await vi.waitFor(() => expect(d.save).toHaveBeenCalled())
    expect(d.rerun).not.toHaveBeenCalled()

    resolveSave(true)
    await fixing
    expect(d.rerun).toHaveBeenCalledTimes(1)
  })

  it('reruns nothing when the save fails', async () => {
    const { deps: d } = deps({ save: vi.fn(async () => false) })

    await fixAutomationRunModel(d, 'codex', 'model-b')

    expect(d.rerun).not.toHaveBeenCalled()
    expect(d.showRun).not.toHaveBeenCalled()
    expect(d.notify.error).toHaveBeenCalledWith("Couldn't save the model. Nothing was rerun.")
  })

  it('saves nothing when the automation can no longer be read', async () => {
    const { deps: d } = deps({ reread: vi.fn(async () => null) })

    await fixAutomationRunModel(d, 'codex', 'model-b')

    expect(d.save).not.toHaveBeenCalled()
    expect(d.rerun).not.toHaveBeenCalled()
  })

  it('saves nothing when the automation moved to another agent meanwhile', async () => {
    const { deps: d } = deps({
      reread: vi.fn(async () => ({ id: 'auto-1', bot: OWN }) as Automation)
    })

    await fixAutomationRunModel(d, 'codex', 'model-b')

    expect(d.save).not.toHaveBeenCalled()
    expect(d.notify.error).toHaveBeenCalledWith(
      "This automation changed, so the model wasn't saved. Use Edit to change it."
    )
  })

  it('says the model was saved when only the rerun failed', async () => {
    const { deps: d } = deps({ rerun: vi.fn(async () => null) })

    await fixAutomationRunModel(d, 'codex', 'model-b')

    expect(d.save).toHaveBeenCalledTimes(1)
    expect(d.showRun).not.toHaveBeenCalled()
    expect(d.notify.error).toHaveBeenCalledWith(
      'Model set to model-b for this automation, but the rerun didn’t start.'
    )
  })
})
