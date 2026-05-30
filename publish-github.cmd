@echo off
setlocal EnableExtensions

set "SOURCE=%~dp0"
if "%SOURCE:~-1%"=="\" set "SOURCE=%SOURCE:~0,-1%"
set "DEPLOY=D:\Stable-Diffusion\hayotzerWEB\github-upload-hayotzer_project-resume"
set "MESSAGE=%~1"
if "%MESSAGE%"=="" set "MESSAGE=Update Hayotzer site"

if not exist "%DEPLOY%\.git" (
  echo GitHub deploy clone was not found: "%DEPLOY%"
  exit /b 1
)

echo Syncing site files...
copy /Y "%SOURCE%\index.html" "%DEPLOY%\index.html" >nul || exit /b 1
copy /Y "%SOURCE%\_headers" "%DEPLOY%\_headers" >nul || exit /b 1
copy /Y "%SOURCE%\.nojekyll" "%DEPLOY%\.nojekyll" >nul || exit /b 1
copy /Y "%SOURCE%\.gitignore" "%DEPLOY%\.gitignore" >nul || exit /b 1
copy /Y "%SOURCE%\.env.example" "%DEPLOY%\.env.example" >nul || exit /b 1
copy /Y "%SOURCE%\netlify.toml" "%DEPLOY%\netlify.toml" >nul || exit /b 1
copy /Y "%SOURCE%\package.json" "%DEPLOY%\package.json" >nul || exit /b 1
copy /Y "%SOURCE%\README_TELEGRAM_ANALYTICS.md" "%DEPLOY%\README_TELEGRAM_ANALYTICS.md" >nul || exit /b 1

xcopy /E /Y /I "%SOURCE%\netlify" "%DEPLOY%\netlify" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\scripts" "%DEPLOY%\scripts" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\loader" "%DEPLOY%\assets\loader" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\js" "%DEPLOY%\assets\js" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-1-frames" "%DEPLOY%\assets\shot-1-frames" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-1-frames-mobile" "%DEPLOY%\assets\shot-1-frames-mobile" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-2" "%DEPLOY%\assets\shot-2" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-03-wand" "%DEPLOY%\assets\shot-03-wand" >nul || exit /b 1
xcopy /Y /I "%SOURCE%\assets\shot-3\*.png" "%DEPLOY%\assets\shot-3\" >nul || exit /b 1
xcopy /Y /I "%SOURCE%\assets\shot-3\*.webp" "%DEPLOY%\assets\shot-3\" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-3\hotspots" "%DEPLOY%\assets\shot-3\hotspots" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-3\wand" "%DEPLOY%\assets\shot-3\wand" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\shot-4-5" "%DEPLOY%\assets\shot-4-5" >nul || exit /b 1
xcopy /E /Y /I "%SOURCE%\assets\vendor" "%DEPLOY%\assets\vendor" >nul || exit /b 1

pushd "%DEPLOY%" || exit /b 1

echo Running JavaScript syntax check...
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n'); new Function(scripts); console.log('js syntax ok');" || exit /b 1

echo Checking local asset references...
node -e "const fs=require('fs'),path=require('path'); const html=fs.readFileSync('index.html','utf8'); const refs=new Set(); for (const re of [/(?:src|href|data-src|data-fallback-src)=['\"](assets\/[^'\"?]+)/g,/url\(['\"]?(assets\/[^'\"\)?]+)/g]) { let m; while ((m=re.exec(html))) refs.add(m[1]); } const missing=[...refs].filter(r=>!fs.existsSync(path.join(process.cwd(),r))); console.log('asset refs '+refs.size); if (missing.length) { console.error('missing:\n'+missing.join('\n')); process.exit(1); } console.log('asset refs ok');" || exit /b 1

git add index.html _headers .nojekyll .gitignore .env.example netlify.toml package.json README_TELEGRAM_ANALYTICS.md netlify scripts assets/loader assets/js assets/shot-1-frames assets/shot-1-frames-mobile assets/shot-2 assets/shot-03-wand assets/shot-3/*.png assets/shot-3/*.webp assets/shot-3/hotspots assets/shot-3/wand assets/shot-4-5 assets/vendor || exit /b 1
git diff --cached --quiet
if "%ERRORLEVEL%"=="0" (
  echo No staged deploy changes to commit.
  popd
  exit /b 0
)

git commit -m "%MESSAGE%" || exit /b 1
git push || exit /b 1

popd
echo Published.
