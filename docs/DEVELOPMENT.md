# Development and testing

## Environment

Use Windows, Windows PowerShell 5.1, and Node.js 22.12.0 or newer with npm.
Install the committed lockfile:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run test:qa
npm.cmd run check:docs
```

Production setup uses `--omit=dev`. `@electron/asar` and `playwright-core` are
runtime tools: archive preparation and native startup verification need them
after Store updates. The `playwright` development dependency supplies browsers
for rendering fixtures; users do not need those browser downloads.

## Installation and secondary-feature tests

`test:qa` runs the transaction/archive, installer/controller, and audit
regressions without executing the renderer suites. Individual commands are:

```powershell
npm.cmd run test:core
npm.cmd run test:installer
node --test tests/audit.test.cjs
```

Despite its name, `test:core` tests installation transactions and the archive
adapter, not the text-direction algorithm. It covers source preservation,
pristine snapshots, staged failures, source races, startup refusal, rollback,
blocked retries, retention, disk-space rejection, locks, path validation, and
real ASAR repacking with synthetic executable/native bytes.

Installer tests run delayed/failed child processes, progress events, argument
quoting, process-tree cleanup, retry decisions, and real shortcuts in temporary
directories. A local HTTP endpoint exercises a slow failed npm download.
Audit regressions cover overlapping paths, unrelated deployment junctions,
custom-root shortcuts/task arguments, and the installed controller's default
root. Task argument tests use controlled scheduler commands; they do not
register a task or alter user shortcuts.

Tests use disposable temporary folders. If the environment restricts atomic
rename or junction creation, select a permitted temporary directory or run with
appropriate test permissions. Do not alter production atomic writes or weaken
assertions to accommodate a sandbox. For example:

```powershell
New-Item -ItemType Directory -Force .\test-results\temp | Out-Null
$env:TEMP = (Resolve-Path .\test-results\temp).Path
$env:TMP = $env:TEMP
npm.cmd run test:qa
```

## Rendering suites

Run these when a renderer change is explicitly in scope:

```powershell
npx.cmd --no-install playwright install chromium
npm.cmd run test:render
npm.cmd run test:surfaces
```

`npm.cmd test` runs the QA and renderer suites together. The original 29
criteria in `tests/fixture.cjs` cover alignment, logical text preservation,
code/math isolation, editor DOM preservation, controls, streaming, and
equal-length edits. `tests/render.cjs` adds language/editor/selection cases.
`tests/surfaces.cjs` covers Questions, Plans, labels, previews, editor metadata,
dynamic panels, controlled resets, accessible frames, and open shadow roots.
Do not weaken the criteria to improve a score.

Optional local stylesheet validation:

```powershell
$env:RTL_STYLE_DIR = 'C:\local\app-styles\assets'
$env:RTL_APP_VERSION = 'INSTALLED_PACKAGE_VERSION'
npm.cmd run test:render
```

`RTL_CHROMIUM` selects an installed Chromium executable. Otherwise Playwright
uses its installed browser. Fixtures abort external requests. Outputs go to
ignored `test-results/`; do not commit proprietary styles or describe simulated
fixture screenshots as actual native panels.

## Native verification

Use a separate managed root and the original Store source. The Node interface
does not create shortcuts or a scheduled task:

```powershell
node .\cli.cjs install --root 'C:\local\rtl-native-test' --source 'PATH_TO_ORIGINAL_STORE_APP_DIRECTORY' --source-version 'INSTALLED_PACKAGE_VERSION'
node .\cli.cjs doctor --root 'C:\local\rtl-native-test' --json
```

Never use WindowsApps or a source-app subdirectory as the destination. The
source is read only. Startup verification must use a fresh renderer profile,
check payload readiness, and close its loopback debugging instance. It must
not attach to an existing browser session or copy account files. Native account
state can still be shared. Startup does not establish signed-in or editor
acceptance; see [validation](TEST-RESULTS.md).

## Continuous integration

The [Windows workflow](../.github/workflows/tests.yml) runs installation QA,
documentation checks, and PowerShell parsing. Renderer fixtures run when their
source/test files or the archive adapter change, or when explicitly selected
in a manual workflow run. The runner does not contain a licensed ChatGPT app;
native startup and signed-in workflows require a separate environment.

## Packaging and release

Include source, launchers, assets, the lockfile, license notices, documentation,
and tests. Exclude `.git`, `node_modules`, app copies, profiles, local state,
logs, and generated screenshots. After committing the intended files, create
a source ZIP and checksum:

```powershell
git archive --format=zip --output=..\chatgpt-rtl-windows-source.zip HEAD
Get-FileHash ..\chatgpt-rtl-windows-source.zip -Algorithm SHA256
```

The icon's PNG/ICO are committed; Pillow was used to create the ICO variants
and is not a runtime dependency. See [artwork provenance](../assets/README.md).

Keep installer and renderer versions distinct. Record actual test scope, app
version, and pending checks. A source snapshot is not a release artifact or a
compatibility guarantee. Publishing a release requires the owner's approval.
