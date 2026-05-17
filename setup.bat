@echo off
echo =========================================
echo Setting up NeuroPlus Guard Application
echo =========================================

echo Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo.
echo Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo =========================================
echo Setup Complete! You can now run start.bat
echo =========================================
pause
