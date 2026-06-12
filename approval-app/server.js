#!/usr/bin/env node
/**
 * Approval Desk — a small request/approval website.
 *
 * Zero dependencies: plain Node.js HTTP server + JSON file storage.
 * Run with:  node server.js
 *
 * Configuration via environment variables:
 *   PORT            — port to listen on (default 3000)
 *   ADMIN_PASSWORD  — password for the approver dashboard (default "admin123")
 *   DATA_FILE       — path to the JSON data file (default ./data/requests.json)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'requests.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------------------
// Storage: JSON file with atomic writes
// ---------------------------------------------------------------------------

let db = { requests: [] };

function loadDb() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(db.requests)) db.requests = [];
  } catch {
    db = { requests: [] };
  }
}

function saveDb() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function newTrackingId() {
  let id;
  do {
    id = 'REQ-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (db.requests.some((r) => r.id === id));
  return id;
}

// ---------------------------------------------------------------------------
// Admin sessions (in-memory tokens, cookie-based)
// ---------------------------------------------------------------------------

const sessions = new Set();
const SESSION_COOKIE = 'approval_session';

function checkPassword(supplied) {
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';
  for (const part of cookies.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

function isAuthed(req) {
  const token = getSessionToken(req);
  return token !== null && sessions.has(token);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sendJson(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    ...extraHeaders,
  });
  res.end(data);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_CATEGORIES = ['purchase', 'leave', 'expense', 'access', 'document', 'other'];

function publicView(r) {
  // What a requester sees when tracking their request (no internal notes).
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    category: r.category,
    submittedAt: r.submittedAt,
    decidedAt: r.decidedAt,
    decisionComment: r.decisionComment,
  };
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

async function handleApi(req, res, url) {
  const { pathname } = url;

  // POST /api/requests — submit a new request (public)
  if (pathname === '/api/requests' && req.method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const title = String(body.title || '').trim();
    const details = String(body.details || '').trim();
    const priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : 'medium';
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';

    if (!name || !title) {
      return sendJson(res, 400, { error: 'Name and request title are required.' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Please provide a valid email address.' });
    }
    if (name.length > 200 || title.length > 300 || details.length > 5000) {
      return sendJson(res, 400, { error: 'One of the fields is too long.' });
    }

    const request = {
      id: newTrackingId(),
      name,
      email,
      title,
      details,
      priority,
      category,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      decisionComment: null,
    };
    db.requests.push(request);
    saveDb();
    return sendJson(res, 201, { id: request.id, status: request.status });
  }

  // GET /api/requests/:id — track a request by its ID (public)
  const trackMatch = pathname.match(/^\/api\/requests\/([A-Za-z0-9-]+)$/);
  if (trackMatch && req.method === 'GET') {
    const r = db.requests.find((x) => x.id === trackMatch[1].toUpperCase());
    if (!r) return sendJson(res, 404, { error: 'No request found with that ID.' });
    return sendJson(res, 200, publicView(r));
  }

  // POST /api/admin/login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readBody(req);
    if (!checkPassword(body.password || '')) {
      return sendJson(res, 401, { error: 'Incorrect password.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    return sendJson(res, 200, { ok: true }, {
      'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
    });
  }

  // POST /api/admin/logout
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = getSessionToken(req);
    if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true }, {
      'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`,
    });
  }

  // Everything below requires an admin session.
  if (pathname.startsWith('/api/admin/')) {
    if (!isAuthed(req)) return sendJson(res, 401, { error: 'Not logged in.' });

    // GET /api/admin/requests?status=pending
    if (pathname === '/api/admin/requests' && req.method === 'GET') {
      const status = url.searchParams.get('status');
      let list = db.requests;
      if (status && status !== 'all') list = list.filter((r) => r.status === status);
      // Newest first; pending sorted by priority urgency.
      const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
      list = [...list].sort((a, b) => {
        if (a.status === 'pending' && b.status === 'pending') {
          const p = priorityRank[a.priority] - priorityRank[b.priority];
          if (p !== 0) return p;
        }
        return b.submittedAt.localeCompare(a.submittedAt);
      });
      const counts = { pending: 0, approved: 0, rejected: 0 };
      for (const r of db.requests) counts[r.status] = (counts[r.status] || 0) + 1;
      return sendJson(res, 200, { requests: list, counts });
    }

    // POST /api/admin/requests/:id/decision  { decision: "approved"|"rejected", comment }
    const decisionMatch = pathname.match(/^\/api\/admin\/requests\/([A-Za-z0-9-]+)\/decision$/);
    if (decisionMatch && req.method === 'POST') {
      const body = await readBody(req);
      const r = db.requests.find((x) => x.id === decisionMatch[1].toUpperCase());
      if (!r) return sendJson(res, 404, { error: 'Request not found.' });
      if (!['approved', 'rejected'].includes(body.decision)) {
        return sendJson(res, 400, { error: 'Decision must be "approved" or "rejected".' });
      }
      r.status = body.decision;
      r.decidedAt = new Date().toISOString();
      r.decisionComment = String(body.comment || '').trim().slice(0, 2000) || null;
      saveDb();
      return sendJson(res, 200, { ok: true, request: r });
    }

    // POST /api/admin/requests/:id/reopen — undo a decision
    const reopenMatch = pathname.match(/^\/api\/admin\/requests\/([A-Za-z0-9-]+)\/reopen$/);
    if (reopenMatch && req.method === 'POST') {
      const r = db.requests.find((x) => x.id === reopenMatch[1].toUpperCase());
      if (!r) return sendJson(res, 404, { error: 'Request not found.' });
      r.status = 'pending';
      r.decidedAt = null;
      r.decisionComment = null;
      saveDb();
      return sendJson(res, 200, { ok: true, request: r });
    }
  }

  return sendJson(res, 404, { error: 'Not found.' });
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

loadDb();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    sendJson(res, 400, { error: err.message || 'Bad request' });
  }
});

server.listen(PORT, () => {
  console.log(`Approval Desk running at http://localhost:${PORT}`);
  console.log(`Admin dashboard:        http://localhost:${PORT}/admin`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('WARNING: using default admin password "admin123" — set ADMIN_PASSWORD to change it.');
  }
});
