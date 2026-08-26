import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  type DeploymentStatus,
  type DeploymentStatusTone,
  readDeploymentStatusPresentation,
} from '@/railway/deployment-status'

const badgeToneClasses: Record<DeploymentStatusTone, string> = {
  danger: 'border-[#d97767] bg-[#2d201e] text-[#f0b8ae]',
  neutral: 'border-[#706d60] bg-[#242522] text-[#c9c5b9]',
  positive: 'border-[#6f9e77] bg-[#1d2b22] text-[#b7d9bd]',
  progress: 'border-[#e5ad68] bg-[#2b281f] text-[#f4d4a9]',
}

type StatusBadgeProps = Readonly<{
  status: DeploymentStatus | null
}>

export function StatusBadge({ status }: StatusBadgeProps) {
  const presentation = status === null ? null : readDeploymentStatusPresentation(status)
  const label = presentation?.label ?? 'No deployment'
  const tone = presentation?.tone ?? 'neutral'

  return (
    <Badge
      className={cn('font-mono font-semibold uppercase tracking-[0.12em]', badgeToneClasses[tone])}
    >
      {label}
    </Badge>
  )
}
