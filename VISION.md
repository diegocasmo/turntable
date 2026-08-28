# Turntable: vision

## What

Turntable is a web application that starts and stops containers on
[Railway](https://railway.com). A railway turntable moves locomotives between tracks. This
application moves Railway services between running and stopped states.

A user gives a Railway API token. The user then does these tasks:

1. Select a project.
2. Select an environment.
3. See the services and their current statuses.
4. Spin a service down.
5. Spin a service up again.

## Why

Three goals shape the product:

1. Correct actions. Turntable uses the same Railway operations as the Railway CLI.
2. Clear targets. The route contains each selected parent ID.
3. Token safety. The browser does not keep the plaintext token after it connects.

## Product scope

The service must already exist. Turntable does not create or delete a service.

Turntable does not open a stream for each service. The Services page reads one collection. It reads
that collection every 5 seconds while an accepted action is not visible or Railway reports at
least one transitional deployment. It stops after the action appears, all shown deployments are
stable, or the user leaves the route.

This rule avoids one stream or poll loop for every visible service. It also lets all visible
services share one scoped request.

## Route flow

Selection uses these routes:

```text
/projects
/projects/:projectId/environments
/projects/:projectId/environments/:environmentId/services
```

Railway IDs are stable path parameters. The current card search uses `q`. Each page owns its own
search. A card link does not carry the previous page search into the next route.

The Services route is the last product route. There is no service detail page.

Each route validates its parent IDs in order. A missing project returns the user to `/projects`. A
missing environment returns the user to that project's Environment page. A network error stays an
error. It does not prove that an entity is missing.

## Selection data

Each route reads the collection that it shows. A dependent route also reads only the selected
parent records that it needs for path validation and breadcrumb names:

| Route | Railway read |
| --- | --- |
| Projects | accessible workspaces, then projects in each workspace |
| Environments | selected project, then environments for that project |
| Services | selected project and environment, then service instances for that environment |

The project read uses `apiToken { workspaces { id } }`. This works for account and workspace tokens.
A workspace token cannot use `me { workspaces }`.

The Services read asks each `ServiceInstance` for `latestDeployment { id status }`. It does not read
deployment history. Railway returns `null` for `latestDeployment` after Spin down. Turntable then
shows `No active deployment`. This is an active-service snapshot, not a deployment history view.

All collection reads follow Railway pagination. Independent workspace project reads run in
parallel. [The query-key registry](./src/query-keys.ts) includes each required parent ID.

Route loaders use `ensureQueryData`. Route components use the same query options. This lets one
request serve the loader and component. A loader first reuses a positive selected parent from a
cached collection. A cold deep link reads the project or environment by ID instead of reading an
unrelated parent collection. The loader returns the parent names for the breadcrumbs.

Search filters the fetched collection in the browser with `fuzzysort`. It does not make another
Railway request. The search input and cards do not keep a second copy of route state.

## Container actions

In Railway, a deployment is the running container. Turntable maps actions to the operations that
the Railway CLI uses:

| Action | GraphQL operation | Rule |
| --- | --- | --- |
| Spin down | `deploymentRemove` | The shown deployment status must be exactly `SUCCESS`. |
| Spin up | `serviceInstanceDeployV2` | The service exists in the selected environment. |

The action sources are Railway CLI
[`down.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/down.rs)
and
[`redeploy.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/redeploy.rs).

The current Railway CLI `up` command waits for a terminal deployment status in attached mode. Its
detached mode returns after Railway queues the build. Turntable uses the same distinction between
an accepted action and a completed deployment. It keeps the dialog pending only for the action
request. The service card then shows Railway's current status.

Both actions need confirmation. A pending mutation disables duplicate submission. A failed
mutation stays visible in the confirmation dialog. After success, Turntable invalidates only the
selected project and environment Services query. It does not guess the next status. The query keeps
reading while the accepted action is not visible or Railway reports a transitional status. It
stops when the action appears and all shown statuses are stable.

Railway has 13 known deployment statuses in the committed schema. One function maps each status to
a badge. An unknown status maps to `Unknown` and does not crash the page.

## State ownership

TanStack Router owns path parameters and the validated `q` search parameter. TanStack Query owns
server data and mutation state. TanStack Form owns token form state. Components derive filtered
cards during render. The application has no global state for route or server data.

The application does not use `useEffect` to copy state between these owners.

## Token and session safety

The token form and its request hold the plaintext token while the form is visible. After a valid
connection, the form unmounts and the mutation leaves the Query cache. The browser then keeps only
an encrypted, `HttpOnly` session cookie.

The cookie is `__Host-turntable`. It uses `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/`. The
session has an absolute one-hour lifetime. Sign out deletes the cookie in that browser and clears
the client query cache.

Every state-changing server function checks `Origin` against `APP_ORIGIN`. Every response uses the
security headers in [src/security-headers.ts](./src/security-headers.ts). Railway production
requests accept Railway's HTTPS API host only.

## Framework and API boundaries

Turntable uses the pinned TanStack Start, Router, and Query versions in
[package.json](./package.json). Server reads and commands use TanStack Start server functions.

Each GraphQL operation uses one gql.tada `graphql()` document. The committed Railway schema checks
the operations during type checking. The Railway client checks transport errors, GraphQL errors,
missing data, and null data before it returns a successful value.

Zod validates response envelopes and domain values at the boundary. The application never logs a
request body. It redacts authorization and cookie headers in every log path.

## User interface

Every selection page keeps this order:

1. Breadcrumbs.
2. Page heading.
3. Refresh action.
4. Search input.
5. Card grid.
6. Loading, empty, no-results, or error feedback when needed.

Project and Environment cards are links. Service cards are not navigation controls. Each Service
card shows its status and a stable action area. Spin up and Spin down are direct text buttons. Spin
down is available only when the exact status allows it. There is no service Refresh action.

The page-level Refresh action reads the visible collection again. Dependent pages first read their
selected parent records again. A successful not-found result returns the user to the nearest valid
collection route. A failed read stays on the current route and shows the error.

Sign out is in the application header. The shell uses CSS to fill at least the dynamic viewport
height. Content can grow and scroll when the card list is long.

The interface uses semantic HTML, visible focus, labelled controls, and polite
status messages. Biome checks accessibility rules.

## Tests

Vitest covers route validation, card search, navigation, server reads, action rules, loading, and
failures. Tests query the user interface by role and accessible name.

`pnpm test:e2e` drives one real Railway target. It selects the target through the route flow and
runs both lifecycle actions. Test cleanup starts the shared target and polls the exact returned
deployment at 1, 2, 4, and then 5 second intervals. Cleanup stops after two minutes or at a terminal
failure state. Application polling is limited to the Services collection while an accepted action
is not visible or a shown deployment is transitional.

## Cut line

The product is complete when one user can do these tasks on the deployed application:

1. Paste a token.
2. Select a project and environment.
3. Search the service cards.
4. See each active deployment status.
5. Spin a service down.
6. Spin a service up again.

## Future work

1. Login with Railway OAuth instead of a pasted token.
2. Support project tokens.
3. Add pagination or server search if real collection sizes require them.
4. Add a supported service-wide live signal if Railway provides one.
