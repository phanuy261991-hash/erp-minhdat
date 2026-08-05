// Logic trang "Cau hinh thong bao" (migration 027, menu Cau hinh): bat/tat 3 loai thong bao +
// cau hinh danh sach moc nhac lich sinh nhat (nhieu moc, vd "truoc 3 ngay" + "truoc 1 ngay" +
// "dung ngay") - tat ca chi ap dung sau khi bam "Luu thay doi" (khong luu tuc thi tung thao tac).

let pickedReminderDays = [];

const settingsForm = document.getElementById('notification-settings-form');
const btnSave = document.getElementById('btn-save-notification-settings');
const settingsErrorBox = document.getElementById('settings-error');
const settingsErrorText = document.getElementById('settings-error-text');
const settingsSuccessBox = document.getElementById('settings-success');

const supplierPaymentToggle = document.getElementById('supplier_payment_enabled');
const customerPaymentToggle = document.getElementById('customer_payment_enabled');
const birthdayToggle = document.getElementById('birthday_enabled');

const reminderDayInput = document.getElementById('reminder-day-input');
const btnAddReminderDay = document.getElementById('btn-add-reminder-day');
const reminderDayListEl = document.getElementById('reminder-day-list');

function reminderDayLabel(day) {
  return day === 0 ? 'Đúng ngày sinh nhật' : `Trước ${day} ngày`;
}

function renderReminderDayList() {
  if (pickedReminderDays.length === 0) {
    reminderDayListEl.innerHTML = '<p class="member-list-empty">Chưa có mốc nhắc nào - sẽ không có thông báo sinh nhật nào được tạo.</p>';
    return;
  }
  const sorted = [...pickedReminderDays].sort((a, b) => b - a);
  reminderDayListEl.innerHTML = sorted
    .map(
      (day) => `
        <div class="member-row">
          <span class="member-row-name">${reminderDayLabel(day)}</span>
          <button type="button" class="icon-btn icon-btn-danger" data-action="remove-day" data-day="${day}" title="Bỏ mốc nhắc này">${icon('trash', 14)}</button>
        </div>
      `
    )
    .join('');
}

btnAddReminderDay.addEventListener('click', () => {
  const value = Number(reminderDayInput.value);
  if (!Number.isInteger(value) || value < 0) {
    alert('Vui lòng nhập số ngày hợp lệ (số nguyên, từ 0 trở lên).');
    return;
  }
  if (pickedReminderDays.includes(value)) {
    alert('Mốc nhắc này đã có trong danh sách.');
    return;
  }
  pickedReminderDays.push(value);
  reminderDayInput.value = '';
  renderReminderDayList();
});

reminderDayListEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="remove-day"]');
  if (!button) return;
  const day = Number(button.dataset.day);
  pickedReminderDays = pickedReminderDays.filter((d) => d !== day);
  renderReminderDayList();
});

async function loadSettings() {
  try {
    const { settings } = await apiFetch('/notification-settings');
    supplierPaymentToggle.checked = settings.supplier_payment_enabled;
    customerPaymentToggle.checked = settings.customer_payment_enabled;
    birthdayToggle.checked = settings.birthday_enabled;
    pickedReminderDays = settings.birthday_reminder_days;
    renderReminderDayList();
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  }
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsErrorBox.hidden = true;
  settingsSuccessBox.hidden = true;
  btnSave.disabled = true;
  btnSave.textContent = 'Đang lưu...';

  try {
    await apiFetch('/notification-settings', {
      method: 'PUT',
      body: JSON.stringify({
        supplier_payment_enabled: supplierPaymentToggle.checked,
        customer_payment_enabled: customerPaymentToggle.checked,
        birthday_enabled: birthdayToggle.checked,
        birthday_reminder_days: pickedReminderDays,
      }),
    });
    settingsSuccessBox.hidden = false;
  } catch (err) {
    settingsErrorText.textContent = err.message;
    settingsErrorBox.hidden = false;
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = 'Lưu thay đổi';
  }
});

(async function init() {
  const currentUser = await initLayout('notification-settings');
  if (!currentUser) return;

  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  document.querySelectorAll('.alert-icon-success-slot').forEach((slot) => {
    slot.innerHTML = icon('check', 16);
  });
  btnAddReminderDay.innerHTML = `${icon('plus', 16)} Thêm mốc nhắc`;

  await loadSettings();
})();
