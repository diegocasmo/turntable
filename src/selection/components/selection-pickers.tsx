import { DeploymentStatus } from '@/deployment/components/deployment-status'
import { Picker } from '@/selection/components/picker'
import { usePickerSelections } from '@/selection/hooks/use-picker-selections'

export function SelectionPickers() {
  const { deploymentTarget, environment, failure, project, service, status } = usePickerSelections()

  return (
    <div className="mt-6 grid gap-4">
      <h3 className="text-2xl leading-tight">Choose a service</h3>
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
