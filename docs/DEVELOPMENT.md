# Development and testing

## Reproducible environment

This application has been developed and tested only on Windows.

Use Windows, Node.js 22.12 or newer, and the committed package lock:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npx.cmd --no-install playwright install chromium
npm.cmd test
```

Production installation uses `npm ci --omit=dev`. Tests additionally install
Playwright and its Chromium runtime. `@electron/asar` and `playwright-core` are
production tools because native health checks must run after future Store
updates. No global npm tools are required.

The Windows workflow runs fixture tests, transaction/archive tests, and
PowerShell parsing. It does not contain a licensed ChatGPT installation, so
it cannot claim native startup or signed-in acceptance on the runner.

## Installer feedback and shortcuts

Run `npm.cmd run test:installer` on Windows. This suite runs child processes
with delayed or absent output, staged events, stderr failures, quiet operation,
argument quoting, protocol failures, and child-tree cleanup. It creates and
reopens real `.lnk` files only in temporary test directories, checks the custom
icon, and checks that repeated installation refreshes the shortcut. It does
not register a scheduled task or overwrite your Desktop shortcuts.

`assets/chatgpt-rtl.png` is the generated source image. The committed ICO has
16, 24, 32, 48, 64, 128, and 256 pixel variants. Python/Pillow is a development
packaging tool only; users do not need it or an image-generation service.

## Rendering tests

`tests/fixture.cjs` preserves the original 29 baseline criteria. Tests check
rendered alignment, literal character order, code/math isolation, lists,
message text preservation, editor child-DOM preservation, control/sidebar
layout, streaming, equal-length edits, typing, bounded append completion,
and JavaScript errors. `tests/render.cjs` adds language/editor/selection checks.
`tests/surfaces.cjs` reproduces the supplied Question/Plan examples and covers
independent UI labels, reply inputs, code protection, file-editor metadata,
nested editing blocks, dynamic panels, controlled resets, and open shadow roots.
Run `npm.cmd run test:surfaces` separately or `npm.cmd test` for all fixtures.
Its screenshots are controlled fixtures and must never be described as native
panel screenshots. See [app-wide RTL](APP-WIDE-RTL.md).

For a second run with stylesheet files extracted read-only from a local
installed app, set these optional variables:

```powershell
$env:RTL_STYLE_DIR = 'C:\local\app-styles\assets'
$env:RTL_APP_VERSION = 'YOUR_INSTALLED_PACKAGE_VERSION'
npm.cmd run test:render
```

`RTL_CHROMIUM` can select an already-installed Chromium executable for local
testing. Without it, Playwright uses the Chromium installed for its version.
The test routes external browser requests to an abort handler. App styles
remain local; do not commit proprietary styles, binaries, or archives.
Reports and screenshots go to `test-results/`, which is ignored by Git.

The numerical 29/29 score is an acceptance count, not a reliability percentage.
Do not weaken expectations to raise the score. Add regressions for additional
languages, layouts, ambiguous examples, editor behavior, or performance changes.

## Transaction and adapter tests

```powershell
npm.cmd run test:core
```

Synthetic files test byte-preserving hash replacement, malformed archives,
unknown manifest settings, grounded entry paths, traversal refusal, ownership
markers, concurrent locking, source preservation, verified snapshots,
injected copy/patch/validation failures, failed launch, a changing source,
tampered originals/rollback targets, blocked-candidate behavior, original
rollback, retention, disk-space checks, interrupted journals, and real ASAR
repacking with unpacked native bytes. The synthetic executable is test data,
not an OpenAI binary. Tests use disposable directories and remove them afterward.

On an environment that denies normal filesystem rename/delete behavior, run
tests in a normal allowed workspace before diagnosing a product failure.
Do not change production atomic-write behavior just to accommodate a sandbox.

## Native verification

The production installer invokes the isolated smoke check. Developers can
create a separate managed root through the core CLI; that does not create user
shortcuts or scheduled tasks:

```powershell
node .\cli.cjs install --root 'C:\local\rtl-native-test' --source 'PATH_TO_ORIGINAL_STORE_APP_DIRECTORY' --source-version 'INSTALLED_PACKAGE_VERSION'
node .\cli.cjs doctor --root 'C:\local\rtl-native-test' --json
```

Select a fresh test root and retain its backups until validation is complete.
Never use the WindowsApps directory as the managed root. Source is only read.
The check must establish a new renderer profile and the payload readiness flag;
it must not attach to an existing browser session or copy authentication files.
The native platform can still share account state. No debug port should
remain enabled after the check. Use [the user acceptance checklist](INSTALLATION.md)
for authenticated/native behavior beyond this test.

## Contributor rules

- Keep the original MIT notice and upstream attribution.
- Preserve source, active-copy, backup, and rollback integrity checks.
- Reject unknown app structures instead of guessing a destructive patch.
- Do not add network telemetry, account-profile copying, or unpinned tool
  downloads to update tasks.
- Limit text direction to independent text flows; preserve control layout and editor models.
- Keep Windows path handling correct and test paths with spaces.
- Keep generated source snapshots, local paths, app binaries, and credentials
  out of commits and distributable artifacts.

## Packaging

The review ZIP contains project source, the lockfile, license notices,
documentation, launchers, tests, and workflow definition. It excludes
`node_modules`, test screenshots, application copies, local manifests,
logs, account profiles, and `.git`. The setup command installs pinned tools
on the recipient's computer. A SHA-256 checksum accompanies the ZIP.

For this 0.1.2 review, the owner elected to perform the remaining real-panel
acceptance checks and requested a test ZIP. Report pending Question/file/editor
checks explicitly; do not describe an owner-test ZIP as fully validated.
The owner must approve it before the first repository push. Future releases should rerun all checks, record
the app version and limitations, and keep test evidence separate from promises
about untested vendor releases.
