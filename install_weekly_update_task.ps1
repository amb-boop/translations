$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$weeklyLauncher = Join-Path $scriptDir "run_weekly_update.ps1"
$logDir = Join-Path $scriptDir "logs"
$logFile = Join-Path $logDir "weekly_update.log"
$taskName = "Etam Localization Twice Weekly Update"

if (-not (Test-Path $weeklyLauncher)) {
  throw "Weekly launcher not found: $weeklyLauncher"
}

if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$actionScript = "& `"$weeklyLauncher`" *> `"$logFile`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command $actionScript"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Thursday -At 8:00am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Updates the Etam localization HTML review tool and CSV queues every Monday and Thursday morning." -Force | Out-Null

Write-Output "Installed scheduled task: $taskName"
Write-Output "Weekly log: $logFile"
