import { money } from '@/lib/format/utils'
import { Derived } from './Derived'

const TONES = { good: 'text-good', bad: 'text-bad' } as const

interface MoneyProps {
  value: number
  /** Colour the amount: 'sign' follows the sign of the value, 'good'/'bad' when the colour means something else. */
  tone?: 'sign' | keyof typeof TONES
}

/** A calculated dollar amount, shimmering while the price recalculates. */
export function Money({ value, tone }: MoneyProps) {
  const key = tone === 'sign' ? (value < 0 ? 'bad' : 'good') : tone

  return (
    <Derived>
      <span className={key && TONES[key]}>{money(value)}</span>
    </Derived>
  )
}
