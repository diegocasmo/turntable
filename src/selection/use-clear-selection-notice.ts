import { useRouter } from '@tanstack/react-router'
import type { MouseEvent } from 'react'

export function useClearSelectionNotice(notice: 'unavailable' | undefined, query: string) {
  const router = useRouter()

  return function clearSelectionNotice(event: MouseEvent<HTMLAnchorElement>) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (notice === undefined || event.button !== 0 || modified) return

    const search = query === '' ? '' : `?${new URLSearchParams({ q: query }).toString()}`
    router.history.replace(
      `${router.state.location.pathname}${search}`,
      router.history.location.state,
    )
  }
}
