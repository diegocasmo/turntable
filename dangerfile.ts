import { execFileSync } from 'node:child_process'
import { danger, fail, message } from 'danger'

const maximumPullRequestAddedLines = 500

function readGeneratedPaths(paths: string[]) {
  if (paths.length === 0) {
    return new Set<string>()
  }

  const output = execFileSync('git', ['check-attr', '-z', '--stdin', 'linguist-generated'], {
    encoding: 'utf8',
    input: `${paths.join('\0')}\0`,
  })
  const fields = output.split('\0')
  const generatedPaths = new Set<string>()

  for (let index = 0; index + 2 < fields.length; index += 3) {
    const path = fields[index]

    if (path !== undefined && fields[index + 2] === 'true') {
      generatedPaths.add(path)
    }
  }

  return generatedPaths
}

export default async function checkPullRequestSize() {
  const changedPaths = [
    ...new Set([
      ...danger.git.created_files,
      ...danger.git.deleted_files,
      ...danger.git.modified_files,
    ]),
  ]
  const generatedPaths = readGeneratedPaths(changedPaths)
  const changes = await Promise.all(
    changedPaths.map(async (path) => {
      const diff = await danger.git.structuredDiffForFile(path)
      const addedLines =
        diff?.chunks.reduce((count, chunk) => {
          return count + chunk.changes.filter((change) => change.type === 'add').length
        }, 0) ?? 0

      return { addedLines, path }
    }),
  )
  const parsedAddedLines = changes.reduce((total, change) => total + change.addedLines, 0)

  if (
    danger.github &&
    (changedPaths.length !== danger.github.pr.changed_files ||
      parsedAddedLines !== danger.github.pr.additions)
  ) {
    fail(
      `Cannot verify pull request size. GitHub reports ${danger.github.pr.changed_files} changed files and ${danger.github.pr.additions} additions. Danger read ${changedPaths.length} changed files and ${parsedAddedLines} additions.`,
    )
    return
  }

  const addedLines = changes.reduce((total, change) => {
    return generatedPaths.has(change.path) ? total : total + change.addedLines
  }, 0)
  const report = `Added lines: ${addedLines}. Limit: ${maximumPullRequestAddedLines}.`

  if (addedLines > maximumPullRequestAddedLines) {
    fail(report)
    return
  }

  message(report)
}
