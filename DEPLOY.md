# SAQI-MD — apne host par 24/7 deploy (5 minute)

Bot ko meri sandbox se azad karne ke liye use kisi bhi always-on machine par chalao. Session Mongo me save hy — **ek dafa link karo, bot mahino chalta rahega** (restart par khud reconnect).

## Rasta 1 — VPS (sab se behtar, 100% uptime)

1. Koi bhi sasta VPS lo (Hetzner/DigitalOcean/Hostinger — Ubuntu 22/24, ~$4-6/mo, ya jo bhi mile)
2. SSH se jao aur ye 2 commands:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/badb54880-spec/SAQI-MD/main/deploy/install.sh)
```

3. Script `.env` banayegi — `nano .env` se MONGODB_URI (wahi jo abhi chal raha) + GEMINI_API_KEY bharo
4. Script dobara chalao — pm2 par bot uth jayega, **server restart par bhi khud wapis** (`pm2 startup` ho chuka)

## Rasta 2 — Purana Android + Termux (FREE)

1. Play Store se **Termux** lo (F-Droid wali)
2. Termux me: `termux-wake-lock` phir wahi install script upar wali
3. Phone charger par laga do — bot 24/7 chalega (WiFi zaroori)

## Kya deploy me jata hy

- `worker.js` — poora bot (multi-user, sab sessions Mongo se)
- Portal already Vercel par hy (saqi-md.vercel.app) — usko chhedna nahi
- `pm2` crash par 5s me restart karta hy, server reboot par bhi

## Zaroori env vars (.env)

```
MONGODB_URI=mongodb+srv://...   (Atlas free cluster chalega)
GEMINI_API_KEY=...              (AI commands)
OWNER_NUMBERS=923106762478
```

## Verify

```bash
pm2 logs saqi-md        # "connected as ..." dikhna chahiye
pm2 status              # online
```
