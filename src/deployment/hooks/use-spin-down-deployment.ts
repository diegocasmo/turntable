import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { type SpinDownDeploymentInput, spinDownDeployment } from '@/deployment/spin-down-deployment'

export function useSpinDownDeployment(onSuccess: () => Promise<void> | void) {
  const requestSpinDown = useServerFn(spinDownDeployment)

  return useMutation({
    mutationKey: ['deployment-lifecycle'],
    mutationFn: async (input: SpinDownDeploymentInput) => {
      const removed = await requestSpinDown({ data: input })

      if (!removed) {
        throw new Error('Railway did not remove this deployment. Try again.')
      }
    },
    onSuccess,
  })
}
