'use strict';

const loginSection = document.getElementById('login-section');
const dashSection = document.getElementById('dash-section');
const logoutLink = document.getElementById('logout-link');
const listEl = document.getElementById('request-list');
const emptyMsg = document.getElementById('empty-msg');
const statsEl = document.getElementById('stats');

let currentFilter = 'pending';

const STATUS_LABELS = {
  pending: '⏳ Pending',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    showLogin();
    throw new Error(data.error || 'Not logged in.');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function showLogin() {
  loginSection.classList.remove('hidden');
  dashSection.classList.add('hidden');
  logoutLink.classList.add('hidden');
}

function showDash() {
  loginSection.classList.add('hidden');
  dashSection.classList.remove('hidden');
  logoutLink.classList.remove('hidden');
}

// --- Login / logout ---

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: e.target.password.value }),
    });
    e.target.reset();
    showDash();
    loadRequests();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

logoutLink.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

// --- Tabs ---

document.getElementById('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  currentFilter = tab.dataset.status;
  loadRequests();
});

// --- Rendering ---

function esc(s) {
  const div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
}

function renderRequest(r) {
  const isPending = r.status === 'pending';
  return `
  <div class="card req-card" data-id="${esc(r.id)}">
    <div class="req-head">
      <div>
        <span class="badge badge-${esc(r.status)}">${STATUS_LABELS[r.status] || esc(r.status)}</span>
        <span class="badge badge-prio-${esc(r.priority)}">${esc(r.priority)}</span>
        <span class="badge badge-cat">${esc(r.category)}</span>
      </div>
      <span class="muted mono">${esc(r.id)}</span>
    </div>
    <h3 class="req-title">${esc(r.title)}</h3>
    <p class="req-from">From <strong>${esc(r.name)}</strong>${r.email ? ' · <a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : ''} · ${new Date(r.submittedAt).toLocaleString()}</p>
    ${r.details ? `<p class="req-details">${esc(r.details)}</p>` : ''}
    ${r.decisionComment ? `<div class="comment-box"><strong>Your note:</strong><p>${esc(r.decisionComment)}</p></div>` : ''}
    ${isPending ? `
      <div class="decision-row">
        <input type="text" class="comment-input" placeholder="Optional note to the requester…" maxlength="2000" />
        <button class="btn btn-approve" data-action="approved">Approve</button>
        <button class="btn btn-reject" data-action="rejected">Reject</button>
      </div>` : `
      <div class="decision-row">
        <span class="muted">Decided ${r.decidedAt ? new Date(r.decidedAt).toLocaleString() : ''}</span>
        <button class="btn btn-small" data-action="reopen">Reopen</button>
      </div>`}
    <span class="error req-error"></span>
  </div>`;
}

async function loadRequests() {
  try {
    const data = await api('/api/admin/requests?status=' + encodeURIComponent(currentFilter));
    statsEl.innerHTML = `
      <span class="stat"><strong>${data.counts.pending || 0}</strong> pending</span>
      <span class="stat"><strong>${data.counts.approved || 0}</strong> approved</span>
      <span class="stat"><strong>${data.counts.rejected || 0}</strong> rejected</span>`;
    listEl.innerHTML = data.requests.map(renderRequest).join('');
    emptyMsg.classList.toggle('hidden', data.requests.length > 0);
  } catch {
    /* showLogin already handled on 401 */
  }
}

// --- Decisions (event delegation) ---

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('.req-card');
  const id = card.dataset.id;
  const errEl = card.querySelector('.req-error');
  errEl.textContent = '';
  btn.disabled = true;

  try {
    if (btn.dataset.action === 'reopen') {
      await api(`/api/admin/requests/${id}/reopen`, { method: 'POST' });
    } else {
      const comment = card.querySelector('.comment-input')?.value || '';
      await api(`/api/admin/requests/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision: btn.dataset.action, comment }),
      });
    }
    loadRequests();
  } catch (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
  }
});

// --- Boot: check whether we're already logged in ---

(async function init() {
  try {
    await api('/api/admin/requests?status=pending');
    showDash();
    loadRequests();
  } catch {
    showLogin();
  }
})();
