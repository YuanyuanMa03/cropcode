param([string]$Prefix = $(if ($env:CROPCODE_INSTALL_PREFIX) { $env:CROPCODE_INSTALL_PREFIX } else { Join-Path $env:LOCALAPPDATA 'CropCode' }))
$ErrorActionPreference = 'Stop'
if (-not [IO.Path]::IsPathRooted($Prefix)) { throw 'Prefix must be an absolute path.' }
$Prefix = [IO.Path]::GetFullPath($Prefix).TrimEnd('\')
if (-not (Test-Path -LiteralPath $Prefix)) { Write-Host 'CropCode standalone is not installed here.'; return }
if ((Get-Item -LiteralPath $Prefix).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to remove a linked directory.' }
$marker = Join-Path $Prefix '.cropcode-install-root'
if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -Raw -LiteralPath $marker).Trim() -ne 'cropcode-standalone-v1') { throw 'Refusing to remove an unmanaged directory.' }
$lockPath = Join-Path $Prefix '.install-lock'
$lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    # Windows cannot remove an open runtime. Fail explicitly if CropCode is still running.
    Get-ChildItem -LiteralPath $Prefix -Force | Where-Object { $_.Name -notin @('.install-lock', '.cropcode-install-root', 'uninstall.ps1') } | Remove-Item -Recurse -Force
}
finally { $lock.Dispose(); Remove-Item -LiteralPath $lockPath -Force }
Remove-Item -LiteralPath $Prefix -Recurse -Force
Write-Host 'CropCode standalone and its private runtime were removed. Your ~/.cropcode settings, sessions and project files were kept.'
Write-Host 'Remove its bin directory from user PATH if you added it. npm installations are uninstalled separately with npm.'
