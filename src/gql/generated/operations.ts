/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type ProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProjectsQuery = { projects: { edges: Array<{ node: { id: string, name: string, primaryEnvironmentId: string | null, workspace: { id: string, name: string } | null } }> } };

export type RailwaySmokeQueryVariables = Exact<{
  projectId: string;
  environmentId: string;
}>;


export type RailwaySmokeQuery = { project: { id: string, name: string }, environment: { id: string, name: string, projectId: string, serviceInstances: { edges: Array<{ node: { serviceId: string, serviceName: string } }> } } };
