import { Tooltip } from '@base-ui/react/tooltip'
import { CaretRightIcon } from '@phosphor-icons/react/CaretRight'
import { Link } from '@tanstack/react-router'
import { type ReactElement, useId } from 'react'

export type SelectionProgress =
  | Readonly<{ step: 'project' }>
  | Readonly<{ projectName?: string; step: 'environment' }>
  | Readonly<{
      environmentName?: string
      projectId: string
      projectName?: string
      step: 'services'
    }>

type SelectionBreadcrumbStep =
  | Readonly<{ kind: 'link'; label: string; link: ReactElement }>
  | Readonly<{ kind: 'current'; label: string }>
  | Readonly<{ description: string; kind: 'disabled'; label: string }>

type SelectionBreadcrumbsProps = Readonly<{
  progress: SelectionProgress
}>

const breadcrumbTooltipDelayMilliseconds = 100
const itemClassName =
  'inline-flex min-h-8 min-w-0 items-center rounded-control font-label text-xs font-semibold uppercase tracking-[0.1em] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-focus'
const linkClassName = `${itemClassName} flex-1 text-accent underline decoration-1 underline-offset-4 hover:text-accent-hover focus-visible:bg-accent focus-visible:text-accent-contrast`

function readStepLabel(step: 'Environment' | 'Project', name?: string) {
  return name ? `${step}: ${name}` : step
}

function createSelectionBreadcrumbSteps(
  progress: SelectionProgress,
): readonly SelectionBreadcrumbStep[] {
  if (progress.step === 'project') {
    return [
      { kind: 'current', label: 'Project' },
      { kind: 'disabled', label: 'Environment', description: 'Select a project first' },
      { kind: 'disabled', label: 'Services', description: 'Select an environment first' },
    ]
  }

  const projectLabel = readStepLabel('Project', progress.projectName)
  const projectStep: SelectionBreadcrumbStep = {
    kind: 'link',
    label: projectLabel,
    link: (
      <Link
        activeOptions={{ exact: true }}
        activeProps={{}}
        aria-label={projectLabel}
        className={`${linkClassName} pr-1`}
        search={{}}
        to="/projects"
      >
        <span className="min-w-0 truncate">{projectLabel}</span>
      </Link>
    ),
  }

  if (progress.step === 'environment') {
    return [
      projectStep,
      { kind: 'current', label: 'Environment' },
      { kind: 'disabled', label: 'Services', description: 'Select an environment first' },
    ]
  }

  const environmentLabel = readStepLabel('Environment', progress.environmentName)
  return [
    projectStep,
    {
      kind: 'link',
      label: environmentLabel,
      link: (
        <Link
          activeOptions={{ exact: true }}
          activeProps={{}}
          aria-label={environmentLabel}
          className={`${linkClassName} px-1`}
          params={{ projectId: progress.projectId }}
          search={{}}
          to="/projects/$projectId/environments"
        >
          <span className="min-w-0 truncate">{environmentLabel}</span>
        </Link>
      ),
    },
    { kind: 'current', label: 'Services' },
  ]
}

function DisabledBreadcrumb({
  description,
  label,
}: Readonly<{ description: string; label: string }>) {
  const descriptionId = useId()

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-describedby={descriptionId}
        aria-disabled="true"
        className={`${itemClassName} cursor-help border-0 bg-transparent px-1 text-text-muted focus-visible:bg-panel-raised focus-visible:text-text`}
      >
        {label}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-50" sideOffset={8}>
          <Tooltip.Popup
            id={descriptionId}
            role="tooltip"
            className="max-w-56 rounded-panel border border-border bg-panel-raised px-3 py-2 font-label text-xs text-text shadow-[3px_3px_0_var(--color-shadow)]"
          >
            {description}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function BreadcrumbLabelTooltip({ label }: Readonly<{ label: string }>) {
  return (
    <Tooltip.Portal>
      <Tooltip.Positioner className="z-50" sideOffset={8}>
        <Tooltip.Popup
          role="tooltip"
          className="max-w-72 break-words rounded-panel border border-border bg-panel-raised px-3 py-2 font-label text-xs text-text shadow-[3px_3px_0_var(--color-shadow)]"
        >
          {label}
        </Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  )
}

function renderStep(step: SelectionBreadcrumbStep, isFirst: boolean) {
  if (step.kind === 'link') {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger render={step.link} />
        <BreadcrumbLabelTooltip label={step.label} />
      </Tooltip.Root>
    )
  }

  if (step.kind === 'current') {
    return (
      <span
        aria-current="page"
        className={`${itemClassName} ${isFirst ? 'pr-1' : 'px-1'} text-text`}
      >
        {step.label}
      </span>
    )
  }

  return <DisabledBreadcrumb description={step.description} label={step.label} />
}

export function SelectionBreadcrumbs({ progress }: SelectionBreadcrumbsProps) {
  const steps = createSelectionBreadcrumbSteps(progress)

  return (
    <Tooltip.Provider delay={breadcrumbTooltipDelayMilliseconds}>
      <nav aria-label="Selection progress">
        <ol className="flex min-w-0 items-center gap-2">
          {steps.map((step, index) => (
            <li
              key={`${step.label}-${step.kind}`}
              className={`${step.kind === 'link' ? 'shrink' : 'shrink-0'} flex min-w-0 items-center gap-2`}
            >
              {index === 0 ? null : (
                <CaretRightIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 text-text-muted"
                  weight="bold"
                />
              )}
              {renderStep(step, index === 0)}
            </li>
          ))}
        </ol>
      </nav>
    </Tooltip.Provider>
  )
}
