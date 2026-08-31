import { Tooltip } from '@base-ui/react/tooltip'
import { CaretRightIcon } from '@phosphor-icons/react/CaretRight'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useId } from 'react'

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
  | Readonly<{ kind: 'link'; label: string; link: ReactNode }>
  | Readonly<{ kind: 'current'; label: string }>
  | Readonly<{ description: string; kind: 'disabled'; label: string }>

type SelectionBreadcrumbsProps = Readonly<{
  progress: SelectionProgress
}>

const breadcrumbTooltipDelayMilliseconds = 100
const itemClassName =
  'inline-flex min-h-8 items-center break-words rounded-control px-1 font-label text-xs font-semibold uppercase tracking-[0.1em] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-1 focus-visible:outline-focus'
const linkClassName = 'underline decoration-1 underline-offset-4'

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
        className={linkClassName}
        search={{}}
        to="/projects"
      >
        {projectLabel}
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
          className={linkClassName}
          params={{ projectId: progress.projectId }}
          search={{}}
          to="/projects/$projectId/environments"
        >
          {environmentLabel}
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
        className={`${itemClassName} cursor-help border-0 bg-transparent text-text-muted focus-visible:bg-panel-raised focus-visible:text-text`}
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

function renderStep(step: SelectionBreadcrumbStep) {
  if (step.kind === 'link') {
    return (
      <span
        className={`${itemClassName} p-0 text-accent hover:text-accent-hover [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a]:px-1 [&_a]:outline-none [&_a]:focus-visible:bg-accent [&_a]:focus-visible:text-accent-contrast [&_a]:focus-visible:outline-[3px] [&_a]:focus-visible:outline-offset-1 [&_a]:focus-visible:outline-focus`}
      >
        {step.link}
      </span>
    )
  }

  if (step.kind === 'current') {
    return (
      <span aria-current="page" className={`${itemClassName} text-text`}>
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
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {steps.map((step, index) => (
            <li key={`${step.label}-${step.kind}`} className="flex min-w-0 items-center gap-2">
              {index === 0 ? null : (
                <CaretRightIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 text-text-muted"
                  weight="bold"
                />
              )}
              {renderStep(step)}
            </li>
          ))}
        </ol>
      </nav>
    </Tooltip.Provider>
  )
}
