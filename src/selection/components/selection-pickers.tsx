import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DeploymentStatus } from '@/deployment/components/deployment-status'
import { Picker } from '@/selection/components/picker'
import { usePickerSelections } from '@/selection/hooks/use-picker-selections'
import { useReadSelectionHierarchy } from '@/selection/hooks/use-read-selection-hierarchy'

function SelectionSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 motion-safe:animate-pulse">
      {['w-16', 'w-24', 'w-14'].map((width) => (
        <div key={width} className="border-t border-[#4d4e47] pt-3">
          <div className={`h-4 ${width} bg-[#4d4e47]`} />
          <div className="mt-2 h-8 w-full border border-[#4d4e47] bg-[#242522]" />
        </div>
      ))}
      <div className="border-t border-[#4d4e47]">
        <div className="grid gap-2 py-3">
          <div className="h-4 w-32 bg-[#4d4e47]" />
          <div className="grid min-h-[7.25rem] content-start sm:min-h-[4.5rem]">
            <div className="h-6 w-24 bg-[#4d4e47]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectionFailure({ error, retry }: Readonly<{ error: Error; retry: () => void }>) {
  return (
    <div className="grid">
      <div className="invisible col-start-1 row-start-1">
        <SelectionSkeleton />
      </div>
      <div className="col-start-1 row-start-1 grid grid-cols-[1fr_auto] items-center gap-3 self-center border-l-2 border-[#d97767] bg-[#2d201e] px-3 py-2">
        <p role="alert" className="text-sm leading-6 text-[#f0b8ae]">
          {error.message}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    </div>
  )
}

export function SelectionPickers() {
  const hierarchy = useReadSelectionHierarchy()
  const { deploymentTarget, environment, project, service, status } = usePickerSelections(
    hierarchy.data ?? [],
  )
  const isInitialLoad = hierarchy.data === undefined && hierarchy.isPending

  let content: ReactNode
  if (hierarchy.data !== undefined) {
    content = (
      <div className="grid gap-4">
        <Picker {...project} />
        <Picker {...environment} />
        <Picker {...service} />
        <div id="selection-status" className="sr-only">
          {status !== undefined ? (
            <p aria-label="Selection status" role="status">
              {status}
            </p>
          ) : null}
        </div>
        <DeploymentStatus target={deploymentTarget} />
      </div>
    )
  } else if (hierarchy.error) {
    content = <SelectionFailure error={hierarchy.error} retry={() => void hierarchy.refetch()} />
  } else {
    content = <SelectionSkeleton />
  }

  return (
    <>
      {isInitialLoad ? (
        <p aria-label="Selection status" role="status" className="sr-only">
          Loading choices.
        </p>
      ) : null}
      <section
        aria-busy={isInitialLoad || undefined}
        aria-labelledby="selection-title"
        className="mt-6 grid gap-4"
      >
        <h3 id="selection-title" className="text-2xl leading-tight">
          Choose a service
        </h3>
        {content}
      </section>
    </>
  )
}
