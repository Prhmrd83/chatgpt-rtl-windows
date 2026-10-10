# CLI reference

Double-click `chatgpt-rtl.cmd` for the English menu. For scripted use, run it
from a terminal opened in the extracted project or installed controller folder.

| Command | Behavior |
| --- | --- |
| `install` | Prepare, verify, and activate a copied app; deploy tools and integration. |
| `launch` | Check Store updates, verify critical copied files, then open the active copy; use the original if no copy is active or critical verification fails. |
| `status` | Show active generation, retained snapshots, blocked candidate, and data directory. |
| `doctor` | Verify retained app snapshots and originals; report interrupted work and matching legacy patcher tasks. |
| `update` | Rebuild from the current Store app when source or payload changed. |
| `update --retry` | Explicitly retry a candidate blocked after failure or rollback. |
| `backup list` | List active, previous, and pristine snapshots. |
| `rollback` | Verify and activate the previous retained generation. |
| `rollback --id ID` | Select a specific retained previous generation. |
| `rollback --original` | Disable the active copied app; the launcher uses the original Store app. |
| `verify-launch` | Verify and launch-check the active copy with a fresh temporary renderer profile; requires it to be closed. |
| `uninstall` | Disable the active copy, unregister this project's task, and remove only its owned shortcuts. Keep snapshots for recovery. |

Examples:

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd backup list
.\chatgpt-rtl.cmd update
.\chatgpt-rtl.cmd rollback --original
.\chatgpt-rtl.cmd doctor
```

`-NoColor` or the `NO_COLOR` environment variable disables CLI colors.
PowerShell's `-Root PATH` parameter selects an alternate managed root for
development/testing. Production users should normally keep the default.
An alternate root must initially be empty and must not be a system directory,
filesystem root, or a path reached through a junction.

The scheduled task uses `update -Automatic`. It performs no interactive prompts,
does not close a running session, and records local errors instead of opening
dialogs. Manual commands return zero for success and nonzero for failure.

## Machine-readable core interface

The `.cmd`/PowerShell interface is the supported user interface. Maintainers can
call the underlying Node entry point to obtain JSON, without Windows shortcut
or task setup:

```powershell
node .\cli.cjs status --root "C:\path\to\managed-root" --json
node .\cli.cjs doctor --root "C:\path\to\managed-root" --json
```

Core installation accepts `--source`, `--source-version`, and `--root`.
Only developers should specify a source; normal installation discovers the
original Store package. Core commands do not deploy the controller or register
Windows integration. The internal `launch-path` returns a verified executable
path and dedicated profile path, or `{ "original": true }`; the PowerShell
layer launches it. The ordinary app profile persists across generations and is
not the temporary health-check profile. Native account state may still be
shared by the platform; no authentication files are copied by this tool.

`--events` is an opt-in JSON Lines protocol used by the interactive installer.
Each stdout line is a JSON object: `{ "type": "progress", "message": "..." }`,
followed by `{ "type": "result", "result": ... }` on completion, or
`{ "type": "error", "message": "..." }` with a nonzero exit on failure.
Use either `--json` or `--events`; combining them is rejected. The existing
`--json` interface continues to produce one JSON result with no progress lines.
Automatic updates suppress progress and retain their local diagnostic logs.

## Terminal behavior

The menu uses an ASCII panel and limited colors to work with ordinary Windows
consoles. App status and snapshot lists have human-readable output. Error details
and diagnostic reports remain available when needed. CLI labels are English;
the README includes Persian instructions to avoid relying on a terminal's own
bidi rendering support.

Setup and manual install/update show a moving ASCII indicator, current stage,
and elapsed time. The parent keeps animating while npm or the archive worker
is busy. Redirected output uses periodic status lines instead of carriage-return
animation. `-NoColor` and `NO_COLOR` do not disable progress.
