# Turntable: vision

## What

Turntable is a web application that starts and stops containers on [Railway](https://railway.com). A railway turntable is the machine that turns locomotives and puts them in the roundhouse. This application does the same with containers.

A user gives a Railway API token. Then the user picks a project, an environment, and a service. Then the user controls one container:

1. See the deployment status, live.
2. Spin the container down.
3. Spin the container up again.

More than one user can watch the same service. Each user brings an own token. Both screens follow the same container, and both see each change.

## Why

Three goals shape every decision in this document:

1. Correct semantics. The application must use the API operations that Railway itself uses for "up" and "down".
2. Pushed state. Every open screen must show the true state, live, without polls.
3. Token safety. The browser must not keep the plaintext token after it connects.

## Verified facts

This document states measured facts. A person ran each measurement against the live API on 2026-08-21, except for the token-scope measurements from 2026-08-25. The conformance script in "Tests" repeats them. Two claims stay unverified, and both say so where they appear.

The Railway CLI is the second source. Every link to it points at commit [`3efce83`](https://github.com/railwayapp/cli/tree/3efce83e618a158b16de8eed3a9e1f4f2e585d80). The CLI moves fast, so `master` is not a stable citation.

## Scope

The cut line below names the complete product. The `Optional` milestone in the [issues](https://github.com/diegocasmo/turntable/issues) names the work that we drop first when time is short: logs, the visual theme, and command-progress polish.

The core path never gets cut. A user pastes a token. The user picks a project, an environment, and a service. The user watches the status live. The user spins the container down and spins it up again. All of this works on the deployed application.

The service must already exist. A user makes it in the Railway dashboard. Turntable does not create or delete a service. Reason: this product starts and stops a container. Create and delete are a different job, and each one adds a destructive path to guard.

Turntable also does not build three things:

1. Accounts of our own. Railway already owns the identity.
2. Many services on one screen. That is a dashboard, not a control.
3. More than one server replica. "Two users, one service" explains what this costs.

## How

Each decision below gives the choice, the reason, and the trade-off. Each claim points to its source.

### A container is a deployment

In the Railway model, a service holds configuration. A deployment is the running container. The source is the [Manage Services guide](https://docs.railway.com/integrations/api/manage-services).

Turntable maps each action to the operation that Railway's own CLI uses:

| Action | GraphQL operation | Source of truth |
| --- | --- | --- |
| Spin down | `deploymentRemove` | [`down.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/down.rs) |
| Spin up again | `serviceInstanceDeployV2` | [`redeploy.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/redeploy.rs) |

Railway has two different "up" operations, and the difference matters:

- `deploymentRedeploy(id)` acts on one deployment. It needs that deployment to be alive. `redeploy.rs` refuses it when `Deployment.canRedeploy` is false.
- `serviceInstanceDeployV2(environmentId, serviceId)` acts on the service. It needs no deployment at all. `redeploy.rs` uses this path for `--from-source` and skips the flag.

Turntable uses `serviceInstanceDeployV2`. Measured: it starts a new container when the last deployment is `REMOVED`. `deploymentRedeploy` cannot do that.

Trade-off: `deploymentStop` stops a deployment, but it does not mark it removed. Only `deploymentRemove` gives the state that `railway down` gives: the container is gone, the configuration stays. The source is the [deployment reference](https://docs.railway.com/deployments/reference#remove).

### Selecting a service

The application reads `apiToken { workspaces { id } }`. It then reads `projects(workspaceId)` for each workspace and follows Railway's cursor pages until it has every project. Each project carries `workspace { id name }`, so the screen shows the workspace as a label.

The application never calls `me`. Measured on 2026-08-25: both an account token and a workspace token return their accessible workspaces through `apiToken` and return projects through `projects(workspaceId)`. A workspace token gets "Not Authorized" from `me`, so `me { workspaces }` cannot provide the shared path.

Three pickers follow: project, environment, and service. Each picker stays visible. This keeps the selected target clear and lets the user change it. The application preselects the only choice at a level.

Two details come from the schema:

1. The environment picker preselects `Project.primaryEnvironmentId`. There is no field named `defaultEnvironment`.
2. The service list comes from `Environment.serviceInstances`. Each `ServiceInstance` carries `serviceId` and `serviceName`. `Project.services` cannot answer this, because the `Service` type holds no environment.

The route holds the project ID, environment ID, and service ID. A reload keeps the choice.

### Deployment identity

The status subscription needs a deployment ID. Each "spin up again" makes a new deployment with a new ID. Every screen must find the current ID, also after a reload.

Decision: the stable key is the pair of service ID and environment ID. One server-side read turns this key into the current deployment ID. It queries `deployments`, with `projectId`, `environmentId`, and `serviceId` in `DeploymentListInput`. It sorts by `createdAt`, descending, and takes the newest.

This is the query that the CLI uses for the same question. See `get_latest_deployment_id` in [`mcp/handler.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/mcp/handler.rs).

Why not `ServiceInstance.latestDeployment`: measured, it returns null after a spin-down. The application would then lose the container that it just stopped. The CLI treats that field as a display fallback only, and says so in a comment in [`service_summary.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/commands/output/service_summary.rs).

Unverified: Railway does not document the order of `deployments`. The CLI takes the first edge in one place and sorts in another. Turntable sorts, because a sort costs one line and a wrong order points the screen at a dead container.

There is no retry and no deadline. Three measurements remove the need:

1. `serviceInstanceDeployV2` returns the new deployment ID. Turntable subscribes to that ID at once. A subscribe with no delay works.
2. The new deployment is readable at once, and the list holds it as the newest at once.
3. A removed deployment stays in the list. So the list is never empty after a spin-down.

An empty list means that the service has never deployed. That is a real screen state, and it still allows "spin up again".

### Live data comes from subscriptions, not polls

Decision: the server holds GraphQL subscriptions to Railway over WebSocket, with the `graphql-transport-ws` protocol.

The [API documentation](https://docs.railway.com/integrations/api) does not list subscriptions. Two primary sources prove that they exist:

1. Introspection of `https://backboard.railway.com/graphql/v2` is open and needs no token. The `Subscription` type has 12 fields, and they include `deployment`. You can verify this in [GraphiQL](https://railway.com/graphiql).
2. The CLI subscribes over `wss://backboard.railway.com/graphql/v2`. The source is [`subscription.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/subscription.rs).

The upstream socket must send the token as an `authorization: Bearer` header on the upgrade request. The CLI sets the same header in `subscription.rs`.

This needs no WebSocket package. Node gives a global `WebSocket` client, and it accepts a `headers` option. `graphql-ws` calls `new WebSocketImpl(url, protocol)` with two arguments only. So a small subclass supplies the header and passes the protocol through.

A missing header fails in silence. Measured: an unauthenticated subscribe gets `connection_ack`, and then nothing. There is no error and no close. Therefore a test must assert that a real event arrives. A test that only opens the socket proves nothing.

One open screen gets one upstream subscription. Screens do not share a connection. Two screens of one user therefore hold two sockets.

Trade-off: this costs one socket per open screen. It removes a shared registry, reference counts, and eviction timers. It also makes the lifetime of a subscription exactly the lifetime of one request. A shared upstream is the first thing to add if the screen count per user ever grows.

Why not poll: polls add latency, burn the [rate limit](https://docs.railway.com/integrations/api), and show stale state between ticks.

### Errors come in two layers

Railway answers almost every failure with HTTP 200 and a GraphQL `errors` array. This is normal for GraphQL: the transport worked and the operation failed. So the server must not classify on the status code alone.

Measured behavior:

| Request | Status | Body |
| --- | --- | --- |
| Bad token on a query | 200 | `Not Authorized` |
| Unauthenticated mutation | 200 | `Deployment not found` |
| Malformed JSON | 400 | A message with no `errors` array |
| Missing `query` field | 400 | `Problem processing request` |
| Wrong path | 404 | `Not Found`, as `text/plain` |

`extensions.code` is `INTERNAL_SERVER_ERROR` for every runtime failure, so it carries no information.

Layer 1 reads the transport:

1. Status 429 means the rate limit. The server reads `Retry-After` as whole seconds. The CLI parses the same form in [`client.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/client.rs).
2. Any other status outside 200 means a broken request from us. The server logs it and shows a generic failure. A 400 or a 404 is a build fault, not a user state.

Layer 2 reads the body:

1. Zod parses the response body. It must also accept a body that is not GraphQL, because the 400 case has no `errors` array.
2. A non-empty `errors` array stops the work. The screen shows Railway's own message.
3. A request that uses the stored token and gets a message that contains "not authorized" ends the browser session. The server deletes the session cookie and redirects the browser to the current URL with a full document load. The new document has a new client cache, and the initial session read shows the normal token form. This is a hint only. Measured, an auth failure can also read "Deployment not found", so the text is never the only test of a live session.
4. A request from the token form does not use this rule. It shows the Railway error and keeps the form open.

The CLI matches message text in the same way, and `errors.rs` says in a comment that the match is fragile. A test pins our one string, as `errors.rs` does for its own.

### The stored token is readable only on the server

Decision: the user pastes a token once. The server verifies it against Railway. Then the server puts the token in an authenticated encrypted session. It sends that session as one cookie value.

Turntable uses the public [TanStack Start session API](https://tanstack.com/start/latest/docs/framework/react/guide/authentication#2-session-management). TanStack Start uses H3 to seal the session, verify it, and manage its cookie. The framework owns the wire format. Turntable owns only the session data and the security settings.

`SESSION_SECRET` holds 32 random bytes in base64. The server rejects a secret of the wrong size at startup.

The cookie is `__Host-turntable`, with `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and no `Domain`. The `__Host-` prefix requires `Secure`, `Path=/`, and no `Domain` ([Set-Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)). Turntable also sets `HttpOnly` and `SameSite=Strict`, which the prefix does not require. H3 sets both `Max-Age` and `Expires`.

The server rejects a token above 512 bytes in UTF-8. A session test checks the full cookie against the 4 KB browser limit ([cookie guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)).

The lifetime is one absolute hour, in the sealed session and in the cookie expiry. There is no renewal. The server checks the expiry on every request. Every stream also closes at the earlier of the session expiry and its own 14-minute limit. A cookie expiry cannot close an open response by itself, so the stream owns that timer.

The form asks for a Railway API token ([tokens page](https://railway.com/account/tokens)). Turntable accepts account tokens and workspace tokens. Measured on 2026-08-25: both token types list projects through the shared workspace path. Railway documents that both use the `authorization: Bearer` header. A workspace token also runs both life-cycle mutations and holds a subscription with this header. A project token uses the `Project-Access-Token` header instead, and Turntable does not support it. That is future work.

The form and its request hold the plaintext token while the form is visible. The application never persists or logs it. After a successful connection, the form unmounts and its mutation leaves the Query cache. The encrypted session cookie is then the only browser copy.

Why: a Railway token can control many resources ([token docs](https://docs.railway.com/integrations/api)). Browser JavaScript can never read an `httpOnly` cookie, so script injection cannot steal the token. The client holds only ciphertext, so a copy of the cookie store does not give the token.

Two honest limits:

1. A copied cookie still works until it expires. So the lifetime is short, and a rotation of `SESSION_SECRET` ends every new request at once. Existing streams end when the process restarts.
2. Logout deletes the cookie in that browser. It cannot delete a copy. The control says that it signs out this browser.

Alternatives considered:

- Compact JWE through `jose`: it gives Turntable direct control of a standard encrypted format. No current consumer needs a framework-independent format. It duplicates the session support in the selected framework. Rejected.
- A private Web Crypto format: Turntable would own the format and its parser. The selected framework already provides an authenticated encrypted session. Rejected.
- Token in `localStorage`: readable by any injected script. Rejected.
- Raw token in the cookie: simpler, but a copy of the cookie store gives the token itself. Rejected.
- Token in a server-side session store: it gives true logout revocation. An in-memory store loses every session on each restart. A persistent store adds infrastructure that this project does not need. Rejected.
- Token in a server environment variable: safe, but single-tenant. Other users could not connect their own accounts. Rejected.
- [Login with Railway (OAuth)](https://docs.railway.com/integrations/oauth): the strongest option, with short-lived tokens. It needs app registration and refresh handling. Out of scope now, first item of future work. Railway's own CLI now stores a one-hour access token and a refresh token, so this is the direction that Railway itself takes.

### Web security model

The session cookie alone is not a full defense. The application also does this:

1. Every state-changing server function or route compares the `Origin` header to `APP_ORIGIN`. A different origin, a missing origin, or a malformed origin gets status 403. `APP_ORIGIN` is configuration, and the server validates it at startup. The check never reads the `Host` header, because a client controls that header.
2. Every response carries a Content-Security-Policy with a random nonce for that request. The policy allows scripts with that nonce only, and it includes `frame-ancestors 'none'`. The nonce goes through the framework's server-side render option, so the page still hydrates. TanStack keeps [CSP tests](https://github.com/TanStack/router/blob/main/e2e/react-start/csp/tests/csp.spec.ts) for this path.
3. Responses also carry `Referrer-Policy` and `X-Content-Type-Options`. Authenticated responses carry `Cache-Control: no-store`.
4. The upstream API address is configuration. Production and tests that call Railway accept Railway's own address only. Reason: a wrong value sends every user's token to another host, and the screen shows no symptom.
5. An expired or invalid session returns the expired session state to the application. The application then shows the token form. The event stream answers differently, and "Browser transport" explains why.

### Browser transport: Server-Sent Events

The server must speak WebSocket to Railway. That leg is fixed. The browser leg is a choice.

Decision: one Server-Sent Events (SSE) stream per screen. Commands use TanStack Start server functions.

Why: the data flow is one-directional. `EventSource` is in every browser, and it reconnects by itself ([HTML specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)). A WebSocket client must implement its own reconnect loop.

Each stream starts with a recovery contract:

1. The server subscribes upstream first. It holds the arriving events in a buffer.
2. Then it reads one snapshot of the deployment. It sends the snapshot as the first event.
3. Then it drains the buffer. It applies every buffered event in arrival order. Later events follow in arrival order too. The last event wins.

Step 1 closes the gap where a change happens between the snapshot and the subscription. Arrival order is enough, and two measurements say why:

1. Railway pushes only when the status changes.
2. Railway does not replay the current state to a new subscriber. A subscribe to a stable deployment produced nothing for 8 seconds.

So a pushed event can never carry a state older than the snapshot, and the snapshot is needed because no replay arrives.

There is no timestamp to compare. Measured: `statusUpdatedAt` is null on every subscription payload, although the query path fills it. Railway's own CLI does not ask for it either. Its whole status subscription is `id`, `status`, and `deploymentStopped`.

The upstream client makes no retry of its own. `graphql-ws` retries five times by default ([client options](https://the-guild.dev/graphql/ws/docs/client/interfaces/ClientOptions)). Turntable sets `retryAttempts` to 0, so one reconnect loop exists in the whole system.

Once a stream is open, the route always answers 200. `EventSource` cannot read a status code: a non-200 answer fails the connection, fires an opaque error, and never reconnects. So the route reports every failure as a named event instead:

| Event | Meaning | The client then |
| --- | --- | --- |
| `snapshot` | the current state | renders it |
| `status` | a status change | renders it |
| `disconnected` | a retryable failure | lets the browser reconnect |
| `session-expired` | the session ended | closes the stream, shows the token form |
| `gone` | the service or deployment is unreachable | closes the stream, shows the gone state |

The client calls `close()` on a terminal event. Without that call the browser reconnects, the server fails again at once, and the loop never ends.

The client owns the retry budget, and it copies the CLI's policy in [`deployment.rs`](https://github.com/railwayapp/cli/blob/3efce83e618a158b16de8eed3a9e1f4f2e585d80/src/controllers/deployment.rs): a delay from 1 second, multiplied by 1.5, capped at 8 seconds, and 12 attempts. A stream that stays up for 30 seconds resets the count. After the last attempt the screen shows an error with a reconnect control. The browser's own default is a fixed 3-second retry with no cap. That default turns one broken upstream into a permanent drain on the user's rate limit.

The stream also sends a comment every 30 seconds. It closes at the earlier of 14 minutes and the session expiry. Railway needs traffic every five minutes and ends a request at 15 minutes ([SSE guide](https://docs.railway.com/guides/sse-vs-websockets)).

Recovery needs no replay, because every connection begins with a snapshot. The server sends no `id` field, and it ignores `Last-Event-ID`.

Alternatives considered:

- WebSocket passthrough: it needs custom server wiring, and no feature needs a second direction. Rejected.
- [graphql-sse](https://the-guild.dev/graphql/sse): the same wire with a protocol library on both ends. It is the upgrade path if the subscription types grow.

### Two users, one service

More than one authorized user can watch the same service. Each user pastes an own token, and every read runs with that user's token.

A spin-down converges by itself. Both screens subscribe to the same deployment ID, and Railway pushes to both. Measured: `SUCCESS`, then `REMOVING`, then `REMOVED`, on every subscriber.

A spin-up-again does not converge by itself. It makes a new deployment with a new ID. The public API has no service-wide status subscription. All 12 subscription fields prove this: `deployment` and `deploymentEvents` take one deployment ID, and the fields that take an environment or a service carry logs, not status.

Decision: the application carries the signal itself. One in-memory map holds the open streams, keyed by environment ID and service ID. A command that returns a new deployment ID notifies every stream on that key. Each notified stream then subscribes to the new ID and reads it once, to seed the badge.

Each stream uses its own token for both calls, so no session borrows another session's access. A stream joins the map only after it parses one real `Deployment` payload. The map drops an entry on a dead session, a terminal event, and a close.

Cost: two Railway calls per watching screen, once per spin-up. This is small because there is no retry loop. A screen also shows a notice when its watched deployment changes. A user then knows that the container is a new one.

Two limits:

1. This works while the server runs one replica. A second replica holds a second map, and a command on one replica cannot reach a stream on the other. The Railway service therefore pins the replica count to one.
2. A deployment that starts outside this application produces no signal. This includes a deploy from the Railway dashboard. The refresh control covers that case, and it is the only cover. Unverified: no supported API signal for an external deploy is known.

The refresh control re-reads the newest deployment and moves the subscription. The CLI makes the same trade-off. It re-queries on demand, and it has no loop that waits for a new deployment ID.

One rule holds in every case: a client never derives state from its own actions. A click sends a request. A failed mutation shows a toast. The stream reconciles the screen.

### Action policy

Railway has 13 deployment statuses today. Turntable does not gate its actions on a grouping of them. It copies the narrow gates that the CLI uses, because a wrong grouping would authorize a destructive call.

| Action | Gate | Source |
| --- | --- | --- |
| Spin down | the status is exactly `SUCCESS` | `down.rs` filters to `SUCCESS` before `deploymentRemove` |
| Spin up again | none from the deployment | `serviceInstanceDeployV2` needs no deployment |

Turntable offers "spin up again" when the container is not running. That is a choice about clarity, not about safety: the mutation also works on a running container, and it then replaces it.

Both actions ask for confirmation first. Every destructive CLI command does the same, and it refuses to run without a confirmation or an explicit flag. See `down.rs`, `restart.rs`, and `redeploy.rs`.

The 13 statuses still have a job. One function maps a status to a badge colour and a badge text, and an unknown value maps to "unknown". A wrong badge is a cosmetic fault. A new Railway status therefore needs a colour, not a safety review.

Two rules bound the policy:

1. Every command server function resolves the current state again on the server, checks the gate, and compares the expected deployment ID. A stale screen cannot act. One command per service runs at a time, and the gate holds until the command returns.
2. The server parses the full GraphQL response, including the `errors` array ([GraphQL specification](https://spec.graphql.org/September2025/#sec-Response)). It never retries a mutation by itself after an unclear answer, because a repeat of a destructive call can act twice.

### State ownership

TanStack Query owns server state and asynchronous action state. Mutations give `isPending` and `error` states for the buttons, and the action policy gives the enabled state. TanStack Form owns form values and field errors. The token form and its server function use the same zod input schema. Components only render these states. No component contains `useEffect`. No other state library exists in the project.

The data layer wraps one `EventSource` as an `AsyncIterable`, and TanStack Query's [`streamedQuery`](https://tanstack.com/query/latest/docs/reference/streamedQuery) consumes it. Query starts the stream with the first subscriber, and it ends the stream through its `AbortSignal` with the last.

The stream query sets `staleTime: Infinity` and `retry: false`. It refetches on no event: not on mount, not on focus, and not on network reconnect. The reconnect logic in "Browser transport" is the only recovery path, so a second one would fight it.

The status reducer replaces the snapshot on each event, because the default reducer appends. TanStack marks `streamedQuery` experimental. The pinned version contains that risk.

### Framework: TanStack Start

The application needs four things from a framework: typed server functions for internal reads and commands, a raw server route for the event stream, cookie handling, and a page that updates often in the browser. The initial session state loads on the server. A reload therefore keeps a valid session without exposing the stored token to browser JavaScript.

Decision: [TanStack Start](https://tanstack.com/start/latest), pinned to one exact version. TanStack labels Start a release candidate. The pinned version never changes during the project.

The framework wins on three points. Its [server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions) provide typed internal calls and zod input validation. Its raw server routes return standard `Response` objects for protocols such as SSE. It supports the nonce path that the security policy above needs.

[Nitro](https://nitro.build) is the production adapter for Railway. The [TanStack Start hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) tells Railway applications to use Nitro and gives the Vite plugin setup. `package.json` is the source for the pinned version and the production start command.

Trade-off: the guide marks the `nitro/vite` plugin as under active development. The exact version keeps builds stable. The production smoke test starts the generated server and requests the application page before a change can merge.

The pinned version needs Node 22.12 or later. The repository pins that Node version in `engines`, in `.nvmrc`, and in CI.

Alternatives considered:

- Next.js: stable and the largest ecosystem. But its extra machinery buys nothing here.
- React Router v7: stable and capable, but its end-to-end typing is weaker.

### Types: one schema snapshot and one operation

Decision: [gql.tada](https://gql-tada.0no.co/) with a committed SDL snapshot of the Railway schema. Its [`generate-schema`](https://gql-tada.0no.co/reference/gql-tada-cli#generate-schema) command syncs the snapshot. Its TypeScript plug-in checks each `graphql()` document and infers its result and variables from that document. [Buffer Publish](https://github.com/bufferapp/buffer-mono/pull/23907) uses the same operation model and removed its old GraphQL Code Generator operation imports.

The guards, one per layer:

1. Compile time: `gql-tada check` validates every operation against the committed schema. A removed field is a build error. This check needs no network.
2. Run time: zod validates the response body, including bodies that are not GraphQL. After the client rejects GraphQL errors and missing or null data, it trusts Railway to return the successful field shape that the checked operation requests. The client keeps that one type assertion at this boundary.

There is no job that watches the live schema. Railway owns the schema, and this project cannot fix a change in it. A generated test cannot fail on a status that Railway added, because the generated enum comes from the committed file. So the conformance script below compares the live status list with the committed one, and a person runs it when the answer is useful.

Alternative considered: GraphQL Code Generator can create the same schema snapshot and operation types. gql.tada already creates the snapshot and checks the operations. Keeping Codegen would add three direct dependencies and two configuration files without a separate job.

### Tests: injected states, one real end-to-end path

Decision: unit, component, client, server action, and route tests inject HTTP responses and WebSocket events at the client boundary. They can produce errors and status sequences on demand. They do not need a token or a fake Railway server. Vitest covers these tests.

`pnpm test:e2e` is the only end-to-end command. Playwright drives Turntable against the configured real Railway project, environment, and service. A local run uses the `local` target. Trusted CI uses the `ci` target. Fork pull requests do not get the token and skip this test.

The end-to-end test pastes the token, selects the target, reads the live status, spins the container down, and spins it up again. It checks the live stream and the user interface. It restores the target in a `finally` block. CI serializes the test because each run changes the same service. The test also compares the live status list with the committed schema. [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) scans the rendered application.

A short manual list drives the deployed application through the same cycle. This check covers the public deployment configuration, which a server started from the test branch cannot cover. It is a required step.

The boundary is deliberate. Injected tests make failure states exact and repeatable. The one real end-to-end path finds faults between the browser, Turntable, and Railway. Fixed targets and serial use bound cost and state conflicts.

### User interface

Tailwind CSS with shadcn/ui components, plus a hand-made `StatusBadge`. The badge maps every deployment status to a colour and an `aria-live` announcement. A footer says: "Unofficial. Not a Railway product."

Every screen defines its states. The required set:

| Group | States |
| --- | --- |
| Selection | loading, no projects, no environments, no services |
| Life cycle | no deployment, spin-down in progress, removed, deployment failed |
| Stream | reconnecting, reconnect gave up, watching a new deployment, unknown status |
| Failure | Railway error, rate limited, service gone |
| Session | expired session |

Each state has visible text. Each state has one allowed-action rule from the action policy. Each state has one test. No state outside the "Life cycle" group allows a destructive action.

Accessibility has three enforcement points: semantic HTML by construction, Biome's `a11y` lint rules at error level, and axe scans in CI on rendered states.

### Delivery

Small pull requests, in the order that the blocked-by links between the [issues](https://github.com/diegocasmo/turntable/issues) give. The size rules live in [AGENTS.md](./AGENTS.md).

## Cut line

The product is complete when one user can do all of this on the deployed application:

1. Paste a token.
2. Pick a project, an environment, and a service.
3. Watch the container's status live.
4. Spin it down.
5. Spin it up again.

And when a second screen follows the same service through both actions.

Everything past this line is optional. The `Optional` milestone marks that work.

## Future work

1. Login with Railway ([OAuth](https://docs.railway.com/integrations/oauth)) instead of a pasted token.
2. Create and delete a service, with a confirmation path for each.
3. Support for project tokens, which use the `Project-Access-Token` header ([token docs](https://docs.railway.com/integrations/api)).
4. Many services per project, as a dashboard.
5. A shared upstream subscription per resource, if the screen count per user grows.
6. The graphql-sse protocol on the browser leg, if the subscription types grow.
7. A shared pub/sub layer, so the server can run more than one replica. The map in "Two users, one service" assumes one replica.
8. A signal for a deployment that starts outside the application, if Railway ever offers one.
