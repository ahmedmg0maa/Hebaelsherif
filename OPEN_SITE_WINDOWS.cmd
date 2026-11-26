@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto prerequisites
where corepack >nul 2>nul
if errorlevel 1 goto prerequisites
node -e "process.exit(Number(process.versions.node.split('.')[0])===24?0:1)"
if errorlevel 1 goto prerequisites
if exist "node_modules\.modules.yaml" goto launch
call corepack pnpm install --frozen-lockfile
if errorlevel 1 goto failed
:launch
echo Open http://127.0.0.1:3000 after the server says Ready.
echo Keep this window open. Press Ctrl+C to stop the local server.
echo Admin access requires your configured Supabase project and owner account.
call corepack pnpm dev:next --hostname 127.0.0.1 --port 3000
if errorlevel 1 goto failed
exit /b 0
:prerequisites
echo Install Node.js 24 and Corepack, then run this file again.
pause
exit /b 1
:failed
echo Startup failed. See START_REVIEWED_AR.md for setup and troubleshooting.
pause
exit /b 1
