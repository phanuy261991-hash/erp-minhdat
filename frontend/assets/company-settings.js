// Logic trang Thong tin cong ty: tai du lieu hien co, luu thay doi.
// Chi 1 dong duy nhat trong DB (id=1) - khong co danh sach/modal nhu cac trang khac.
// Rieng "phones" la mang (cho nhap tu 2 so tro len) nen xu ly rieng, khong nam trong TEXT_FIELDS.

const TEXT_FIELDS = [
  'company_name',
  'address',
  'tax_code',
  'email',
  'website',
  'bank_name',
  'bank_branch',
  'bank_account_number',
  'bank_account_holder',
];

let currentUser = null;

const companyForm = document.getElementById('company-form');
const btnSaveCompany = document.getElementById('btn-save-company');
const settingsErrorBox = document.getElementById('settings-error');
const settingsErrorText = document.getElementById('settings-error-text');
const settingsSuccessBox = document.getElementById('settings-success');
const phoneList = document.getElementById('phone-list');
const btnAddPhone = document.getElementById('btn-add-phone');

function addPhoneRow(value) {
  const row = document.createElement('div');
  row.className = 'repeatable-row';
  row.innerHTML = `
    <input type="tel" class="phone-input" placeholder="Số điện thoại" autocomplete="off" />
    <button type="button" class="repeatable-remove-btn" title="Xóa số này">${icon('close', 14)}</button>
  `;
  row.querySelector('.phone-input').value = value || '';
  row.querySelector('.repeatable-remove-btn').addEventListener('click', () => row.remove());
  phoneList.appendChild(row);
}

function fillForm(settings) {
  TEXT_FIELDS.forEach((field) => {
    document.getElementById(field).value = settings[field] || '';
  });

  phoneList.innerHTML = '';
  const phones = Array.isArray(settings.phones) ? settings.phones : [];
  if (phones.length === 0) {
    addPhoneRow('');
  } else {
    phones.forEach((phone) => addPhoneRow(phone));
  }
}

function collectPhones() {
  return Array.from(phoneList.querySelectorAll('.phone-input'))
    .map((input) => input.value.trim())
    .filter((value) => value.length > 0);
}

async function loadSettings() {
  try {
    const { settings } = await apiFetch('/company-settings');
    fillForm(settings);
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  }
}

btnAddPhone.addEventListener('click', () => addPhoneRow(''));

companyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsErrorBox.hidden = true;
  settingsSuccessBox.hidden = true;
  btnSaveCompany.disabled = true;
  btnSaveCompany.textContent = 'Đang lưu...';

  const body = { phones: collectPhones() };
  TEXT_FIELDS.forEach((field) => {
    body[field] = document.getElementById(field).value.trim();
  });

  try {
    const { settings } = await apiFetch('/company-settings', { method: 'PUT', body: JSON.stringify(body) });
    fillForm(settings);
    settingsSuccessBox.hidden = false;
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  } finally {
    btnSaveCompany.disabled = false;
    btnSaveCompany.textContent = 'Lưu thay đổi';
  }
});

(async function init() {
  currentUser = await initLayout('company-settings');
  if (!currentUser) return;

  btnAddPhone.innerHTML = `${icon('plus', 14)} Thêm số điện thoại`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.querySelectorAll('.alert-icon-success-slot').forEach((slot) => {
    slot.innerHTML = icon('check', 16);
  });

  await loadSettings();
})();
