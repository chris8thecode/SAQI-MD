<h1 align="center">SAQI-MD</h1>

<p align="center">A self-hosted, multi-session WhatsApp bot with a pairing portal and persistent session storage.</p>

<p align="center">
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&style=for-the-badge" alt="Node.js 24.x" />
  </a>
  <a href="https://www.mongodb.com/atlas/database">
    <img src="https://img.shields.io/badge/MongoDB-session%20storage-47A248?logo=mongodb&style=for-the-badge" alt="MongoDB session storage" />
  </a>
  <a href="https://github.com/saqibiqbaltesting-ai/SAQI-MD">
    <img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&style=for-the-badge" alt="WhatsApp bot powered by Baileys" />
  </a>
</p>

SAQI-MD is a community-focused WhatsApp bot built with Node.js and
[Baileys](https://github.com/WhiskeySockets/Baileys). It brings command-driven
chat utilities, media tools, group features, games and optional AI into one
self-hosted service. A persistent worker keeps linked accounts connected; an
optional pairing portal lets users link accounts with a phone-number pairing
code.

## Disclaimer

SAQI-MD is provided for educational and personal use. Use it responsibly:

- Do not spam, harass or contact people without their consent.
- Handle phone numbers, messages, linked sessions and other user data with care.
- Follow WhatsApp's terms and all laws that apply to your use.
- Get permission before adding the bot to groups or processing other people's
  messages and media.

The maintainers are not responsible for misuse or for account restrictions
resulting from use of the project. WhatsApp may suspend or ban accounts that
use unofficial clients.

## Why SAQI-MD?

SAQI-MD combines WhatsApp automation and community features in one
self-hosted project:

- Pair linked accounts through a phone-number code.
- Keep multiple sessions available across worker restarts with MongoDB.
- Use modular commands for media, chat utilities, games, productivity and
  group administration.
- Add optional Gemini-backed text and image prompts.

## How it works

```text
 WhatsApp user
      │
      │ requests a pairing code
      ▼
 Pairing portal ─── MongoDB ─── Worker ─── WhatsApp
  server.js        sessions and   worker.js   message handling
  web/API          pairing queue              and commands
```

- **Pairing portal:** accepts a phone number and creates or queues a pairing
  request.
- **MongoDB:** stores linked-device credentials and bot data so they can
  survive worker restarts. The portal and worker must use the same database
  settings for the queued, multi-user flow.
- **Worker:** connects linked sessions, polls for new pairing requests and
  handles messages. Run it on a persistent Node.js host, not as a serverless
  worker.

Without `MONGODB_URI`, the worker falls back to a local file-backed session and
starts only the configured single session. MongoDB is required for the
multi-session deployment flow.

## Features

### Bot capabilities

- **General commands:** Menu, help, ping, runtime and utility commands.
- **Media tools:** Stickers, audio effects, media conversion, downloads and
  image utilities.
- **Community features:** Group administration, chat tools and participant
  management commands.
- **Games and productivity:** Interactive games, notes, reminders and other
  utilities.
- **Optional AI:** Gemini-backed text prompts and image questions.

### Service capabilities

- **Session persistence:** Store linked-device credentials in MongoDB and
  reconnect sessions when the worker starts.
- **Multi-session worker:** Poll for new sessions and pairing requests.
- **Pairing portal:** Serve a web pairing page and pairing/status APIs.
- **Health endpoints:** Expose worker status for local checks and host
  monitoring.
- **Media processing:** Use FFmpeg for supported audio, video, image and
  sticker commands.

The command registry is built from the modules in [`src/commands`](src/commands).
Use `.menu` (or `.help`) in WhatsApp to see the current command categories, then
use `.menu <category>` and `.details <command>` for command-specific help. The
menu is generated from the loaded modules, so it is the source of truth for
available commands.

## Commands

The default prefix is `.`. A few examples:

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `.menu` or `.help`     | Show command categories                      |
| `.menu <category>`     | List commands in a category                  |
| `.details <command>`   | Show a command description                   |
| `.ping`                | Check bot response time                      |
| `.song <name or link>` | Request audio via the downloader             |
| `.sticker`             | Reply to supported media to create a sticker |
| `.ai <question>`       | Ask the configured Gemini model              |

AI commands require `GEMINI_API_KEY`; FFmpeg-backed commands require FFmpeg.
Use `.menu` in WhatsApp for the full list loaded by the running worker.

## Requirements

- Node.js **24.x**, as declared in [`package.json`](package.json)
- npm
- MongoDB for persistent multi-user sessions and portal-to-worker pairing
- FFmpeg for audio, video, image and sticker commands

The package, Docker image and VPS installer use Node.js 24.x.

## Quick start

### 1. Get the code and install dependencies

```bash
git clone https://github.com/saqibiqbaltesting-ai/SAQI-MD.git
cd SAQI-MD
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env` and set at least `MONGODB_URI` and `OWNER_NUMBERS` for the
multi-session setup. Keep the database URI and any API keys private.

### 3. Start the worker

```bash
npm start
```

The worker serves its status endpoint on `PORT` (default `3000`) and mounts the
pairing API. With MongoDB configured, it restores saved sessions and checks for
new pairing requests. Without MongoDB, it starts a single file-backed session.

To run the standalone pairing server instead:

```bash
npm run pair
```

The worker and standalone server both use port `3000` by default; do not start
both on the same port. In production, keep the worker running on a persistent
host. Serverless platforms can handle portal requests, but should enqueue
pairing through MongoDB rather than being relied on to keep a WhatsApp socket
alive.

## Pairing

For the MongoDB-backed multi-user flow:

1. Deploy the worker with `MONGODB_URI` and `SESSION_PREFIX` configured.
2. Deploy the pairing portal with the same MongoDB URI and session prefix.
3. Submit the phone number with its country code, without a leading `+`.
4. Wait for the pairing code, then enter it in WhatsApp under **Linked devices**
   → **Link with phone number**.
5. The worker detects the linked session and connects it. The session is stored
   in MongoDB for subsequent restarts.

The portal API provides `POST /api/pair` and `GET /api/status/:id`. Pairing
requests move through `pending`, `ready` and `linked` (or `error`) states. The
worker polls the queue while running.

## Web endpoints

| Endpoint                     | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `/` on the worker            | JSON status with session, connection, uptime and command counts |
| `/` on the standalone portal | Pairing page                                                    |
| `/health` on the portal      | Portal health status                                            |
| `POST /api/pair`             | Create or retrieve a pairing request; send a JSON `number`      |
| `GET /pair?phone=<number>`   | Request a pairing code through the direct portal flow           |
| `GET /api/status/:id`        | Read the status and code for a pairing request                  |

The worker's `/livetest` endpoint is restricted to localhost. Do not expose
debug or operational endpoints through a public proxy.

## Configuration

Configuration is read from environment variables or `.env`. See
[`.env.example`](.env.example) for the checked-in template.

| Variable         | Purpose                                                         | Default                            |
| ---------------- | --------------------------------------------------------------- | ---------------------------------- |
| `BOT_NAME`       | Display name used in bot replies                                | `SAQI-MD`                          |
| `PREFIX`         | Command prefix                                                  | `.`                                |
| `OWNER_NAME`     | Owner display name                                              | `Attitude King`                    |
| `OWNER_NUMBERS`  | Comma-separated owner phone numbers, with country codes         | Empty                              |
| `OWNER_EMAIL`    | Optional owner email                                            | Empty                              |
| `MONGODB_URI`    | MongoDB connection string; enables multi-user persistence       | Empty (file-backed single session) |
| `SESSION_ID`     | ID for the local/single-session fallback                        | `saqi-md-session`                  |
| `SESSION_PREFIX` | Prefix for MongoDB multi-user session IDs                       | `SAQI`                             |
| `MAX_SESSIONS`   | Maximum sessions started by one worker                          | `8`                                |
| `MODE`           | `public` or `private`; private mode allows owner and sudo users | `public`                           |
| `TIMEZONE`       | Time zone for time-based messages                               | `Asia/Karachi`                     |
| `AUTO_READ`      | Read incoming command messages when set to `true`               | `false`                            |
| `AUTO_TYPING`    | Enable automatic typing presence unless set to `false`          | `true`                             |
| `WELCOME`        | Enable welcome messages unless set to `false`                   | `true`                             |
| `GOODBYE`        | Enable goodbye messages unless set to `false`                   | `true`                             |
| `PORT`           | HTTP port for the worker or standalone portal                   | `3000`                             |
| `GEMINI_API_KEY` | API key for AI commands                                         | Empty (AI unavailable)             |
| `GEMINI_MODEL`   | Preferred Gemini model                                          | `gemini-flash-latest`              |

`OWNER_NUMBERS` accepts a comma-separated list, for example:

```env
OWNER_NUMBERS=923001234567,923009876543
```

## Deployment

### Persistent worker

Run `npm start` on a persistent Node.js service, VPS or container host. Set
the environment variables from the table above, configure the host's health
check for the worker's HTTP status endpoint and allow outbound access to
MongoDB and WhatsApp. The repository includes a
[Dockerfile](Dockerfile), [Railway configuration](railway.json) and a
[PM2 ecosystem file](deploy/ecosystem.config.js).

The worker polls MongoDB for pairing requests and for sessions created by the
portal. Keep `MONGODB_URI` and `SESSION_PREFIX` consistent across the portal
and worker. The `MAX_SESSIONS` limit is per worker process; size it to the
memory available on the host.

### Pairing portal

The standalone portal entry point is `server.js` (`npm run pair`). The
serverless adapters live in the root [`api`](api) directory, which Vercel
discovers automatically. [`vercel.json`](vercel.json) maps the portal page and
stylesheet from [`src/public`](src/public) to their public URLs. Use the same
MongoDB settings as the worker for the queued pairing flow.

### MongoDB setup

Create a database user with only the access needed by the bot and restrict
network access to trusted addresses where the hosting platform allows it.
Store the connection string as a secret environment variable; do not commit it
to the repository or paste it into public logs.

### FFmpeg

Install FFmpeg using your operating system's package manager, then verify it is
available on `PATH`:

```bash
ffmpeg -version
```

The Dockerfile installs FFmpeg in the container. Some media commands will not
work on a host where the `ffmpeg` executable is missing.

## Project structure

| Path                           | Purpose                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| [`worker.js`](worker.js)       | Persistent worker, command registry, session lifecycle and health endpoint |
| [`server.js`](server.js)       | Pairing portal routes and standalone server entry point                    |
| [`config.js`](config.js)       | Environment configuration and owner checks                                 |
| [`src/commands`](src/commands) | Dynamically loaded command modules                                         |
| [`src/lib`](src/lib)           | Session persistence, message helpers, media utilities and shared logic     |
| [`api`](api)                   | Vercel serverless adapters for the pairing routes                           |
| [`src/public`](src/public)     | Pairing page assets                                                        |
| [`src/assets`](src/assets)     | Bundled image assets                                                       |
| [`deploy`](deploy)             | Deployment scripts and PM2 configuration                                   |
| [`.env.example`](.env.example) | Environment variable template                                              |

## Development

Run the worker locally with `npm start` or run the standalone portal with
`npm run pair`. `npm run format` applies Prettier formatting to the repository.
There is no test script currently defined in `package.json`.
Both npm (`package-lock.json`) and Bun (`bun.lock`) lockfiles are included and
should remain committed; use the matching package manager to keep its lockfile
up to date. Lockfiles should not be ignored.

To add a command, add a module under [`src/commands`](src/commands) and export
the command definitions using the existing module format. The worker loads
JavaScript files from that directory at startup; restart the worker to load
changes.

## Data and security

- Set `OWNER_NUMBERS` before exposing the bot. Owner-only commands depend on
  this configuration.
- Treat MongoDB credentials, linked WhatsApp sessions and API keys as secrets.
  Restrict database access and keep backups private.
- MongoDB stores authentication credentials and selected bot settings; other
  commands may persist command-specific data. Review the code and your MongoDB
  contents before handling sensitive information.
- Do not expose the pairing portal or worker endpoints publicly without
  understanding their access controls and operational risks.
- Follow applicable privacy laws and obtain consent before processing other
  people's messages or media.

Use SAQI-MD only where permitted and at your own risk. WhatsApp may restrict or
ban accounts that use unofficial clients.

## Contributing

Contributions are welcome. Keep changes focused, follow the existing command
module format and describe behavior changes clearly. Before submitting a
change, run the applicable checks; this repository currently defines a
formatting script but no test script.

## Troubleshooting

**The worker does not start**

- Check that the installed Node.js version is 24.x.
- Confirm the `.env` file is in the repository root and `MONGODB_URI` is valid
  when using multi-user mode.
- Check the worker logs for database connectivity or Baileys connection errors.

**A pairing request stays pending**

- Confirm the worker is running and has the same `MONGODB_URI` and
  `SESSION_PREFIX` as the portal.
- Verify the MongoDB network allowlist and credentials.
- Check the worker logs for pairing queue errors and confirm the session limit
  has not been reached.

**Media or sticker commands fail**

- Install FFmpeg and confirm `ffmpeg -version` works in the same environment
  where the worker runs.
- Check available disk space for temporary media files.

**Commands are not recognized**

- Check the configured `PREFIX`.
- Use `.menu` or `.help` to see commands loaded by the running worker.
- Restart the worker after adding or changing command modules.

---

<p align="center">SAQI-MD · Powered by Attitude King</p>
