import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { workerDockKindLabel, workerDockStateLabel } from './worker-dock-labels'
import { memo } from 'react'
import { AgentStateDot } from '@/components/agent/status/AgentStateDot'
import { workerDockDotState } from './worker-dock-status-dot'
import { WorkerDockRowAction } from './WorkerDockRowAction'
import { useNowSnapshot } from '@/lib/window-activity/use-now'
import { formatShortTimeAgo } from '@/lib/time-format/short-time-ago'
import { formatCompactDuration } from '../../../../../../../shared/agent-status/presentation/agent-row-decay-state'
import { cn } from '@/lib/class-names'
import type { WorkerDockEntry } from '../../../../../../../shared/orchestration/dock/worker-dock'
import { subagentModelLabel } from '../../../../../../../shared/native-chat/transcript/subagents/native-chat-subagent-entry-detail'

function Age({ at, visible }: { at: number | null; visible: boolean }) {
  const t = useTranslate()
  const locale = useIntlLocale()
  const label = useNowSnapshot(
    30_000,
    (now) => (at === null ? '—' : formatShortTimeAgo(at, now)),
    visible && at !== null
  )
  return (
    <span
      className="w-11 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      title={
        at === null
          ? t('components.native-chat.workerDock.timeUnavailable', 'Status time unavailable')
          : new Date(at).toLocaleString(locale)
      }
    >
      {label}
    </span>
  )
}
export type WorkerDockRowView = WorkerDockEntry & {
  retired?: boolean
  providerId?: string
  /** The open question a needs-you worker asked, shown in full on the lead row. */
  question?: string
}
/** The title only when it adds to the name: a worker named after its own prompt shows it once. */
export function workerDockDistinctTitle(name: string, title: string): string | null {
  const stem = (value: string) => value.replace(/(?:\.\.\.|…)\s*$/, '').trim()
  const a = stem(name)
  const b = stem(title)
  return !b || a.startsWith(b) || b.startsWith(a) ? null : title
}

/** One line per worker: state glyph, name, what it waits on or works at, state, age, action. The
 *  full prompt and any error live in the card the row opens. */
export const WorkerDockRow = memo(function WorkerDockRow({
  row,
  narrow,
  mixed,
  modelColumn,
  visible,
  pending,
  onOpen,
  onAction
}: {
  row: WorkerDockRowView
  narrow: boolean
  mixed: boolean
  modelColumn: boolean
  visible: boolean
  pending: boolean
  onOpen: (row: WorkerDockRowView, opener: HTMLElement) => void
  onAction: (row: WorkerDockRowView, action: 'stop' | 'clear') => void
}) {
  const t = useTranslate()
  const locale = useIntlLocale()
  const elapsed = useNowSnapshot(
    30_000,
    (now) => (row.startedAt === null ? '' : formatCompactDuration(now - row.startedAt)),
    visible && row.startedAt !== null && row.state === 'running'
  )
  const failed = row.state === 'failed' || row.state === 'unexpected'
  // An unreadable state has no label: the row shows its name, title, age and Stop only.
  const unreadable = row.state === 'unavailable' && !row.retired
  const state = row.retired
    ? t('components.native-chat.workerDock.doneResult', 'Done · open result')
    : unreadable
      ? ''
      : workerDockStateLabel(t, row.state)
  const stateTone = failed
    ? 'text-destructive'
    : row.state === 'needs-you'
      ? 'text-chat-warning'
      : 'text-muted-foreground'
  const distinct = workerDockDistinctTitle(row.name, row.title)
  // A name cut from the prompt reads in full from the longer of the two.
  const primary = distinct || row.title.length <= row.name.length ? row.name : row.title
  const secondary = row.question ?? distinct
  // A remote chat's worker is shown, not driven, here: its row says where to act instead.
  const remote =
    row.kind === 'worker' && row.ownerActionsAvailable === false
      ? t(
          'components.native-chat.workerDock.remoteOwner',
          'Stop or clear this from the computer it runs on'
        )
      : null
  const tooltip = `${[primary, secondary, row.model].filter(Boolean).join(' · ')}${row.startedAt ? t('components.native-chat.workerDock.startedAt', ' · Started {{time}} · {{elapsed}} elapsed', { time: new Date(row.startedAt).toLocaleString(locale), elapsed }) : ''}${t('components.native-chat.workerDock.contactUnavailable', ' · Last confirmed contact unavailable')}${remote ? ` · ${remote}` : ''}`
  const label = [
    mixed ? workerDockKindLabel(t, row.kind) : '',
    row.state === 'running' && !row.retired ? '' : state
  ]
    .filter(Boolean)
    .join(' · ')
  const dot = workerDockDotState(row.state, row.retired)
  return (
    <div
      data-worker-dock-row={row.id}
      className="group/worker relative flex min-w-0 items-center text-foreground hover:bg-accent has-[[data-worker-dock-open]:focus-visible]:bg-accent"
    >
      <button
        type="button"
        data-worker-dock-open={row.id}
        className="flex min-h-9 min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 pl-4 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset [@media(pointer:coarse)]:min-h-11"
        aria-label={[primary, distinct, state, row.reason, remote].filter(Boolean).join(' · ')}
        title={`${row.question ? `${row.question}\n` : ''}${tooltip}${narrow && state ? `\n${state}` : ''}`}
        onClick={(event) => onOpen(row, event.currentTarget)}
      >
        {/* An unreadable state keeps the glyph column's width but draws nothing. */}
        {dot ? (
          <AgentStateDot state={dot} size="sm" title={null} className="mx-0.5" />
        ) : (
          <span aria-hidden="true" className="mx-0.5 size-2.5 shrink-0" />
        )}
        <span className="min-w-16 flex-1 truncate text-sm">
          <span className="font-medium">{primary}</span>
          {secondary ? (
            <span data-worker-dock-question="" className="text-muted-foreground">
              {' '}
              {secondary}
            </span>
          ) : null}
        </span>
        {/* A narrow row gives the name the room; the dot's color and the section heading carry
            the state, and the tooltip and label keep its words. */}
        {label && !narrow ? (
          <span
            data-worker-dock-state=""
            className={cn('min-w-0 max-w-40 truncate text-xs', stateTone)}
          >
            {label}
          </span>
        ) : null}
        {modelColumn && !narrow && (row.model || !unreadable) ? (
          <span className="max-w-25 shrink-0 truncate text-xs text-muted-foreground">
            {row.model ? subagentModelLabel(row.model) : '—'}
          </span>
        ) : null}
        <Age at={row.changedAt} visible={visible} />
      </button>
      <WorkerDockRowAction row={row} pending={pending} onAction={onAction} />
    </div>
  )
})
