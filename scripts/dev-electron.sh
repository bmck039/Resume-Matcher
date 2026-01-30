#!/bin/bash
# Development script for Resume Matcher Electron app

set -e

echo "🚀 Starting Resume Matcher Electron Development Server..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"/..

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }

echo "✓ Node.js and npm found"
echo ""

# Start backend
echo "🐍 Starting backend on http://localhost:8000..."
npm run dev:backend &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend dev server
echo "📦 Starting frontend dev server on http://localhost:3000..."
echo "⏳ Wait a few seconds for frontend to start, then Electron will launch..."
echo ""

npm run dev:frontend &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 10

# Start Electron (pointing to localhost:3000)
echo "🖥️  Launching Electron..."
NODE_ENV=development NEXT_PUBLIC_API_URL=http://localhost:8000 npm run electron:dev &
ELECTRON_PID=$!

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping development servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  kill $ELECTRON_PID 2>/dev/null || true
  exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for processes
wait
