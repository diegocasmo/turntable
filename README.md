# Turntable

Turntable starts and stops Railway containers. The deployed application is available at
[turntable-production.up.railway.app](https://turntable-production.up.railway.app/). Connect with a
Railway API token, select a project and environment, then search the services in that environment.
Each service shows its current deployment status and lets you spin it down or back up.

After Turntable connects, it removes the plaintext token from the page and stores the session in an
encrypted cookie. The application confirms each action and follows the status that Railway reports
while the service changes state.

## Install

Use the Node version in `.nvmrc` and the pnpm version in `package.json`.

```sh
nvm install
pnpm install
```

## Run

The application reads `SESSION_SECRET`, `APP_ORIGIN`, `RAILWAY_API_URL`, `NODE_ENV`, and `PORT`.

[The configuration module](./src/config.server.ts) defines the validation rules and local port default.

Create the local configuration:

```sh
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Paste the generated value after `SESSION_SECRET=` in `.env`.

```sh
pnpm dev
```

Open `http://localhost:3000`.

After a user connects, the selection flow uses these routes:

```text
/projects
/projects/:projectId/environments
/environments/:environmentId/services
```

Each route stores its card search in the `q` search parameter.

## Test

```sh
pnpm typecheck
pnpm lint
pnpm test
```

The normal test suite does not use Railway or a token.

To run the end-to-end tests, add a Railway API token and the `turntable-e2e/local` target IDs to
`.env`. [`.env.example`](./.env.example) lists the required names.

```sh
pnpm test:e2e
```

This command starts Turntable, uses the configured Railway target, and runs all browser tests. CI
uses `turntable-e2e/ci`. It runs for branches in this repository, `main`, and manual requests. It
does not run for fork pull requests, because they cannot receive the token.
