import type { DeploymentTarget } from '@/deployment/schema'
export const queryKeys = {
  deployment: { watch: (target: DeploymentTarget | undefined) => ['deployment', target] as const },
  environments: { list: (projectId: string) => ['projects', projectId, 'environments'] as const },
  projectHierarchy: { read: ['project-hierarchy'] as const },
  projects: { list: ['projects'] as const },
  services: {
    list: (projectId: string, environmentId: string) =>
      ['projects', projectId, 'environments', environmentId, 'services'] as const,
  },
}
