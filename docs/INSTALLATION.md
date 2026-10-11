# Windows installation

## Requirements

- Windows with the unified Microsoft Store package `OpenAI.Codex` installed.
  ChatGPT Classic, macOS, Linux, browser, and mobile versions are not supported.
- [Node.js LTS with npm](https://nodejs.org/en/download), version 22.12.0 or newer.
  Reopen your terminal after installing Node.js.
- Windows PowerShell 5.1, used explicitly by the `.cmd` launchers.
- Internet access to the npm registry for initial setup.
- Free space for the pristine snapshot, candidate, and archive preparation.

Save unfinished work and close the managed **ChatGPT RTL** app before setup.
The installer does not close your sessions. Administrator mode is not required.
Enforced organizational script policies may still prevent setup.

## Disk space and destination

The preparation check requires:

```text
free space >= 3 × original app size + 512 MiB
```

The `26.1007.2314.0` build measured on 10 October 2026 occupied about 2.16 GiB,
requiring about 7 GiB free (7.5 GB in decimal units). Allowing 8–10 GiB gives
working room; 5 GiB does not meet this build's check. These figures are
build-specific, not fixed requirements for future versions.

The default root is `%LOCALAPPDATA%\Programs\ChatGPT-RTL`, usually on C:.
Extracting the source ZIP to another drive does not change this destination.
The check remains conservative when an existing pristine backup can be reused.
Retained copies and the managed profile need additional space over time.

## Guided setup

1. [Download the source ZIP](https://github.com/Prhmrd83/chatgpt-rtl-windows/archive/refs/heads/main.zip)
   or clone the repository, then open the local source folder. Extract ZIPs
   completely; do not run setup inside an archive.
2. Double-click `setup.cmd`.
3. Wait for dependency installation and app preparation. Setup displays the
   stage and elapsed time even when a download has no output. The indicator
   does not report an estimated percentage.
4. When setup confirms success, open the **ChatGPT RTL** Desktop or Start menu
   shortcut, identified by its RTL arrow icon.

Setup creates verified snapshots, a managed app copy, a stable controller,
shortcuts, and an update task when registration succeeds. Re-running install
refreshes integration. The original Store shortcut still opens the original app.
After successful controller deployment, the extracted folder is not needed
for shortcuts or scheduled updates.

The copy has a persistent renderer profile. Native account state may already
be shared; otherwise sign in normally. The installer does not migrate your
original profile, copy credentials, or export conversations.

## Terminal installation

Open a terminal in the source folder:

```powershell
node --version
npm.cmd --version
npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund
.\chatgpt-rtl.cmd install
.\chatgpt-rtl.cmd launch
```

`setup.cmd` runs the dependency and installation steps for you. The launchers
use a process-scoped PowerShell execution-policy argument; they do not change
user or machine policy. Follow your organization's policy if execution is blocked.

For an alternate destination, install dependencies as above, then use:

```powershell
.\chatgpt-rtl.cmd install -Root 'D:\ChatGPT-RTL'
.\chatgpt-rtl.cmd status -Root 'D:\ChatGPT-RTL'
```

Choose a new empty root outside the source app and extracted tool folder.
Do not use a filesystem root, WindowsApps, a protected system location, or a
path through a junction. Shortcuts and the task retain the selected root.
Commands inside its installed `controller` folder default to that root.
Desktop shortcuts and the task have fixed per-user names; maintain one
integrated installation per Windows user.

## Update the installer

Download and extract the reviewed new tool source into a fresh folder. Close
the managed app and run that folder's `setup.cmd`, or install dependencies
and run `install` with the same `-Root` used previously. This refreshes the
controller without replacing the persistent profile.

Store app updates use `update` and the existing controller; they do not
download new project source. See [recovery](RECOVERY.md#automatic-updates).

## Reinstall after rollback or uninstall

Rollback blocks the rejected source/payload combination to prevent automatic
reactivation. Uninstall retains this block, snapshots, and profile.

In installer 0.1.3, ordinary setup explains a blocked candidate and asks:
`Retry this installation now? [y/N]`. Enter `y` only after resolving a failure
or deliberately returning to a working version. Enter or `n` cancels. One retry
runs the full checks; another failure stops setup without a success message.

For explicit retry:

```powershell
.\setup.cmd -Retry
```

With dependencies already installed:

```powershell
.\chatgpt-rtl.cmd install --retry
```

Add `-Root` when using a custom root from the extracted folder. `install`
restores shortcuts and attempts task registration. `update --retry` only
prepares the app and does not restore integration removed by uninstall.
Automatic checks never ask this question or bypass the blocked candidate.

## Check installation

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd backup list
.\chatgpt-rtl.cmd doctor
```

Confirm that an active generation and snapshots are listed. Open the installed
shortcut, then close the managed copy before running `verify-launch` if a fresh
startup check is needed. Native startup verifies payload readiness, not every
signed-in workflow. [Validation](TEST-RESULTS.md) records tested environments;
[coverage](APP-WIDE-RTL.md#native-acceptance-checklist) retains native acceptance examples.

## Disable or uninstall

```powershell
.\chatgpt-rtl.cmd rollback --original
.\chatgpt-rtl.cmd uninstall
```

The first command disables the managed copy. The second also removes the owned
shortcuts and task. Both retain snapshots and the profile. Open the original
Store shortcut afterward. See [recovery](RECOVERY.md) before deleting data.

## Installation errors

Read the error above the final setup message. npm errors concern dependency
downloads; insufficient-space errors concern the managed installation drive.
Restore registry access or free space, then rerun setup. Failed setup does not
announce success. For blocked candidates, integrity failures, running sessions,
or unknown vendor layouts, use the [troubleshooting table](RECOVERY.md#common-failures).
