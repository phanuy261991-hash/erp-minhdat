// Logic trang Cau hinh kho: tai cau hinh hien co, luu thay doi.
// Hien tai chi co 1 cau hinh (allow_negative_stock) - se mo rong them khi phat sinh nhu cau
// (xem docs/PRD.md muc 4.8), moi cau hinh moi la 1 .setting-row them vao form.

let currentUser = null;

const warehouseForm = document.getElementById('warehouse-form');
const btnSaveWarehouse = document.getElementById('btn-save-warehouse');
const settingsErrorBox = document.getElementById('settings-error');
const settingsErrorText = document.getElementById('settings-error-text');
const settingsSuccessBox = document.getElementById('settings-success');
const allowNegativeStockToggle = document.getElementById('allow_negative_stock');
const costingMethodGroup = document.getElementById('costing-method-group');
const backupPathInput = document.getElementById('backup_path');
const btnRunBackup = document.getElementById('btn-run-backup');
const backupResultText = document.getElementById('backup-result-text');

function getCostingMethod() {
  const checked = costingMethodGroup.querySelector('input[name="costing_method"]:checked');
  return checked ? checked.value : 'binh_quan_gia_quyen';
}

async function loadSettings() {
  try {
    const { settings } = await apiFetch('/warehouse-settings');
    allowNegativeStockToggle.checked = Boolean(settings.allow_negative_stock);
    const target = costingMethodGroup.querySelector(`input[value="${settings.costing_method}"]`);
    if (target) target.checked = true;
    backupPathInput.value = settings.backup_path || '';
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  }
}

warehouseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsErrorBox.hidden = true;
  settingsSuccessBox.hidden = true;
  btnSaveWarehouse.disabled = true;
  btnSaveWarehouse.textContent = 'Đang lưu...';

  try {
    await apiFetch('/warehouse-settings', {
      method: 'PUT',
      body: JSON.stringify({
        allow_negative_stock: allowNegativeStockToggle.checked,
        costing_method: getCostingMethod(),
        backup_path: backupPathInput.value.trim(),
      }),
    });
    settingsSuccessBox.hidden = false;
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  } finally {
    btnSaveWarehouse.disabled = false;
    btnSaveWarehouse.textContent = 'Lưu thay đổi';
  }
});

// "Backup ngay" - luu duong dan hien tai (tranh backup nham duong dan cu chua luu) roi goi
// POST /warehouse-settings/backup ngay lap tuc, khong doi lich Windows Task Scheduler - dung
// de nguoi dung xac nhan duong dan da cau hinh dung (xem scripts/backup.js).
btnRunBackup.addEventListener('click', async () => {
  backupResultText.textContent = '';
  backupResultText.className = 'backup-result-text';

  if (!backupPathInput.value.trim()) {
    backupResultText.textContent = 'Vui lòng nhập thư mục lưu backup trước.';
    backupResultText.classList.add('backup-result-text--error');
    return;
  }

  btnRunBackup.disabled = true;
  btnRunBackup.textContent = 'Đang backup...';

  try {
    await apiFetch('/warehouse-settings', {
      method: 'PUT',
      body: JSON.stringify({
        allow_negative_stock: allowNegativeStockToggle.checked,
        costing_method: getCostingMethod(),
        backup_path: backupPathInput.value.trim(),
      }),
    });
    const { path } = await apiFetch('/warehouse-settings/backup', { method: 'POST' });
    backupResultText.textContent = `Đã backup thành công: ${path}`;
    backupResultText.classList.add('backup-result-text--success');
  } catch (err) {
    backupResultText.textContent = err.message;
    backupResultText.classList.add('backup-result-text--error');
  } finally {
    btnRunBackup.disabled = false;
    btnRunBackup.innerHTML = `${icon('arrowDownTray', 16)} Backup ngay`;
  }
});

(async function init() {
  currentUser = await initLayout('warehouse-settings');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.querySelectorAll('.alert-icon-success-slot').forEach((slot) => {
    slot.innerHTML = icon('check', 16);
  });
  btnRunBackup.innerHTML = `${icon('arrowDownTray', 16)} Backup ngay`;

  await loadSettings();
})();
