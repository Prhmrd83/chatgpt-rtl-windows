# Windows installation and user acceptance

This application has been developed and tested only on Windows.

## Before starting

- Use the unified Microsoft Store ChatGPT app with Chat, Work, and Codex.
- Install Node.js LTS from https://nodejs.org/en/download with npm included.
  The minimum supported version is 22.12.0. Reopen the terminal after installing.
- Save unfinished messages. Close the **managed ChatGPT RTL** app before
  installation, updates, or rollback. The installer does not kill sessions.
- Allow enough free disk space for local app snapshots. Installation checks
  for three times the source app's size plus 512 MiB of headroom before starting.
  Retained generations also occupy disk space.

## Required free disk space

For the Windows ChatGPT build `26.1007.2314.0` measured on 10 October 2026,
the original app files occupy approximately **2.16 GiB**. The current installer
requires approximately **7 GiB of free space** (about **7.5 GB in decimal units**).
Keep **8–10 GiB free** on the installation drive for a practical margin.
**5 GiB free is insufficient for this build's installation check.**

The required free space is calculated from the installed app's actual size:

```text
required free space = 3 × original app size + 512 MiB
```

This allowance covers a pristine backup, the separately patched app, temporary
archive preparation, and operational headroom. It is a conservative preparation
threshold, not the final installed size. The current check does not reduce its
estimate when an existing pristine backup can be reused. Future ChatGPT builds
can have different sizes; retained generations and profile data use additional
space over time, and updates also need free working space.

By default the installation drive is **C:**, because app copies and backups are
stored under `%LOCALAPPDATA%\Programs\ChatGPT-RTL`. Extracting the ZIP to another
drive alone does not change that destination. The CLI's `-Root` option can select
an alternate managed root; see [CLI reference](CLI.md).

If setup reports `Insufficient disk space; free space before retrying`, free
space on the **installation drive**, then run `setup.cmd` again. The message
comes from the free-space check, rather than a download/network failure.

## Install the review package

1. Extract the entire ZIP to a local folder. Do not run directly inside the ZIP.
2. Open that folder and double-click `setup.cmd`.
3. Wait for the locked dependency installation and the app preparation check.
   The first npm download needs an internet connection. A moving indicator shows
   the current stage and elapsed time even when the network produces no output.
   The indicator is indeterminate: it does not invent a download percentage.
   On slow connections, setup also displays a reminder that work can take longer.
4. Setup creates a verified local copy, snapshots, a stable controller,
   a **ChatGPT RTL** shortcut on the desktop and Start menu, and its own
   limited-privilege update task when task registration is available.
5. When setup succeeds it confirms: **Setup complete! A "ChatGPT RTL" shortcut
   has been added to your Desktop. Double-click it to open the app.**
   Look for the white knot, teal left arrow, and **RTL** icon on your Desktop
   (or search for **ChatGPT RTL** in Start). Re-running install refreshes both
   shortcuts and their icons. The original Store shortcut still opens the original app.
   This copy uses a separate persistent renderer profile, without migrating
   the original app's local settings. Native account state may be shared, so
   you may already be signed in; otherwise sign in yourself. Cloud content follows your normal account
   access; the patch does not export or copy conversations.

You can also open a terminal in the extracted folder:

```powershell
node --version
npm.cmd --version
npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund
.\chatgpt-rtl.cmd install
.\chatgpt-rtl.cmd launch
```

The launcher supplies a PowerShell execution-policy setting for its own process;
it does not change system or user policy. Managed environments can still block
scripts through enforced policy. In that case, inspect the policy error and
follow your organization's policy; do not disable security protection.

If a download fails, read the npm error shown above the setup error, check the
connection, and run `setup.cmd` again. A failed setup does not display the
success message. The icon is installed with the launcher; the shortcut does
not depend on the extracted ZIP folder after installation.

## Reinstall after rollback or uninstall

Rollback intentionally blocks the rejected app/patch combination to prevent
automatic reactivation. Uninstall retains this block along with backups and
the managed profile. This does not mean that downloading dependencies failed.

Starting with version **0.1.3**, run `setup.cmd` normally. If the candidate is
blocked, setup explains why and asks **Retry this installation now? [y/N]**.
Enter `y` only if you intentionally rolled back a working version or resolved
the earlier failure. Entering `n` or pressing Enter cancels; no success message
is shown, and the block and backups remain intact. One retry runs the full
verification and startup checks again. A further failure stops installation.

For a deliberate retry without this question, open a terminal in the extracted
folder and run:

```powershell
.\setup.cmd -Retry
```

If dependencies are already installed, use:

```powershell
.\chatgpt-rtl.cmd install --retry
```

Both installation paths recreate the Desktop/Start menu shortcuts and attempt
to register the update task after successful app preparation. `update --retry`
retries app preparation but does not restore integration removed by uninstall.
Scheduled updates never display this question or automatically retry a blocked
candidate. For an unresolved failure, inspect `chatgpt-rtl.cmd doctor` and the
reported error before retrying.

## User acceptance checklist

Use the patched shortcut and check these examples both while typing and in a
response. The text direction heuristic runs per paragraph.

```text
ChatGPT برای نوشتن و بررسی متن فارسی و انگلیسی به ما کمک می‌کند.
من برای نوشتن کد از ChatGPT و Visual Studio Code استفاده می‌کنم.
ChatGPT يساعدنا في كتابة النص العربي والإنجليزي بشكل صحيح.
ChatGPT עוזר לנו לכתוב ולבדוק טקסט בעברית ובאנגלית בצורה נכונה.
The Persian greeting سلام means hello in English.
نتیجهٔ محاسبه 2 + 3 = 5 درست است.
نسخهٔ 1.2.3 در تاریخ 2026-10-07 منتشر شد.
https://example.com/a?x=1&y=2
```

Also check:

- Pure English remains left-aligned. RTL prose reads right-to-left.
- Inline code and code blocks remain LTR and copy correctly.
- Typing, selecting, copying, undo, and replacing text with an equal-length
  English sentence work naturally.
- Streaming responses change direction when their content changes.
- Sidebar, mode buttons, menus, and embedded buttons remain clickable and keep
  their expected positions.
- Reopen the app and test the Chat/Work/Codex modes you actually use.
- Open a Question with options and its reply input; check direction and action order.
- Open Plan, document preview, and plain-text/Markdown file tabs. Test headings,
  lists, text selection, typing, copy, undo, save, and reopen. Keep code fences
  and source-code files LTR; verify saved characters exactly.
- Switch tabs and file types, and check a newly mounted panel.
- Run `status`, `backup list`, and `doctor`. Confirm that snapshots are present.

Rendering fixture tests and the native startup test have passed; see the dated
report for exact coverage. The owner chose to carry out the remaining native
checks in this review. This checklist covers behavior those tests cannot prove.
Record the app version, mode, example, and expected result for any failure.

## Recovery during review

Close the managed app first. On the first installation there may not be an
earlier patched generation; return to the original app with:

```powershell
.\chatgpt-rtl.cmd rollback --original
```

Open ChatGPT using its original Store shortcut. After a successful subsequent
update, use `rollback` to select the previous verified patched generation.

To disable the patch and remove its task and owned shortcuts:

```powershell
.\chatgpt-rtl.cmd uninstall
```

Snapshots are deliberately retained. Read [recovery](RECOVERY.md) before
manually deleting them. No publication to GitHub should occur until the owner
accepts the supplied review package.
