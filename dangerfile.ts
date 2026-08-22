import { execFileSync } from 'node:child_process'
import { danger, fail } from 'danger'

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
  const fieldsPerGitAttributeResult = 3
  const generatedPaths = new Set<string>()

  for (
    let resultStart = 0;
    resultStart + fieldsPerGitAttributeResult <= fields.length;
    resultStart += fieldsPerGitAttributeResult
  ) {
    const path = fields[resultStart]

    if (path !== undefined && fields[resultStart + 2] === 'true') {
      generatedPaths.add(path)
    }
  }

  return generatedPaths
}

export default async function checkPullRequestSize() {
  const { number: pull_number, owner, repo } = danger.github.thisPR
  const files = await danger.github.api.paginate(danger.github.api.rest.pulls.listFiles, {
    owner,
    per_page: 100,
    pull_number,
    repo,
  })
  const changedPaths = files.map((file) => file.filename)
  const generatedPaths = readGeneratedPaths(changedPaths)

  if (changedPaths.length !== danger.github.pr.changed_files) {
    fail(
      `Cannot verify pull request size. GitHub reports ${danger.github.pr.changed_files} changed files. Danger read ${changedPaths.length} changed files.`,
    )
    return
  }

  const addedLines = files.reduce((total, file) => {
    return generatedPaths.has(file.filename) ? total : total + file.additions
  }, 0)
  const report = `Added lines: ${addedLines}. Limit: ${maximumPullRequestAddedLines}.`

  if (addedLines > maximumPullRequestAddedLines) {
    fail(report)
    return
  }
}
