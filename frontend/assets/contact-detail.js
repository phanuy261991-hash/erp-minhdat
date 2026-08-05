// Trang "Chi tiet doi tac" (moi, 2026-08-05) - xem day du thong tin 1 doi tac (contacts.html
// chi co bang rut gon + modal sua). Nut "Sua" dieu huong ve contacts.html?edit=ID (mo san modal,
// giong pattern warranty-card-edit da dung o customer-detail.js), nut "Xoa" chi hien voi Admin.

const contactId = new URLSearchParams(window.location.search).get('id');

const contactNameHeading = document.getElementById('contact-name');
const infoGrid = document.getElementById('contact-info-grid');
const btnEditContact = document.getElementById('btn-edit-contact');
const btnDeleteContact = document.getElementById('btn-delete-contact');
const detailErrorBox = document.getElementById('detail-error');
const detailErrorText = document.getElementById('detail-error-text');

function renderDetailError(message) {
  detailErrorText.textContent = message;
  detailErrorBox.hidden = false;
}

function formatDateVN(value) {
  if (!value) return '-';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeVN(sqliteDateTime) {
  if (!sqliteDateTime) return '-';
  const [datePart, timePart] = sqliteDateTime.split(' ');
  const [y, m, d] = datePart.split('-');
  return `${d}/${m}/${y}${timePart ? ' ' + timePart.slice(0, 5) : ''}`;
}

function detailInfoItem(label, value) {
  return `<div class="detail-info-item"><p class="detail-label">${label}</p><p class="detail-value">${value}</p></div>`;
}

function renderContactInfo(contact) {
  contactNameHeading.textContent = contact.full_name;
  infoGrid.innerHTML = [
    detailInfoItem('Số điện thoại', contact.phone || '-'),
    detailInfoItem('Ngày tháng năm sinh', formatDateVN(contact.date_of_birth)),
    detailInfoItem('Địa chỉ', contact.address || '-'),
    detailInfoItem('Nghề nghiệp', contact.occupation || '-'),
    detailInfoItem('Sở thích', contact.hobby || '-'),
    detailInfoItem('Ghi chú', contact.note || '-'),
    detailInfoItem('Ngày tạo', formatDateTimeVN(contact.created_at)),
  ].join('');
}

(async function init() {
  const currentUser = await initLayout('contacts');
  if (!currentUser) return;

  document.getElementById('btn-back').innerHTML = icon('arrowLeft', 16);
  btnEditContact.innerHTML = `${icon('pencil', 16)} Sửa thông tin`;
  btnDeleteContact.innerHTML = `${icon('trash', 16)} Xóa đối tác`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  if (!contactId) {
    renderDetailError('Thiếu id đối tác trên đường dẫn');
    return;
  }

  btnEditContact.href = `contacts.html?edit=${contactId}`;

  if (currentUser.is_protected) {
    btnDeleteContact.hidden = false;
  }

  try {
    const { contacts } = await apiFetch('/contacts');
    const contact = contacts.find((c) => String(c.id) === contactId);
    if (!contact) {
      renderDetailError('Không tìm thấy đối tác');
      return;
    }
    renderContactInfo(contact);
  } catch (err) {
    renderDetailError(err.message);
  }

  btnDeleteContact.addEventListener('click', async () => {
    if (!confirm('Xóa đối tác này? Không thể hoàn tác.')) return;
    btnDeleteContact.disabled = true;
    try {
      await apiFetch(`/contacts/${contactId}`, { method: 'DELETE' });
      window.location.href = 'contacts.html';
    } catch (err) {
      renderDetailError(err.message);
      btnDeleteContact.disabled = false;
    }
  });
})();
