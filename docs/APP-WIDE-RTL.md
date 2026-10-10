# App-wide RTL — version 0.1.2

This application has been developed and tested only on Windows.

## The problem addressed

Earlier versions classified message paragraphs and the composer. A Work
Question prompt can instead be a block `span` outside message Markdown;
Plan and file tabs can use a separate editor. These surfaces retained LTR
direction, so English names at the beginning of Persian prose could produce
the wrong reading order. The supplied Question and Plan examples are retained
as regression fixtures.

The engine now walks accessible text throughout each recognized renderer.
It classifies paragraphs, headings, captions, list items, standalone text
blocks, question/option labels, menu labels, tooltips, and ordinary text inputs.
Persian, Arabic, and Hebrew examples, along with mostly English prose containing
RTL words, are covered separately in the surface suite.

## Text direction and interface layout

Direction belongs to a text flow. Flex/grid panels and controls containing
icons or buttons keep their layout. Direct text inside those controls receives
an owned inline text run instead of direction on its layout container.
No application-wide `dir` or `lang` attribute is added. English-only labels
retain their vendor alignment. Code, terminal output, math, line-number gutters,
and technical URL/email inputs are excluded.

Readable ordering is the primary criterion. A narrow option label may remain
anchored on the left of its row while its text reads RTL. The patch does not
move numbered markers or action arrows merely to force right alignment.

Read-only RTL prose isolates Latin and numeric runs, including names, URLs,
versions, dates, and arithmetic. The string and link destination stay intact.
The framework's original Text node stays connected as an update anchor; later
updates retire generated fragments before reclassification. Selection offsets
are mapped through the visual transformation. Generated runs never become file
content, and the patch does not send or save text.

## Editing adapters

- Ordinary textarea and text/search inputs: value-aware CSS direction, including
  controlled resets that do not dispatch an input event.
- Rich text / contenteditable: CSS direction per text block, including nested
  paragraphs and headings. Child text and model DOM are not wrapped or rewritten.
- CodeMirror: plain-text or Markdown is accepted only from explicit language
  metadata on the editor or its `.cm-content`. The native Plan editor places
  `data-language="markdown"` on `.cm-content`; 0.1.2 detects that placement.
  Direction is applied to existing lines using positional selectors. When the
  installed app exposes its verified CodeMirror module, the adapter additionally
  uses the editor's own decorations and bidi-isolation API for Latin/numeric
  runs. Per-line bidi configuration keeps cursor geometry aware of direction;
  no characters or document changes are dispatched. Fenced
  code lines, Markdown table syntax, and gutters retain LTR direction.
- Monaco and other declared file editors: only explicit supported plain-text
  or Markdown metadata enables their text-line adapter. Unknown/source-code
  editors are left protected until a separately tested adapter exists.

The adapter removes its plain-text treatment when a tab changes to a code
language. No document text, editor selection model, undo stack, or save
implementation is replaced. CodeMirror decorations belong to the native editor,
with its own selection mapping, rather than external DOM wrappers. Other
editing surfaces have fewer inline isolation opportunities than read-only
rendering: CSS cannot split a plain textarea value into separate LTR runs. Native cursor, copy, undo, and saved-byte behavior therefore require
real-editor acceptance, beyond direction assertions in fixtures.

## Dynamic panels and performance

Each document, accessible same-origin embedded document, and open Shadow DOM
gets its own observer and stylesheet. Newly mounted tabs and streaming text
enter a deduplicated queue. Late-attached open shadow roots and controlled
input-value resets are checked periodically; detached roots are retired.
Classification runs in batches of at most 160 elements per animation frame,
with a queue cap of 4,000. Editor rule construction is also staged across
frames and replaced when newer edits arrive. Text classification reads at most
4,000 characters per block. Extremely long or unusual text remains subject
to that heuristic and needs examples when reported as a failure.

Both `index.html` and the optional recognized `detached-window.html` entry are
patched from the exact module URLs in their HTML. Unrecognized module layouts
are rejected rather than guessed. Native detached-window behavior must still
be validated on the installed app build.

## Limits and release criteria

Raster image text, canvas-only/PDF raster content, closed Shadow DOM, and
inaccessible external frames cannot be rewritten through this DOM patch.
Source-code editors and terminals are intentionally protected. Script counting
is a direction heuristic, not a language parser; ambiguous prose needs a
regression example. Future app versions can change editor structures.

Keep fixture results and real native-panel results separate. The 0.1.2 review
candidate retains 29/29 in both baseline environments, supplemental regressions,
and recorded native startup/backups/rollback evidence. On 9 October 2026 the
owner elected to perform the remaining native-panel acceptance checks himself
and requested a test package. The ZIP therefore represents an owner-test
candidate, not a claim of complete native validation. Publication remains
blocked until the owner's final approval. See the exact pending checks in
[test results](TEST-RESULTS.md).

Installation, profile, backup paths, shortcut names, and the existing icon are
unchanged. See [test results](TEST-RESULTS.md), [architecture](ARCHITECTURE.md),
[development](DEVELOPMENT.md), and [installation](INSTALLATION.md).
