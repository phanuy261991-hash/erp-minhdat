// Logic trang dang nhap: neu da co session hop le thi chuyen thang sang dashboard,
// nguoc lai xu ly submit form dang nhap va toggle hien/an mat khau.

const loginForm = document.getElementById('login-form');
const errorBox = document.getElementById('login-error');
const errorText = document.getElementById('login-error-text');
const submitButton = document.getElementById('login-submit');
const submitButtonText = document.getElementById('login-submit-text');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('password-toggle');
const eyeIcon = document.getElementById('eye-icon');

// Icon mo/nham mat - doi noi dung SVG ben trong nut theo trang thai an/hien mat khau.
const EYE_OPEN_SVG = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
const EYE_CLOSED_SVG = '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.2 4.1M6.5 6.5C4 8.2 2 12 2 12s3.5 7 10 7a9.9 9.9 0 0 0 4.1-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';

// Neu he thong CHUA co tai khoan nao (lan dau chay ban dong goi .exe), chuyen sang trang
// thiet lap thay vi hien form dang nhap vo nghia (khong co tai khoan nao de dang nhap).
// Neu da dang nhap tu truoc (session con hieu luc), khong can hien lai form.
(async function checkSession() {
  try {
    const { needs_setup: needsSetup } = await apiFetch('/setup/status');
    if (needsSetup) {
      window.location.href = 'setup.html';
      return;
    }
  } catch (err) {
    // Khong doc duoc trang thai setup (vd loi mang) - van cho hien form dang nhap binh thuong.
  }

  // Dang mo tren dien thoai/tablet nho (2026-08-06, Giao dien di dong) - chuyen sang trang dang
  // nhap rieng cua ban mobile thay vi form desktop. Dat SAU kiem tra needs_setup (thiet lap lan
  // dau van uu tien lam tren may tinh du dang mo bang dien thoai, truong hop hiem it lien quan
  // pham vi Dot 1).
  if (isMobileDevice()) {
    window.location.href = 'm/login.html';
    return;
  }

  try {
    await apiFetch('/auth/me');
    window.location.href = 'dashboard.html';
  } catch (err) {
    // Chua dang nhap - o lai trang login, khong lam gi them.
  }
})();

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  submitButton.disabled = true;
  submitButtonText.textContent = 'Đang đăng nhập...';

  const username = document.getElementById('username').value.trim();
  const password = passwordInput.value;

  try {
    await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    window.location.href = 'dashboard.html';
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
  eyeIcon.innerHTML = isHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
  passwordToggle.setAttribute('aria-label', isHidden ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  passwordToggle.setAttribute('aria-pressed', String(isHidden));
});
