param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference = 'Stop'
$prefix = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
$processes = @(Get-Process -Name ChatGPT,Codex -ErrorAction SilentlyContinue | Where-Object {
    $processPath = $null
    try { $processPath = $_.Path } catch { throw 'Cannot inspect a ChatGPT/Codex process; refusing to update.' }
    if (-not $processPath) { throw 'Cannot inspect a ChatGPT/Codex process; refusing to update.' }
    $processPath -and $processPath.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)
})
Write-Output $processes.Count
