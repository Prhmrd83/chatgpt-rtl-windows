# Project overview

ChatGPT RTL Windows is a per-user installer and renderer patch for the unified
Windows Microsoft Store package `OpenAI.Codex`. It creates a verified app copy
that applies text direction independently across supported Chat, Work, and
Codex surfaces. It does not convert the entire interface to an RTL layout.

Installer 0.1.3 ships renderer 0.1.2. These versions identify different
components: reinstall and installation fixes do not require a renderer change.
The supported environment is Windows, Windows PowerShell 5.1, and Node.js
22.12.0 or newer with npm. All npm tools are locked. Installation downloads
them once; subsequent app updates use the local controller.

## Installation lifecycle

1. Discover the original Store package and its expected application archive.
2. Refuse a running managed copy or overlapping source/destination paths and
   acquire an exclusive operation lock.
3. Hash the source tree and check available disk space.
4. Create or verify a pristine snapshot.
5. Prepare a separate candidate from that snapshot.
6. Patch recognized renderer entries and compatibility settings in the copy.
7. Check archive preservation and embedded launcher hashes.
8. Start the candidate with a fresh renderer profile, verify payload readiness,
   and close the verification instance.
9. Verify that the Store source did not change during preparation.
10. Save a verified record and atomically replace the active pointer.

Installation then deploys a stable controller, creates Desktop/Start menu
shortcuts, and attempts to register the per-user update task. Task-registration
failure is reported as a warning; manual updates remain available. A controller
or shortcut failure returns an error even if app preparation succeeded.

No original Store files are patched. A failed candidate does not replace the
previous active copy. Exact component responsibilities and archive boundaries
are documented in [architecture](ARCHITECTURE.md).

## Updates and recovery

Microsoft Store updates the original app. The managed launcher checks before
opening, and its task checks at logon and daily at 12:00 in Windows local time.
A running managed app defers preparation. Source/payload changes produce a new
candidate; a blocked candidate needs explicit retry. Startup checks do not
guarantee that every UI surface remains compatible with a new vendor build.

The copied app operates outside its Store identity, so its built-in update
panel may report updates unavailable. Use the Store app and the tool's `update`
command. Installer source updates are manual: extract a reviewed new source
package and run setup to refresh the controller.

The current copy and up to two previous copies are tracked. Referenced original
snapshots are deduplicated by source fingerprint. Pruning follows successful
activation. Rollback verifies a retained copy before selecting it and blocks
the rejected candidate. `rollback --original` clears the active pointer;
`uninstall` also removes owned integration. See [recovery](RECOVERY.md).

## Data boundaries

The managed `profile` persists across generations and rollback. It is separate
from temporary verification profiles and the original renderer profile. Native
account state may be shared by the platform; a fresh renderer profile does not
guarantee sign-out. No authentication files are copied by the installer.

Snapshots contain application program files. They do not back up cloud
conversations, account credentials, user profiles, or MSIX registration. They
cannot reinstall a removed Store package. Logs remain local and may contain
machine-specific paths; review them before sharing.

## Renderer reference

The renderer uses script-based direction classification, scoped styles,
read-only LTR isolation, and supported editor adapters. The heuristic is not a
language parser. Ambiguous quotations and unusual punctuation need examples
when reported. [App-wide coverage](APP-WIDE-RTL.md) and
[architecture](ARCHITECTURE.md) preserve the detailed behavior and exclusions.

## Origin and licensing

This project derives from RT-AI ChatGPT Desktop RTL by RT-AI / Roi Itach,
baseline `1687240e91d2ab13cd87caba4e2906eaa78f3162` (v0.7.2). The inherited
renderer approach, narrow drag-region workaround, header-hash replacement,
and Store-identity compatibility mechanism are attributed in [NOTICE](../NOTICE.md).

The source is [MIT licensed](../LICENSE), including personal and commercial
use, modification, redistribution, and sublicensing. Retain the copyright
and permission notice. The license does not cover proprietary app files,
service access, or third-party trademarks. No affiliation or endorsement
by OpenAI or RT-AI is implied.

## Further reading

Start with [installation](INSTALLATION.md), use [CLI](CLI.md) for commands,
and consult [development](DEVELOPMENT.md) for tests and packaging.
[Validation](TEST-RESULTS.md) records what was executed and its limits.
