import { useEffect, useRef } from 'react'

/** Runs the callback once the caller has stopped calling it for `delay` ms. */
export function useDebounced<T>(run: (value: T) => void, delay: number) {
  const latest = useRef(run)
  useEffect(() => {
    latest.current = run
  })

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  return (value: T) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => latest.current(value), delay)
  }
}
