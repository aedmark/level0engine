@echo off
echo Starting Archive Editor...
cd lore-editor

:: Wait for a second to let the server start, then open the browser
start http://localhost:3000

:: Start the server
node server.js
pause
