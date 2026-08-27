import { Tooltip } from '@base-ui/react/tooltip'
import { useId } from 'react'

export type SelectionBreadcrumbStep =
  | Readonly<{ href: string; kind: 'link'; label: string }>
  | Readonly<{ kind: 'current'; label: string }>
  | Readonly<{ description: string; kind: 'disabled'; label: string }>

type SelectionBreadcrumbsProps = Readonly<{
  steps: readonly SelectionBreadcrumbStep[]
}>

const itemClassName =
  'break-words font-mono text-xs font-semibold uppercase tracking-[0.1em] outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring'

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
        className={`${itemClassName} cursor-help border-0 bg-transparent p-0 text-muted-foreground`}
      >
        {label}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-50" sideOffset={8}>
          <Tooltip.Popup
            id={descriptionId}
            role="tooltip"
            className="max-w-56 border border-border bg-popover px-3 py-2 font-mono text-xs text-foreground shadow-[3px_3px_0_var(--shadow-color)]"
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
      <a className={`${itemClassName} text-foreground-soft hover:text-primary`} href={step.href}>
        {step.label}
      </a>
    )
  }

  if (step.kind === 'current') {
    return (
      <span aria-current="page" className={`${itemClassName} text-foreground`}>
        {step.label}
      </span>
    )
  }

  return <DisabledBreadcrumb description={step.description} label={step.label} />
}

export function SelectionBreadcrumbs({ steps }: SelectionBreadcrumbsProps) {
  return (
    <Tooltip.Provider>
      <nav aria-label="Selection progress">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {steps.map((step, index) => (
            <li key={`${step.label}-${step.kind}`} className="flex min-w-0 items-center gap-2">
              {index === 0 ? null : (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              )}
              {renderStep(step)}
            </li>
          ))}
        </ol>
      </nav>
    </Tooltip.Provider>
  )
}
