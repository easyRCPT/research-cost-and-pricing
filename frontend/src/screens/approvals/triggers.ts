/**
 * Why a dean has to sign, in words.
 *
 * The server decides whether a dean is needed and says which rules fired; this
 * only turns its codes into a sentence. No arithmetic here decides anything
 * (#83) -- an unknown code is shown as it came, rather than guessed at.
 */
const TRIGGER_TEXT: Record<string, string> = {
  margin_below_minimum: "the margin is below the University's minimum",
  in_kind_present: 'the University is contributing costs in kind',
}

export const describeTrigger = (code: string) => TRIGGER_TEXT[code] ?? code
