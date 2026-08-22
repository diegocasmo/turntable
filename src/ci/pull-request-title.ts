import conventionalConfig from '@commitlint/config-conventional'
import lint from '@commitlint/lint'

export async function readPullRequestTitleError(title: string) {
  const report = await lint(title, conventionalConfig.rules, { defaultIgnores: false })

  if (report.valid) {
    return null
  }

  const reasons = report.errors.map((error) => error.message).join('; ')

  return `Pull request title must use Conventional Commits: ${reasons}.`
}
