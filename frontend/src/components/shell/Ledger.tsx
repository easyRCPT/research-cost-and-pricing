import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Ledger({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <table className={cn('w-full border-collapse text-[13px]', className)}>
      {children}
    </table>
  )
}

interface LedgerRowProps {
  label: ReactNode
  value: ReactNode
  secondValue?: ReactNode
  tone?: 'rule'
}

export function LedgerRow({ label, value, secondValue, tone }: LedgerRowProps) {
  return (
    <tr className={cn('border-b', tone === 'rule' && 'font-semibold')}>
      <td className="py-1.5 pr-6 text-left align-middle">{label}</td>
      {secondValue !== undefined && (
        <td className="tabular py-1.5 text-right align-middle">
          {secondValue}
        </td>
      )}
      <td className="tabular py-1.5 text-right align-middle">{value}</td>
    </tr>
  )
}
