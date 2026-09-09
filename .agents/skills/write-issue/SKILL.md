---
name: write-issue
description: File or rewrite GitHub issues on easyRCPT/research-cost-and-pricing so someone else can pick them up. Use when asked to create, raise, triage, audit, tidy or rewrite issues, when turning findings from a review or a walkthrough into issues, and whenever an issue needs a screenshot, a parent, a sub-issue or a blocked-by link.
---

# Write an issue someone else can pick up

The test for every issue is the same. A person who was not in the room reads it
once and knows what is wrong, what "fixed" looks like, and where to start.

## Check you can file before you write a word

Writing three good bodies and then finding `gh` is not authenticated wastes all
three. One command first:

```bash
gh auth status && gh repo view easyRCPT/research-cost-and-pricing --json viewerPermission
```

`WRITE` or `ADMIN` and you are clear. `READ`, or no `gh` at all, and the fix is
`gh auth login` with the `repo` scope. Say what is wrong and stop there. Do not
fall back to handing the user a body to paste into the browser — that is the
thing this skill exists to save them.

## Then, in this order

1. **Agree on what the issue is.** A wrong issue costs more than a missing one,
   and it is cheapest to catch now. Ask about anything you had to guess at —
   which screen, whether it is broken or just unpolished, what "fixed" or 
  "finished" means, in a single round, then file.
2. **Label it.** One type, one priority, at least one domain; status labels as
   they become true. → [references/labels.md](references/labels.md)
3. **Write the body.** Fixed headings per kind of issue — bug, enhancement,
   task, feature, decision, open choice — every one ending in `Done when`.
   → [references/body.md](references/body.md)
4. **Add a picture, more often than you think.** Most frontend `bug` and
   `enhancement` issues want an annotated screenshot; a schema change wants a
   Mermaid ER diagram. Images reach GitHub only by a clipboard paste, so ask
   once per session who does the pasting.
   → [references/screenshots.md](references/screenshots.md)
5. **Set relationships in GitHub's own fields**, never in a sentence.
   → [references/linking.md](references/linking.md)

Tidying an existing issue rather than filing one:
[references/body.md](references/body.md#rewriting-an-existing-issue).

## When it gets picked up

`dev` is the trunk. Work happens on a branch off `dev` named for the issue —
`feat/`, `fix/`, `refactor/` or `chore/` and a short slug — and merges back into
`dev` by pull request. `main` is the release branch: only `dev` merges into it,
and that merge is what deploys. Never open a pull request straight into `main`.

Close the issue from the pull request body with `Closes #22`, so the issue and
the merge stay in step without anyone remembering to tidy up.
