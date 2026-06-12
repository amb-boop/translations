$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dailyLauncher = Join-Path $scriptDir "run_daily_update.ps1"

if (-not (Test-Path $dailyLauncher)) {
  throw "Weekly update cannot run because run_daily_update.ps1 is missing."
}

& $dailyLauncher

