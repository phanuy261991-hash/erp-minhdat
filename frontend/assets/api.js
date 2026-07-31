// Ham goi API dung chung cho toan bo frontend - tu dong gan header JSON, gui kem cookie
// session, va nem loi ro rang khi response khong thanh cong de cac trang tu xu ly hien thi.

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
