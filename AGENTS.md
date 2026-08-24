# Turntable: instructions for agents

Turntable is a web application. [VISION.md](./VISION.md) describes it.

Read VISION.md before you make a design decision. Read the [issues](https://github.com/diegocasmo/turntable/issues) before you start work. Each issue is one pull request. Do them in the order that the blocked-by links give.

## Rules

These rules apply to all work in this repository. This file is the only source for these rules.

1. Write all documents in ASD-STE100 Simplified Technical English. Use short sentences. Use the active voice. Use simple words.
2. Point to the single source of truth. Do not copy information that has a source. Give a link or a file path instead.
3. Use strict TypeScript. Do not use `any`. Do not use a type assertion to hide an error.
4. Do not write `useEffect`. Use TanStack Query for server state. Ask the project owner before you add a different state tool.
5. Use GraphQL subscriptions for live data. Do not poll. There is no exception.
6. Keep the Railway API token readable only on the server. Browser JavaScript must never read the token. The client stores only ciphertext.
7. Keep each pull request at or below the added-line limit that [the Dangerfile](./dangerfile.mts) defines and enforces. The check counts tests like other files. Split the work instead.
8. `.gitattributes` marks each file that a tool owns and replaces with `linguist-generated=true`. The size check in CI does not count these files, and GitHub hides them in the diff. Do not mark source code that the project owns and maintains.
9. A feature's dependencies land in a pull request before its feature code. A dependency pull request can add the minimum configuration, generated output, and tests that prove the dependencies work. The scaffold pull request can add the dependencies of the scaffold.
10. Put tests in the same pull request as the code that they test.
11. Make the user interface accessible. Use semantic HTML. Use an `aria-live` region for the live status.
12. Validate every response from the Railway API at the boundary with zod. The body is not always GraphQL. Map an unknown status to the unknown badge. Do not crash.
13. Never log a request body. Redact `Authorization`, `Cookie`, and `Set-Cookie` in every log line and every error path.
14. Write commit messages and pull request titles in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
15. CI must be green before you merge.
16. Write a comment only to give a reason that the code cannot show: an invariant, a trade-off, or a surprise. Do not write a comment that repeats what the code does. Do not write a comment about a past version of the code. When a better name can replace a comment, use the name. When you change code, update or delete the comments near it.
17. Each pull request is one testable unit.
18. In component tests, query the rendered user interface by semantic role and accessible name. Do not assert serialized HTML with substring matches.
19. Use the `@/` alias for each hand-maintained import that points to a file in `src`. Keep imports in the `vite.config.ts` dependency graph relative because [Vite cannot resolve a project alias while it loads the config](https://github.com/vitejs/vite/issues/16718). Keep relative imports that point outside `src`.
20. Before you write infrastructure that a selected framework or dependency can provide, inspect its pinned public API and official documentation. Use that API when it meets the requirements. If it does not, record the exact missing behavior and evidence before you write a custom replacement.

## Commands

`package.json` is the source of truth for commands.
