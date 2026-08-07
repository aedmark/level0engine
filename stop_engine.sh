#!/bin/bash
echo "Stopping Level 0 Engine and Archive Editor..."

# pkill will specifically target our node scripts
pkill -f "node engine_server.js"

echo "Servers stopped."
