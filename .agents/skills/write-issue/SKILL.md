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

## Label it

Every issue gets **one type**, **one priority** and **at least one domain**.
Status labels are added as they become true.

| Family | Pick from |
| --- | --- |
| Type | `bug` · `enhancement` · `task` · `feature` |
| Priority | `priority: high` · `priority: medium` · `priority: low` |
| Domain | `domain: frontend` · `domain: backend` · `domain: infra` |
| Status | `status: needs triage` · `status: blocked` · `status: needs discussion` · `status: needs client` |

Two boundaries are easy to get backwards:

- **`task` vs `feature`** — if you can write the `Done when` checklist without
  inventing scope, it is a task. "Quotes can be exported" is a feature; "add the
  CSV export endpoint" is a task.
- **`bug` vs `enhancement`** — ask whether it is doing what it was built to do.
  A control that blends into its background is a **bug**; a table that works but
  is cramped is an **enhancement**. Bugs outrank enhancements on priority.

`agent-ready` is separate: the paths and the `Done when` list are concrete
enough that a Claude Code agent could start without asking a question.

Full definitions, and which status label says who unblocks it, in
[references/labels.md](references/labels.md).

## Write the body

Almost nobody reads an issue top to bottom. They scan for the bit they need, so
the body has to survive scanning.

- **Use the headings for that kind of issue**, same order every time. A bug is
  `What happens` · `What should happen` · `Steps to reproduce` · `Where in the
  code` · `Done when`. Enhancement, task, feature, and the two that ship an
  answer rather than code — decision and open choice — are in
  [references/body.md](references/body.md).
- **Keep the diagnosis out of `What happens`.** What was seen and what was
  inferred are different claims; a guess at the cause goes under `Where in the
  code`, where a wrong pointer still saves someone a search.
- **End with `Done when`** — a checklist, each box checkable by someone who did
  not do the work. Not `- [ ] Fix the table`. If you cannot write the list, the
  issue is a question: say so and file it as a decision.
- **Lead with the screenshot when there is one**, directly under the first
  heading, not at the bottom under a `---`.
- **One idea per sentence, wrapped at 80 columns.** A paragraph running past
  about five lines is holding two ideas and belongs in two sections.
- **Bold the thing being claimed.** A bullet opening with a **bolded claim** and
  then explaining it is the house pattern here.
- **Never bury a relationship in prose.** "Blocked on #32" at the end of a
  paragraph is invisible — set GitHub's own field instead.

## Add a picture more often than you think

Most frontend `bug` and `enhancement` issues want a screenshot, and a schema
change wants a Mermaid ER diagram rather than a chunky SQL block. An
unannotated screenshot is half a screenshot: the reader does not know where to
look, so `scripts/annotate.py` draws numbered boxes with a legend underneath.

GitHub has no API for issue attachments, so images only get in by a clipboard
paste into a logged-in browser — you, if this session has browser tools, or the
user by hand. Ask once per session, unless a memory already answers it.

The annotation spec, both upload routes, and the handoff table that goes with
the manual one: [references/screenshots.md](references/screenshots.md).

## Link it in GitHub

A **sub-issue** is part of finishing its parent; **blocked by** means this
cannot start until the other lands. A feature's tasks are sub-issues, not
blocked issues — they can all start today. Put `status: blocked` on alongside
the dependency, because the label is what shows up in a list view.

Both APIs take the issue's `id`, not its number:
[references/linking.md](references/linking.md).

## When it gets picked up

`dev` is the trunk. Work happens on a branch off `dev` named for the issue —
`feat/`, `fix/`, `refactor/` or `chore/` and a short slug — and merges back into
`dev` by pull request. `main` is the release branch: only `dev` merges into it,
and that merge is what deploys. Never open a pull request straight into `main`.

Close the issue from the pull request body with `Closes #22`, so the issue and
the merge stay in step without anyone remembering to tidy up.

Tidying an existing issue rather than filing one:
[references/body.md](references/body.md#rewriting-an-existing-issue).
