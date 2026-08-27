import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import type { DeploymentTarget } from '@/deployment/schema'
import { spinUpDeployment } from '@/deployment/spin-up-deployment'

export function useSpinUpDeployment(onSuccess: () => Promise<void> | void) {
  const requestSpinUp = useServerFn(spinUpDeployment)

  return useMutation({
    mutationKey: ['deployment-lifecycle'],
    mutationFn: (input: DeploymentTarget) => requestSpinUp({ data: input }),
    onSuccess,
  })
}
