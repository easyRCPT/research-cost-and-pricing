import { useCallback, useEffect, useRef } from 'react'

/**
 * Holds the newest value until the caller stops changing it, then commits once.
 *
 * The rule for any field bound to the saved budget: keep what is typed local
 * and commit when typing settles. Committing per keystroke costs a write and a
 * re-render of every screen reading that budget, and holding a key down repeats
 * faster than anyone types, which is where it is felt. `flush` commits at once,
 * for blur, so leaving a field never loses the last thing typed in it.
 */
export function useSettled<T>(commit: (value: T) => void, delay: number) {
  const pending = useRef<{ value: T } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Read at commit time, so a stale closure never overwrites a newer value.
  const latest = useRef(commit)
  useEffect(() => {
    latest.current = commit
  })

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const held = pending.current
    pending.current = null
    if (held) latest.current(held.value)
  }, [])

  // Leaving the screen mid-edit should still save what was typed.
  useEffect(() => flush, [flush])

  const change = useCallback(
    (value: T) => {
      pending.current = { value }
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    [flush, delay],
  )

  return { change, flush }
}
