import { describe, expect, it } from 'vitest'
import { readPullRequestTitleError } from './pull-request-title'

describe('pull request title validation', () => {
  it('accepts a conventional title', async () => {
    const error = await readPullRequestTitleError('ci: enforce conventional pull request titles')

    expect(error).toBeNull()
  })

  it('reports why a plain title is invalid', async () => {
    const error = await readPullRequestTitleError('Enforce conventional pull request titles')

    expect(error).toBe(
      'Pull request title must use Conventional Commits: subject may not be empty; type may not be empty.',
    )
  })
})
