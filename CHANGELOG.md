# Changelog

## 0.1.3 — reinstall recovery

- Explain blocked candidates during manual installation and offer one explicit
  retry after rollback/uninstall; declining leaves the candidate blocked.
- Repeat all backup, archive integrity, and isolated startup checks on retry.
  Automatic updates remain noninteractive and do not bypass blocked candidates.
- Support `setup.cmd -Retry` and restore shortcuts and the update task after a
  successful reinstall. Report the correct install/update recovery command.
- Add lifecycle and Windows installer regressions for acceptance, cancellation,
  unrelated failures, retry failures, and successful integration restoration.

## 0.1.2 — owner-test candidate

- Extend RTL classification to Questions/options, labels, menus, headings,
  document previews, and supported plain-text/Markdown editing surfaces.
- Preserve interface layout and original framework Text anchors; observe
  dynamic panels, accessible frames, and open Shadow DOM in bounded batches.
- Detect native Markdown metadata on CodeMirror content and use native
  decorations/bidi isolation without rewriting the document model.
- Patch recognized main and optional detached window entries.
- Retain both original 29/29 suites; add app-wide language/editor regressions
  and report native component/panel evidence separately.
- Prioritize readable ordering while preserving short labels' existing position.
- Deliver an owner-test ZIP at the owner's request; remaining native acceptance
  belongs to the owner, and publication requires his final approval.

## 0.1.1 — review candidate

- Rename the project/package to chatgpt-rtl-windows; retain existing local
  app, backup, profile, shortcut, and scheduled-task names.
- Add live installer feedback and elapsed time during slow downloads and
  app preparation, with an opt-in machine-readable events protocol.
- Confirm Desktop shortcut creation after verification and document it in
  English and Persian; state that development/testing has been Windows-only.
- Add a generated RTL icon, deploy it in the stable controller, and use it
  for both shortcuts, including refreshed installations.
- Keep the RTL renderer unchanged from the validated 0.1.0 engine.

## 0.1.0 — review candidate

- Derived from rt25ai's v0.7.2 baseline with original MIT attribution retained.
- Fix arithmetic/date ordering, math isolation, user-message alignment, and
  same-length edit reclassification from the baseline comparison.
- Add English-first RTL editor handling without rewriting editor descendants.
- Add verified pristine backups, staged generations, atomic activation,
  isolated startup checks, retained previous copies, and rollback.
- Add English Windows CLI, locked local tools, stable owned shortcuts,
  per-user deferred updates, and English/Persian project documentation.
- Preserve the original 29 checks and add language, editor, transaction,
  and archive regression tests.

No public release or repository push is authorized until the owner accepts
the supplied review package.
