import { skipToken, useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { readCurrentDeployment } from '@/deployment/read-current-deployment'
import type { DeploymentTarget } from '@/deployment/schema'

export function useReadCurrentDeployment(target: DeploymentTarget | undefined) {
  const read = useServerFn(readCurrentDeployment)
  return useQuery({
    queryFn: target === undefined ? skipToken : () => read({ data: target }),
    queryKey: ['deployment', target?.projectId, target?.environmentId, target?.serviceId],
    retry: false,
  })
}
