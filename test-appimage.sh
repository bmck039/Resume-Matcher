#!/bin/bash
# Test script for AppImage - logs to file

LOG_FILE="/tmp/resume-matcher-debug.log"

echo "Starting Resume Matcher AppImage test..." > "$LOG_FILE"
echo "Timestamp: $(date)" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"

# Run with DISPLAY set to :99 (virtual display) and capture all output
DISPLAY=:99 XVFB_RUN_TMPDIR=/tmp xvfb-run -a "./dist/Resume Matcher-1.0.0-x86_64.AppImage" >> "$LOG_FILE" 2>&1 &
APP_PID=$!

echo "App PID: $APP_PID" >> "$LOG_FILE"

# Wait and check
sleep 20

echo "" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"
echo "After 20 seconds:" >> "$LOG_FILE"
ps aux | grep -E "(resume|backend|node)" | grep -v grep >> "$LOG_FILE" 2>&1

# Check backend
echo "" >> "$LOG_FILE"
echo "Backend health check:" >> "$LOG_FILE"
curl -s http://localhost:8000/api/v1/health >> "$LOG_FILE" 2>&1

# Check frontend  
echo "" >> "$LOG_FILE"
echo "Frontend check:" >> "$LOG_FILE"
curl -s http://localhost:3000 | head -20 >> "$LOG_FILE" 2>&1

# Kill the app
kill $APP_PID 2>/dev/null || true

echo "" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"
echo "Test complete. Check $LOG_FILE for details"
echo "Log file: $LOG_FILE"
cat "$LOG_FILE"
