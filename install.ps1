param(
    [string]$Version = 'latest',
    [string]$Prefix = $(if ($env:CROPCODE_INSTALL_PREFIX) { $env:CROPCODE_INSTALL_PREFIX } else { Join-Path $env:LOCALAPPDATA 'CropCode' }),
    [string]$FromRelease
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($env:OS -ne 'Windows_NT') { throw 'Use install.sh on macOS or Linux.' }
if (-not [IO.Path]::IsPathRooted($Prefix)) { throw 'Prefix must be an absolute path.' }
$Prefix = [IO.Path]::GetFullPath($Prefix).TrimEnd('\')
$arch = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
if ($arch -notin @('x64', 'arm64')) { throw 'Supported Windows architectures: x64 and ARM64.' }
$target = "win32-$arch"
$repo = 'https://github.com/YuanyuanMa03/cropcode'
if ($Version -eq 'latest') {
    if ($FromRelease) { throw 'FromRelease requires an explicit version.' }
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/YuanyuanMa03/cropcode/releases/latest'
    if ($release.draft -or $release.prerelease) { throw 'Expected a stable release.' }
    $Version = $release.tag_name
}
$Version = $Version -replace '^v', ''
if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') { throw 'Expected a version such as 2.2.1.' }
$asset = "cropcode-$Version-$target.zip"
$temp = Join-Path ([IO.Path]::GetTempPath()) ('cropcode-install-' + [guid]::NewGuid().ToString('N'))
$lock = $null
New-Item -ItemType Directory -Path $temp | Out-Null
try {
    Write-Host "Installing CropCode $Version for $target (bundled runtime)..."
    foreach ($name in @($asset, 'SHA256SUMS')) {
        $destination = Join-Path $temp $name
        if ($FromRelease) { Copy-Item -LiteralPath (Join-Path $FromRelease $name) -Destination $destination }
        else { Invoke-WebRequest -UseBasicParsing -Uri "$repo/releases/download/v$Version/$name" -OutFile $destination }
    }
    $entries = @(Get-Content -LiteralPath (Join-Path $temp 'SHA256SUMS') | Where-Object { $_ -match "^[a-fA-F0-9]{64}\s+$([regex]::Escape($asset))$" })
    if ($entries.Count -ne 1) { throw 'Missing or duplicate checksum entry.' }
    $expected = ($entries[0] -split '\s+')[0]
    $stream = [IO.File]::OpenRead((Join-Path $temp $asset))
    $hasher = [Security.Cryptography.SHA256]::Create()
    try { $actual = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '') }
    finally { $stream.Dispose(); $hasher.Dispose() }
    if ($actual -ne $expected) {
        throw 'SHA-256 verification failed. The installed version was not changed.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory((Join-Path $temp $asset), $temp)
    $bundle = Join-Path $temp 'cropcode'
    $manifest = Get-Content -Raw -LiteralPath (Join-Path $bundle 'manifest.json') | ConvertFrom-Json
    if ($manifest.product -ne 'CropCode' -or $manifest.version -ne $Version -or $manifest.target -ne $target) { throw 'Bundle manifest mismatch.' }
    $runtime = Join-Path $bundle 'runtime\node.exe'
    & $runtime (Join-Path $bundle 'app\node_modules\@yuanyuanma03\cropcode-cli\cli.js') --version
    if ($LASTEXITCODE -ne 0) { throw 'The new CLI could not start. The installed version was not changed.' }

    $marker = Join-Path $Prefix '.cropcode-install-root'
    if (Test-Path -LiteralPath $Prefix) {
        if ((Get-Item -LiteralPath $Prefix).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Installation prefix must not be a link.' }
        if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -Raw -LiteralPath $marker).Trim() -ne 'cropcode-standalone-v1') { throw 'Refusing to replace an unmanaged directory.' }
    }
    New-Item -ItemType Directory -Force -Path $Prefix | Out-Null
    Set-Content -LiteralPath $marker -Value 'cropcode-standalone-v1' -Encoding ascii
    $lockPath = Join-Path $Prefix '.install-lock'
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $bin = Join-Path $Prefix 'bin'
    New-Item -ItemType Directory -Force -Path $bin | Out-Null
    $command = Join-Path $bin 'cropcode.cmd'
    if ((Test-Path -LiteralPath $command) -and -not ((Get-Content -LiteralPath $command) -contains '@rem CropCode standalone launcher')) { throw "Another installation owns $command." }
    $slotName = "$Version-$target-" + [guid]::NewGuid().ToString('N')
    $slot = Join-Path $Prefix "releases\$slotName"
    New-Item -ItemType Directory -Force -Path (Split-Path $slot) | Out-Null
    Move-Item -LiteralPath $bundle -Destination $slot
    Copy-Item -LiteralPath (Join-Path $slot 'uninstall.ps1') -Destination (Join-Path $Prefix 'uninstall.ps1') -Force
    $next = Join-Path $bin '.cropcode-next.cmd'
    $launcher = "@echo off`r`n@rem CropCode standalone launcher`r`ncall `"%~dp0..\releases\$slotName\cropcode.cmd`" %*`r`nexit /b %errorlevel%`r`n"
    [IO.File]::WriteAllText($next, $launcher, [Text.Encoding]::ASCII)
    if (Test-Path -LiteralPath $command) {
        # Windows PowerShell converts a null string argument to an empty path.
        $backup = Join-Path $bin ('.cropcode-previous-' + [guid]::NewGuid().ToString('N') + '.cmd')
        [IO.File]::Replace($next, $command, $backup)
        Remove-Item -LiteralPath $backup -Force
    }
    else { [IO.File]::Move($next, $command) }
    Write-Host "Installed: $command"
    if (($env:PATH -split ';') -notcontains $bin) {
        Write-Host "Add $bin to your user PATH in Windows Environment Variables, then reopen the terminal."
        Write-Host 'For this PowerShell session:'
        Write-Host ('$env:PATH = ' + "'" + $bin.Replace("'", "''") + ";' + " + '$env:PATH')
    }
    Write-Host "Uninstall: & '$($Prefix.Replace("'", "''"))\uninstall.ps1' -Prefix '$($Prefix.Replace("'", "''"))'"
    Write-Host 'Your existing Node.js, settings, sessions and project files were not changed.'
}
finally {
    if ($lock) { $lock.Dispose(); Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
