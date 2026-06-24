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
  Write-Host "Downloading CropCode $version..."
  Invoke-WebRequest -UseBasicParsing -Uri "$downloadBase/$asset" -OutFile $archive
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
