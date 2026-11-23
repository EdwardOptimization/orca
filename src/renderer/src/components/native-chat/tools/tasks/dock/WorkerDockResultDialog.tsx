import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { workerDockResultLabel } from './worker-dock-result-label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AgentStateDot } from '@/components/agent/status/AgentStateDot'
import { cn } from '@/lib/class-names'
import { NativeChatMarkdown } from '../../../markdown/NativeChatMarkdown'
import type { WorkerDockResult } from '../../../../../../../shared/orchestration/dock/worker-dock'
import { workerDockStateLabel } from './worker-dock-labels'
import { workerDockDotState, workerDockResultDotState } from './worker-dock-status-dot'
import { workerDockDistinctTitle, type WorkerDockRowView } from './WorkerDockRow'

/** The first sentence of an error, as plain text, for the card's one reason line. */
export function workerDockReasonLine(text: string): string {
  const plain = text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return /^(.+?[.!?])(?:\s|$)/.exec(plain)?.[1] ?? plain
}

function Details({ text }: { text: string }) {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        data-worker-dock-details=""
        className="-ml-0.5 flex w-fit items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight
          aria-hidden="true"
          className={cn('size-3.5 transition-transform', open && 'rotate-90')}
        />
        {open
          ? t('components.native-chat.workerDock.hideDetails', 'Hide details')
          : t('components.native-chat.workerDock.showDetails', 'Show details')}
      </button>
      {open ? (
        <pre className="scrollbar-sleek max-h-40 overflow-auto overscroll-contain rounded-md bg-muted px-2.5 py-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
          {text}
        </pre>
      ) : null}
    </div>
  )
}

/** A worker's card: its name on one line, its state as the app's dot and label, one reason line
 *  with the raw error folded under Show details, and its actions at the bottom right. */
export function WorkerDockResultDialog({
  result,
  row,
  error,
  onClose,
  onOpen,
  onRestore,
  ownerActionsAvailable
}: {
  result: WorkerDockResult | null
  /** The row the card opened from, for its name and state when the saved result is unreadable. */
  row?: WorkerDockRowView
  error: string | null
  onClose: () => void
  onOpen: () => void
  onRestore: () => void
  ownerActionsAvailable: boolean
}) {
  const t = useTranslate()
  const name = result?.name ?? row?.name ?? null
  const title = result?.title ?? row?.title ?? ''
  const distinct = name === null ? null : workerDockDistinctTitle(name, title)
  const headline =
    name === null
      ? t('components.native-chat.workerDock.resultUnavailable', 'Worker result unavailable')
      : distinct || title.length <= name.length
        ? name
        : title
  const status = result
    ? {
        dot: workerDockResultDotState(result.outcome),
        label: workerDockResultLabel(t, result.outcome),
        failed: result.outcome === 'failed' || result.outcome === 'unexpected'
      }
    : row
      ? {
          dot: workerDockDotState(row.state, row.retired),
          label: workerDockStateLabel(t, row.state),
          failed: row.state === 'failed' || row.state === 'unexpected'
        }
      : null
  // A failure's body is its raw error: one line up front, the rest on request. A finished
  // worker's body is its report and reads in full. An error beside a loaded result is a failed
  // action (Show in dock again), shown next to the result rather than in place of it.
  const raw = result ? (status?.failed ? result.body : null) : error
  const actionError = result ? error : null
  const reason = raw ? workerDockReasonLine(raw) : null
  // The reason line clamps at two lines, and how much fits depends on the glyphs and the width,
  // not the length: any error keeps its full text one click away.
  const details = Boolean(raw?.trim())
  return (
    <Dialog
      open={result !== null || error !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        size="flush"
        scrollable
        showCloseButton={false}
        className="sm:max-w-md"
        data-worker-dock-card=""
        onOpenAutoFocus={(event) => {
          // Focus the card itself: a ring on Open worker or the X on every open reads as stuck.
          event.preventDefault()
          if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus({ preventScroll: true })
          }
        }}
      >
        <div className="flex min-w-0 flex-col gap-1 px-4 pt-4 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <DialogTitle
              size="compact"
              className="min-w-0 flex-1"
              title={[headline, distinct].filter(Boolean).join('\n')}
            >
              <span className="block truncate">{headline}</span>
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-mr-1 shrink-0"
                aria-label={t('components.native-chat.workerDock.close', 'Close')}
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription asChild>
            <div className="flex min-w-0 items-center gap-1.5 text-xs">
              {status ? (
                <>
                  {status.dot ? <AgentStateDot state={status.dot} size="md" title={null} /> : null}
                  <span
                    data-worker-dock-card-state=""
                    className={cn(
                      'truncate',
                      status.failed ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {status.label}
                  </span>
                </>
              ) : null}
            </div>
          </DialogDescription>
        </div>
        <div className="flex min-w-0 flex-col gap-2 px-4 pb-3">
          {distinct ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{distinct}</p>
          ) : null}
          {reason ? (
            <p
              role={result ? undefined : 'alert'}
              data-worker-dock-card-reason=""
              className="line-clamp-2 text-sm text-foreground"
            >
              {reason}
            </p>
          ) : null}
          {raw !== null && details ? <Details text={raw} /> : null}
          {result && raw === null ? <NativeChatMarkdown content={result.body} /> : null}
          {actionError ? (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 pb-4">
          {result?.acknowledged ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={!ownerActionsAvailable}
              title={
                ownerActionsAvailable
                  ? undefined
                  : t(
                      'components.native-chat.workerDock.remoteOwner',
                      'Stop or clear this from the computer it runs on'
                    )
              }
              onClick={onRestore}
            >
              {t('components.native-chat.workerDock.restore', 'Show in dock again')}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onOpen}>
            {t('components.native-chat.workerDock.openWorker', 'Open worker')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
