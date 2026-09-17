import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// TODO: use UUIDs instead of increments and add sort_order
export const nextTempId = (lines: readonly { id: number }[]) =>
  Math.min(0, ...lines.map((line) => line.id)) - 1
