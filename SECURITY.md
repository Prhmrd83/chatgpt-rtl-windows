# Security and privacy

ChatGPT RTL Windows is an independent community patch. It reads the original
Store app and modifies a copy in the managed directory. Patching an executable
changes its signature status. Inspect Windows Security alerts; do not disable
protection or assume an alert is harmless.

## Installation boundaries

Setup does not require elevation, antivirus exceptions, credentials, or changes
to global PowerShell policy. Launchers use a process-scoped execution-policy
argument. Enforced organizational policies may still block them.

The archive adapter updates recognized header-hash references without disabling
Electron's integrity fuse. Unknown structures are rejected. Managed source and
destination paths must be separate; symlink/junction traversal is refused in
managed paths and copied source trees.

Temporary startup verification enables a dynamic loopback debugging endpoint,
checks a fresh renderer profile, and closes the owned instance before activation.
Ordinary launches do not enable debugging. Never expose the verification port
on a network interface.

## Data and network access

The installer does not copy authentication files or migrate the original
profile. Native account state may be shared despite a separate renderer
profile; a fresh profile does not guarantee sign-out.

Backups contain local proprietary program files. They are unencrypted and do
not include cloud conversations or the account profile. Keep them private.
The tool adds no telemetry. npm setup downloads locked dependencies; ordinary
ChatGPT sessions use the application's normal services.

Logs include paths, versions, timestamps, and errors. Review and redact them
before sharing. Do not upload copied app files, account data, or credentials.
The source license does not license OpenAI binaries or service access.

## Report a vulnerability

Use GitHub private vulnerability reporting if it is enabled for this repository.
Otherwise contact the maintainer through a private channel they publish. Do not
post secrets or account data in a public issue. No response-time or support
guarantee is stated for this community project.
