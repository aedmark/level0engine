@echo off
echo Starting Archive Editor...

:: Wait for a second to let the server start, then open the browser
start http://localhost:3000

:: Start the server
node editor_server.js
pause
