import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TurntablePage } from '@/components/turntable-page'
import type { DeploymentStreamEvent } from '@/deployment/event-stream'
import type { SelectionProject } from '@/gql/operations/projects'
import { type SelectionSearch, selectionSearchSchema } from '@/selection/schema'
import { maximumSessionTokenByteLength, type SessionState } from '@/session/schema'
import {
  createRailwayService,
  createSelectionEnvironment,
  createSelectionProject,
  testRailwayProjectId,
  testRailwayServiceId,
  testRailwayToken,
} from '@/test/railway'

const {
  connectToRailwayMock,
  disconnectFromRailwayMock,
  readSelectionHierarchyMock,
  spinDownDeploymentMock,
  streamDeploymentEventsMock,
} = vi.hoisted(() => ({
  connectToRailwayMock: vi.fn(),
  disconnectFromRailwayMock: vi.fn(),
  readSelectionHierarchyMock: vi.fn(),
  spinDownDeploymentMock: vi.fn(),
  streamDeploymentEventsMock: vi.fn(),
}))

vi.mock('@/session/connect-to-railway', () => ({
  connectToRailway: connectToRailwayMock,
}))
vi.mock('@/session/disconnect-from-railway', () => ({
  disconnectFromRailway: disconnectFromRailwayMock,
}))
vi.mock('@/deployment/stream-deployment-events', () => ({
  streamDeploymentEvents: streamDeploymentEventsMock,
}))
vi.mock('@/deployment/spin-down-deployment', () => ({
  spinDownDeployment: spinDownDeploymentMock,
}))
vi.mock('@/selection/read-selection-hierarchy', () => ({
  readSelectionHierarchy: readSelectionHierarchyMock,
}))
vi.stubGlobal('scrollTo', vi.fn())

type SessionOperation = () => Promise<SessionState>

type RenderOptions = Readonly<{
  connect?: SessionOperation
  disconnect?: SessionOperation
  initialEntry?: string
  sessionState?: SessionState
}>

function renderTurntablePage(options: RenderOptions = {}) {
  let sessionState = options.sessionState ?? 'signed-out'
  const connect =
    options.connect ??
    (async () => {
      sessionState = 'authenticated'
      return sessionState
    })
  const disconnect =
    options.disconnect ??
    (async () => {
      sessionState = 'signed-out'
      return sessionState
    })

  connectToRailwayMock.mockImplementation(connect)
  disconnectFromRailwayMock.mockImplementation(disconnect)

  const rootRoute = createRootRoute()
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: selectionSearchSchema,
    loader: () => sessionState,
    component: TestPage,
  })

  function TestPage() {
    return <TurntablePage sessionState={pageRoute.useLoaderData()} />
  }

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [options.initialEntry ?? '/'] }),
    routeTree: rootRoute.addChildren([pageRoute]),
    Wrap: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })

  return {
    queryClient,
    router,
    ...render(<RouterProvider router={router} />),
  }
}

function submitToken(token = testRailwayToken) {
  fireEvent.change(screen.getByLabelText('Railway API token'), {
    target: { value: token },
  })
  fireEvent.submit(screen.getByRole('form', { name: 'Connect to Railway' }))
}

async function* createEventStream(...events: DeploymentStreamEvent[]) {
  yield* events
}

async function searchPicker(name: string, query: string) {
  const picker = await screen.findByRole('combobox', { name })
  await waitFor(() => expect(picker).toBeEnabled())
  fireEvent.input(picker, { inputType: 'insertText', target: { value: query } })
  return picker
}

async function selectOption(name: string, optionName: string) {
  await searchPicker(name, optionName)
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}

async function expectSearch(page: ReturnType<typeof renderTurntablePage>, search: SelectionSearch) {
  await waitFor(() => expect(page.router.state.location.search).toEqual(search))
}

beforeEach(() => {
  connectToRailwayMock.mockReset()
  disconnectFromRailwayMock.mockReset()
  readSelectionHierarchyMock
    .mockReset()
    .mockResolvedValue([createSelectionProject(), createSelectionProject({ id: 'project-2' })])
  spinDownDeploymentMock.mockReset().mockResolvedValue(true)
  streamDeploymentEventsMock
    .mockReset()
    .mockResolvedValue(createEventStream({ data: null, type: 'snapshot' }))
})

