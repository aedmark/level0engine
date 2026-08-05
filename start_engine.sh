#!/bin/bash
echo "Starting Level 0 Engine..."

# Attempt to open the default web browser in the background
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:8080 &
elif command -v open > /dev/null; then
    open http://localhost:8080 &
fi

# Start the server
node engine_server.js
