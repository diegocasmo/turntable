import { execFileSync } from 'node:child_process'
import lint from '@commitlint/lint'
import load from '@commitlint/load'
import { danger, fail } from 'danger'
import { z } from 'zod'

const maximumPullRequestAddedLines = 500
const conventionalConfig = load({ extends: ['@commitlint/config-conventional'] })
const parserOptionsSchema = z.object({
  breakingHeaderPattern: z.instanceof(RegExp),
  headerCorrespondence: z.array(z.string()),
  headerPattern: z.instanceof(RegExp),
  issuePrefixes: z.array(z.string()),
  noteKeywords: z.array(z.string()),
  revertCorrespondence: z.array(z.string()),
  revertPattern: z.instanceof(RegExp),
})

export async function readPullRequestTitleError(title: string) {
  const config = await conventionalConfig
  const parserOpts = parserOptionsSchema.parse(config.parserPreset?.parserOpts)
  const report = await lint(title, config.rules, {
    defaultIgnores: false,
    parserOpts,
  })

  if (report.valid) {
    return null
  }

  const reasons = report.errors.map((error) => error.message).join('; ')

  return `Pull request title must use Conventional Commits: ${reasons}.`
}

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

export default async function checkPullRequest() {
  const titleError = await readPullRequestTitleError(danger.github.pr.title)

  if (titleError !== null) {
    fail(titleError)
  }

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
