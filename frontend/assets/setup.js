// Logic trang "Thiet lap lan dau" (2026-08-01) - chi hien thi duoc khi he thong CHUA co tai
// khoan nao (goi GET /api/setup/status). Dung cho ban dong goi .exe chay tren may nguoi dung -
// thay the cho "npm run seed:admin" (can bien moi truong, khong phu hop nguoi dung khong biet
// terminal). Sau khi tao xong 1 tai khoan, route nay tu khoa vinh vien o phia backend.

const setupForm = document.getElementById('setup-form');
const errorBox = document.getElementById('setup-error');
const errorText = document.getElementById('setup-error-text');
const submitButton = document.getElementById('setup-submit');
const submitButtonText = document.getElementById('setup-submit-text');

function renderError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

(async function checkNeedsSetup() {
  try {
    const { needs_setup: needsSetup } = await apiFetch('/setup/status');
    if (!needsSetup) {
      // He thong da thiet lap roi (da co tai khoan) - khong cho vao lai trang nay.
      window.location.href = 'login.html';
    }
  } catch (err) {
    renderError(err.message);
  }
})();

document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
  slot.innerHTML = icon('alertCircle', 16);
});

setupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password_confirm').value;
  if (password !== passwordConfirm) {
    renderError('Mật khẩu xác nhận không khớp');
    return;
  }

  submitButton.disabled = true;
  submitButtonText.textContent = 'Đang tạo tài khoản...';

  try {
    await apiFetch('/setup', {
      method: 'POST',
      body: JSON.stringify({
        company_name: document.getElementById('company_name').value.trim(),
        full_name: document.getElementById('full_name').value.trim(),
        username: document.getElementById('username').value.trim(),
        password,
      }),
    });
    window.location.href = 'login.html';
  } catch (err) {
    renderError(err.message);
    submitButton.disabled = false;
    submitButtonText.textContent = 'Tạo tài khoản & bắt đầu';
  }
});
