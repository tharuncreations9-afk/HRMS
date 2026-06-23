#!/bin/sh
# Stop whatever is listening on a port (Synology / Linux).
# Usage: sh scripts/stop-port.sh [port]
# Example: sh scripts/stop-port.sh 3000

PORT="${1:-3000}"

echo "Looking for process on port ${PORT}..."

if command -v fuser >/dev/null 2>&1; then
  if fuser "${PORT}/tcp" >/dev/null 2>&1; then
    echo "Killing process on port ${PORT}..."
    fuser -k "${PORT}/tcp" 2>/dev/null || sudo fuser -k "${PORT}/tcp"
    echo "Done."
    exit 0
  fi
fi

if command -v ss >/dev/null 2>&1; then
  PID=$(ss -tlnp 2>/dev/null | grep ":${PORT} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
elif command -v netstat >/dev/null 2>&1; then
  PID=$(netstat -tlnp 2>/dev/null | grep ":${PORT} " | awk '{print $7}' | cut -d/ -f1 | head -1)
else
  echo "Install fuser, ss, or netstat to find the process."
  exit 1
fi

if [ -z "$PID" ] || [ "$PID" = "-" ]; then
  echo "No process found on port ${PORT}."
  exit 0
fi

echo "Found PID ${PID} on port ${PORT}. Stopping..."
kill "$PID" 2>/dev/null || sudo kill "$PID" 2>/dev/null
sleep 1
kill -9 "$PID" 2>/dev/null || sudo kill -9 "$PID" 2>/dev/null
echo "Port ${PORT} should be free now."
