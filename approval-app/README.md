# Approval Desk

A small website that takes approval requests off your inbox. People submit
requests through a form; they land in your dashboard where you approve or
reject them with one click (optionally with a note). Requesters get a tracking
ID so they can check the status themselves instead of chasing you.

## Features

- **Public submission form** — name, email, category (purchase, leave,
  expense, access, document sign-off, other), priority, and details.
- **Tracking IDs** — every request gets an ID like `REQ-A1B2C3`; requesters
  check the status themselves on the *Track a request* page.
- **Approver dashboard** (`/admin`) — password-protected. Pending requests are
  sorted urgent-first; approve or reject with an optional note that the
  requester sees; reopen a decision if you change your mind. Tabs for
  pending / approved / rejected / all, with live counts.
- **Zero dependencies** — plain Node.js, no `npm install`. Data is stored in a
  JSON file (`data/requests.json`) with atomic writes.

## Running it

```bash
cd approval-app
ADMIN_PASSWORD=your-secret node server.js
```

Then open:

- **http://localhost:3000** — submission + tracking (share this with everyone)
- **http://localhost:3000/admin** — your approver dashboard

### Configuration (environment variables)

| Variable         | Default               | Purpose                          |
|------------------|-----------------------|----------------------------------|
| `PORT`           | `3000`                | Port to listen on                |
| `ADMIN_PASSWORD` | `admin123`            | Dashboard password — **change it** |
| `DATA_FILE`      | `./data/requests.json`| Where requests are stored        |

Requires Node.js 18+.

## Making it public (so multiple people can use it)

The app is already multi-user — any number of people can submit and you
approve from one dashboard. It just needs to be hosted somewhere with a
public URL. Three good options, easiest first:

### Option A — Render (recommended, ~2 minutes)

A `render.yaml` blueprint is included at the repo root.

1. Create a free account at [render.com](https://render.com) and connect
   your GitHub.
2. Click **New → Blueprint**, pick this repository.
3. Render reads `render.yaml`, prompts you for `ADMIN_PASSWORD` — choose a
   strong one (this is the only thing protecting your dashboard).
4. Deploy. You'll get a URL like `https://approval-desk.onrender.com` to
   share with everyone; your dashboard is at `/admin` on that URL.

The blueprint uses the **starter** plan (about $7/mo) because it includes a
persistent disk so requests are never lost. To try it for free first, change
`plan: starter` to `plan: free` and delete the `disk:` block — but note that
on the free plan **data resets whenever the service restarts**, so don't use
it for real approvals.

### Option B — Railway / Fly.io / any Docker host

A `Dockerfile` is included. Deploy the `approval-app/` folder as a container,
attach a volume at `/data`, and set the `ADMIN_PASSWORD` and
`NODE_ENV=production` environment variables.

### Option C — your own server (VPS)

1. Copy the `approval-app/` folder to the server.
2. Set `ADMIN_PASSWORD` and `NODE_ENV=production`.
3. Run `node server.js` under a process manager (`pm2` or `systemd`).
4. Put it behind HTTPS (Caddy or nginx + Let's Encrypt).

### Production behavior

- The server **refuses to start** with `NODE_ENV=production` unless
  `ADMIN_PASSWORD` is set — so you can't accidentally go live on the default
  password.
- Submissions are rate-limited (20/hour per IP) and login attempts are
  rate-limited (10 per 15 minutes per IP) to keep spam and password-guessing
  out.
- Session cookies are marked `Secure` automatically when served over HTTPS.

Back up `data/requests.json` (or `/var/data/requests.json` on Render) —
that file is the entire database.

## Ideas for later

- Email notification to the approver on new requests (needs an SMTP account
  or a service like Resend/SendGrid — easy to add in `server.js` where the
  request is saved).
- Multiple approvers / approval chains.
- Swap the JSON file for SQLite if volume grows.
