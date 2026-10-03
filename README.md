# SAQI-MD ⚡

**Attitude King ka apna WhatsApp Bot** — JAWAD-MD style: web pairing portal + MongoDB session persistence + 24/7 worker.

## Architecture

```
┌─────────────────────────┐    session (MongoDB)    ┌──────────────────────┐
│  Pairing Portal (Vercel) │ ─────────────────────▶ │  Worker (Koyeb/Railway)│
│  server.js               │   creds persist hoti    │  index.js             │
│  number dalo -> code     │   hain, worker usi      │  24/7 messages        │
│  user WhatsApp me dale   │   session se online     │  listen + commands    │
└─────────────────────────┘                          └──────────────────────┘
```

1. **Pairing portal** (Vercel): user number deta hy → 8-digit code → WhatsApp me link → creds MongoDB me save
2. **Worker** (Koyeb/Render/Railway/VPS): usi MongoDB session se connect → 24/7 commands chalata hy
3. Ek dafa pair = hamesha connected (restart par bhi, kyunke session Mongo me hy)

## Commands (built-in)

| Category | Commands |
|---|---|
| General | `.menu` `.help` `.ping` `.speed` `.alive` |
| Downloader | `.song` `.ytmp3` `.music` `.play` `.video` `.ytmp4` |
| Tools | `.vv2` `.vv` `.viewonce` `.sticker` `.s` |
| Owner | `.restart` `.eval` `.session` `.setprefix` |

Naya command: `commands/` me file banao — format dekho `commands/general.js`.

## Deployment

### Step 1 — MongoDB Atlas (free)

1. https://cloud.mongodb.com → sign up → **Free M0 cluster** banao
2. **Database Access** → user banao (password yaad rakho)
3. **Network Access** → `0.0.0.0/0` allow karo (everywhere)
4. **Connect → Drivers → Node.js** → connection string copy karo:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true`

### Step 2 — Pairing Portal (Vercel)

1. Is repo ko GitHub par rakho (already: `saqibiqbaltesting-ai/SAQI-MD`)
2. https://vercel.com/new → repo import karo
3. Environment Variables me dalo:
   - `MONGODB_URI` = upar wala connection string
   - `SESSION_ID` = `saqi-md-session`
   - `OWNER_NUMBERS` = apna number (92xxxxxxx)
   - `OWNER_NAME` = apna naam
4. Deploy → `https://saqi-md.vercel.app` ready

> ⚠️ **Honest note:** Vercel serverless par pairing socket 60s tak hi zinda rehta hy
> (limit). Zyada tar dafa code banta hy aur link ho jata hy, magar kabhi kabhi
> "connection closed" aata hy — dobara "Generate" karo. **100% reliable pairing
> ke liye portal ko bhi Koyeb par chalao** (neechy wala Step 3, start command
> `node server.js`) — tab ek hi service me portal + worker dono honge.

### Step 3 — 24/7 Worker (Koyeb — free tier)

1. https://app.koyeb.com → **Create Service → GitHub** → `SAQI-MD` repo
2. **Build:** Dockerfile (already included)
3. **Port:** 3000
4. **Environment variables:** wahi 4 jo Vercel me dale
5. **Restart policy:** ON_FAILURE (already railway.json me hy)
6. Deploy → worker 24/7 chal ega, auto-reconnect bhi

### Local run (dev)

```bash
npm install
cp .env.example .env   # values dalo
npm run pair           # pairing portal (localhost:3000)
npm start              # worker
```

## Security

- `.eval` sirf owner ke liye hy — phir bhi risk samajh kar use karo
- `OWNER_NUMBERS` zaroor set karo warna owner commands koi nahi chala sakta
- WhatsApp unofficial bots ko ban kar sakta hy — spare number use karo

---
*SAQI-MD — Powered by Attitude King 🗡️*
