import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { deploymentLifecycleMutationKey } from '@/deployment/hooks/deployment-lifecycle'
import { type SpinUpDeploymentInput, spinUpDeployment } from '@/deployment/spin-up-deployment'

export function useSpinUpDeployment(onDeploymentCreated: (deploymentId: string) => void) {
  const requestSpinUp = useServerFn(spinUpDeployment)

  return useMutation({
    mutationKey: deploymentLifecycleMutationKey,
    mutationFn: (input: SpinUpDeploymentInput) => requestSpinUp({ data: input }),
    onSuccess: onDeploymentCreated,
  })
}
