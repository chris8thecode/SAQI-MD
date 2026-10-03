#!/bin/sh
# SAQI-MD multi-user guardian — Mongo ke sab sessions ko jaga kar rakhta hy
exec 9>/tmp/.saqi-guard.lock
flock -n 9 || { echo "guard already running — exit"; exit 0; }
cd /workspace/saqi-md
echo "=== saqi-md guard start $(date -u) ===" >> saqi.log
while true; do
  MONGODB_URI=$(grep '^MONGODB_URI=' .env 2>/dev/null | cut -d= -f2-)
  export MONGODB_URI
  MAX_SESSIONS=4 /workspace/tools/node22/bin/node worker.js >> saqi.log 2>&1 &
  BOT_PID=$!
  echo "$BOT_PID" > saqi.pid
  wait $BOT_PID
  echo "worker exited ($(date -u)), restart in 5s" >> saqi.log
  sleep 5
done
