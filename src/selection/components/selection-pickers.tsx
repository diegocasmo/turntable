import { Navigate } from '@tanstack/react-router'
import { DeploymentStatus } from '@/deployment/components/deployment-status'
import { Picker } from '@/selection/components/picker'
import { usePickerSelections } from '@/selection/hooks/use-picker-selections'

export function SelectionPickers() {
  const {
    deploymentTarget,
    environment,
    failure,
    project,
    searchWithDefaultOption,
    service,
    status,
  } = usePickerSelections()

  return (
    <div className="mt-6 grid gap-4">
      {searchWithDefaultOption && (
        <Navigate to="/" search={searchWithDefaultOption} replace resetScroll={false} />
      )}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8f8c81]">
          Project / Environment / Service
        </p>
        <h3 className="mt-2 text-2xl leading-tight">Choose a service</h3>
      </div>
      <Picker {...project} />
      <Picker {...environment} />
      <Picker {...service} />
      <div id="selection-status" className="sr-only">
        {failure?.message}
        {!failure && status !== undefined ? (
          <p aria-label="Selection status" role="status">
            {status}
          </p>
        ) : null}
      </div>
      <DeploymentStatus selectionFailure={failure} target={deploymentTarget} />
    </div>
  )
}
