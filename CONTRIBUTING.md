# Contributing

Start with [architecture](docs/ARCHITECTURE.md) and
[development](docs/DEVELOPMENT.md). Use the committed lockfile and keep changes
focused on a reproducible problem.

## Report a bug

Include the installer version, Windows and Node.js versions, Store package
version, exact command or workflow, expected behavior, and redacted error.
For text-display problems, provide a short non-private example and expected
reading order. A screenshot alone may not preserve logical text order.

Do not attach conversations, credentials, account profiles, backups, app
archives, or proprietary vendor assets. Report security-sensitive findings
through the process in [SECURITY.md](SECURITY.md).

## Submit a change

1. Create a branch and reproduce the issue.
2. Make the smallest reliable fix and add a focused regression when practical.
3. Run the checks relevant to the changed components and update affected docs.
4. Describe the root cause, resulting behavior, tests executed, and limitations
   in the pull request.

For installation-only changes, use `npm.cmd run test:qa`. Renderer changes
require their own explicit scope and rendering checks. Do not refactor working
direction logic as part of an unrelated installation or documentation change.
Preserve source-file integrity, backup verification, atomic activation, rollback,
and the upstream copyright notice. Reject unknown app layouts rather than guess.

Never commit app copies, account data, generated local state, or secrets.
Do not weaken assertions to make a check pass. Distinguish synthetic fixtures,
native startup, and signed-in acceptance in every test report.
