# Security and privacy

This is a community patch, not an OpenAI or RT-AI product. Modifying the copied
application executable changes its signature status. Do not disable Windows
Security or assume that an alert is a false positive. Inspect the exact alert.

The original Store application is read, never patched. Changes are confined to
the owned managed directory, its dedicated shortcuts, and its scheduled task.
No antivirus exceptions, global PowerShell execution-policy changes, elevation,
or account credentials are required by the installer. The launcher uses a process-scoped
PowerShell execution-policy argument to run its local scripts.

The patch updates the embedded ASAR header hash in the copied launcher; it
does not disable Electron's integrity fuse. Unknown archive/executable layouts
are rejected. A launch check with a fresh renderer profile uses a loopback debugging
port only during verification and closes it before activation. Normal launches
do not enable debugging. Never expose that port on a network interface.

The native platform may share account state even with a fresh renderer profile.
The patch does not read or copy authentication files; a fresh profile must not
be described as a guarantee that the native app is signed out.

Backups contain proprietary app files. Keep them on your own computer. They are
not encrypted and do not include your account profile or cloud conversations.
The patch sends no telemetry. npm setup downloads packages from the npm
registry; launching ChatGPT uses ChatGPT's normal network services. Logs contain
local paths, versions, timestamps, and error messages. Review them before sharing.

Report security problems privately through GitHub's private vulnerability
reporting **if the repository owner enables it**. Otherwise contact the owner
through a channel they publish. Do not post credentials or account data in issues.

The source license covers this project's code; it does not license OpenAI's
application, third-party bundled runtime components, or service access.
