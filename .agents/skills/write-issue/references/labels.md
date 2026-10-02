# Labels

Every issue gets **one type**, **one priority** and **at least one domain**.
Status labels are added as they become true.

## Type — what kind of thing this is

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

## Priority — where it sits in the queue

| Label | It is this when |
| --- | --- |
| `priority: high` | Do this before the other open work. Broken behaviour, blocked teammates, a deploy at risk. |
| `priority: medium` | The normal queue. Most tasks and features land here. |
| `priority: low` | Nice to have, no deadline. Most `enhancement` items land here. |

## Domain — which half of the repo it touches

`domain: frontend` (`frontend/`, React + Vite), `domain: backend` (`backend/`,
Django + DRF), `domain: infra` (CI, Render, Neon, Docker, `Makefile`,
`scripts/`). Pick more than one when it spans them — an API change with a
matching UI change is both.

## Status — why it is not moving

| Label | It is this when |
| --- | --- |
| `status: needs triage` | Filed but not yet labelled, sized or assigned. |
| `status: blocked` | Waiting on another issue. Set the **blocked by** field too. |
| `status: needs discussion` | The team has to agree on something before work starts. |
| `status: needs client` | Frank has to clarify something before work starts. |

`status: needs discussion` and `status: needs client` say *who* unblocks it, so
the right person can filter for their own pile. Both mean the issue is parked —
add `status: blocked` alongside only when a specific other issue is the blocker.

## agent-ready

Separate from all of this: the file paths and the `Done when` list are concrete
enough that a Claude Code agent could start without asking a question. Never put
it on an [open choice](body.md#open-choice) — an agent cannot pick between
options, and the label promises it can start.
