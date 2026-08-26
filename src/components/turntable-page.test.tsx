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
import { type SelectionSearch, selectionSearchSchema } from '@/selection/schema'
import { maximumSessionTokenByteLength, type SessionState } from '@/session/schema'
import {
  createRailwayEnvironment,
  createRailwayProject,
  createRailwayService,
  testRailwayToken,
} from '@/test/railway'

const {
  connectToRailwayMock,
  disconnectFromRailwayMock,
  readCurrentDeploymentMock,
  readEnvironmentsMock,
  readProjectsMock,
  readServicesMock,
} = vi.hoisted(() => ({
  connectToRailwayMock: vi.fn(),
  disconnectFromRailwayMock: vi.fn(),
  readCurrentDeploymentMock: vi.fn(),
  readEnvironmentsMock: vi.fn(),
  readProjectsMock: vi.fn(),
  readServicesMock: vi.fn(),
}))

vi.mock('@/session/connect-to-railway', () => ({
  connectToRailway: connectToRailwayMock,
}))
vi.mock('@/session/disconnect-from-railway', () => ({
  disconnectFromRailway: disconnectFromRailwayMock,
}))
vi.mock('@/deployment/read-current-deployment', () => ({
  readCurrentDeployment: readCurrentDeploymentMock,
}))
vi.mock('@/selection/read-environments', () => ({ readEnvironments: readEnvironmentsMock }))
vi.mock('@/selection/read-projects', () => ({ readProjects: readProjectsMock }))
vi.mock('@/selection/read-services', () => ({ readServices: readServicesMock }))
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
    defaultOptions: { mutations: { retry: false } },
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

async function selectOption(name: string, value: string) {
  const picker = await screen.findByRole('combobox', { name })
  await waitFor(() => expect(picker).toBeEnabled())
  fireEvent.change(picker, { target: { value } })
}

async function expectSearch(page: ReturnType<typeof renderTurntablePage>, search: SelectionSearch) {
  await waitFor(() => expect(page.router.state.location.search).toEqual(search))
}

