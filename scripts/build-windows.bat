@echo off
REM Updated build script for Resume Matcher Electron app on Windows
REM Now includes backend bundling and icon generation

setlocal enabledelayedexpansion

echo 🔨 Building Resume Matcher Electron App for Windows...
echo.

REM Get the script directory
cd /d "%~dp0"
cd ..

REM Check prerequisites
echo 📋 Checking prerequisites...
where node >nul 2>nul || (echo ❌ Node.js is required & exit /b 1)
where npm >nul 2>nul || (echo ❌ npm is required & exit /b 1)
where python >nul 2>nul || (echo ❌ Python is required & exit /b 1)

echo ✓ Node.js and npm found
echo ✓ Python found
echo.

REM Generate icons if they don't exist
if not exist "assets\icon.png" (
  echo 🎨 Generating app icons...
  call npm run generate:icons
  echo.
)

if not exist "assets\icons\icon.ico" (
  echo 🎨 Creating Windows .ico icon...
  node scripts/create-ico.js
  echo.
)

REM Build backend for Windows
echo 🔨 Building Windows backend...
node scripts/build-backend-windows.js
echo.

REM Build everything (frontend + electron app)
echo 📦 Building frontend...
call npm run build:frontend
if errorlevel 1 exit /b 1

echo 📦 Building Electron app...
call npm run build:electron-windows
if errorlevel 1 exit /b 1

echo.
echo ✅ Build complete!
echo 📂 Installers are in: .\dist\
echo.
dir /b dist\*.exe 2>nul
