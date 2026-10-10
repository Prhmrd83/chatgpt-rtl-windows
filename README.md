# ChatGPT RTL Windows

Automatic right-to-left text support for **Persian, Arabic, and Hebrew mixed
with English** in the unified Windows ChatGPT desktop app (Chat / Work / Codex).
English prose, code, URLs, dates, versions, and arithmetic keep their intended
left-to-right order. Installation uses a verified app copy, local backups, and
transactional updates with rollback.

Version **0.1.2** extends direction detection to Question prompts and options,
reply inputs, Plan panels, document previews, headings, menus, tooltips, and
control labels. Plain-text and Markdown editing use CSS rules for each text
block or recognized source-editor line. Panel layout and button order stay
unchanged; the application root never receives `dir=rtl`.
See [app-wide RTL coverage](docs/APP-WIDE-RTL.md) for adapters and limits.

**This application has been developed and tested only on Windows.**
Repository: [Prhmrd83/chatgpt-rtl-windows](https://github.com/Prhmrd83/chatgpt-rtl-windows).

**This is an optimized derivative of
[rt25ai/chatgpt-desktop-rtl-rt-ai](https://github.com/rt25ai/chatgpt-desktop-rtl-rt-ai),
by RT-AI / Roi Itach.** Its MIT license and copyright notice are retained.
See [NOTICE](NOTICE.md) for the exact baseline and inherited mechanisms.
This project is independent of OpenAI and RT-AI.

## Quick start

1. Install the unified ChatGPT desktop app from Microsoft Store.
2. Install [Node.js LTS](https://nodejs.org/en/download), version 22.12 or later.
3. Download the provided project ZIP and **extract it completely** to a normal
   local folder, for example `Documents\ChatGPT-RTL`.
4. Double-click **setup.cmd**. It installs the locked tools and prepares the app.
   First-time setup needs internet access. A moving indicator shows the current
   stage and elapsed time, including while a slow download produces no output.
   No administrator mode is required.
5. After successful setup, a **ChatGPT RTL** shortcut with the RTL arrow icon
   is added to your **Desktop** and **Start menu**. Double-click the Desktop
   shortcut to open the managed app. Setup explicitly confirms its creation.

The managed app uses its own persistent renderer profile. The native platform
may share account state, so the copy may already be signed in; otherwise sign
in yourself. Your original profile is not migrated or overwritten, and local
profile data is not included in the program-file backups.

For the menu, double-click **chatgpt-rtl.cmd**. In a terminal opened inside the
extracted folder:

```powershell
.\chatgpt-rtl.cmd status
.\chatgpt-rtl.cmd doctor
.\chatgpt-rtl.cmd update
.\chatgpt-rtl.cmd backup list
.\chatgpt-rtl.cmd rollback
.\chatgpt-rtl.cmd rollback --original
.\chatgpt-rtl.cmd uninstall
```

Close the managed ChatGPT RTL app before installing, updating, or rolling back.
Other patchers' installations and update tasks are not removed automatically.
`doctor` reports matching legacy tasks so you can inspect them.

## Verification

The original **29 rendering checks passed 29/29** in both a neutral fixture and
with stylesheet assets from Windows ChatGPT `26.1002.7124.0`.
Additional multilingual/editor checks and transaction/archive checks also passed.
A real copied app launched with a fresh renderer profile and loaded the RTL
payload. Native-panel evidence is recorded separately in
[the test report](docs/TEST-RESULTS.md). This ZIP is an owner-test candidate;
the owner elected to perform the remaining native acceptance checks.

These results are acceptance checks, not a guarantee that every future ChatGPT
version or every mixed-language sentence will work. Unknown app layouts stop
the update and preserve the existing active version. Signed-in Chat/Work/Codex
use and native editing still need the user's acceptance test.

## Documentation

- [Complete English project documentation](docs/PROJECT.md)
- [Windows installation and acceptance test](docs/INSTALLATION.md)
- [CLI reference](docs/CLI.md)
- [Architecture, RTL behavior, and compatibility](docs/ARCHITECTURE.md)
- [Backups, updates, and recovery](docs/RECOVERY.md)
- [Developer and testing guide](docs/DEVELOPMENT.md)
- [Security and privacy](SECURITY.md)
- [License](LICENSE) and [attribution](NOTICE.md)

## فارسی

این پروژه نسخهٔ بهینه‌شده و مشتق‌شده از
[پروژهٔ rt25ai](https://github.com/rt25ai/chatgpt-desktop-rtl-rt-ai) است و نام
نویسنده و مجوز MIT آن حفظ شده است. نمایش متن فارسی، عربی و عبری در کنار انگلیسی
را در نسخهٔ یکپارچهٔ ویندوز ChatGPT اصلاح می‌کند. کد، نشانی‌ها، تاریخ و محاسبات
چپ‌به‌راست می‌مانند.

نسخهٔ **0.1.2** اصلاح را به سؤال‌ها و گزینه‌ها، ورودی پاسخ، پنل Plan،
پیش‌نمایش اسناد، عنوان‌ها، منوها و برچسب کنترل‌ها گسترش می‌دهد. متن معمولی و
Markdown هنگام ویرایش نیز با قواعد CSS مناسبِ ویرایشگر بررسی می‌شوند؛ مدل
ویرایشگر و متن فایل بازنویسی نمی‌شوند. جهت روی قسمت متنی اعمال می‌شود تا
چیدمان پنل‌ها، آیکون‌ها و ترتیب دکمه‌ها حفظ شود. متن داخل تصویر، PDF رستری
و محتوای غیرقابل‌دسترسیِ صفحات خارجی جزو این اصلاح DOM نیستند.
جزئیات پوشش و محدودیت‌ها در [راهنمای RTL سراسری](docs/APP-WIDE-RTL.md) آمده است.

این برنامه تنها در محیط **ویندوز** توسعه یافته و آزمایش شده است.

برای نصب، Node.js LTS را نصب کن، ZIP پروژه را کامل استخراج کن و `setup.cmd` را
اجرا کن. نشانگر متحرک، مرحلهٔ جاری و زمان سپری‌شده را حتی هنگام دانلود کند
نمایش می‌دهد. پس از نصب موفق، میان‌بر **ChatGPT RTL** با آیکون RTL روی **دسکتاپ**
و در **Start menu** ساخته می‌شود و نصب‌کننده این موضوع را اعلام می‌کند.
برای بازکردن برنامه روی میان‌بر دسکتاپ دوبار کلیک کن. `chatgpt-rtl.cmd` منوی
انگلیسی برنامه را باز می‌کند. نصب اصلی Store تغییر نمی‌کند؛ پیش از تغییرات از
فایل‌های برنامه بکاپ گرفته می‌شود و نسخهٔ تازه ابتدا جداگانه بررسی می‌شود.

برنامهٔ اصلاح‌شده پروفایل مستقلِ رندر دارد؛ بخش بومی برنامه ممکن است وضعیت حساب
را مشترک نگه دارد و کپی از قبل وارد حساب باشد. در غیر این صورت خودت وارد حساب شو.
پروفایل اصلی جابه‌جا یا بازنویسی نمی‌شود.

معیار اصلی خوانایی و ترتیب درست متن است؛ برچسب کوچکِ گزینه می‌تواند در جای
چپ‌چین قبلی بماند، درحالی‌که متن آن درست خوانده شود. آزمون نهایی پنل‌ها به انتخاب
مالک پروژه به خود او سپرده شده است؛ این بسته برای تست و تأیید اوست.

برای بازگشت به نسخهٔ سالم قبلی، پس از بستن برنامه دستور
`chatgpt-rtl.cmd rollback` را اجرا کن. برای استفادهٔ مجدد از نصب اصلی، دستور
`chatgpt-rtl.cmd rollback --original` را اجرا کن. دستور `uninstall` اصلاح را غیرفعال
می‌کند و بکاپ‌ها را برای بازیابی نگه می‌دارد.

۲۹ آزمون قبلی در هر دو محیط ۲۹/۲۹ پاس شدند؛ این نتیجه تضمین سازگاری با تمام
آپدیت‌های آینده نیست. راهنمای کامل انگلیسی و جزئیات آزمون‌ها در لینک‌های بالا
قرار دارد.

## License

MIT: personal and commercial use, modification, redistribution, and sublicensing
are permitted without payment or source-disclosure requirements. Keep the
copyright and license notice in copies or substantial portions. The project
does not impose a noncommercial restriction or copyleft requirement. OpenAI's
app and services retain their own terms and licenses.
