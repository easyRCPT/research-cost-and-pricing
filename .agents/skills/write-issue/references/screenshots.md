# Pictures, annotation and getting them into GitHub

Include a screenshot when the problem is visual, when a layout or a piece of
copy is the evidence, or when it saves someone finding the screen themselves.
Most `bug` and `enhancement` issues on the frontend want one. Put it directly
under the first heading, not at the bottom under a `---`.

Screenshots of the running app come from the headless-Chrome CDP script, not
Playwright. Radix tabs need a `mousedown`, and panes need padding to test pinned
heads.

## Schema changes want a diagram, not a SQL block

GitHub renders a ```` ```mermaid ```` fence in an issue body, and an ER diagram
shows the foreign keys and the linked tables at a glance where DDL makes you
hold them in your head:

- **Draw the tables the change touches, plus the ones hanging off them.** The
  neighbours are how a reader sees what cascades.
- **Show existing and proposed as two diagrams**, in that order, and mark the new
  parts. The difference between them is the actual proposal.
- **Simplify.** Name the primary key, the foreign keys and the two or three
  columns the issue turns on.
- **Back it with the migration, do not replace it with the migration.**

Hand-drawn SVG is fine where a diagram is not a schema — a state machine, a
sequence, a layout that does not exist yet to screenshot.

## An unannotated screenshot is half a screenshot

The reader does not know where to look, so mark it up. `scripts/annotate.py`
draws numbered boxes on the image and a matching legend underneath, so callout
text never sits on top of the screenshot and nothing collides:

```bash
python3 .agents/skills/write-issue/scripts/annotate.py spec.json
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

## Ask once who uploads, then remember the answer

GitHub has no API for issue attachments, and a raw link to a file in the repo
will not render. The only route in is a real clipboard paste into a logged-in
browser. Two people can do that: you, if this session has browser tools, or the
user by hand.

**Ask before the first upload of the session, unless a memory already answers
it.** Check whether browser tools are available first, so you are offering
something you can actually do. Then put it plainly, and make the manual route
sound like the fine choice it is — it is three drags, and it keeps a browser
session out of the loop entirely.

Write the answer to memory as `issue-image-upload`, type `feedback`, with the
reason they gave. Re-ask only if they say something that contradicts it.

## When you upload, stage every image in one pass

1. `osascript -e 'set the clipboard to (read (POSIX file "…/shot.png") as «class PNGf»)'`
2. In a logged-in browser, click into the comment box on any issue, press
   **cmd+v**, and wait for the upload to finish.
3. Read the `https://github.com/user-attachments/assets/…` URL back out of the
   textarea, then **clear the box without posting**.

That box is a staging area, not a comment. Upload every image in one pass,
collect the URLs in order, then write the bodies with `gh issue edit`. Those
URLs render in any issue in the same repo, so it does not matter whose box you
stage them in.

## When they upload, leave them a trail

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
