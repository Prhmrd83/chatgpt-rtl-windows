# Architecture and compatibility

## Components

| Component | Responsibility |
| --- | --- |
| `payload.js` | In-page text classification, visual isolation, editor CSS, streaming observation, and the inherited narrow drag-region workaround. |
| `lib/archive.cjs` | Recognized ASAR/webview layout, exact payload injection, app-contained-core setting, header-hash replacement, and untouched-content verification. |
| `lib/store.cjs` | Safe owned paths, file hashes, manifests, process lock, and atomic JSON writes. |
| `lib/manager.cjs` | Snapshots, candidate staging, activation, retention, rollback, integrity diagnostics, and transaction logs. |
| `lib/smoke.cjs` | Native startup verification through a fresh temporary renderer profile, without copying authentication files. |
| `cli.cjs` | Machine-readable operations and running-copy checks. |
| `chatgpt-rtl.ps1` | English UI, Store discovery, stable shortcuts, launcher fallback, and per-user scheduled task. |

## Renderer

The engine classifies accessible text across the application. Semantic blocks
and independent div/span labels receive text direction; flex/grid/layout
containers remain unchanged. Only scoped text-direction rules override vendor
alignment. No app-wide dir/lang attributes are added. Read-only Latin/numeric
runs use owned isolation spans, while original framework Text anchors remain
connected for streaming updates. Logical selection offsets are restored.

Editors use CSS with a native CodeMirror decoration adapter where the verified
module and public bidi APIs are available. Explicit plain-text/Markdown metadata enables source
adapters, including CodeMirror metadata on its internal .cm-content. Nested
editable blocks get positional CSS selectors. Generic model children stay
untouched; CodeMirror owns its decorations and selection mapping. The archive
adapter discovers the editor library through the recognized editor module's
imports and validates its public capabilities at runtime. No editor text or
document changes are dispatched by the patch.
Native fenced-code lines, technical inputs, terminals, math, and unknown code
editors remain protected. Input resets and file-language changes are rechecked.

Documents, open shadow roots, and accessible same-origin frames have separate
styles/observers. DOM and editor rule work is staged across animation frames.
See [app-wide coverage](APP-WIDE-RTL.md) for exact adapters, limits, and the
separate fixture/native release criteria.

The inherited drag-region workaround remains narrowly scoped to elements whose
computed state indicates a noninteractive phantom region. It does not give the
patch ownership of normal window chrome.

## Archive transformation

The adapter reads `webview/index.html` and requires exactly one recognized
module entry per supported HTML page (main and optional detached window). It does not inject into every file matching a guessed glob.
Entry paths must stay inside the archive. Source bundles already bearing an
RTL patch marker are refused; use the original Store app.

`@electron/asar` streams a new archive while preserving the original file tree
and each native file's unpacked status. Only the grounded entry bundles and recognized
package setting change. Unmodified files are checked against the actual
pristine bytes, including unpacked native files whose vendor header integrity
metadata can differ from the on-disk post-build file. Archive symlinks currently
require another tested adapter and are refused.

Electron's ASAR integrity reference hashes the header JSON, not the entire
archive. The adapter replaces matching 64-character SHA-256 references in the
copied ChatGPT/Codex launchers without resizing them. If no known reference is
found, compatibility is unestablished and activation stops. Integrity fuses are
not disabled.

The recognized `codexWindowsAppContainedCore` setting is changed from `1` to `0`
in the copy so the copied app can use its bundled core outside the Store package
identity, following the upstream mechanism. Unknown app identity or setting
values are refused. This does not make the modified executable officially signed.

## Transaction model

The default owned root is `%LOCALAPPDATA%\Programs\ChatGPT-RTL`:

```text
ChatGPT-RTL/
  .chatgpt-rtl-owned
  state.json
  operation.lock                  # only while an operation is running
  controller/                     # stable tool installation
  profile/                        # managed app profile; not an app-file backup
  versions/<id>/app/               # immutable copied app generation
  versions/<id>/record.json        # source, payload, health, and file hashes
  backups/original-<fingerprint>/app/
  backups/original-<fingerprint>/manifest.json
  transactions/<id>.json
  logs/events.jsonl
```

`state.json` has schema version 1, an active generation ID, up to two previous
IDs, and a blocked candidate key. Candidates are identified by the source tree
and payload hash. A transaction records `preparing`, `validated`, `committed`,
or `failed`. The state pointer is written to a temporary file, flushed, and
renamed into place. A failed preparation cannot promote its candidate.

One process owns the operation lock. A dead-owner lock can be recovered; a
live-owner lock prevents another mutation. Paths must be beneath the marked
root. System directories, filesystem roots, traversal, and reparse paths are
refused. Cleanup only addresses owned generation directories after successful
activation, with the immediately prior controller retained during tool deployment.

Snapshots are program-file backups. They are not copies of MSIX registration
or user profiles and cannot reinstall a removed Store package by themselves.

## Native health check

The candidate is launched with a new `--user-data-dir`, a dynamic debugging port,
and a loopback address. The check requires a port file in that new profile,
connects only to that endpoint, and confirms body content and the payload's
readiness flag. It waits briefly for early startup failure, then closes the
instance and removes the temporary profile where possible.

The ordinary launcher does not enable a debugging port. Tests do not log into
an account. Ordinary launches use the stable dedicated profile under the managed
root, independent of the temporary health-check profile and the original app's
renderer profile. Native account/task state may still be shared by the platform;
the patch does not copy authentication files.
Startup readiness does not prove signed-in conversations, service
acceptance of an older client, or all future DOM selectors. The user acceptance
test and rendering fixtures remain necessary.
