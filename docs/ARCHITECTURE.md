# Architecture and compatibility

## Components

| Component | Responsibility |
| --- | --- |
| `payload.js` | Text classification, visual isolation, editor adapters, streaming observation, and the inherited drag-region workaround. |
| `lib/archive.cjs` | Recognized ASAR layouts, payload injection, compatibility setting, header-hash replacement, and content-preservation checks. |
| `lib/store.cjs` | Owned paths, manifests, hashes, process locks, and atomic JSON writes. |
| `lib/manager.cjs` | Snapshots, staging, activation, retention, rollback, diagnostics, and logs. |
| `lib/smoke.cjs` | Temporary-profile native startup verification. |
| `cli.cjs` | Node operations, JSON/event output, and running-copy checks. |
| `chatgpt-rtl.ps1` | Windows UI, Store discovery, launch fallback, and integration. |
| `scripts/setup.ps1` | Node prerequisite check, locked dependency installation, and guided setup. |
| `scripts/deploy.cjs` | Verified stable-controller deployment. |
| `scripts/integration.ps1` | Desktop/Start menu shortcuts and their verification. |
| `scripts/progress.ps1` | Child-process output, progress display, and owned-tree cleanup. |
| `scripts/install-retry.ps1` | Explicit, one-time retry for blocked manual installation. |

## Renderer boundary

The renderer classifies each supported text flow independently. RTL script
letters and Latin letters determine a majority; a tie uses the first strong
character. Numbers, punctuation, code, and rendered math do not determine prose
direction. This is a script heuristic, not natural-language parsing.

Semantic blocks and independent labels receive scoped classes/styles. Flex/grid
layout containers keep their layout; no global `dir` or `lang` attributes are
added. Read-only Latin/numeric runs use isolation spans while original framework
Text anchors remain connected. Logical selection offsets are restored.

Editing uses CSS and, when available, the verified native CodeMirror decoration
and bidi APIs. Plain-text/Markdown metadata enables source-editor treatment;
CodeMirror metadata can be on `.cm-content`. Generic model children remain
untouched. No editor document changes are dispatched. Unknown source languages,
terminals, technical inputs, gutters, and fenced code remain protected.

Documents, accessible same-origin frames, and open shadow roots have separate
styles/observers. Work is batched across animation frames. The narrow inherited
drag-region workaround applies only to detected noninteractive phantom regions.
See [coverage](APP-WIDE-RTL.md) for adapters and limits.

## Archive transformation

The adapter reads `webview/index.html` and the optional recognized
`detached-window.html`. Each HTML page must identify one module entry whose path
stays inside the archive. Already-patched source bundles are rejected.

`@electron/asar` streams a new archive, preserving its file tree and each native
file's unpacked status. Only grounded entry bundles and the recognized package
setting change. Unmodified content is compared against pristine bytes, including
unpacked native files whose vendor header metadata may be stale. Archive links
require a separate tested adapter and are refused.

Electron's integrity reference hashes the ASAR header JSON, not the whole
archive. Matching 64-character SHA-256 references in copied launchers are
replaced without resizing the binaries. Missing references stop preparation;
integrity fuses are not disabled.

The recognized `codexWindowsAppContainedCore` value changes from `1` to `0`
so the copy can use its bundled core outside Store identity, following upstream.
An absent setting is left absent; unknown identities or setting values are
refused. Modifying a launcher changes its signature status.

## Managed storage

Default root: `%LOCALAPPDATA%\Programs\ChatGPT-RTL`.

```text
ChatGPT-RTL/
  .chatgpt-rtl-owned
  state.json
  operation.lock
  controller/
  profile/
  versions/<id>/app/
  versions/<id>/record.json
  backups/original-<fingerprint>/app/
  backups/original-<fingerprint>/manifest.json
  transactions/<id>.json
  logs/events.jsonl
```

`state.json` schema 1 tracks an active generation, up to two previous IDs, and
a blocked candidate key. Candidate identity combines source-tree and payload
hashes. Journals record `preparing`, `validated`, `committed`, or `failed`.
Pointer writes use a temporary file, flush, and rename. Failed preparation
cannot promote a candidate.

One live process owns the mutation lock. Dead-owner locks can be recovered.
Source and destination must not overlap. Paths stay within the marked root;
filesystem roots, banned user/system locations, traversal, and junction paths
are rejected. Cleanup follows successful activation and targets owned retired
generations. Controller deployment verifies only its selected source files and
keeps the immediately previous controller in case files remain in use.

Snapshots back up program files, not MSIX registration, conversations, or
profiles. The stable `profile` remains separate from generation records.

## Startup and launch

Candidate startup uses a new `--user-data-dir`, a dynamic debugging port, and
a loopback address. The check requires the new profile's port file, connects to
that endpoint, checks body content and payload readiness, and waits briefly for
early exit. It then closes the owned instance and removes the temporary profile
where possible. Normal launches do not enable debugging.

Before ordinary launch, the Windows wrapper attempts a noninteractive update.
It then verifies the active archive and launcher hashes. Critical-file failure
or a disabled active pointer falls back to the original Store app. Native
account state may be shared; no authentication files are copied. Readiness
does not prove every signed-in workflow or future vendor layout.
