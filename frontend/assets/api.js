// Ham goi API dung chung cho toan bo frontend - tu dong gan header JSON, gui kem cookie
// session, va nem loi ro rang khi response khong thanh cong de cac trang tu xu ly hien thi.

// Bat loi JS chua xu ly + Promise bi reject khong bat, gui ve server ghi log (POST /api/client-logs,
// backend/routes/clientLogs.routes.js) - dat trong api.js (khong phai layout.js) vi day la file
// DUY NHAT duoc nap tren MOI trang ke ca login.html/setup.html (layout.js chi nap sau khi da dang
// nhap, khong co sidebar). Dieu tra 2026-08-06 (bao cao "dung ung dung thi bi do"): truoc day loi
// phia trinh duyet khong bao gio toi duoc server, khong co gi de doi chieu neu tai dien. Dedupe
// theo message+url trong pham vi 1 lan tai trang (Set, mat khi F5) - tranh gui lap qua nhieu neu
// 1 loi lap lai lien tuc (vd trong 1 vong lap/interval).
const _reportedClientErrors = new Set();

function _reportClientError(message, stack, url) {
  const key = `${message}|${url}`;
  if (_reportedClientErrors.has(key)) return;
  _reportedClientErrors.add(key);

  fetch('/api/client-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || '',
      stack: stack || '',
      url: url || window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {
    // Gui bao loi thi thoi - khong duoc gay them loi khac.
  });
}

window.addEventListener('error', (event) => {
  _reportClientError(event.message, event.error && event.error.stack, window.location.href);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : '';
  _reportClientError(`Unhandled promise rejection: ${message}`, stack, window.location.href);
});

async function apiFetch(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Da co loi xay ra');
    error.status = response.status;
    throw error;
  }

  return data;
}
