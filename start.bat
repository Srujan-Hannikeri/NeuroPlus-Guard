@echo off
echo =========================================
echo Starting NeuroPlus Guard Application
echo =========================================

echo Starting Backend Server...
cd api
start cmd /k "npm run dev"
cd ..

echo Starting Frontend Server...
start cmd /k "npm run dev"

echo.
echo Both servers are starting in new terminal windows!
echo Keep those windows open while using the application.
echo =========================================
