$ErrorActionPreference = "Stop"

$repository = "YuanyuanMa03/cropcode"
$version = if ($env:CROPCODE_VERSION) { $env:CROPCODE_VERSION } else { "latest" }
$asset = "cropcode-windows-x64.zip"
$downloadBase = if ($env:CROPCODE_DOWNLOAD_BASE) {
  $env:CROPCODE_DOWNLOAD_BASE
} elseif ($version -eq "latest") {
  "https://github.com/$repository/releases/latest/download"
} else {
  "https://github.com/$repository/releases/download/$version"
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("cropcode-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  $archive = Join-Path $tempDir $asset
  $checksums = Join-Path $tempDir "SHA256SUMS"
  Write-Host "Downloading CropCode $version..."
  Invoke-WebRequest -UseBasicParsing -Uri "$downloadBase/$asset" -OutFile $archive
  Invoke-WebRequest -UseBasicParsing -Uri "$downloadBase/SHA256SUMS" -OutFile $checksums
  $checksumLine = Get-Content $checksums | Where-Object { $_ -match "\s+$([regex]::Escape($asset))$" } | Select-Object -First 1
  if (-not $checksumLine) {
    throw "SHA256SUMS does not contain $asset."
  }
  $expectedHash = ($checksumLine -split "\s+")[0].ToLowerInvariant()
  $actualHash = (Get-FileHash $archive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) {
    throw "Checksum verification failed for $asset."
  }
  Expand-Archive -Path $archive -DestinationPath $tempDir -Force
  $installer = Get-ChildItem -Path $tempDir -Recurse -File -Filter install.ps1 |
    Where-Object { $_.DirectoryName -ne $tempDir } |
    Select-Object -First 1
  if (-not $installer) {
    throw "The downloaded package does not contain install.ps1."
  }
  & $installer.FullName
} finally {
  Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
}
