import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { deploymentLifecycleMutationKey } from '@/deployment/hooks/deployment-lifecycle'
import type { DeploymentTarget } from '@/deployment/schema'
import { spinUpDeployment } from '@/deployment/spin-up-deployment'

export function useSpinUpDeployment(onDeploymentCreated: (deploymentId: string) => void) {
  const requestSpinUp = useServerFn(spinUpDeployment)

  return useMutation({
    mutationKey: deploymentLifecycleMutationKey,
    mutationFn: (input: DeploymentTarget) => requestSpinUp({ data: input }),
    onSuccess: onDeploymentCreated,
  })
}
