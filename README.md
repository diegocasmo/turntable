# Turntable

Turntable starts and stops one Railway container. It shows the container status live. See
[VISION.md](./VISION.md) for the product scope and design.

## Install

Use the Node version in `.nvmrc` and the pnpm version in `package.json`.

```sh
nvm install
pnpm install
```

## Run

The application reads `SESSION_SECRET`, `APP_ORIGIN`, `RAILWAY_API_URL`, `RAILWAY_WEBSOCKET_URL`, `NODE_ENV`, and `PORT`.

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
