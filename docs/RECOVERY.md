# Backups, updates, and recovery

## Inspect snapshots

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd backup list
.\chatgpt-rtl.cmd doctor
```

Snapshots are under `%LOCALAPPDATA%\Programs\ChatGPT-RTL`. Each original snapshot
has a file manifest with relative paths, byte sizes, and SHA-256 hashes. Patched
generations have their own verified manifests. Before a subsequent activation,
the existing active generation is verified and then retained as a previous
generation; its app files are not overwritten.

The current generation and two previous generations are kept. Originals used
by those generations are kept too. A failed first installation can leave its
verified pristine backup available for retry. These files may use several
gigabytes. Backups are local and unencrypted; account data is not included.
The managed app's persistent `profile` is separate from its program-file
snapshots and is retained across updates, rollback, and uninstall. The tool
does not change or migrate the original app profile. Removing the entire root
manually also removes this managed profile; sign-in and unsynchronized local
settings may then need to be recreated.

## Roll back

Close ChatGPT RTL, list backups, and choose:

```powershell
.\chatgpt-rtl.cmd rollback
.\chatgpt-rtl.cmd rollback --id PREVIOUS_ID
```

Rollback verifies the selected generation before switching the active pointer.
A damaged snapshot is refused. The generation you rejected is blocked from
automatic reactivation. After investigating or obtaining a fixed patch tool,
you can deliberately retry:

```powershell
.\chatgpt-rtl.cmd update --retry
```

The first installation has no prior patched generation. Return to the untouched
Store installation with:

```powershell
.\chatgpt-rtl.cmd rollback --original
```

Use the original ChatGPT shortcut, or `launch` while the active pointer is
disabled. The Store app must remain installed. Original-file snapshots are
available for verification and rebuilding; the patch does not change MSIX
registration or attempt a Store downgrade.

## Automatic updates

The task **ChatGPT RTL Safe Update** runs as the current user, without elevation,
at logon and daily at 12:00 local time. The launcher checks before opening too.
It compares the installed Store version and the local payload, builds a separate
copy if needed, and verifies compatibility and isolated startup before switching.
It does not download new project source or interrupt an open managed app.

Failed candidates remain blocked until an explicit retry or a different source/
payload produces a different candidate key. A Store version whose layout is
unrecognized leaves the previous copy active. A failed critical-file check at
launch falls back to the original app. This is failure containment, not a
promise that every future ChatGPT release is supported.

## Common failures

| Symptom | Action |
| --- | --- |
| Node/npm not found | Install Node.js LTS with npm; reopen the terminal and rerun setup. |
| npm network error | Restore registry access and rerun setup; the existing app copy is not replaced by dependency download failure. |
| App is running | Close only your managed ChatGPT RTL window; retry later. Background updates defer. |
| Insufficient disk space | Free space; retain needed backups. Do not delete the active generation. |
| Candidate blocked | Inspect logs and `doctor`; use `update --retry` only after addressing the failure. |
| Unknown module entry/hash/core setting | Keep the original or last working copy; a compatibility adapter update is needed. |
| Snapshot integrity failure | Do not activate that snapshot; use the original Store app and prepare a fresh copy after investigating. |
| Updates unavailable inside copied app | Update the original through Store and use this project's `update` command. |
| Windows Security alert | Inspect the precise alert; do not assume a false positive or disable protection. |
| Old rt25ai/mmnaderi task found | Inspect it in Task Scheduler; this project deliberately does not delete other tools' tasks. |

## Interrupted operations

`doctor` reports journals left in `preparing` or `validated` without becoming
active. The active pointer remains the committed generation. Run the relevant
command again after ensuring no managed copy is running. Dead process locks
are recovered automatically; a live lock is not removed.

If the disk or permissions prevent pointer/log writes themselves, do not edit
JSON blindly. Keep the managed folder, open the original Store app, and inspect
the last complete state and retained manifests. Cleanup can be deferred when
Windows still holds a file. No guarantee is made against physical disk failure
or corruption of every local backup; store a separate copy if you need that.

## Uninstall

```powershell
.\chatgpt-rtl.cmd uninstall
```

This disables the active patch, unregisters only this project's update task,
and removes shortcuts only when their arguments identify this controller.
It keeps snapshots and controller files for recovery. The original Store
installation and other patchers remain untouched. After checking that the
original app works and no task uses this root, you may manually remove the
managed folder if you no longer need its local snapshots.
