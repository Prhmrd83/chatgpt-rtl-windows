# Validation report

## 0.1.3 — reinstall recovery

Validation date: **11 October 2026**. Platform: Windows.

- Transaction/archive tests: **26/26 passed**. New regressions reproduce
  install → original rollback → uninstall → blocked install → explicit retry,
  retained backups, failed startup on retry, and typed CLI error events.
- Installer/controller tests: **21/21 passed**. New cases cover accepting,
  declining, empty input, one retry only, automatic/noninteractive behavior,
  unrelated errors, restoration of integration only after success, and the
  actual `setup.cmd -Retry` entry point from a folder with spaces.
- Original rendering: **29/29 neutral and 29/29 with installed-app styles**
  (retained stylesheet assets from `26.1002.7124.0`). Supplemental rendering:
  **15/15**. App-wide surface fixtures: **116/116**. The renderer payload is
  byte-identical to the tested 0.1.2 payload.
- All shipped PowerShell scripts parse successfully.

The reinstall app lifecycle uses synthetic source files and controlled startup
checks. Windows wrapper tests execute the actual install/retry functions with
controlled worker results and temporary shortcuts. They do not reinstall the
owner's real Store app or claim a new native-panel acceptance test.
Earlier sandbox-only temporary-file rename restrictions were resolved by using
a writable workspace test directory; test assertions were not weakened.

## 0.1.2 — historical validation

Validation date: **9 October 2026**. Platform: Windows. Node.js: `24.15.0`.
Store package: **OpenAI.Codex 26.1002.7124.0**.
This application has been developed and tested only on Windows.

**Status: ready for owner acceptance, not fully validated native behavior.**
The owner elected to perform the remaining final app tests himself and requested
a test ZIP. No code has been pushed; publication requires his final approval.
Readable ordering is the primary criterion. Short option labels may remain
anchored on the left if their text reads correctly and controls keep their positions.

| Test group | Result | Scope |
| --- | --- | --- |
| Original neutral rendering | **29/29 passed** | Unchanged original criteria in isolated Chromium. |
| Original rendering with installed-app styles | **29/29 passed** | Selected local stylesheet assets from the installed build. |
| Supplemental rendering | **15/15 passed** | Languages, editing, selection, streaming, and framework anchors. |
| App-wide surfaces | **116/116 passed** | Controlled Question/Plan reproductions, options, labels, inputs, previews, editor metadata, nested editing, dynamic panels, open shadow roots, accessible frames, and staged 3,000-paragraph processing. |
| Transaction/archive regressions | **23/23 passed** | Backups, corruption refusal, rollback, source races, locks, retention, exact module injection, detached entry, editor-module discovery, and native-file preservation. |
| Installer/controller regressions | **10/10 passed** | Silent/slow processes, delayed/disconnecting local npm endpoint, errors, events, JSON output, paths with spaces, and real temporary shortcuts with stable icons. |
| Native vendor CodeMirror integration | **18/18 passed** | Actual vendor library in native Electron, controlled test editor: model, four languages, LTR literals, native selection mapping, edits, and file-type switching. Not an actual file-tab save/copy/undo test. |
| Native copied-app startup | Passed | Copied executable loads renderer 0.1.2; shipped payload hash matches the tested candidate. |
| Native backup/update/rollback integrity | Passed | Previous copied generation selected, latest restored, pristine backup and retained app manifests verified. Same Store build throughout. |
| Actual Plan and Question | Partial evidence | Authenticated Plan direction/native adapter observed. Owner supplied a real Question screenshot showing RTL text and LTR arithmetic. Visual evidence, not full interaction acceptance. |
| Final actual file/editor acceptance | **Owner test pending** | Save/reopen, clipboard, undo, cursor movement, and all actual preview/editor types. |

## Corrections and regression criteria

The supplied Question and Plan text is retained in fixtures. The earlier
message-only renderer passed 36/58 of the initial surface checks. That earlier
set has fewer checks than the current suite and is not directly comparable to
its denominator. App-wide text-flow scanning covers labels and panels outside
message Markdown without setting global RTL direction.

Actual Plan inspection found Markdown language metadata on `.cm-content`,
rather than its `.cm-editor` wrapper; the adapter now reads it. A first editing
implementation added markers inside model children and failed the original
child-DOM preservation test. Positional CSS replaced those child markers;
the unchanged original suite returned to 29/29.

CodeMirror uses native decoration and bidi-isolation APIs without changing its
document. Other editable areas receive CSS only. Original framework Text nodes
remain connected, and streaming updates retire owned fragments before
reclassification. Source code, terminals, fences, table syntax, and gutters stay LTR.

The vendor Question option wrapper structure is reproduced for four languages.
Tests cover direction, arithmetic order, exact logical text, marker/arrow
positions, click targets, and return to English. They do not require moving
short labels to the right, following the owner's readability preference.
The original 29 checks were not weakened.

## Native and account boundaries

Native tests used a separate managed root and copied application files. Store
source files were read and hashed, never patched. Existing profiles and
credentials were not read or copied. A fresh renderer profile does not guarantee
that the native platform is signed out: account/task state may be shared, and
the owner reported the copy was already signed in. Earlier descriptions of an
“unauthenticated” profile should not be interpreted as that guarantee.

Startup proves the copy opens and the patch loads, not every live panel.
The vendor-editor component test does not prove actual file persistence or
clipboard/undo behavior. Tests used the same Store version and cannot establish
compatibility across a real vendor-version update.

## Remaining acceptance and limits

- Follow [installation acceptance](INSTALLATION.md) for actual Question replies,
  Plan, file previews, plain-text/Markdown editing, cursor movement, selection,
  copy, undo, save, and reopen.
- Verify setup on your own Desktop and Start menu. Real shortcuts were tested
  in temporary directories; fresh end-user setup remains an acceptance step.
- Unknown editor languages stay protected. Raster text, canvas/PDF raster content,
  closed Shadow DOM, and inaccessible external frames are outside DOM correction.
- Future app versions and every mixed-script sentence are not guaranteed.
- GitHub Actions has not run: no push occurred before approval.

## Evidence

See [automatic suite output](automated-results.txt),
[render results](render-results.json), [surface results](surface-results.json),
[native startup/rollback](native-results.json), and
[native editor component results](native-editor-results.json).
Fixture screenshots are simulated surfaces, not native panel screenshots.
The owner's Question screenshot is not redistributed with source because it
contains personal sidebar content. Earlier 0.1.1 TAP reports are replaced by the
current combined automatic-suite output.

Counts are diagnostic checks, not reliability percentages or a claim of flawless
operation. This ZIP is an owner-test candidate, not an approved public release.
