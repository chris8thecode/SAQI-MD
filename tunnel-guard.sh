#!/bin/sh
cd /workspace/saqi-md
echo "=== tunnel guard start $(date -u) ===" >> tunnel-guard.log
while true; do
  /tmp/cloudflared tunnel --url http://localhost:3000 --no-autoupdate > tunnel.log 2>&1 &
  TPID=$!
  echo "$TPID" > tunnel.pid
  wait $TPID
  echo "tunnel exited ($(date -u)), restart in 5s" >> tunnel-guard.log
  sleep 5
done