describe('Token form', () => {
  it('shows the idle state and the required product text', async () => {
    renderTurntablePage()

    const main = await screen.findByRole('main')

    expect(within(main).getByRole('heading', { level: 1, name: 'Turntable' })).toBeVisible()
    expect(within(main).getByLabelText('Railway API token')).toBeRequired()
    expect(within(main).getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    expect(within(main).getByRole('form', { name: 'Connect to Railway' })).toHaveAttribute(
      'method',
      'post',
    )
    const railwayTokensLink = within(main).getByRole('link', {
      name: "Railway's token page (opens in a new tab)",
    })
    expect(railwayTokensLink).toHaveAttribute('href', 'https://railway.com/account/tokens')
    expect(railwayTokensLink).toHaveAttribute('target', '_blank')
    expect(railwayTokensLink).toHaveAttribute('rel', 'noreferrer')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Unofficial. Not a Railway product.')
  })

  it('shows the pending state while Railway checks the token', async () => {
    renderTurntablePage({ connect: () => new Promise<SessionState>(() => undefined) })

    await screen.findByLabelText('Railway API token')
    submitToken()

    expect(await screen.findByRole('button', { name: 'Connecting...' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByLabelText('Railway API token')).toBeDisabled()
    expect(screen.getByText('Railway is checking the token.')).toBeVisible()
  })

  it('rejects an invalid token before it calls the server', async () => {
    renderTurntablePage()
    const tokenAboveByteLimit = `${'é'.repeat(maximumSessionTokenByteLength / 2)}a`

    await screen.findByLabelText('Railway API token')
    submitToken(tokenAboveByteLimit)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Railway token must contain 1 to 512 UTF-8 bytes.',
    )
    expect(connectToRailwayMock).not.toHaveBeenCalled()
  })

  it('shows a safe server error', async () => {
    const { queryClient } = renderTurntablePage({
      connect: () => Promise.reject(new Error('Railway could not verify this token.')),
    })

    await screen.findByLabelText('Railway API token')
    submitToken()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not verify this token.',
    )
    expect(screen.getByRole('button', { name: 'Connect to Railway' })).toBeEnabled()
    expect(queryClient.getMutationCache().getAll()[0]?.state.variables).toBeUndefined()
  })

  it('shows the success state and clears the token mutation', async () => {
    const { queryClient } = renderTurntablePage()
    queryClient.setQueryData(['private-test-data'], 'private')

    await screen.findByLabelText('Railway API token')
    submitToken()

    expect(await screen.findByRole('heading', { name: 'Connected to Railway' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Session status' })).toHaveTextContent(
      'Connected to Railway.',
    )
    expect(connectToRailwayMock.mock.calls[0]?.[0]).toEqual({
      data: { token: testRailwayToken },
    })
    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
    expect(queryClient.getQueryData(['private-test-data'])).toBeUndefined()
  })

  it('signs out this browser', async () => {
    const { queryClient } = renderTurntablePage({ sessionState: 'authenticated' })
    queryClient.setQueryData(['private-test-data'], 'private')

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))

    expect(await screen.findByLabelText('Railway API token')).toBeVisible()
    expect(disconnectFromRailwayMock.mock.calls[0]?.[0]).toEqual({})
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('shows a safe sign-out error', async () => {
    const message = 'Railway could not sign out this browser.'
    renderTurntablePage({
      disconnect: () => Promise.reject(new Error(message)),
      sessionState: 'authenticated',
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out this browser' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    const retry = screen.getByRole('button', { name: 'Sign out failed. Try again' })
    expect(retry).toBeEnabled()
    expect(retry).toHaveAccessibleDescription(message)
  })

  it('shows an expired session', async () => {
    renderTurntablePage({ sessionState: 'expired' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session expired. Enter your Railway API token again.',
    )
    expect(screen.getByLabelText('Railway API token')).toBeVisible()
  })
})

describe('project, environment, and service selection', () => {
  it('shows the loading state', async () => {
    const hierarchy = Promise.withResolvers<readonly SelectionProject[]>()
    readSelectionHierarchyMock.mockReturnValue(hierarchy.promise)
    renderTurntablePage({ sessionState: 'authenticated' })

    expect(await screen.findByRole('status', { name: 'Selection status' })).toHaveTextContent(
      'Loading choices.',
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    hierarchy.resolve([createSelectionProject()])
    expect(await screen.findAllByRole('combobox')).toHaveLength(3)
    expect(screen.getByRole('group', { name: 'Choose a service' })).toBeVisible()
  })

  it('finds project names through their workspace group and stores IDs in the URL', async () => {
    const workspace = { id: 'workspace-2', name: 'Zulu' }
    const project = createSelectionProject({ id: 'project-2', name: 'Alpha', workspace })
    const environment = project.environments[0]
    const service = environment?.services[0]
    readSelectionHierarchyMock.mockResolvedValue([
      createSelectionProject({ id: 'project-3', name: 'Beta' }),
      project,
    ])
    const page = renderTurntablePage({ sessionState: 'authenticated' })
    await searchPicker('Project', workspace.name)
    const group = await screen.findByRole('group', { name: workspace.name })
    expect(within(group).getByRole('option', { name: project.name })).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Railway workspace' })).not.toBeInTheDocument()
    fireEvent.click(within(group).getByRole('option', { name: project.name }))
    if (!environment || !service) throw new Error('The test project must have a service target.')
    await selectOption('Environment', environment.name)
    await selectOption('Service', service.name)
    await expectSearch(page, {
      environmentId: environment.id,
      projectId: project.id,
      serviceId: service.id,
    })
    expect(screen.queryByRole('status', { name: 'Selection status' })).not.toBeInTheDocument()
  })

  it('ranks fuzzy matches without navigating until keyboard selection', async () => {
    const worker = createSelectionProject({ id: 'project-worker', name: 'Worker' })
    readSelectionHierarchyMock.mockResolvedValue([
      createSelectionProject({ id: 'project-web', name: 'Web' }),
      createSelectionProject({ id: 'project-api-worker', name: 'API worker' }),
      worker,
    ])
    const page = renderTurntablePage({ sessionState: 'authenticated' })
    expect(await screen.findByRole('button', { name: 'Show project options' })).toBeInTheDocument()
    const picker = await searchPicker('Project', 'wkr')
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'Worker',
      'API worker',
    ])
    expect(screen.getByRole('status', { name: 'Project results' })).toHaveTextContent(
      '2 projects found.',
    )
    await expectSearch(page, {})
    fireEvent.keyDown(picker, { key: 'Escape' })
    fireEvent.blur(picker)
    await expectSearch(page, {})

    await searchPicker('Project', 'wkr')
    fireEvent.keyDown(picker, { key: 'Enter' })
    await expectSearch(page, { projectId: worker.id })
  })

  it('searches every choice but renders at most 20 results and announces no matches', async () => {
    readSelectionHierarchyMock.mockResolvedValue(
      Array.from({ length: 25 }, (_, index) =>
        createSelectionProject({ id: `project-${index}`, name: `Service ${index}` }),
      ),
    )
    renderTurntablePage({ sessionState: 'authenticated' })
    const picker = await searchPicker('Project', 'service')

    expect(await screen.findAllByRole('option')).toHaveLength(20)
    expect(screen.getByRole('status', { name: 'Project results' })).toHaveTextContent(
      '20 of 25 projects shown.',
    )

    fireEvent.input(picker, { inputType: 'insertText', target: { value: 'zzzz' } })
    const emptyResults = screen.getByRole('note', { name: 'Project empty results' })
    await waitFor(() => expect(emptyResults).toHaveTextContent('No projects found.'))
    expect(emptyResults).toHaveAttribute('aria-live', 'polite')
  })

  it('requires each choice and restores valid IDs after a reload', async () => {
    const environment = createSelectionEnvironment()
    const service = createRailwayService()
    const project = createSelectionProject({
      environments: [{ ...environment, services: [service] }],
    })
    readSelectionHierarchyMock.mockResolvedValue([project])
    const first = renderTurntablePage({ sessionState: 'authenticated' })

    const projectPicker = await screen.findByRole('combobox', { name: 'Project' })
    await waitFor(() => expect(projectPicker).toBeEnabled())
    expect(projectPicker).toHaveAttribute('placeholder', 'Choose a project')

    await selectOption('Project', project.name)
    const environmentPicker = screen.getByRole('combobox', { name: 'Environment' })
    await waitFor(() => expect(environmentPicker).toBeEnabled())
    expect(environmentPicker).toHaveAttribute('placeholder', 'Choose an environment')
    await expectSearch(first, { projectId: project.id })

    await selectOption('Environment', environment.name)
    const servicePicker = screen.getByRole('combobox', { name: 'Service' })
    await waitFor(() => expect(servicePicker).toBeEnabled())
    expect(servicePicker).toHaveAttribute('placeholder', 'Choose a service')
    await expectSearch(first, { environmentId: environment.id, projectId: project.id })

    await selectOption('Service', service.name)
    await expectSearch(first, {
      environmentId: environment.id,
      projectId: project.id,
      serviceId: service.id,
    })
    const url = first.router.state.location.href
    first.unmount()
    renderTurntablePage({ initialEntry: url, sessionState: 'authenticated' })
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Service' })).toHaveValue(service.name),
    )
  })

  it('clears child choices when a parent changes', async () => {
    const secondEnvironment = createSelectionEnvironment({ id: 'environment-2', name: 'Staging' })
    const firstProject = createSelectionProject({
      environments: [createSelectionEnvironment(), secondEnvironment],
    })
    const secondProject = createSelectionProject({
      environments: [secondEnvironment],
      id: 'project-2',
      name: 'Other',
    })
    readSelectionHierarchyMock.mockResolvedValue([firstProject, secondProject])
    const page = renderTurntablePage({
      initialEntry: '/?projectId=project-1&environmentId=environment-1&serviceId=service-1',
      sessionState: 'authenticated',
    })

    await selectOption('Environment', secondEnvironment.name)
    await expectSearch(page, {
      environmentId: secondEnvironment.id,
      projectId: testRailwayProjectId,
    })
    await selectOption('Service', 'Web')
    await expectSearch(page, {
      environmentId: secondEnvironment.id,
      projectId: testRailwayProjectId,
      serviceId: testRailwayServiceId,
    })

    await selectOption('Project', secondProject.name)
    await expectSearch(page, { projectId: secondProject.id })
  })

  it.each([
    ['Environment', createSelectionProject({ environments: [] }), '/?projectId=project-1'],
    [
      'Service',
      createSelectionProject({ environments: [createSelectionEnvironment({ services: [] })] }),
      '/?projectId=project-1&environmentId=environment-1',
    ],
  ])('shows an empty %s picker after its parent resolves', async (label, project, url) => {
    readSelectionHierarchyMock.mockResolvedValue([project])
    renderTurntablePage({ initialEntry: url, sessionState: 'authenticated' })

    const picker = await screen.findByRole('combobox', { name: label })
    await waitFor(() => expect(picker).toHaveAttribute('placeholder', `No ${label.toLowerCase()}s`))
    expect(picker).toBeDisabled()
  })

  it.each([
    ['project', '/?projectId=missing'],
    ['environment', '/?projectId=project-1&environmentId=missing'],
    ['service', '/?projectId=project-1&environmentId=environment-1&serviceId=missing'],
  ])('keeps a stale %s ID until the user replaces it', async (level, initialEntry) => {
    const { router } = renderTurntablePage({ initialEntry, sessionState: 'authenticated' })

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Selection status' })).toHaveTextContent(
        `selected ${level} is no longer available`,
      ),
    )
    expect(router.state.location.href).toContain(`${level}Id=missing`)
  })

  it('shows and retries a safe error', async () => {
    const message = 'Railway could not load choices.'
    readSelectionHierarchyMock.mockRejectedValueOnce(new Error(message)).mockResolvedValueOnce([])
    renderTurntablePage({ sessionState: 'authenticated' })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('combobox', { name: 'Project' })).toHaveAttribute(
      'placeholder',
      'No projects',
    )
  })
})

describe('deployment status', () => {
  const selectedTargetUrl = '/?projectId=project-1&environmentId=environment-1&serviceId=service-1'
  const renderStatus = () =>
    renderTurntablePage({ initialEntry: selectedTargetUrl, sessionState: 'authenticated' })

  it('shows the stable state before a service is selected', async () => {
    renderTurntablePage({ sessionState: 'authenticated' })

    const deploymentRegion = await screen.findByRole('region', { name: 'Deployment status' })
    expect(within(deploymentRegion).getByText('Choose a service')).toBeVisible()
    expect(streamDeploymentEventsMock).not.toHaveBeenCalled()
  })

  it('shows a service with no deployment', async () => {
    renderStatus()

    const deploymentStatus = await screen.findByRole('status', { name: 'Deployment status' })
    await waitFor(() => expect(deploymentStatus).toHaveTextContent('No deployment'))
  })

  it('shows the loading state', async () => {
    streamDeploymentEventsMock.mockReturnValueOnce(new Promise(() => undefined))
    renderStatus()

    const deploymentStatus = await screen.findByRole('status', { name: 'Deployment status' })
    await waitFor(() => expect(deploymentStatus).toHaveTextContent('Loading…'))
  })

  it('follows status values and aborts the request on close', async () => {
    const channel = new TransformStream<DeploymentStreamEvent>()
    const writer = channel.writable.getWriter()
    streamDeploymentEventsMock.mockResolvedValue(channel.readable)
    const page = renderStatus()

    await writer.write({
      data: { deploymentStopped: false, id: 'deployment-private-id', status: 'NEEDS_APPROVAL' },
      type: 'snapshot',
    })
    expect(await screen.findByText('Needs approval')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Spin down' })).not.toBeInTheDocument()
    expect(screen.queryByText('deployment-private-id')).not.toBeInTheDocument()
    await writer.write({
      data: { deploymentStopped: false, id: 'deployment-private-id', status: 'unknown' },
      type: 'status',
    })
    expect(await screen.findByText('Unknown')).toBeVisible()
    const signal = streamDeploymentEventsMock.mock.calls[0]?.[0].signal

    page.unmount()
    await waitFor(() => expect(signal?.aborted).toBe(true))
    await writer.close()
  })

  it('confirms the exact deployment and shows a command failure', async () => {
    const deploymentId = 'deployment-private-id'
    spinDownDeploymentMock.mockResolvedValue(false)
    streamDeploymentEventsMock.mockResolvedValue(
      createEventStream({
        data: { deploymentStopped: false, id: deploymentId, status: 'SUCCESS' },
        type: 'snapshot',
      }),
    )
    renderStatus()

    fireEvent.click(await screen.findByRole('button', { name: 'Spin down' }))
    let dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAccessibleDescription(
      'This removes the running container. The service configuration stays in Railway.',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(spinDownDeploymentMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Spin down' }))
    dialog = screen.getByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Spin down' }))

    await waitFor(() =>
      expect(spinDownDeploymentMock).toHaveBeenCalledWith({ data: { deploymentId } }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway did not remove this deployment. Try again.',
    )
  })

  it('shows a terminal unavailable deployment', async () => {
    streamDeploymentEventsMock.mockResolvedValue(createEventStream({ type: 'gone' }))
    renderStatus()

    expect(await screen.findByText('Deployment unavailable')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument()
  })

  it('returns to the token form when the session expires', async () => {
    streamDeploymentEventsMock.mockResolvedValue(createEventStream({ type: 'session-expired' }))
    renderStatus()

    expect(await screen.findByLabelText('Railway API token')).toBeVisible()
    expect(disconnectFromRailwayMock.mock.calls[0]?.[0]).toEqual({})
  })

  it('reconnects after a stream failure', async () => {
    const channel = new TransformStream<DeploymentStreamEvent>()
    const writer = channel.writable.getWriter()
    streamDeploymentEventsMock
      .mockRejectedValueOnce(new Error('Railway could not stream the deployment.'))
      .mockResolvedValueOnce(channel.readable)
    renderStatus()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not stream the deployment.',
    )
    const deploymentRegion = screen.getByRole('region', { name: 'Deployment status' })
    fireEvent.click(within(deploymentRegion).getByRole('button', { name: 'Reconnect' }))
    expect(await within(deploymentRegion).findByText('Loading…')).toBeVisible()
    await writer.write({
      data: { deploymentStopped: false, id: 'deployment-1', status: 'unknown' },
      type: 'snapshot',
    })

    expect(await screen.findByRole('status', { name: 'Deployment status' })).toHaveTextContent(
      'Unknown',
    )
    await writer.close()
  })
})
