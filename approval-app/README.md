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

## Deploying

Any host that runs Node.js works (a small VPS, Railway, Render, Fly.io, etc.):

1. Copy the `approval-app/` folder to the server.
2. Set `ADMIN_PASSWORD` (and `PORT` if needed).
3. Run `node server.js` under a process manager (`pm2`, `systemd`, or the
   host's own supervisor).
4. Put it behind HTTPS (the host usually does this for you; on a VPS use
   Caddy or nginx + Let's Encrypt).

Back up `data/requests.json` — that file is the entire database.

## Ideas for later

- Email notification to the approver on new requests (needs an SMTP account
  or a service like Resend/SendGrid — easy to add in `server.js` where the
  request is saved).
- Multiple approvers / approval chains.
- Swap the JSON file for SQLite if volume grows.
