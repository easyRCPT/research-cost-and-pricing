<<<<<<< HEAD
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
=======
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
>>>>>>> 4eb84e5c8850ab27879eaab5e00ca663493ef244

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
<<<<<<< HEAD
=======

// TODO: use UUIDs instead of increments and add sort_order
export const nextTempId = (lines: readonly { id: number }[]) =>
  Math.min(0, ...lines.map((line) => line.id)) - 1
>>>>>>> 4eb84e5c8850ab27879eaab5e00ca663493ef244
