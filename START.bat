@echo off
title LinkedIn Auto Bot - Setup & Run
color 0A
echo.
echo  ██╗     ██╗███╗   ██╗██╗  ██╗███████╗██████╗ ██╗███╗   ██╗
echo  ██║     ██║████╗  ██║██║ ██╔╝██╔════╝██╔══██╗██║████╗  ██║
echo  ██║     ██║██╔██╗ ██║█████╔╝ █████╗  ██║  ██║██║██╔██╗ ██║
echo  ██║     ██║██║╚██╗██║██╔═██╗ ██╔══╝  ██║  ██║██║██║╚██╗██║
echo  ███████╗██║██║ ╚████║██║  ██╗███████╗██████╔╝██║██║ ╚████║
echo  ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═══╝
echo.
echo  AUTO BOT - Setup and Launch
echo  ============================================
echo.

:: Check Python
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found!
    echo  Please install Python from https://python.org
    pause
    exit
)
echo  Python OK

:: Check Node
echo [2/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found!
    echo  Please install Node.js from https://nodejs.org
    pause
    exit
)
echo  Node.js OK

:: Install Python packages
echo [3/6] Installing Python packages...
pip install selenium webdriver-manager flask flask-cors werkzeug requests --quiet --exists-action i
echo  Python packages OK

:: Setup React UI if not exists
echo [4/6] Setting up React UI...
if not exist "ui\package.json" (
    echo  Creating React project...
    call npm create vite@latest ui -- --template react --yes >nul 2>&1
    cd ui
    call npm install --silent >nul 2>&1
    call npm install tailwindcss @tailwindcss/vite --silent >nul 2>&1
    cd ..
    echo  React project created
) else (
    echo  React project already exists
)

:: Copy frontend files
echo [5/6] Copying app files...
copy /Y "App.jsx" "ui\src\App.jsx" >nul 2>&1
copy /Y "vite.config.js" "ui\vite.config.js" >nul 2>&1
copy /Y "index.css" "ui\src\index.css" >nul 2>&1
copy /Y "main.jsx" "ui\src\main.jsx" >nul 2>&1
echo  Files copied

:: Launch everything
echo [6/6] Launching Bot System...
echo.
echo  Starting Python backend on http://localhost:5000
echo  Starting React frontend on http://localhost:5173
echo.

:: Start backend in new window
start "LinkedIn Bot Backend" cmd /k "python server.py"

:: Wait 2 seconds
timeout /t 2 /nobreak >nul

:: Start frontend in new window
start "LinkedIn Bot Frontend" cmd /k "cd ui && npm run dev"

:: Wait 3 seconds then open browser
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo  Both servers started!
echo  Browser opening at http://localhost:5173
echo.
echo  Press any key to close this window...
pause >nul
