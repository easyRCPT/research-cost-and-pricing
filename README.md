# Research Costing and Pricing Tool — UI prototypes

React + Vite + Tailwind + shadcn/ui rebuild of the University of Melbourne
Research Costing and Pricing Tool. The calculation engine in
`src/lib/rcpt-engine.ts` is a port of the workbook: salary table, EBA
progression, the on-cost cascade, cost recovery multipliers, in-kind treatment,
GST and the dean authorisation triggers.

## Two variants, one on each branch

| Branch | Flow |
| --- | --- |
| `variant/faithful` | The workbook as it stands. In-kind lives inside Staff Costs (Part B section 2) and Non-Staff Costs (Part C In Kind? column). |
| `variant/split` | Costing and pricing separated. Costing is staff and non-staff only; in-kind moves under pricing as a single list of everything already costed, where you tick what the University absorbs. |

`main` carries the shared foundation and defaults to the faithful flow.

This branch is the **split** variant.

```bash
npm install
npm run dev
```

Screens are hash-linkable: `#details`, `#staff`, `#nonstaff`, `#inkind`
(split only), `#price`, `#budget`, `#lookup`.