beforeEach(() => {
  connectToRailwayMock.mockReset()
  disconnectFromRailwayMock.mockReset()
  readCurrentDeploymentMock.mockReset().mockResolvedValue(null)
  readEnvironmentsMock.mockReset().mockResolvedValue([createRailwayEnvironment()])
  readProjectsMock
    .mockReset()
    .mockResolvedValue([createRailwayProject(), createRailwayProject({ id: 'project-2' })])
  readServicesMock.mockReset().mockResolvedValue([createRailwayService()])
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

    expect(await screen.findByRole('button', { name: 'Connecting...' })).toBeDisabled()
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
    readProjectsMock.mockReturnValue(new Promise(() => undefined))
    renderTurntablePage({ sessionState: 'authenticated' })
    expect(await screen.findByRole('status', { name: 'Selection status' })).toHaveTextContent(
      'Loading projects.',
    )
  })

  it('groups names for display and stores IDs in the URL', async () => {
    const project = createRailwayProject({ name: 'Beta' })
    const environment = createRailwayEnvironment({ id: 'environment-2', name: 'Staging' })
    const service = createRailwayService({ id: 'service-2', name: 'Worker' })
    const workspace = { id: 'workspace-2', name: 'Zulu' }
    readProjectsMock.mockResolvedValue([
      createRailwayProject({ id: 'project-2', name: 'Alpha', workspace }),
      createRailwayProject({ id: 'project-3', name: 'Beta' }),
      createRailwayProject({ id: 'project-4', name: 'Aardvark' }),
      project,
    ])
    readEnvironmentsMock.mockResolvedValue([createRailwayEnvironment(), environment])
    readServicesMock.mockResolvedValue([createRailwayService(), service])
    const page = renderTurntablePage({ sessionState: 'authenticated' })
    await selectOption('Project', project.id)
    await selectOption('Environment', environment.id)
    await selectOption('Service', service.id)
    await expectSearch(page, {
      environmentId: environment.id,
      projectId: project.id,
      serviceId: service.id,
    })
    const groups = screen.getAllByRole('group')
    expect(groups.map((group) => group.getAttribute('label'))).toEqual([
      'Railway workspace',
      'Zulu',
    ])
    expect(
      within(screen.getByRole('group', { name: 'Railway workspace' }))
        .getAllByRole('option')
        .map((option) => option.getAttribute('value')),
    ).toEqual(['project-4', 'project-1', 'project-3'])
  })

  it('preselects stable IDs and restores them after a reload', async () => {
    const project = createRailwayProject()
    const environment = createRailwayEnvironment()
    const service = createRailwayService()
    readProjectsMock.mockResolvedValue([project])
    readEnvironmentsMock.mockResolvedValue([
      environment,
      createRailwayEnvironment({ id: 'environment-2' }),
    ])
    readServicesMock.mockResolvedValue([service])
    const first = renderTurntablePage({ sessionState: 'authenticated' })
    await expectSearch(first, {
      environmentId: environment.id,
      projectId: project.id,
      serviceId: service.id,
    })
    const url = first.router.state.location.href
    first.unmount()
    renderTurntablePage({ initialEntry: url, sessionState: 'authenticated' })
    const servicePicker = await screen.findByRole('combobox', { name: 'Service' })
    await waitFor(() => expect(servicePicker).toHaveValue(service.id))
  })

  it.each([
    ['Environment', []],
    ['Service', [createRailwayEnvironment()]],
  ])('shows an empty %s picker after its parent resolves', async (label, environments) => {
    readEnvironmentsMock.mockResolvedValue(environments)
    readServicesMock.mockResolvedValue([])
    renderTurntablePage({ initialEntry: '/?projectId=project-1', sessionState: 'authenticated' })

    const picker = await screen.findByRole('combobox', { name: label })
    await waitFor(() => expect(picker).toHaveDisplayValue(`No ${label.toLowerCase()}s`))
  })

  it.each([
    ['project', '/?projectId=missing'],
    ['environment', '/?projectId=project-1&environmentId=missing'],
    ['service', '/?projectId=project-1&environmentId=environment-1&serviceId=missing'],
  ])('keeps a stale %s ID until the user replaces it', async (level, initialEntry) => {
    const { router } = renderTurntablePage({ initialEntry, sessionState: 'authenticated' })

    const status = await screen.findByRole('status', { name: 'Selection status' })
    await waitFor(() =>
      expect(status).toHaveTextContent(`selected ${level} is no longer available`),
    )
    expect(router.state.location.href).toContain(`${level}Id=missing`)
  })

  it('shows and retries a safe error', async () => {
    const message = 'Railway could not load choices.'
    readProjectsMock.mockRejectedValueOnce(new Error(message)).mockResolvedValueOnce([])
    renderTurntablePage({ sessionState: 'authenticated' })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('combobox', { name: 'Project' })).toHaveDisplayValue(
      'No projects',
    )
  })
})

describe('deployment status', () => {
  const selectedTargetUrl = '/?projectId=project-1&environmentId=environment-1&serviceId=service-1'
  const renderStatus = () =>
    renderTurntablePage({ initialEntry: selectedTargetUrl, sessionState: 'authenticated' })

  it.each([
    [{ id: 'deployment-private-id', status: 'NEEDS_APPROVAL' }, 'Status: Needs approval.'],
    [null, 'No deployment.'],
  ])('shows the resolved deployment state', async (result, text) => {
    readCurrentDeploymentMock.mockResolvedValue(result)
    renderStatus()

    const deploymentStatus = await screen.findByRole('status', { name: 'Deployment status' })
    await waitFor(() => expect(deploymentStatus).toHaveTextContent(text))
    expect(screen.queryByText('deployment-private-id')).not.toBeInTheDocument()
  })

  it('shows the loading state', async () => {
    readCurrentDeploymentMock.mockReturnValueOnce(new Promise(() => undefined))
    renderStatus()

    expect(await screen.findByRole('status', { name: 'Deployment status' })).toHaveTextContent(
      'Loading deployment.',
    )
  })

  it('retries an error and maps an unknown status', async () => {
    readCurrentDeploymentMock
      .mockRejectedValueOnce(new Error('Railway could not load the deployment.'))
      .mockResolvedValueOnce({ id: 'deployment-1', status: 'unknown' })
    renderStatus()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Railway could not load the deployment.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry deployment status' }))

    expect(await screen.findByRole('status', { name: 'Deployment status' })).toHaveTextContent(
      'Status: Unknown.',
    )
  })
})
