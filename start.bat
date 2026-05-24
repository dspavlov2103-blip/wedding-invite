@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Свадебное приглашение — локальный запуск
echo  Откройте в браузере: http://localhost:3847
echo  Админка анкет:        http://localhost:3847/admin
echo.
node server.js
pause
