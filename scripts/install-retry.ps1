# Interactive installation may retry a blocked candidate only with explicit consent.
function Invoke-RtlInstallWithRetry {
    param(
        [Parameter(Mandatory=$true)][scriptblock]$Install,
        [switch]$Retry,
        [switch]$Automatic,
        [scriptblock]$Prompt = { Read-Host '  Retry this installation now? [y/N]' }
    )
    try { return (& $Install ([bool]$Retry)) } catch {
        if ($Automatic -or $Retry -or $_.Exception.Data['code'] -ne 'CANDIDATE_BLOCKED') { throw }
        Write-Host '  This app version was blocked after an earlier rollback or failed installation.' -ForegroundColor Yellow
        Write-Host '  Retry only if the rollback was intentional or the earlier problem is resolved.'
        Write-Host '  Retrying preserves backups and runs the full integrity and startup checks again.'
        $answer = [string](& $Prompt)
        if ($answer.Trim() -notmatch '^(?i:y|yes)$') { throw }
        # One retry only. Any further failure propagates without another prompt.
        return (& $Install $true)
    }
}
