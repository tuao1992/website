'use strict';

const submitSection = document.getElementById('submit-section');
const trackSection = document.getElementById('track-section');

function showTrack(e) {
  if (e) e.preventDefault();
  submitSection.classList.add('hidden');
  trackSection.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function showSubmit(e) {
  if (e) e.preventDefault();
  trackSection.classList.add('hidden');
  submitSection.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// Allow deep-linking to #track
if (location.hash === '#track') showTrack();

// --- Submit form ---

const requestForm = document.getElementById('request-form');
const successCard = document.getElementById('success-card');
const formError = document.getElementById('form-error');

requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const fd = new FormData(requestForm);
  const payload = Object.fromEntries(fd.entries());

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    document.getElementById('new-tracking-id').textContent = data.id;
    requestForm.classList.add('hidden');
    successCard.classList.remove('hidden');
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit request';
  }
});

function resetForm() {
  requestForm.reset();
  successCard.classList.add('hidden');
  requestForm.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// --- Track form ---

const trackForm = document.getElementById('track-form');
const trackError = document.getElementById('track-error');
const trackResult = document.getElementById('track-result');

const STATUS_LABELS = {
  pending: '⏳ Pending approval',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
};

trackForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  trackError.textContent = '';
  trackResult.classList.add('hidden');

  const id = trackForm.trackId.value.trim().toUpperCase();
  try {
    const res = await fetch('/api/requests/' + encodeURIComponent(id));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lookup failed.');

    document.getElementById('tr-title').textContent = data.title;
    document.getElementById('tr-id').textContent = data.id;
    document.getElementById('tr-category').textContent = data.category;
    document.getElementById('tr-priority').textContent = data.priority;
    document.getElementById('tr-submitted').textContent = new Date(data.submittedAt).toLocaleString();

    const statusEl = document.getElementById('tr-status');
    statusEl.textContent = STATUS_LABELS[data.status] || data.status;
    statusEl.className = 'badge badge-' + data.status;

    const decidedRow = document.getElementById('tr-decided-row');
    if (data.decidedAt) {
      document.getElementById('tr-decided').textContent = new Date(data.decidedAt).toLocaleString();
      decidedRow.classList.remove('hidden');
    } else {
      decidedRow.classList.add('hidden');
    }

    const commentBox = document.getElementById('tr-comment-box');
    if (data.decisionComment) {
      document.getElementById('tr-comment').textContent = data.decisionComment;
      commentBox.classList.remove('hidden');
    } else {
      commentBox.classList.add('hidden');
    }

    trackResult.classList.remove('hidden');
  } catch (err) {
    trackError.textContent = err.message;
  }
});
