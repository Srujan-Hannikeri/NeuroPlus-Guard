@echo off
echo =========================================
echo Starting NeuroPlus Guard Application
echo =========================================

echo Starting Backend Server...
cd backend
start cmd /k "npm run dev"
cd ..

echo Starting Frontend Server...
cd frontend
start cmd /k "npm run dev"
cd ..

echo.
echo Both servers are starting in new terminal windows!
echo Keep those windows open while using the application.
echo =========================================
