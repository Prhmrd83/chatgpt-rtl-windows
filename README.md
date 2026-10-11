# ChatGPT RTL Windows

[![Windows QA](https://github.com/Prhmrd83/chatgpt-rtl-windows/actions/workflows/tests.yml/badge.svg)](https://github.com/Prhmrd83/chatgpt-rtl-windows/actions/workflows/tests.yml)

ChatGPT RTL Windows improves the display of Persian, Arabic, and Hebrew mixed
with English in the unified Windows ChatGPT desktop app (Chat, Work, and Codex).
It applies direction to individual text blocks while preserving the interface
layout and left-to-right code, URLs, dates, and arithmetic.

The installer prepares a separate app copy, verifies its startup, and keeps
local program-file backups for rollback. The original Microsoft Store app is
read without modification. This is an independent community project, derived
from [RT-AI / Roi Itach's desktop RTL patch](https://github.com/rt25ai/chatgpt-desktop-rtl-rt-ai).

## Install

Requirements: Windows, the unified Microsoft Store package `OpenAI.Codex`, and
[Node.js with npm](https://nodejs.org/en/download), version 22.12.0 or newer.
Use Node.js LTS. macOS, Linux, ChatGPT Classic, web, and mobile apps are not
supported. Setup does not require administrator mode.

1. [Download the source ZIP](https://github.com/Prhmrd83/chatgpt-rtl-windows/archive/refs/heads/main.zip)
   and extract it completely to a local folder.
2. Close the managed **ChatGPT RTL** app if it is already running.
3. Double-click `setup.cmd`. The first dependency download needs internet access.
4. After setup confirms success, open **ChatGPT RTL** from the Desktop or Start menu.

Allow at least `3 × installed app size + 512 MiB` of free space on the managed
installation drive. The measured `26.1007.2314.0` build needs about 7 GiB for
this check; 8–10 GiB gives a practical margin. App sizes vary.

The default location is `%LOCALAPPDATA%\Programs\ChatGPT-RTL`. The copy has a
persistent renderer profile; native account state may still be shared by the
platform. The installer does not migrate your original profile or copy credentials.

See [installation](docs/INSTALLATION.md) for terminal setup, prerequisites,
tool upgrades, custom locations, and reinstalling after rollback or uninstall.
Installer version: **0.1.3**. Renderer version: **0.1.2**. A source ZIP from
`main` is a development snapshot, not a versioned release asset.

## Use and recover

Double-click `chatgpt-rtl.cmd` for the menu, or use a terminal in the extracted
folder. The installed controller is also available under the managed root.

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd doctor
.\chatgpt-rtl.cmd update
.\chatgpt-rtl.cmd backup list
.\chatgpt-rtl.cmd rollback
.\chatgpt-rtl.cmd rollback --original
.\chatgpt-rtl.cmd uninstall
```

Close the managed app before install, update, rollback, or uninstall. Scheduled
checks defer while it is running. `rollback` selects a verified previous copy;
`rollback --original` disables the copy. `uninstall` also removes the owned
shortcuts and update task, retaining backups and the managed profile.

The Store app updates through Microsoft Store. The launcher and a per-user task
check for those updates and rebuild the copy when needed. They do not download
new versions of this project's installer. Unknown app layouts stop preparation
and preserve the active copy. See [recovery](docs/RECOVERY.md).

## Features and limits

- Direction handling for messages, Questions, Plans, previews, labels, and
  supported plain-text/Markdown editors.
- Verified snapshots, staged activation, integrity diagnostics, and rollback.
- Desktop and Start menu shortcuts, a persistent profile, and deferred updates.
- Explicit reinstall recovery for candidates blocked after failure or rollback.

Raster text, inaccessible frames, and closed shadow roots are outside DOM
correction. Future vendor builds can require compatibility changes.
[Coverage](docs/APP-WIDE-RTL.md) describes the renderer's boundaries.
[Validation](docs/TEST-RESULTS.md) separates historical rendering evidence from
installation QA and records pending native checks.

## Documentation and contribution

- [Project overview](docs/PROJECT.md)
- [Installation](docs/INSTALLATION.md) and [CLI reference](docs/CLI.md)
- [Backups and troubleshooting](docs/RECOVERY.md)
- [Architecture](docs/ARCHITECTURE.md) and [development](docs/DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md) and [security](SECURITY.md)
- [Changelog](CHANGELOG.md) and [upstream attribution](NOTICE.md)

Report reproducible problems in [GitHub Issues](https://github.com/Prhmrd83/chatgpt-rtl-windows/issues).
Include Windows, Node.js, installer, and Store app versions, the command or
workflow, and a redacted error. Do not upload account data or ChatGPT binaries.

## راهنمای فارسی

این ابزار نمایش متن فارسی، عربی و عبری در کنار انگلیسی را در نسخهٔ یکپارچهٔ
ویندوز ChatGPT اصلاح می‌کند. چیدمان برنامه حفظ می‌شود و کد و نشانی‌ها
چپ‌به‌راست می‌مانند. نصب اصلی Microsoft Store تغییر نمی‌کند.

Node.js LTS را با npm نصب کنید (حداقل نسخهٔ 22.12.0). ZIP پروژه را کامل
استخراج کنید و `setup.cmd` را اجرا کنید. نصب اولیه به اینترنت و فضای آزاد
کافی نیاز دارد. پس از پیام موفقیت، میان‌بر **ChatGPT RTL** را روی دسکتاپ
یا در Start باز کنید. برنامه پروفایل رندر مستقل دارد؛ وضعیت حساب در بخش
بومی ممکن است مشترک باشد. ابزار فایل‌های ورود یا پروفایل اصلی را کپی نمی‌کند.

برای منوی دستورات، `chatgpt-rtl.cmd` را باز کنید. پیش از به‌روزرسانی یا
بازگشت، نسخهٔ مدیریت‌شده را ببندید. دستور `rollback --original` آن را
غیرفعال می‌کند و `uninstall` میان‌برها و وظیفهٔ به‌روزرسانی را نیز حذف می‌کند؛
بکاپ‌ها و پروفایل حفظ می‌شوند. برای نصب مجددِ نسخهٔ مسدود، Setup تأیید
می‌خواهد؛ `y` بررسی‌ها را تکرار می‌کند و Enter یا `n` نصب را لغو می‌کند.
دستور `chatgpt-rtl.cmd install --retry` نیز در دسترس است.

این پروژه مستقل از OpenAI و مشتق‌شده از پروژهٔ RT-AI است. پشتیبانی آن
محدود به ویندوز است. جزئیات نصب، محدودیت‌ها و نتایج آزمون در راهنماهای بالا آمده است.

## License

[MIT](LICENSE), with the upstream copyright retained. Keep the copyright and
permission notice when redistributing the source. OpenAI application files,
services, and third-party trademarks retain their own terms and licenses.
