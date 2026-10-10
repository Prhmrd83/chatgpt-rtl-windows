# Windows PowerShell 5.1 compatible. The parent animates while its child is busy.
function ConvertTo-RtlProcessArgument([string]$Value) {
    if ($Value -notmatch '[\s"]' -and $Value.Length) { return $Value }
    return '"' + ([regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1')) + '"'
}

function Invoke-RtlProcess {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [string[]]$ArgumentList = @(),
        [string]$WorkingDirectory = $PSScriptRoot,
        [string]$Stage = 'Preparing tools',
        [switch]$Events,
        [switch]$Quiet
    )
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $FilePath
    $info.Arguments = (($ArgumentList | ForEach-Object { ConvertTo-RtlProcessArgument $_ }) -join ' ')
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
    $info.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    $lines = New-Object 'Collections.Generic.List[string]'
    $messages = New-Object 'Collections.Generic.List[object]'
    $result = $null
    $resultSeen = $false
    $started = $false
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $lastDraw = -10000
    $frame = 0
    $width = 0
    $interactive = -not [Console]::IsOutputRedirected
    try {
        [void]$process.Start()
        $started = $true
        $reads = @($process.StandardOutput.ReadLineAsync(), $process.StandardError.ReadLineAsync())
        $ended = @($false, $false)
        while (-not $process.HasExited -or -not ($ended[0] -and $ended[1])) {
            for ($stream = 0; $stream -lt 2; $stream++) {
                # Drain a bounded batch so continuous output cannot starve animation.
                $drained = 0
                while (-not $ended[$stream] -and $reads[$stream].IsCompleted -and $drained -lt 100) {
                    $line = $reads[$stream].GetAwaiter().GetResult()
                    if ($null -eq $line) { $ended[$stream] = $true; break }
                    if ($stream -eq 0) { $reads[$stream] = $process.StandardOutput.ReadLineAsync() }
                    else { $reads[$stream] = $process.StandardError.ReadLineAsync() }
                    $drained++
                    if ($Events -and $stream -eq 0) {
                        $event = $line | ConvertFrom-Json -ErrorAction Stop
                        $messages.Add($event)
                        switch ($event.type) {
                            'progress' { $Stage = [string]$event.message; $lastDraw = -10000 }
                            'result' { $result = $event.result; $resultSeen = $true }
                            'error' { $lines.Add([string]$event.message) }
                            default { throw 'Unknown progress event from the installer.' }
                        }
                    } else { $lines.Add($line) }
                    if ((-not $Events -or $stream -eq 1 -or $event.type -eq 'error') -and -not $Quiet) {
                        if ($interactive -and $width) { Write-Host ("`r" + (' ' * $width) + "`r") -NoNewline; $width = 0 }
                        $visible = if ($Events -and $stream -eq 0) { [string]$event.message } else { $line }
                        Write-Host ('  ' + $visible)
                    }
                }
            }
            if (-not $Quiet -and $clock.ElapsedMilliseconds - $lastDraw -ge $(if ($interactive) { 200 } else { 2000 })) {
                $elapsed = if ($clock.Elapsed.TotalHours -ge 1) { '{0:hh\:mm\:ss}' -f $clock.Elapsed } else { '{0:mm\:ss}' -f $clock.Elapsed }
                $slow = if ($clock.Elapsed.TotalSeconds -ge 30) { $(if ($Stage -match 'Downloading') { ' | Still working; slow connections can take longer.' } else { ' | Still working; large app files can take longer.' }) } else { '' }
                $display = '  [' + @('|','/','-','\')[$frame % 4] + '] ' + $Stage + ' | ' + $elapsed + $slow
                if ($interactive) {
                    try { $limit = [Math]::Max(20,[Console]::BufferWidth - 1); if ($display.Length -gt $limit) { $display = $display.Substring(0,$limit) } } catch {}
                    $padded = $display.PadRight([Math]::Max($width,$display.Length))
                    Write-Host ("`r" + $padded) -NoNewline
                    $width = $padded.Length
                } else { Write-Host $display }
                $frame++
                $lastDraw = $clock.ElapsedMilliseconds
            }
            Start-Sleep -Milliseconds 50
        }
        $process.WaitForExit()
        if ($Events -and $process.ExitCode -eq 0 -and -not $resultSeen) { throw 'Installer finished without a result event.' }
        return @{ ExitCode=$process.ExitCode; Lines=$lines.ToArray(); Events=$messages.ToArray(); Result=$result }
    } finally {
        if ($interactive -and $width) { Write-Host ("`r" + (' ' * $width) + "`r") -NoNewline }
        # On interruption, stop only the process tree started by this invocation.
        if ($started -and -not $process.HasExited) {
            try { & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $process.Id /T /F 2>$null | Out-Null } catch {}
            if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(2000) }
        }
        $process.Dispose()
    }
}
