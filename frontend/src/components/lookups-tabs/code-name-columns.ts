import { columnHelper } from '@/components/data-table'

interface CodeName {
  code: string
  name: string
}

const col = columnHelper<CodeName>()

export const codeNameColumns = (label: string) =>
  col.columns([
    col.accessor('name', { header: label }),
    col.accessor('code', {
      header: 'Code',
      meta: { align: 'right', className: 'tabular' },
    }),
  ])

export const byCode = (row: CodeName) => row.code
