$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$systemNode = Get-Command node -ErrorAction SilentlyContinue

if (Test-Path $bundledNode) {
  $node = $bundledNode
} elseif ($systemNode) {
  $node = $systemNode.Source
} else {
  throw "Node.js is not available. Install Node.js or open Codex once so the bundled runtime is installed."
}

Set-Location $scriptDir

$envFile = Join-Path $scriptDir ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
    $name, $value = $_.Split("=", 2)
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
  }
}

$argsList = @("--online", "--incremental")
if ($env:ETAM_SHEETS_WEBAPP_URL) {
  $argsList += "--publish-sheets"
}

& $node ".\generate_etam_localization_mvp.js" @argsList
