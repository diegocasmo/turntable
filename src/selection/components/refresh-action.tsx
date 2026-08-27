import { ArrowClockwiseIcon } from '@phosphor-icons/react/ArrowClockwise'
import { CircleNotchIcon } from '@phosphor-icons/react/CircleNotch'
import { AsyncButton } from '@/components/ui/button'

type RefreshActionProps = Readonly<{
  label: string
  onRefresh: () => void
  pending: boolean
}>

export function RefreshAction({ label, onRefresh, pending }: RefreshActionProps) {
  return (
    <AsyncButton
      type="button"
      aria-label={`Refresh ${label.toLowerCase()}`}
      pending={pending}
      size="sm"
      variant="secondary"
      onClick={() => {
        if (!pending) onRefresh()
      }}
    >
      {pending ? (
        <CircleNotchIcon aria-hidden="true" className="motion-safe:animate-spin" weight="bold" />
      ) : (
        <ArrowClockwiseIcon aria-hidden="true" weight="bold" />
      )}
      {pending ? 'Refreshing' : 'Refresh'}
    </AsyncButton>
  )
}
