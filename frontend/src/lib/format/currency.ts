import { createContext, use } from 'react'

import { dash, money } from './utils'

/**
 * The currency the costing on screen is priced in (#152). Set by the costing
 * screens; anything outside them (the lists, the queue, the console) reads AUD,
 * which is what their prices are stored in.
 */
export const CurrencyContext = createContext('AUD')

export const useCurrency = () => use(CurrencyContext)

/** money(), in the costing's currency. */
export function useMoney() {
  const currency = useCurrency()
  return (n: number) => money(n, currency)
}

/** dash(), in the costing's currency. */
export function useDash() {
  const currency = useCurrency()
  return (n: number) => dash(n, currency)
}
