[CmdletBinding()]
param(
    [ValidateSet('menu','install','launch','status','doctor','update','backup','rollback','uninstall','verify-launch')][string]$Command = 'menu',
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$Options,
    [switch]$NoColor,
    [switch]$Automatic,
    [string]$Root = (Join-Path $env:LOCALAPPDATA 'Programs\ChatGPT-RTL')
)
$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$node = (Get-Command node.exe -ErrorAction Stop).Source
$cli = Join-Path $project 'cli.cjs'
$taskName = 'ChatGPT RTL Safe Update'
. (Join-Path $project 'scripts\progress.ps1')
. (Join-Path $project 'scripts\integration.ps1')
. (Join-Path $project 'scripts\install-retry.ps1')

function Say([string]$Text,[ConsoleColor]$Color = 'Gray') {
    if ($NoColor -or $env:NO_COLOR) { Write-Host $Text } else { Write-Host $Text -ForegroundColor $Color }
}
function Source-App {
    $package = Get-AppxPackage -Name OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $package) { throw 'Install the unified ChatGPT desktop app from Microsoft Store first.' }
    $app = Join-Path $package.InstallLocation 'app'
    if (-not (Test-Path -LiteralPath (Join-Path $app 'resources\app.asar'))) { throw 'Unknown Store app layout. The current installation will be preserved.' }
    return @{Path=$app;Version=[string]$package.Version;Package=$package}
}
function Invoke-Core([string]$Action,[string[]]$Extra = @()) {
    if (-not $Automatic -and $Action -in @('install','update') -and $Extra -notcontains '--automatic') {
        $arguments = @($cli,$Action,'--root',$Root,'--events') + $Extra
        $operation = Invoke-RtlProcess -FilePath $node -ArgumentList $arguments -WorkingDirectory $project -Stage 'Checking source files' -Events
        if ($operation.ExitCode -ne 0) {
            $failure = @($operation.Events | Where-Object type -eq 'error') | Select-Object -Last 1
            $message = if ($failure) { [string]$failure.message } else { 'Operation failed. Read the error above; run doctor for diagnostics.' }
            $exception = New-Object System.InvalidOperationException($message)
            if ($failure.code) { $exception.Data['code'] = [string]$failure.code }
            throw $exception
        }
        return $operation.Result
    }
    $arguments = @($cli,$Action,'--root',$Root,'--json') + $Extra
    $text = & $node @arguments
    if ($LASTEXITCODE -ne 0) { foreach ($line in $text) { Say $line Red }; throw 'Operation failed. Read the error above; run doctor for diagnostics.' }
    return (($text -join "`n") | ConvertFrom-Json)
}
function Original-App {
    $source = Source-App
    $manifest = Get-AppxPackageManifest -Package $source.Package.PackageFullName
    $application = @($manifest.Package.Applications.Application) | Where-Object { $_.Executable -match '(ChatGPT|Codex)\.exe$' } | Select-Object -First 1
    if (-not $application) { throw 'Could not locate the original Store app entry. Open ChatGPT from Windows Start.' }
    Start-Process explorer.exe -ArgumentList ('shell:AppsFolder\' + $source.Package.PackageFamilyName + '!' + $application.Id)
}
function Configure-Integration {
    $installedTools = Join-Path $Root 'controller'
    if ([IO.Path]::GetFullPath($project) -ne [IO.Path]::GetFullPath($installedTools)) {
        $deployment = Invoke-RtlProcess -FilePath $node -ArgumentList @((Join-Path $project 'scripts\deploy.cjs'),$project,$Root) -WorkingDirectory $project -Stage 'Installing launcher and shortcut icon' -Quiet:$Automatic
        if ($deployment.ExitCode -ne 0) { throw 'App was prepared, but controller deployment failed. Keep this downloaded folder and retry install.' }
    }
    if (-not $Automatic) { Say '  Creating Desktop and Start menu shortcuts...' Cyan }
    New-RtlShortcuts -InstalledTools $installedTools -Directories @([Environment]::GetFolderPath('Desktop'),(Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))
    try {
        $action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + (Join-Path $installedTools 'chatgpt-rtl.ps1') + '" update -Automatic')
        $triggers = @((New-ScheduledTaskTrigger -AtLogOn -User ([Security.Principal.WindowsIdentity]::GetCurrent().Name)),(New-ScheduledTaskTrigger -Daily -At '12:00'))
        $principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Force | Out-Null
        Say '  [OK] Automatic updates enabled.' Green
    } catch { Say ('  [!] Could not register automatic updates: ' + $_.Exception.Message + '. Run update manually.') Yellow }
}
function Run-Action([string]$Action) {
    $extra = @($Options | Where-Object { $_ })
    switch ($Action) {
        { $_ -in 'install','update' } {
            $source = Source-App
            $arguments = @('--source',$source.Path,'--source-version',$source.Version) + $extra
            if ($Automatic) { $arguments += '--automatic' }
            if (-not $Automatic) { Say '  Preparing a verified copy; the active version stays available.' Cyan }
            if ($Action -eq 'install') {
                $result = Invoke-RtlInstallWithRetry -Retry:($extra -contains '--retry') -Automatic:$Automatic -Install {
                    param([bool]$retryCandidate)
                    $attemptArguments = @($arguments)
                    if ($retryCandidate -and $attemptArguments -notcontains '--retry') { $attemptArguments += '--retry' }
                    Invoke-Core $Action $attemptArguments
                }
            } else { $result = Invoke-Core $Action $arguments }
            if ($Action -eq 'install') { Configure-Integration }
            if (-not $Automatic) { Say ('  [OK] Active version: ' + $result.active) Green }
            if ($Action -eq 'install' -and -not $Automatic) { Say '  Setup complete! A "ChatGPT RTL" shortcut has been added to your Desktop. Double-click it to open the app.' Green }
        }
        'launch' {
            try {
                $source = Source-App
                Invoke-Core 'update' @('--source',$source.Path,'--source-version',$source.Version,'--automatic') | Out-Null
            } catch { Say ('  [!] Update deferred: ' + $_.Exception.Message) Yellow }
            try { $result = Invoke-Core 'launch-path' } catch { Say '  [!] Managed copy failed verification. Opening the original app.' Yellow; Original-App; return }
            if ($result.original) { Original-App } else { Start-Process -FilePath $result.exe -WorkingDirectory $result.directory -ArgumentList ('--user-data-dir="' + $result.profile + '"') }
        }
        'uninstall' {
            Invoke-Core 'uninstall' | Out-Null
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
            foreach ($directory in @([Environment]::GetFolderPath('Desktop'),(Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))) {
                $shortcut = Join-Path $directory 'ChatGPT RTL.lnk'
                if (Test-Path -LiteralPath $shortcut) {
                    $shell = New-Object -ComObject WScript.Shell
                    $existing = $shell.CreateShortcut($shortcut)
                    if ($existing.Arguments.Contains((Join-Path $Root 'controller'))) { Remove-Item -LiteralPath $shortcut -Force }
                }
            }
            Say '  [OK] Patch disabled. Verified backups retained for recovery.' Green
        }
        'doctor' {
            $result = Invoke-Core 'doctor' $extra
            $result | ConvertTo-Json -Depth 8
            Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object TaskName -Match '(RT-AI|Codex).*RTL' | ForEach-Object { Say ('  [!] Other patcher task exists: ' + $_.TaskName + '. It was not changed.') Yellow }
        }
        'status' {
            $result = Invoke-Core 'status' $extra
            Say ('  Active version: ' + $(if ($result.active) { $result.active } else { 'Original Store app' })) Cyan
            Say ('  Retained snapshots: ' + @($result.backups).Count)
            Say ('  Blocked candidate: ' + $(if ($result.blocked) { 'Yes; inspect doctor before retrying' } else { 'None' }))
            Say ('  Data directory: ' + $Root) DarkGray
        }
        'backup' {
            $result = Invoke-Core 'backup' $extra
            $result | Format-Table type,id,sourceVersion,created -AutoSize
        }
        'rollback' {
            $result = Invoke-Core 'rollback' $extra
            Say ('  [OK] Active: ' + $(if ($result.active) { $result.active } else { 'Original Store app' })) Green
            Say '  The rejected candidate is blocked; use update --retry only after investigating.' Yellow
        }
        default { Invoke-Core $Action $extra | ConvertTo-Json -Depth 8 }
    }
}
try {
    if ($Command -eq 'menu') {
        Say ''
        Say '  +----------------------------------------------------+' Cyan
        Say '  |  CHATGPT RTL                       Safe text flow  |' Cyan
        Say '  |  Persian  /  Arabic  /  Hebrew  +  English          |' Cyan
        Say '  +----------------------------------------------------+' Cyan
        Say '  Derived from rt25ai / RT-AI. MIT licensed.' DarkGray
        $status = Invoke-Core 'status'
        Say ('  Active: ' + $(if ($status.active) { $status.active } else { 'Original app' }))
        Say ('  Retained snapshots: ' + @($status.backups).Count)
        Say ''
        Say '  1 Install      2 Launch       3 Update'
        Say '  4 Backups      5 Roll back    6 Doctor'
        Say '  7 Status       8 Uninstall    0 Exit'
        $actions = @{'1'='install';'2'='launch';'3'='update';'4'='backup';'5'='rollback';'6'='doctor';'7'='status';'8'='uninstall'}
        $choice = Read-Host '  Choose'
        if ($choice -ne '0') { if (-not $actions.ContainsKey($choice)) { throw 'Choose an option from 0 to 8.' }; Run-Action $actions[$choice] }
    } else { Run-Action $Command }
    exit 0
} catch {
    if (-not $Automatic) { Say ('  [ERROR] ' + $_.Exception.Message) Red }
    exit 1
}
