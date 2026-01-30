#!/bin/bash
# Test the unpacked Electron app and capture all console output

LOG_FILE="/tmp/resume-matcher-electron.log"

echo "Starting Electron app test at $(date)" > "$LOG_FILE"
echo "======================================" >> "$LOG_FILE"

# Run the unpacked app
./dist/linux-unpacked/resume-matcher-desktop >> "$LOG_FILE" 2>&1 &
APP_PID=$!

echo "App started with PID: $APP_PID"

# Wait for startup
sleep 20

# Check if still running
if ps -p $APP_PID > /dev/null; then
    echo "App is still running!"
    kill $APP_PID 2>/dev/null
else
    echo "App exited"
fi

echo ""
echo "======================================"
echo "Log file: $LOG_FILE"
echo "======================================"
cat "$LOG_FILE"
