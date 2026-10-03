#!/bin/sh
# SAQI-MD multi-user guardian — Mongo ke sab sessions ko jaga kar rakhta hy
# v2 (Oct 3 PM): crash-loop guard — EADDRINUSE / fast-fail par backoff, aur
# 5 consecutive fast failures ke baad exit (agli cron window ka intezar).
# Pehle ye while-true bina guard ka tha -> 39 worker exits, 2 EADDRINUSE crashes.
exec 9>/tmp/.saqi-guard.lock
flock -n 9 || { echo "guard already running — exit"; exit 0; }
cd /workspace/saqi-md

FAILS=0
MAX_FAST_FAILS=5
FAST_FAIL_SECS=30

while true; do
  MONGODB_URI=$(grep '^MONGODB_URI=' .env 2>/dev/null | cut -d= -f2-)
  export MONGODB_URI
  MAX_SESSIONS=4 /workspace/tools/node22/bin/node worker.js >> saqi.log 2>&1 &
  BOT_PID=$!
  echo "$BOT_PID" > saqi.pid
  START_TS=$(date +%s)
  wait $BOT_PID
  END_TS=$(date +%s)
  RAN=$((END_TS - START_TS))

  echo "worker exited ($(date -u)), ran ${RAN}s, restart in 5s" >> saqi.log

  if [ "$RAN" -lt "$FAST_FAIL_SECS" ]; then
    FAILS=$((FAILS + 1))
    echo "guard: fast-fail $FAILS/$MAX_FAST_FAILS (ran ${RAN}s)" >> saqi.log
  else
    FAILS=0
  fi

  if [ "$FAILS" -ge "$MAX_FAST_FAILS" ]; then
    echo "guard: $MAX_FAST_FAILS consecutive fast failures — backing off, exiting (agli cron window intezar)" >> saqi.log
    exit 1
  fi

  # backoff: normal 5s, fast-fail par barhta hua (5, 10, 20, 40, 60 cap)
  # POSIX sh me ** nahi hota — case se map karte hain
  case "$FAILS" in
    0) SLEEP=5 ;;
    1) SLEEP=5 ;;
    2) SLEEP=10 ;;
    3) SLEEP=20 ;;
    4) SLEEP=40 ;;
    *) SLEEP=60 ;;
  esac
  echo "guard: sleeping ${SLEEP}s" >> saqi.log
  sleep "$SLEEP"
done
