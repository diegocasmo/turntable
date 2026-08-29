import { WarningIcon } from '@phosphor-icons/react/Warning'
import { XIcon } from '@phosphor-icons/react/X'
import { Button } from '@/components/ui/button'

type WarningNoticeProps = Readonly<{
  descriptionId: string
  message: string
  onDismiss: () => void
  title: string
  urgency: 'assertive' | 'polite'
}>

export function WarningNotice({
  descriptionId,
  message,
  onDismiss,
  title,
  urgency,
}: WarningNoticeProps) {
  return (
    <aside
      aria-label={title}
      aria-live={urgency}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border border-warning border-l-[3px] bg-warning-panel px-3 py-3 text-warning-text shadow-[3px_3px_0_var(--color-shadow)]"
      role={urgency === 'assertive' ? 'alert' : 'status'}
    >
      <WarningIcon aria-hidden="true" className="mt-0.5 size-5" weight="fill" />
      <div className="min-w-0">
        <p className="font-label text-xs font-semibold uppercase tracking-[0.12em]">{title}</p>
        <p id={descriptionId} className="mt-1 text-sm leading-5">
          {message}
        </p>
      </div>
      <Button
        aria-label={`Dismiss ${title.toLowerCase()} warning`}
        className="size-10 text-warning-text hover:bg-warning/10 hover:text-text"
        size="icon-xs"
        type="button"
        variant="ghost"
        onClick={onDismiss}
      >
        <XIcon aria-hidden="true" weight="bold" />
      </Button>
    </aside>
  )
}
