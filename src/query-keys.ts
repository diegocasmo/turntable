export const queryKeys = {
  environments: {
    detail: (projectId: string, environmentId: string) =>
      ['projects', projectId, 'environments', 'detail', environmentId] as const,
    list: (projectId: string) => ['projects', projectId, 'environments'] as const,
  },
  projects: {
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
    list: ['projects'] as const,
  },
  session: { read: ['session'] as const },
  services: {
    list: (projectId: string, environmentId: string) =>
      ['projects', projectId, 'environments', environmentId, 'services'] as const,
  },
}
