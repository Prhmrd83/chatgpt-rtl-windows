# Complete English project documentation

This application has been developed and tested only on Windows.

## Purpose and origin

ChatGPT RTL improves mixed-direction text in the unified Windows ChatGPT desktop
app. It targets accessible text, Questions, Plans, previews, labels, and supported
plain-text/Markdown editors used by Chat, Work, and Codex;
it does not change the entire application's layout to RTL.

It is an optimized derivative of **RT-AI ChatGPT Desktop RTL**, by **RT-AI / Roi
Itach**, at
https://github.com/rt25ai/chatgpt-desktop-rtl-rt-ai.
The baseline is commit `1687240e91d2ab13cd87caba4e2906eaa78f3162`, associated with
v0.7.2. The original renderer approach, narrowly scoped drag-region workaround,
ASAR hash replacement, and Store-identity compatibility mechanism inform this
version. See [NOTICE](../NOTICE.md). No affiliation or endorsement is implied.

The project adds content-aware reclassification after same-length edits,
explicit user-message coverage, read-only inline LTR isolation, mathematical
isolation, editor direction rules, verified snapshots, staged installation,
an active-version pointer, isolated launch checks, rollback, a Windows CLI,
and a repeatable acceptance suite.

## Supported environment

The first version targets Windows and the **unified Microsoft Store package
`OpenAI.Codex`**. ChatGPT Classic, macOS, Linux, browser extensions, and mobile
apps are outside this version's implementation. The development validation
used Windows package `26.1002.7124.0` and Node.js `24.15.0`.

Node.js must be at least 22.12.0. Use an LTS version from the official Node.js
website, with npm included. The Windows CLI runs on Windows PowerShell 5.1;
the .cmd launchers select the system PowerShell explicitly. All package
dependencies are locked. Setup needs npm-registry access; subsequent app
repatching uses the installed local tools, not an unpinned remote `npx` download.

## Text behavior

Each supported text block is classified independently. Persian, Arabic, and
Hebrew letters count toward RTL; Latin letters count toward LTR. Numbers,
punctuation, code, and rendered mathematical nodes do not determine prose
direction. A majority decides; ties use the first strong character. This
allows a Persian/Arabic/Hebrew sentence beginning with `ChatGPT` to read RTL,
while an English sentence containing one RTL greeting stays LTR.

The algorithm is a script heuristic, not a natural-language parser. Shared
Arabic-script languages can benefit, but only the documented Persian, Arabic,
and Hebrew cases are explicitly covered by the current supplementary tests.
Ambiguous quotations and unusual punctuation combinations can require further
fixtures. Report examples with expected reading order rather than assuming
that all text containing an RTL character should align right.

Code, URLs, dates, versions, and arithmetic expressions in read-only messages
are visually isolated as LTR. Their logical characters and plain text remain
unchanged. The rich-text editor's child DOM is not rewritten; direction is
applied through generated CSS. This avoids taking ownership of the editor's
model. Inline token isolation in the editor is therefore more limited than
in read-only responses.

The engine avoids adding `dir` and `lang` attributes. Those attributes can
activate the application's RTL-specific layout variants and reverse controls.
Classes and scoped CSS affect prose, lists, quotes, code, math, and editor
text instead. Embedded interactive controls keep LTR layout.

See [app-wide RTL](APP-WIDE-RTL.md) for independent text flows, open shadow
roots, editor adapters, and exclusions. Raster image/PDF text, closed shadow
roots, and inaccessible external content are outside DOM correction. The
0.1.2 release stays pending until its required real panels pass acceptance.

## Installation lifecycle

1. Discover the original Store app and check that its expected archive exists.
2. Check that the managed copy is closed and obtain an exclusive operation lock.
3. Hash the source file tree and check free space.
4. Create or verify a pristine local snapshot.
5. Build a separate candidate from that snapshot.
6. Patch the module entries grounded in the recognized main/detached webview HTML; preserve untouched
   archive content and unpacked native-file placement.
7. Update known embedded header hashes in copied launchers and adjust the
   recognized app-contained-core setting. Unknown structures are rejected.
