#!/bin/bash
echo "Starting Archive Editor..."
cd lore-editor

# Attempt to open the default web browser in the background
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000 &
elif command -v open > /dev/null; then
    open http://localhost:3000 &
fi

# Start the server
node server.js
