// Logic man Dang nhap ban mobile - doi xung frontend/assets/auth.js (ban desktop), chi khac
// duong dan dieu huong (m/index.html thay dashboard.html) va markup id (m-* thay vi id goc).

const EYE_OPEN_SVG_KEY = 'eye';

(async function checkSession() {
  try {
    const { needs_setup: needsSetup } = await apiFetch('/setup/status');
    if (needsSetup) {
      // Thiet lap lan dau luon lam tren may tinh (setup.html chua co ban mobile, ngoai pham vi
      // Dot 1) - thoat luon che do mobile de nguoi dung thay dung form thiet lap.
      window.location.href = '../setup.html';
      return;
    }
  } catch (err) {
    // Khong doc duoc trang thai setup - van cho hien form dang nhap binh thuong.
  }

  try {
    await apiFetch('/auth/me');
    window.location.href = 'index.html';
  } catch (err) {
    // Chua dang nhap - o lai trang dang nhap, hien icon mat khau.
  }

  document.getElementById('m-eye-icon').innerHTML = icon('eye', 18);
})();

const form = document.getElementById('m-login-form');
const errorBox = document.getElementById('m-login-error');
const errorText = document.getElementById('m-login-error-text');
const submitButton = document.getElementById('m-login-submit');
const submitButtonText = document.getElementById('m-login-submit-text');
const passwordInput = document.getElementById('m-password');
const passwordToggle = document.getElementById('m-password-toggle');

document.getElementById('m-login-error-icon').innerHTML = icon('alertCircle', 16);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  submitButton.disabled = true;
  submitButtonText.textContent = 'Đang đăng nhập...';

  const username = document.getElementById('m-username').value.trim();
  const password = passwordInput.value;

  try {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    window.location.href = 'index.html';
  } catch (err) {
    errorText.textContent = err.message;
    errorBox.hidden = false;
    submitButton.disabled = false;
    submitButtonText.textContent = 'Đăng nhập';
  }
});

passwordToggle.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  passwordToggle.setAttribute('aria-label', isHidden ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  passwordToggle.setAttribute('aria-pressed', String(isHidden));
});

document.getElementById('m-use-desktop').addEventListener('click', () => {
  localStorage.setItem('erp_force_desktop', 'true');
  window.location.href = '../login.html';
});