8. Launch the candidate using a fresh renderer profile; verify that its
   renderer loaded the RTL payload; close the verification instance.
9. Recheck that the Store source did not change while preparing the candidate.
10. Write a verified candidate record and atomically replace the active pointer.

No active directory is deleted before this sequence succeeds. Installation
failures preserve the old active pointer. The original Store files are only
read. Source files, backup files, and copied application binaries are never
committed to GitHub or included in the distributable ZIP.

## Updates and compatibility boundaries

The original ChatGPT updates through Microsoft Store. This patch's per-user
task checks at logon and daily at 12:00 local time; the launcher also checks
before opening the managed copy. A running managed app defers the update.
Task registration failure is reported and does not erase a successful install.

The copied app is outside its Store identity. Its built-in update panel may
report unavailable updates; use the original Store update and this project's
`update` command. The patch does not install new versions of its own source
automatically. To update the patch tool itself, download a reviewed new package
and run its setup; the controller is refreshed during installation.

A new app version is activated only after compatibility and startup checks.
This cannot guarantee compatibility with every future vendor release. A
structural change may require a new compatibility adapter, and a source version
whose UI changed without failing startup can still need new rendering tests.
Keeping an older copy working is recovery behavior, not a promise that the
vendor will keep accepting an old client forever. The original updated Store
app remains available as a fallback.

## Backups and data boundaries

Ordinary managed launches use a persistent `profile` directory beneath the
managed root. This prevents a launch from being redirected to another copy's
existing profile instance. Sign in once in this copy. The tool does not migrate
or overwrite the original app's profile. This profile is shared across this
tool's generations so rollback does not replace it.

Snapshots contain program files, not cloud conversations, login credentials,
or local account profiles. App sessions continue to use ChatGPT's normal
services during ordinary launches. This tool is not a conversation exporter
or a complete account backup solution.

The current and two previous verified patched generations are retained. Each
retained generation references its pristine original snapshot. Shared originals
are deduplicated by source fingerprint. Old originals no longer referenced by
retained generations are pruned only after a successful activation. See
[recovery](RECOVERY.md) before removing anything manually.

## Command reference and troubleshooting

Use [installation](INSTALLATION.md) for a guided start, [CLI](CLI.md) for commands,
and [recovery](RECOVERY.md) for errors and rollback. `doctor` performs full
integrity checks and reports interrupted preparation. Logs are local and can
contain machine-specific paths; review them before sharing.

## Quality evidence

The 29 baseline rendering checks are preserved; no failed requirement was
removed to reach 29/29. Additional cases cover Arabic, Hebrew, English-first
editors, text selection, idempotence, and number-only text. Transaction tests
cover rollback, backup corruption, interruption, source races, retention,
disk-space rejection, path validation, locking, and the real ASAR adapter.

A fresh-profile startup check establishes that the copied app opens and its
renderer loads the payload. It does not establish correct signed-in Chat/Work/
Codex operation, actual Store update handling across multiple vendor versions,
all native cursor behavior, or perfect visual ordering in all languages. See
[the exact test report](TEST-RESULTS.md) and complete the user acceptance test.

Renderer profiles are separate, but the native platform may share account
state. The patch does not copy authentication files. For 0.1.2 the owner chose
to perform the remaining native acceptance himself; the supplied ZIP is a test
candidate and cannot be published until he gives final approval.

## License and contribution

The code is MIT licensed. You may use it personally or commercially, modify,
redistribute, sublicense, and sell copies. You do not have to publish your
changes or pay a fee. Keep the copyright and permission notice, including the
upstream notice. This is the attribution condition required by inherited MIT
code; it cannot truthfully be described as having zero conditions.

The license covers project source only. OpenAI application files and bundled
third-party components have their own licenses, and service use has its own
terms. This project intentionally does not redistribute those files.

Contributions should include a reproducible failing case and a test when
behavior changes. Maintain upstream attribution, snapshot verification, and
failure preservation. See [development](DEVELOPMENT.md).
