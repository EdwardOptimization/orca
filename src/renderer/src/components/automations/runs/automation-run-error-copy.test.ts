import { describe, expect, it } from 'vitest'
import {
  AGENT_SESSION_FAILURE_COPY,
  sayAgentSessionFailureEnglish
} from '../../../../../shared/agent-session/failures/agent-session-failure-copy'
import { automationRunErrorText } from './automation-run-error-copy'

const run = (fields: { error: string; errorCode?: string; errorParams?: Record<string, string> }) =>
  automationRunErrorText({ errorCode: undefined, errorParams: undefined, ...fields })

describe('automationRunErrorText: model failures', () => {
  it('names the agent and model the run recorded', () => {
    expect(
      run({
        error: "Codex couldn't use model-x.",
        errorCode: 'agentModelUnavailable',
        errorParams: { agent: 'codex', model: 'model-x' }
      })
    ).toBe("Codex couldn't use model-x.")
  })

  it('says "The agent" for an agent this build does not know, and "the selected model" for none', () => {
    expect(
      run({
        error: 'stored',
        errorCode: 'agentModelUnavailable',
        errorParams: { agent: 'agent-from-the-future' }
      })
    ).toBe("The agent couldn't use the selected model.")
  })

  it("drops the Chat's send-again advice from runs saved before the code", () => {
    const saved = sayAgentSessionFailureEnglish('modelUnavailable', {
      agent: 'Codex',
      detail: 'model-x'
    })
    expect(saved).toMatch(/send again/)
    expect(run({ error: saved })).toBe("Codex couldn't use model-x.")
  })

  it('reads the Chat sentence with no agent or model named', () => {
    const saved = sayAgentSessionFailureEnglish('modelUnavailable', {
      agent: AGENT_SESSION_FAILURE_COPY.theAgent,
      detail: AGENT_SESSION_FAILURE_COPY.selectedModel
    })
    expect(run({ error: saved })).toBe("The agent couldn't use the selected model.")
  })

  it('reads the Chat sentence that also asks for an agent update', () => {
    const saved = sayAgentSessionFailureEnglish('modelUnavailableUpdate', {
      agent: 'Codex',
      detail: 'model-x',
      minimumVersion: '9.9.0'
    })
    expect(run({ error: saved })).toBe("Codex couldn't use model-x.")
  })

  it('leaves other stored errors as they are', () => {
    expect(run({ error: 'API Error: 503 Service unavailable' })).toBe(
      'API Error: 503 Service unavailable'
    )
  })
})
