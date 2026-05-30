param(
  [string]$Message = "Update Hayotzer site $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"

$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployRoot = "D:\Stable-Diffusion\hayotzerWEB\github-upload-hayotzer_project-resume"

if (-not (Test-Path -LiteralPath (Join-Path $DeployRoot ".git"))) {
  throw "GitHub deploy clone was not found at: $DeployRoot"
}

function Copy-OneFile {
  param(
    [string]$Source,
    [string]$Destination
  )

  $sourceDir = Split-Path -Parent $Source
  $fileName = Split-Path -Leaf $Source
  $destinationDir = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $destinationDir)) {
    & cmd.exe /d /c "mkdir `"$destinationDir`""
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create $destinationDir"
    }
  }

  cmd /c copy /Y "$Source" "$Destination"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy $Source"
  }
}

function Copy-AssetTree {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Destination)) {
    & cmd.exe /d /c "mkdir `"$Destination`""
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create $Destination"
    }
  }

  $excludedDirs = @("3Dmagic_wand-main", "MagicWandVideoCarouselUnity", "node_modules", "src")
  $excludedFiles = @("3Dmagic_wand-main.zip")
  & robocopy.exe $Source $Destination /E /NFL /NDL /NJH /NJS /NP /R:2 /W:1 /XD $excludedDirs /XF $excludedFiles
  if ($LASTEXITCODE -ge 8) {
    throw "Asset copy failed with robocopy exit code $LASTEXITCODE"
  }
}

Write-Host "Syncing site files..."
Copy-OneFile (Join-Path $SourceRoot "index.html") (Join-Path $DeployRoot "index.html")
Copy-OneFile (Join-Path $SourceRoot "_headers") (Join-Path $DeployRoot "_headers")
Copy-OneFile (Join-Path $SourceRoot ".nojekyll") (Join-Path $DeployRoot ".nojekyll")
Copy-OneFile (Join-Path $SourceRoot ".gitignore") (Join-Path $DeployRoot ".gitignore")
Copy-OneFile (Join-Path $SourceRoot ".env.example") (Join-Path $DeployRoot ".env.example")
Copy-OneFile (Join-Path $SourceRoot "netlify.toml") (Join-Path $DeployRoot "netlify.toml")
Copy-OneFile (Join-Path $SourceRoot "package.json") (Join-Path $DeployRoot "package.json")
Copy-OneFile (Join-Path $SourceRoot "README_TELEGRAM_ANALYTICS.md") (Join-Path $DeployRoot "README_TELEGRAM_ANALYTICS.md")

$sourceAssets = Join-Path $SourceRoot "assets"
$deployAssets = Join-Path $DeployRoot "assets"
Copy-AssetTree $sourceAssets $deployAssets

Copy-AssetTree (Join-Path $SourceRoot "netlify") (Join-Path $DeployRoot "netlify")
Copy-AssetTree (Join-Path $SourceRoot "scripts") (Join-Path $DeployRoot "scripts")

Push-Location $DeployRoot
try {
  Write-Host "Running JavaScript syntax check..."
  node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const scripts=[...html.matchAll(/<script(?![^>]*type=[`"'](?:importmap|application\/json)[`"'])[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n'); new Function(scripts); console.log('js syntax ok');"

  Write-Host "Checking local asset references..."
  @'
from pathlib import Path
import re
root = Path.cwd()
html = (root / 'index.html').read_text(encoding='utf-8')
refs = set(re.findall(r'''(?:src|href|data-src|data-fallback-src)=["'](assets/[^"'?]+)''', html))
refs.update(re.findall(r'''url\(["']?(assets/[^"')?]+)''', html))
missing = [r for r in sorted(refs) if not (root / r).exists()]
print('asset refs', len(refs))
if missing:
    print('missing:')
    print('\n'.join(missing))
    raise SystemExit(1)
print('asset refs ok')
'@ | python -

  git add index.html _headers .nojekyll .gitignore .env.example netlify.toml package.json README_TELEGRAM_ANALYTICS.md `
    netlify `
    scripts `
    assets/loader `
    assets/js `
    assets/shot-1-frames `
    assets/shot-1-frames-mobile `
    assets/shot-2 `
    assets/shot-03-wand `
    assets/shot-3/*.png `
    assets/shot-3/*.webp `
    assets/shot-3/hotspots `
    assets/shot-3/wand `
    assets/shot-4-5 `
    assets/vendor

  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Write-Host "No staged deploy changes to commit."
    exit 0
  }

  git commit -m $Message

  if ($NoPush) {
    Write-Host "Committed locally. Skipping push because -NoPush was used."
    exit 0
  }

  try {
    git push
  } catch {
    Write-Warning "Commit was created, but git push failed. Sign in to GitHub, then run: git push"
    throw
  }
} finally {
  Pop-Location
}
