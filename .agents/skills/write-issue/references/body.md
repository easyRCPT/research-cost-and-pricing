# Body sections, by kind of issue

Same headings, same order, every time — someone who has read one issue then
knows where to look in all of them. Every kind ends with **Done when**. Skip a
section only when it would be empty; never pad one out to fill the shape.

Almost nobody reads an issue top to bottom. They scan for the bit they need, so
the body has to survive scanning:

- **One idea per sentence, wrapped at 80 columns.** A paragraph running past
  about five lines is holding two ideas and belongs in two sections.
- **Bold the thing being claimed.** A bullet opening with a **bolded claim** and
  then explaining it is the house pattern here.
- **Lead with the screenshot when there is one**, directly under the first
  heading. See [screenshots.md](screenshots.md).

## Bug

```markdown
## What happens
## What should happen
## Steps to reproduce
## Where in the code
## Done when
```

`What happens` is the observed behaviour and nothing else. Keep the diagnosis
out of it — if you know the cause, it goes under `Where in the code`, so a
reader can tell what was seen from what was inferred.

## Enhancement

```markdown
## What it looks like now
## What would be better
## Where in the code
## Done when
```

Say what is unsatisfying, not just that it is. "The row height makes a 40-line
quote unreadable" is actionable; "the table looks bad" is not.

## Task

```markdown
## What needs doing
## Where in the code
## Done when
```

Short on purpose. If a task needs three paragraphs of background, the background
belongs on the parent `feature` and the task should link to it.

## Feature

```markdown
## The problem
## Proposed shape
## The pieces          <- the tasks it splits into, as sub-issues
## Done when
```

`The problem` describes who is stuck and on what, not the solution. If you catch
yourself writing the fix there, you are writing `Proposed shape` early.

A feature is a parent. Add its tasks as sub-issues and let GitHub render the
list with live open/closed state — do not hand-write a checklist of children,
because that is two descriptions to keep in step.

## Decision

An issue that closes a question rather than shipping a change. It is done when
the answer is written down and the issues it blocks can start. Label it `task`
plus `status: needs discussion` or `status: needs client`.

```markdown
## The problem
## What has to be settled      <- the open questions, as a list
## Where it lands              <- the file or migration the answer shows up in
## Done when
```

Say plainly that it is a decision. Whoever picks it up is writing an answer, not
code, and should not have to work that out from the tone.

## Open choice

Something is definitely wrong, but there is more than one defensible fix and the
trade-offs are real. Do not quietly pick one and bury the others — that throws
away the judgement of whoever ends up doing it.

```markdown
## The problem
## This one is a judgement call, so it is not decided here
## Where in the code
## Done when                   <- first box is "the choice is written down here"
```

- **Give each option a letter, a one-line summary and its cost.** An option with
  no stated downside reads as the answer, which defeats the point.
- **Draw them if they are visual.** Three layouts side by side settle in a glance
  what three paragraphs argue about.
- **Say explicitly who decides**, and that the reason goes back in the issue.
- **Do not label it `agent-ready`.**

An open choice is not the same as a decision issue. A decision ships an answer
and no code; this ships code, once someone has chosen how.

## Done when, specifically

A checklist of things that are true at the end, each one checkable by someone
who did not do the work.

```markdown
## Done when

- [ ] Adjust Price shows the in-kind rows under their own subtotal
- [ ] A line with no salary point renders an empty cell, and the total ignores it
- [ ] The 1.70 fixed rate is still uneditable from the UI
```

Not `- [ ] Fix the table`. If you cannot write this list, the issue is a
question — say so, and file it as a decision.

## Rewriting an existing issue

When you tidy an issue rather than filing one:

- **Keep every fact.** The old body is usually right and badly laid out. Losing
  a filename or a reproduction step to make the page shorter is a bad trade.
- **Check the evidence still says what the text claims.** A screenshot that
  contradicts its own caption means the caption is wrong, not the screenshot.
  Fix the text and say what you changed.
- **Do not renumber or re-title just to fit the pattern.** A title someone has
  already linked to is worth more than a consistent one.
- **Set the relationships even if the prose already described them**, then take
  the sentence out. See [linking.md](linking.md).
