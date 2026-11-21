import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'

export function AutomationRunRerunButton({
  pending,
  disabled,
  onRerun
}: {
  pending: boolean
  disabled: boolean
  onRerun: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      onClick={onRerun}
    >
      <RefreshCw className={cn('size-3.5', pending && 'motion-safe:animate-spin')} />
      {t('auto.components.automations.AutomationsPage.295698292f', 'Rerun')}
    </Button>
  )
}
