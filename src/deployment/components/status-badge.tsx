import { ArrowsClockwiseIcon } from '@phosphor-icons/react/ArrowsClockwise'
import { HourglassSimpleIcon } from '@phosphor-icons/react/HourglassSimple'
import { WarningIcon } from '@phosphor-icons/react/Warning'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

const badgeToneClasses: Record<DeploymentStatusTone, string> = {
  danger: 'border-destructive bg-danger-surface text-danger-foreground',
  neutral: 'border-border bg-secondary text-foreground-soft',
  positive: 'border-positive bg-positive-surface text-positive-foreground',
  progress: 'border-warning bg-warning-surface text-warning-foreground',
}

type StatusBadgeProps = Readonly<{
  status: DeploymentStatus | null
}>

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = status === null ? null : readDeploymentStatusPresentation(status)
  const label = presentation?.label ?? 'No active deployment'
  const tone = presentation?.tone ?? 'neutral'

  return (
    <Badge
      aria-atomic="true"
      aria-live="polite"
      className={cn('font-mono font-semibold uppercase tracking-[0.12em]', badgeToneClasses[tone])}
      role="status"
    >
      {presentation?.indicator === 'activity' ? (
        <ArrowsClockwiseIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {presentation?.indicator === 'waiting' ? (
        <HourglassSimpleIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {presentation?.indicator === 'attention' ? (
        <WarningIcon aria-hidden="true" data-icon="inline-start" weight="bold" />
      ) : null}
      {label}
    </Badge>
  )
}
