function New-RtlShortcuts {
    param([Parameter(Mandatory=$true)][string]$InstalledTools, [Parameter(Mandatory=$true)][string[]]$Directories)
    $icon = Join-Path $InstalledTools 'assets\chatgpt-rtl.ico'
    $launcher = Join-Path $InstalledTools 'chatgpt-rtl.ps1'
    if (-not (Test-Path -LiteralPath $icon) -or -not (Test-Path -LiteralPath $launcher)) { throw 'Installed launcher or shortcut icon is missing. Retry install.' }
    $shell = New-Object -ComObject WScript.Shell
    foreach ($directory in $Directories) {
        if (-not $directory -or -not (Test-Path -LiteralPath $directory -PathType Container)) { throw 'Shortcut destination is unavailable: ' + $directory }
        $file = Join-Path $directory 'ChatGPT RTL.lnk'
        $shortcut = $shell.CreateShortcut($file)
        $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $launcher + '" launch'
        $shortcut.WorkingDirectory = $InstalledTools
        $shortcut.IconLocation = $icon + ',0'
        $shortcut.Description = 'ChatGPT with automatic right-to-left text support'
        $shortcut.Save()
        $saved = $shell.CreateShortcut($file)
        if (-not (Test-Path -LiteralPath $file) -or $saved.IconLocation -ne ($icon + ',0') -or $saved.Arguments -ne $shortcut.Arguments) {
            throw 'Could not verify the shortcut: ' + $file
        }
    }
}
