// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkerDockResultDialog, workerDockReasonLine } from './WorkerDockResultDialog'
import type { WorkerDockResult } from '../../../../../../../shared/orchestration/dock/worker-dock'

afterEach(cleanup)

const PROMPT = 'Audit the release checklist for the billing service and list gaps, changing no...'
const ERROR =
  'Creating the worktree took longer than 180 seconds, so Orca stopped Git. Set `SOME_TIMEOUT_MS` and restart. Abandoned by orca_session_id:00000000-0000-4000-8000-000000000000.'
const result: WorkerDockResult = {
  id: 'result-1',
  dispatchId: 'ctx-1',
  name: PROMPT,
  title: PROMPT,
  outcome: 'unexpected',
  body: ERROR,
  at: 1,
  settlement: 'settled-1',
  acknowledged: false,
  ownerActionsAvailable: true
}

function card(value: WorkerDockResult, error: string | null = null) {
  return render(
    <TooltipProvider>
      <WorkerDockResultDialog
        result={value}
        error={error}
        onClose={() => {}}
        onOpen={() => {}}
        onRestore={() => {}}
        ownerActionsAvailable
      />
    </TooltipProvider>
  )
}

it('takes the first sentence of an error as plain text', () => {
  expect(workerDockReasonLine(ERROR)).toBe(
    'Creating the worktree took longer than 180 seconds, so Orca stopped Git.'
  )
  expect(workerDockReasonLine('no stop at the end')).toBe('no stop at the end')
})

it('shows the prompt once, the state on its own line, one reason and the raw error on request', () => {
  card(result)
  const title = screen.getByRole('heading')
  expect(title).toHaveTextContent(PROMPT)
  expect(title).toHaveAttribute('title', PROMPT)
  expect(title).not.toHaveTextContent('Stopped unexpectedly')
  expect(screen.getAllByText(PROMPT)).toHaveLength(1)
  expect(document.querySelector('[data-worker-dock-card-state]')).toHaveTextContent(
    'Stopped unexpectedly'
  )
  expect(document.querySelector('[data-worker-dock-card-reason]')).toHaveTextContent(
    'Creating the worktree took longer than 180 seconds, so Orca stopped Git.'
  )
  expect(screen.queryByText(/orca_session_id/)).toBeNull()
  const details = screen.getByRole('button', { name: 'Show details' })
  expect(details).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(details)
  expect(screen.getByText(/orca_session_id/).tagName).toBe('PRE')
  expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
    'aria-expanded',
    'true'
  )
})

it('reads a finished report in full with no details fold', () => {
  card({ ...result, outcome: 'succeeded', name: 'Notes', title: 'Draft notes', body: 'All done.' })
  expect(screen.getByRole('heading')).toHaveTextContent('Notes')
  expect(screen.getByText('Draft notes')).toBeInTheDocument()
  expect(screen.getByText('All done.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Show details' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Open worker' })).toBeInTheDocument()
})

it('keeps one long error sentence reachable behind Show details', () => {
  const long = `Git could not create the worktree because ${'the path is locked by another process and '.repeat(4)}gave up.`
  card({ ...result, body: long })
  expect(document.querySelector('[data-worker-dock-card-reason]')).toHaveTextContent(long)
  fireEvent.click(screen.getByRole('button', { name: 'Show details' }))
  expect(document.querySelector('pre')).toHaveTextContent(long)
})

it('keeps the report readable when Show in dock again fails', () => {
  card(
    {
      ...result,
      outcome: 'succeeded',
      name: 'Notes',
      title: 'Notes',
      body: 'All done.',
      acknowledged: true
    },
    'Could not update the dock.'
  )
  expect(screen.getByText('All done.')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Could not update the dock.')
})

it('names the shown headline in its tooltip when the name is a cut prompt', () => {
  card({
    ...result,
    name: 'Investigate failure…',
    title: 'Investigate failure in the nightly upload job'
  })
  const title = screen.getByRole('heading')
  expect(title).toHaveTextContent('Investigate failure in the nightly upload job')
  expect(title).toHaveAttribute('title', 'Investigate failure in the nightly upload job')
})
