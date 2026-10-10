[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'progress.ps1')
try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    & $node -e "const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<12)){console.error('Node.js 22.12 or newer is required. Install Node.js LTS.');process.exit(1)}"
    if ($LASTEXITCODE -ne 0) { exit 1 }
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $npmCli = Join-Path (Split-Path $npm -Parent) 'node_modules\npm\bin\npm-cli.js'
    if (-not (Test-Path -LiteralPath $npmCli)) { throw 'Could not locate npm. Install Node.js LTS with npm included and reopen setup.' }
    Write-Host ''
    Write-Host '  CHATGPT RTL WINDOWS - SETUP'
    Write-Host '  Downloading tools, then preparing a backed-up app copy.'
    $download = Invoke-RtlProcess -FilePath $node -ArgumentList @($npmCli,'--prefix',$project,'ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund') -WorkingDirectory $project -Stage 'Downloading and installing dependencies'
    if ($download.ExitCode -ne 0) { throw 'Dependency installation failed. Check the connection and run setup.cmd again.' }
    & (Join-Path $project 'chatgpt-rtl.ps1') install
    exit $LASTEXITCODE
} catch {
    Write-Host ('  [ERROR] ' + $_.Exception.Message)
    exit 1
}
