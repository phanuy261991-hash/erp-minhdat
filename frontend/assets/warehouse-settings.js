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

(async function init() {
  currentUser = await initLayout('warehouse-settings');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.querySelectorAll('.alert-icon-success-slot').forEach((slot) => {
    slot.innerHTML = icon('check', 16);
  });

  await loadSettings();
})();
