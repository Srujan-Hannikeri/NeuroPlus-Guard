@echo off
echo =========================================
echo Setting up NeuroPlus Guard
echo =========================================

echo Installing Backend Dependencies...
cd api
call npm install
cd ..

echo.
echo Installing Frontend Dependencies...
call npm install

echo.
echo Setup Complete!
echo You can now run start.bat to launch the application.
echo =========================================
pause
