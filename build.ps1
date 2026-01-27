# 1. Load the version from version.json
$jsonFile = "version.json"
if (-Not (Test-Path $jsonFile)) {
    Write-Host "Error: version.json not found!" -ForegroundColor Red; exit
}

$json = Get-Content -Raw -Path $jsonFile | ConvertFrom-Json
$currentVer = $json.version
$notes = $json.notes

Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host " STAGE 1: VERSION VERIFICATION" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Target Version: $currentVer" -ForegroundColor Yellow
Write-Host "Update Notes:   $notes" -ForegroundColor Gray

$confirmVersion = Read-Host "`nIs this version correct? (y/n)"
if ($confirmVersion -ne 'y') {
    Write-Host "Build cancelled." -ForegroundColor Red; exit
}

# ---------------------------------------------------------
# 2. Sync HTML
Write-Host "`nSyncing index.html..." -ForegroundColor Blue
$html = Get-Content index.html -Raw
$html = $html -replace 'window\.APP_VERSION\s*=\s*".*?"', "window.APP_VERSION = `"$currentVer`""
# $html = $html -replace '<span class="title_version">v.*?</span>', "<span class=`"title_version`">v$currentVer</span>"
$html = $html -replace '<span class="version-badge">v.*?</span>', "<span class=`"version-badge`">v$currentVer</span>"
$html | Set-Content index.html

Write-Host "Done: index.html is now v$currentVer" -ForegroundColor Green

# Open local server to check before committing
Start-Process "http://localhost:6179" # Adjust this URL to your IIS path

# ---------------------------------------------------------
# 3. Git Add and Commit
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host " STAGE 2: GIT COMMIT" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
$confirmCommit = Read-Host "Everything look good on Localhost? Ready to commit? (y/n)"

if ($confirmCommit -eq 'y') {
    git add .
    # Using ${} prevents the colon from being treated as a drive reference
    git commit -m "Build v${currentVer}: ${notes}"

    # ---------------------------------------------------------
    # 4. Git Push
    Write-Host "`n==============================================" -ForegroundColor Cyan
    Write-Host " STAGE 3: GITHUB PUSH" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    $confirmPush = Read-Host "Ready to PUSH to GitHub? (y/n)"

    if ($confirmPush -eq 'y') {
        git push
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    }
}

Write-Host "Opening GitHub Project Actions!" -ForegroundColor Green
Start-Process "https://github.com/ArcTropics/fountain-screenplay/actions" # Adjust this path to the github actions path

Write-Host "`n--- Script Finished ---" -ForegroundColor Cyan
pause
