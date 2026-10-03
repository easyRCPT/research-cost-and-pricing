import type { VersionChange } from '@/api/admin-lookups'

const MARKS = [
  {
    op: 'create',
    mark: '+',
    word: 'added',
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    op: 'update',
    mark: '~',
    word: 'updated',
    tone: 'text-sky-700 dark:text-sky-300',
  },
  {
    op: 'delete',
    mark: '-',
    word: 'removed',
    tone: 'text-destructive',
  },
] as const

interface ChangeTallyProps {
  changes: VersionChange[]
  /** What the set says it holds, for one whose changes were not recorded. */
  count: number
}

/** How many rows a set added, updated and removed, e.g. +2 ~1 -1; a kind with none is left out. */
export function ChangeTally({ changes, count }: ChangeTallyProps) {
  const kinds = MARKS.map((kind) => ({
    ...kind,
    count: changes.filter((change) => change.op === kind.op).length,
  })).filter((kind) => kind.count > 0)

  return (
    <span className="tabular ml-auto flex w-24 shrink-0 justify-end gap-2 font-medium">
      {kinds.length === 0 ? (
        <span className="font-normal text-muted-foreground">
          {count} {count === 1 ? 'change' : 'changes'}
        </span>
      ) : (
        kinds.map((kind) => (
          <span key={kind.op} className={kind.tone}>
            <span aria-hidden>
              {kind.mark}
              {kind.count}
            </span>
            <span className="sr-only">
              {kind.count} {kind.word}
            </span>
          </span>
        ))
      )}
    </span>
  )
}
