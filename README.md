# Turntable

Turntable starts and stops Railway containers. It shows a status snapshot for each service. See
[VISION.md](./VISION.md) for the product scope and design.

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
/projects/:projectId/environments/:environmentId/services
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

## Check a deployed build

Use the configured Railway test target. Complete this list with a keyboard and then with a pointer:

1. Connect and open each collection route directly.
2. Search and clear search on Projects, Environments, and Services.
3. Refresh each collection. Confirm that the route and search stay unchanged.
4. Use Back, Forward, and reload on each route.
5. Check focus, breadcrumbs, Sign out, and service menus at 390 by 844 pixels.
6. Repeat at 1440 by 900 pixels.
7. Run Spin down and Spin up. Confirm that the Services snapshot updates once after each action.
8. Confirm that the target is running before you finish.
