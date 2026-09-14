# Linking issues in GitHub, not in prose

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
