# Turntable: instructions for agents

Turntable is a web application. [VISION.md](./VISION.md) describes it.

Read VISION.md before you make a design decision. Read the [issues](https://github.com/diegocasmo/turntable/issues) before you start work. Each issue is one pull request. Do them in the order that the blocked-by links give.

<!-- intent-skills:start -->
## Skill Loading

Before you edit files for a substantial task:

- Run `pnpm skills:list` from the workspace root.
- If a listed skill matches the task, run `pnpm skills:load <package>#<skill>` before the edit.
- Use the loaded `SKILL.md` guidance while you make the change.
<!-- intent-skills:end -->

## Rules

These rules apply to all work in this repository. This file is the only source for these rules.

1. Write all documents in ASD-STE100 Simplified Technical English. Use short sentences. Use the active voice. Use simple words.
2. Point to the single source of truth. Do not copy information that has a source. Give a link or a file path instead.
3. Use strict TypeScript. Do not use `any`. Do not use a type assertion to hide an error. The Railway client can assert the successful `data` value once, after it validates the GraphQL response and rejects errors, missing data, and null data.
4. Do not write `useEffect`. Use TanStack Query for server state and asynchronous action state. Use TanStack Form for form state. Ask the project owner before you add a different state tool.
5. Keep the plaintext Railway API token in the token form and its request only. Never persist, log, or put it in a long-lived client cache. Remove the form and its mutation from client state after a successful connection. The client then stores only ciphertext.
6. Keep each pull request at or below the added-line limit that [the Dangerfile](./dangerfile.mts) defines and enforces. The check counts tests like other files. Split the work instead.
7. `.gitattributes` marks each file that a tool owns and replaces with `linguist-generated=true`. The size check in CI does not count these files, and GitHub hides them in the diff. Do not mark source code that the project owns and maintains.
8. A feature's dependencies land in a pull request before its feature code. A dependency pull request can add the minimum configuration, generated output, and tests that prove the dependencies work. The scaffold pull request can add the dependencies of the scaffold.
9. Put tests in the same pull request as the code that they test.
10. Make the user interface accessible. Use semantic HTML. Use an `aria-live` region for action progress, results, and errors when needed.
11. Validate every Railway response body at the boundary with zod. The body is not always GraphQL. Use gql.tada for successful GraphQL result and variable types. Do not copy a GraphQL result shape into zod or a hand-written type. Validate a domain rule with zod when GraphQL cannot express it. Map an unknown status to the unknown badge. Do not crash.
12. Never log a request body. Redact `Authorization`, `Cookie`, and `Set-Cookie` in every log line and every error path.
13. Write commit messages and pull request titles in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
14. CI must be green before you merge.
15. Write a comment only to give a reason that the code cannot show: an invariant, a trade-off, or a surprise. Do not write a comment that repeats what the code does. Do not write a comment about a past version of the code. When a better name can replace a comment, use the name. When you change code, update or delete the comments near it.
16. Each pull request is one testable unit.
17. In component tests, query the rendered user interface by semantic role and accessible name. Do not assert serialized HTML with substring matches.
18. Use the `@/` alias for each hand-maintained import that points to a file in `src`. Keep imports in the `vite.config.ts` dependency graph relative because [Vite cannot resolve a project alias while it loads the config](https://github.com/vitejs/vite/issues/16718). Keep relative imports that point outside `src`.
19. Before you write infrastructure that a selected framework or dependency can provide, inspect its pinned public API and official documentation. Use that API when it meets the requirements. If it does not, record the exact missing behavior and evidence before you write a custom replacement.
20. Start each hand-maintained, non-component function name with an action verb. Keep framework-required names and third-party API names.
21. Define each GraphQL operation once with gql.tada's `graphql()` function. Infer its result and variables from that document.
22. Use TanStack Start server functions for internal reads and commands. Use a raw server route only when the HTTP protocol needs a `Response`, such as SSE and health checks.
23. Put an input schema that the browser and server share in a non-server file. Use the same schema in TanStack Form and the server function validator.
24. Group a capability that spans the user interface and server under `src/<domain>`. Keep application composition outside the domain.
25. Put each TanStack server function in its own non-server file named after its exported function so the browser can import its RPC stub. Put its server-only work in a verb-named `.server.ts` file named after its main exported action. Keep shared protocol, storage, or security policy in one explicit module. Use direct imports. Do not add barrel files.
26. Open an external link in a new tab only when leaving Turntable would interrupt the current task. Use `rel="noreferrer"`. Give a visual and accessible warning that the link opens in a new tab.
27. Reserve enough space inside the component that changes for the largest normal asynchronous state. Do not stack an empty feedback row when an existing stable region can show that state. A skeleton must match that reserved region. A full-screen state change and an unusually long error can change the layout.
28. When a component test helper only varies component props, accept typed partial props and apply them after complete defaults. Use explicit typed options for router, provider, mock, or controlled-state harnesses.

## Commands

`package.json` is the source of truth for commands.
