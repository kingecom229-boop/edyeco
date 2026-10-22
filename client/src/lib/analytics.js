import api from './api';

function sessionId() {
  try {
    let id = sessionStorage.getItem('edyeco_sid');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem('edyeco_sid', id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Privacy-friendly first-party analytics: no cookies, no third-party, no PII. */
export function track(name, meta = {}) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      name,
      path: window.location.pathname,
      referrer: document.referrer ? new URL(document.referrer).hostname : '',
      sessionId: sessionId(),
      meta,
    };
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'include',
      }).catch(() => {});
    }
  } catch {
    /* analytics must never break the store */
  }
}

export default { track };
