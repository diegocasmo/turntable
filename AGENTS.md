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
7. Keep each pull request at 500 added lines or less. This count includes tests. There is no exception. Split the work instead.
8. `.gitattributes` marks each generated and vendored file with `linguist-generated=true`. The size check in CI does not count these files, and GitHub hides them in the diff. Add the path there when you add a generated or vendored file.
9. A feature's dependencies land in a pull request before its feature code. A dependency pull request can add the minimum configuration, generated output, and tests that prove the dependencies work. The scaffold pull request can add the dependencies of the scaffold.
10. Put tests in the same pull request as the code that they test.
11. Make the user interface accessible. Use semantic HTML. Use an `aria-live` region for the live status.
12. Validate every response from the Railway API at the boundary with zod. The body is not always GraphQL. Map an unknown status to the unknown badge. Do not crash.
13. Never log a request body. Redact `Authorization`, `Cookie`, and `Set-Cookie` in every log line and every error path.
14. Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format.
15. CI must be green before you merge.
16. A pull request description states what the pull request does and how to verify it.
17. Write a comment only to give a reason that the code cannot show: an invariant, a trade-off, or a surprise. Do not write a comment that repeats what the code does. Do not write a comment about a past version of the code. When a better name can replace a comment, use the name. When you change code, update or delete the comments near it.
18. Each pull request is one testable unit.

## Commands

`package.json` is the source of truth for commands.
