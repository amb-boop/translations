$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$systemPython = Get-Command python -ErrorAction SilentlyContinue

if (Test-Path $bundledPython) {
  $python = $bundledPython
} elseif ($systemPython) {
  $python = $systemPython.Source
} else {
  throw "Python is not available. The PIM export could not be generated."
}

Set-Location $scriptDir
& $python ".\export_validated_pim.py"

