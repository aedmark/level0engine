@echo off
echo Stopping Level 0 Engine and Archive Editor...

:: Use WMIC to kill Node processes running our specific scripts safely
wmic process where "name='node.exe' and commandline like '%%engine_server.js%%'" call terminate >nul 2>&1

echo Servers stopped.
pause
