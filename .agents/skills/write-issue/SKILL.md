---
name: write-issue
description: File or rewrite GitHub issues on easyRCPT/research-cost-and-pricing so someone else can pick them up. Use when asked to create, raise, triage, audit, tidy or rewrite issues, when turning findings from a review or a walkthrough into issues, and whenever an issue needs a screenshot, a parent, a sub-issue or a blocked-by link.
---

# Write an issue someone else can pick up

The test for every issue is the same. A person who was not in the room reads it
once and knows what is wrong, what "fixed" looks like, and where to start.

This skill covers both halves: the [labels](#the-labels), which are how the
issue is found, and the [body](#the-body-is-scanned-not-read), which is how it
is picked up.

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

## The labels

Every issue gets **one type**, **one priority** and **at least one domain**.
Status labels are added as they become true.

### Type — what kind of thing this is

| Label | It is this when |
| --- | --- |
| `bug` | Not working as intended. Something is broken, wrong or invisible. |
| `enhancement` | Working as intended, but it should be better. UI and UX polish. |
| `task` | A concrete unit of work. Also chores, refactors, config, dependencies. |
| `feature` | A capability the tool does not have. Abstract enough to need breaking down. |

Two boundaries do the work here, and both are easy to get backwards:

- **`task` vs `feature`.** A `feature` is abstract and needs a reviewer to split
  it into `task` sub-issues before anyone can start. A `task` is small enough
  that someone can open the file and begin. If you can write a `Done when`
  checklist without inventing scope, it is a task. "Quotes can be exported" is a
  feature; "add the CSV export endpoint" is a task.
- **`bug` vs `enhancement`.** Ask whether it is doing what it was built to do. A
  CSS class that blends a control into the background so nobody can see it is a
  **bug** — the control was meant to be visible. A table that works but is
  cramped and hard to scan is an **enhancement**. Bugs outrank enhancements on
  priority by default; a UI polish item is rarely `priority: high`.

### Priority — where it sits in the queue

| Label | It is this when |
| --- | --- |
| `priority: high` | Do this before the other open work. Broken behaviour, blocked teammates, a deploy at risk. |
| `priority: medium` | The normal queue. Most tasks and features land here. |
| `priority: low` | Nice to have, no deadline. Most `enhancement` items land here. |

### Domain — which half of the repo it touches

`domain: frontend` (`frontend/`, React + Vite), `domain: backend` (`backend/`,
Django + DRF), `domain: infra` (CI, Render, Neon, Docker, `Makefile`,
`scripts/`). Pick more than one when it spans them — an API change with a
matching UI change is both.

### Status — why it is not moving

| Label | It is this when |
| --- | --- |
| `status: needs triage` | Filed but not yet labelled, sized or assigned. |
| `status: blocked` | Waiting on another issue. Set the **blocked by** field too. |
| `status: needs discussion` | The team has to agree on something before work starts. |
| `status: needs client` | Frank has to clarify something before work starts. |

`status: needs discussion` and `status: needs client` say *who* unblocks it, so
the right person can filter for their own pile. Both mean the issue is parked —
add `status: blocked` alongside only when a specific other issue is the blocker.

`agent-ready` is separate from all of this: the file paths and the `Done when`
list are concrete enough that a Claude Code agent could start without asking a
question. Never put it on an [open choice](#open-choice) — an agent cannot pick
between options, and the label promises it can start.

## The body is scanned, not read

Almost nobody reads an issue top to bottom. They scan for the bit they need, so
the body has to survive scanning.

- **Lead with the screenshot when there is one.** The picture makes the case
  faster than the paragraph does. Put it directly under the first heading, not
  at the bottom under a `---`.
- **Use the section headings below.** Same headings, same order, every time —
  someone who has read one issue then knows where to look in all of them.
- **One idea per sentence, wrapped at 80 columns.**
- **Bold the thing being claimed.** A bullet opening with a **bolded claim** and
  then explaining it is the house pattern here.
- **Never bury a relationship in prose.** "Blocked on #32" at the end of a
  paragraph is invisible. Relationships go in GitHub's own fields — see
  [Link issues in GitHub, not in prose](#link-issues-in-github-not-in-prose).

Do not write a wall of prose and call it context. If a paragraph runs past about
five lines, it is holding more than one idea and belongs in two sections.

## The sections, by kind of issue

Every kind ends with **Done when**. Skip a section only when it would be empty —
never pad one out to fill the shape.

### Bug

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

### Enhancement

```markdown
## What it looks like now
## What would be better
## Where in the code
## Done when
```

Say what is unsatisfying, not just that it is. "The row height makes a 40-line
quote unreadable" is actionable; "the table looks bad" is not.

### Task

```markdown
## What needs doing
## Where in the code
## Done when
```

Short on purpose. If a task needs three paragraphs of background, the background
belongs on the parent `feature` and the task should link to it.

### Feature

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

### Decision

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

### Open choice

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

### Done when, specifically

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

## A picture earns its place more often than you think

Include a screenshot when the problem is visual, when a layout or a piece of
copy is the evidence, or when it saves someone finding the screen themselves.
Most `bug` and `enhancement` issues on the frontend want one.

**A schema or migration issue needs a picture too.** Draw a Mermaid ER diagram
rather than pasting a chunky SQL block. GitHub renders a ```` ```mermaid ````
fence in an issue body, and a diagram shows the foreign keys and the linked
tables at a glance where DDL makes you hold them in your head:

- **Draw the tables the change touches, plus the ones hanging off them.** The
  neighbours are how a reader sees what cascades.
- **Show existing and proposed as two diagrams**, in that order, and mark the new
  parts. The difference between them is the actual proposal.
- **Simplify.** Name the primary key, the foreign keys and the two or three
  columns the issue turns on.
- **Back it with the migration, do not replace it with the migration.**

Hand-drawn SVG is fine where a diagram is not a schema — a state machine, a
sequence, a layout that does not exist yet to screenshot.

**An unannotated screenshot is half a screenshot.** The reader does not know
where to look, so mark it up. `annotate.py` in this directory draws numbered
boxes on the image and a matching legend underneath, so callout text never sits
on top of the screenshot and nothing collides:

```bash
python3 .agents/skills/write-issue/annotate.py spec.json
```

The docstring at the top of the script has the spec format. What matters:

- **Coordinates are in a reference space**, `ref_width` (default 1100). Downscale
  the screenshot to that width, read the coordinates off the preview, and the
  script scales them to the real pixels.
- **Colours mean something.** `red` is the defect, `amber` a knock-on effect or
  something to watch, `blue` context or what should happen instead.
- **Marks are numbered in the order you list them.** List them in the order you
  want someone to read them.
- **Crop to the evidence.** A full-page screenshot with one small box in it wastes
  the reader's attention. Crop, then annotate.

Write callouts as observations, not instructions: "Salary point column is blank
for every line" beats "should show the salary point".

Screenshots of the running app come from the headless-Chrome CDP script, not
Playwright. Radix tabs need a `mousedown`, and panes need padding to test pinned
heads.

### Ask once who uploads the screenshots, then remember the answer

GitHub has no API for issue attachments, and the repo is private, so a raw link
to a file will not render. The only route in is a real clipboard paste into a
logged-in browser. Two people can do that: you, if this session has browser
tools, or the user by hand.

**Ask before the first upload of the session, unless a memory already answers
it.** Check whether browser tools are available first, so you are offering
something you can actually do. Then put it plainly, and make the manual route
sound like the fine choice it is — it is three drags, and it keeps a browser
session out of the loop entirely.

Write the answer to memory as `issue-image-upload`, type `feedback`, with the
reason they gave. Re-ask only if they say something that contradicts it.

### When you upload, stage every image in one pass

1. `osascript -e 'set the clipboard to (read (POSIX file "…/shot.png") as «class PNGf»)'`
2. In a logged-in browser, click into the comment box on any issue, press
   **cmd+v**, and wait for the upload to finish.
3. Read the `https://github.com/user-attachments/assets/…` URL back out of the
   textarea, then **clear the box without posting**.

That box is a staging area, not a comment. Upload every image in one pass,
collect the URLs in order, then write the bodies with `gh issue edit`. Those
URLs render in any issue in the same private repo, so it does not matter whose
box you stage them in.

### When they upload, leave them a trail

Do not finish with "add a screenshot to #22" and a folder path. Do all three of
these, or the handoff costs them more than doing it themselves would have.

- **Put a visible placeholder on the exact line the image belongs on:**

  ```markdown
  > **Screenshot: `22-lookup-filter-popover.png`** — drop it on this line, then
  > delete the line.
  ```

  A blockquote renders and is impossible to miss. An HTML comment is invisible
  on GitHub, which is the opposite of what this needs to do.
- **Send the annotated files with `SendUserFile`**, in the same order as the
  table below.
- **End the response with one table and nothing after it:**

  | Issue | Where it goes | File |
  | --- | --- | --- |
  | [#22 Lookup filter popover clips at the viewport edge](https://github.com/easyRCPT/research-cost-and-pricing/issues/22) | under `## What happens` | `22-lookup-filter-popover.png` |

Link the issue by title rather than printing a bare number. They are clicking
through to edit, so the link is the whole point of the row.

## Link issues in GitHub, not in prose

Three different relationships, three different fields. Getting them right is
what makes the board readable — a sentence saying "blocked on #32" does not stop
anyone picking the issue up.

| Relationship | Use it when | How |
| --- | --- | --- |
| **Sub-issue** | The child is part of finishing the parent | `POST /repos/{repo}/issues/{parent}/sub_issues` with `{"sub_issue_id": <id>}` |
| **Blocked by** | This cannot start until the other lands | `POST /repos/{repo}/issues/{n}/dependencies/blocked_by` with `{"issue_id": <id>}` |
| **Related** | Same area, neither one waits | A `See also` line in the body |

Both APIs take the issue's **`id`**, not its number, and `gh` needs `-F` so it
sends an integer — `-f` sends a string and the request is rejected:

```bash
REPO=easyRCPT/research-cost-and-pricing
ID=$(gh api repos/$REPO/issues/32 --jq .id)
gh api -X POST repos/$REPO/issues/44/dependencies/blocked_by -F issue_id=$ID
```

Parent and blocked-by are not the same claim, and the difference matters:

- **A feature's tasks are sub-issues, not blocked issues.** They can all start
  today. A feature holding three table fixes means any of them can be done first.
- **A decision blocks the work that depends on the answer.** An issue settling
  how in-kind contributions are stored blocks the screens that read them — and
  those screens are also its sub-issues, because settling it is what finishes it.
- **`status: blocked` goes on alongside the dependency**, because the label is
  what shows up in a list view.

Never leave a bare "Blocks #42, #43 and #44." as the only record. Set the field,
and let the sidebar say it.

## Branches, when the issue gets picked up

`dev` is the trunk. Work happens on a branch off `dev` named for the issue —
`feat/`, `fix/`, `refactor/` or `chore/` and a short slug — and merges back into
`dev` by pull request. `main` is the release branch: only `dev` merges into it,
and that merge is what deploys. Never open a pull request straight into `main`.

Close the issue from the pull request body with `Closes #22`, so the issue and
the merge stay in step without anyone remembering to tidy up.

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
  the sentence out.
