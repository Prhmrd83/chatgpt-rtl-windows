# CLI reference

Double-click `chatgpt-rtl.cmd` for the menu. In a terminal, run commands from
the extracted source folder or the installed `controller` folder.

## Commands

| Command | Effect |
| --- | --- |
| `install` | Prepare and verify a copy, deploy the controller, and create integration. |
| `install --retry` | Explicitly retry a blocked candidate and restore integration after verification. |
| `launch` | Check for Store updates, verify critical files, and open the managed app; fall back to the Store app if no copy is active or verification fails. |
| `status` | Show the active generation, snapshot count, block status, and managed root. |
| `doctor` | Verify retained generations and originals, report interrupted preparation, and list matching legacy patcher tasks. |
| `update` | Rebuild if the original app or local payload changed. |
| `update --retry` | Retry a blocked candidate without deploying integration. |
| `backup list` | List tracked app generations and pristine snapshots. |
| `rollback` | Verify and select the previous retained generation. |
| `rollback --id ID` | Select a specific retained previous generation. |
| `rollback --original` | Disable the active copy and make the launcher use the original Store app. |
| `verify-launch` | Verify the active generation and run its temporary-profile startup check. |
| `uninstall` | Disable the copy and remove owned shortcuts/task, retaining snapshots and profile. |

Close the managed app before install, update, rollback, verify-launch, or
uninstall. Automatic checks defer rather than close a running session. Manual
commands return zero on success and nonzero on error. An unhealthy `doctor`
also returns nonzero; review its diagnostic output.

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd rollback --id PREVIOUS_ID
.\chatgpt-rtl.cmd install --retry -Root 'D:\ChatGPT-RTL'
```

## Windows options

`-Root PATH` selects the managed directory. The default is
`%LOCALAPPDATA%\Programs\ChatGPT-RTL` in an extracted source folder. An installed
controller defaults to its own marked parent root. Shortcuts and scheduled
updates pass the root explicitly. Use an empty, non-system destination on first
installation, outside the source app, with no junction ancestors.

`-NoColor` or a nonempty `NO_COLOR` environment variable disables colors.
Progress remains visible. Manual install/update display stages and elapsed
time; redirected output uses periodic lines instead of console animation.
Menu labels are English because terminal bidi support varies.

The task invokes `update -Automatic`. This avoids prompts and progress output,
records local errors, and never retries a blocked candidate implicitly.

## Node interface for maintainers

The Windows wrapper is the user interface. The underlying Node CLI provides
JSON and transaction operations without deploying shortcuts or a task:

```powershell
node .\cli.cjs status --root 'C:\local\rtl-test' --json
node .\cli.cjs doctor --root 'C:\local\rtl-test' --json
```

Installation accepts `--source`, `--source-version`, `--root`, and an optional
`--payload`. Only maintainers should supply a source manually; ordinary setup
discovers the Store package. `launch-path` returns a verified executable,
working directory, and persistent profile path, or `{ "original": true }`.
PowerShell performs the launch.

`--events` produces one JSON object per stdout line:

```json
{"type":"progress","message":"Checking source files"}
{"type":"result","result":{"active":"GENERATION_ID"}}
```

An error uses `{"type":"error","message":"..."}` with a nonzero exit. Blocked
candidates additionally carry `"code":"CANDIDATE_BLOCKED"`. `--json` emits a
single result without progress lines. Combining `--json` and `--events` is
rejected. Automatic Node operations suppress progress and log local diagnostics.

Profiles remain separate from program-file backups. Temporary verification
profiles are discarded where possible; ordinary profiles persist across
generations. Native account state can still be shared. See
[data boundaries](PROJECT.md#data-boundaries) and [recovery](RECOVERY.md).
