@echo off
echo Starting Level 0 Engine...

:: Wait for a second to let the server start, then open the browser
start http://localhost:8080

:: Start the server
node engine_server.js
pause
