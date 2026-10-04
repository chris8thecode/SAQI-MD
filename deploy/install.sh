#!/usr/bin/env bash
# SAQI-MD one-shot install   VPS (Ubuntu/Debian) ya Android (Termux) dono par
# Chalane se pehle: .env me MONGODB_URI aur GEMINI_API_KEY bharo
set -e
echo "=== SAQI-MD install ==="

# 1) Node 24 (agar nahi hy)
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 24 ]; then
  if command -v apt >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs git
  else
    echo "Termux: pkg install nodejs -y"; pkg install nodejs git -y
  fi
fi

# 2) Repo + deps
[ -d SAQI-MD ] || git clone https://github.com/saqibiqbaltesting-ai/SAQI-MD.git
cd SAQI-MD
npm install

# 3) .env (agar nahi hy)
if [ ! -f .env ]; then
  cat > .env <<'E'
MONGODB_URI=yahan_apna_mongo_uri
GEMINI_API_KEY=yahan_apni_gemini_key
OWNER_NUMBERS=923106762478
E
  echo "⚠️  .env ban gayi   ab usme MONGODB_URI aur GEMINI_API_KEY bharo, phir dobara ye script chalao: pm2 start deploy/ecosystem.config.js"
  exit 0
fi

# 4) pm2 + start + boot persist
npm install -g pm2 2>/dev/null || true
pm2 start deploy/ecosystem.config.js
pm2 save
(pm2 startup 2>/dev/null | tail -1 | bash) 2>/dev/null || true

echo ""
echo "=== ✅ SAQI-MD chal raha hy (24/7, restart-proof) ==="
echo "Logs: pm2 logs saqi-md | Status: pm2 status"
