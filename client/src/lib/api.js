const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function cookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = {
    method,
    credentials: 'include',
    signal,
    headers: { Accept: 'application/json', ...headers },
  };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers['Content-Type'] = 'application/json';
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = cookie('edyeco_csrf');
    if (csrf) opts.headers['X-CSRF-Token'] = csrf;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch {
    throw new ApiError('Connexion impossible. Vérifiez votre réseau puis réessayez.', 0, 'NETWORK');
  }

  let data = null;
  if (res.status !== 204) {
    data = await res.json().catch(() => null);
  }
  if (!res.ok) {
    const detail = Array.isArray(data?.error?.details) ? data.error.details[0]?.message : null;
    throw new ApiError(
      detail ? `${data.error.message} ${detail}`.trim() : data?.error?.message || 'Une erreur est survenue.',
      res.status,
      data?.error?.code,
      data?.error?.details
    );
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, body, opts) => request(path, { ...opts, method: 'DELETE', body }),
  upload: (path, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(path, { method: 'POST', body: form });
  },
};

export default api;
