// TODO: temporary. Delete this folder when auth lands and the budget goes back
// to the database.

// Holds the whole budget in the browser, because v1 has no auth.
export type { BudgetInput } from './budget-input'
export { yearsOf } from './budget-input'
export { isCosted, toCalculateRequest } from './calculate-request'
export { changesPrice } from './price-fingerprint'
export {
  getBudgetInput,
  savePatch,
  seedMultipliers,
  setBudgetInput,
  useBudgetInput,
} from './store'
