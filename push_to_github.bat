@echo off
title Pushing to GitHub - DO NOT CLOSE
echo =============================================
echo   Force Pushing local repo to GitHub
echo =============================================
echo.

cd /d "C:\Users\DELL\Desktop\WEBSITES\billing software"
echo Working directory: %cd%
echo.

echo Please paste your new GitHub token (starts with ghp_) and press Enter:
set /p GITHUB_TOKEN=Token: 

echo.
echo [1/3] Aborting any in-progress merge...
git merge --abort 2>nul
git rebase --abort 2>nul
echo Done.
echo.

echo [2/3] Preparing files...
git add -A
echo.

echo [3/3] Uploading to GitHub...
rem Remove old remote and add new one with the token
git remote remove origin 2>nul
git remote add origin https://chamarthymahesh:%GITHUB_TOKEN%@github.com/chamarthymahesh/billing.git

git push -u origin main --force
echo.

if errorlevel 1 (
    echo.
    echo ERROR: Push failed. Make sure the token has "repo" permissions!
) else (
    echo.
    echo =============================================
    echo   SUCCESS! Code is now on GitHub.
    echo   Visit: https://github.com/chamarthymahesh/billing
    echo =============================================
)
echo.
echo Press any key to close...
pause >nul
