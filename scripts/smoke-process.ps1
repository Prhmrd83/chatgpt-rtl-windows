[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$AppExe,[Parameter(Mandatory=$true)][string]$Profile,[switch]$Stop)
$ErrorActionPreference = 'Stop'
if ($Stop) {
    $owned = @(Get-CimInstance Win32_Process | Where-Object {
        $_.ExecutablePath -eq $AppExe -and $_.CommandLine -and $_.CommandLine.Contains($Profile)
    })
    foreach ($process in $owned) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
} else {
    if ($Profile.Contains('"') -or $AppExe.Contains('"')) { throw 'Invalid quoted path' }
    $arguments = '--user-data-dir="' + $Profile + '" --remote-debugging-port=0 --remote-debugging-address=127.0.0.1 --no-first-run'
    $process = Start-Process -FilePath $AppExe -ArgumentList $arguments -WorkingDirectory (Split-Path -Parent $AppExe) -WindowStyle Hidden -PassThru
    Write-Output $process.Id
}
