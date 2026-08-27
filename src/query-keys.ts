export const queryKeys = {
  environments: { list: (projectId: string) => ['projects', projectId, 'environments'] as const },
  projects: { list: ['projects'] as const },
  session: { read: ['session'] as const },
  services: {
    list: (projectId: string, environmentId: string) =>
      ['projects', projectId, 'environments', environmentId, 'services'] as const,
  },
}
