// Logic trang "Doi tac" (migration 026): danh sach, tim kiem theo ten/SDT, them moi/sua qua
// modal, xoa (chi Admin) - hoan toan doc lap voi Nha cung cap/Khach hang (partners.html/
// customers.html), khong lien quan kho/cong no.

let currentUser = null;
let contactsCache = [];
let searchKeyword = '';
let editingContactId = null;

const contactsTbody = document.getElementById('contacts-tbody');
const contactsErrorBox = document.getElementById('contacts-error');
const contactsErrorText = document.getElementById('contacts-error-text');
const searchInput = document.getElementById('contact-search');

const btnAddContact = document.getElementById('btn-add-contact');
const contactModal = document.getElementById('contact-modal');
const contactModalTitle = document.getElementById('contact-modal-title');
const contactForm = document.getElementById('contact-form');
const contactFormErrorBox = document.getElementById('contact-form-error');
const contactFormErrorText = document.getElementById('contact-form-error-text');
const btnCancelContact = document.getElementById('btn-cancel-contact');
const btnSubmitContact = document.getElementById('btn-submit-contact');

const fullNameInput = document.getElementById('contact-full-name');
const phoneInput = document.getElementById('contact-phone');
const birthDateInput = document.getElementById('contact-birth-date');
const addressInput = document.getElementById('contact-address');
const occupationInput = document.getElementById('contact-occupation');
const hobbyInput = document.getElementById('contact-hobby');
const noteInput = document.getElementById('contact-note');

function formatDateVN(value) {
  if (!value) return '-';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function renderContactsError(message) {
  contactsErrorText.textContent = message;
  contactsErrorBox.hidden = false;
}

function getVisibleContacts() {
  const keyword = searchKeyword.trim().toLowerCase();
  if (!keyword) return contactsCache;
  return contactsCache.filter(
    (c) => c.full_name.toLowerCase().includes(keyword) || (c.phone || '').toLowerCase().includes(keyword)
  );
}

function renderRow(contact) {
  const tr = document.createElement('tr');
  const deleteActionHtml = currentUser.is_protected
    ? `<button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${contact.id}" title="Xóa đối tác">${icon('trash', 14)}</button>`
    : '';

  tr.innerHTML = `
    <td>${contact.full_name}</td>
    <td>${contact.phone || '-'}</td>
    <td>${contact.address || '-'}</td>
    <td>${contact.occupation || '-'}</td>
    <td>${formatDateVN(contact.date_of_birth)}</td>
    <td>${contact.hobby || '-'}</td>
    <td>
      <a href="contact-detail.html?id=${contact.id}" class="icon-btn" title="Xem chi tiết">${icon('eye', 14)}</a>
      <button type="button" class="icon-btn" data-action="edit" data-id="${contact.id}" title="Sửa thông tin">${icon('pencil', 14)}</button>
      ${deleteActionHtml}
    </td>
  `;
  return tr;
}

function renderContacts() {
  contactsTbody.innerHTML = '';
  getVisibleContacts().forEach((c) => contactsTbody.appendChild(renderRow(c)));
}

async function loadContacts() {
  try {
    const { contacts } = await apiFetch('/contacts');
    contactsCache = contacts;
    renderContacts();
  } catch (err) {
    renderContactsError(err.message);
  }
}

searchInput.addEventListener('input', (event) => {
  searchKeyword = event.target.value;
  renderContacts();
});

function openCreateModal() {
  editingContactId = null;
  contactModalTitle.textContent = 'Thêm đối tác mới';
  btnSubmitContact.textContent = 'Tạo đối tác';
  contactForm.reset();
  contactFormErrorBox.hidden = true;
  contactModal.hidden = false;
}

function openEditModal(contact) {
  editingContactId = contact.id;
  contactModalTitle.textContent = 'Sửa thông tin đối tác';
  btnSubmitContact.textContent = 'Lưu thay đổi';
  contactFormErrorBox.hidden = true;

  fullNameInput.value = contact.full_name;
  phoneInput.value = contact.phone || '';
  birthDateInput.value = contact.date_of_birth || '';
  addressInput.value = contact.address || '';
  occupationInput.value = contact.occupation || '';
  hobbyInput.value = contact.hobby || '';
  noteInput.value = contact.note || '';

  contactModal.hidden = false;
}

function closeContactModal() {
  contactModal.hidden = true;
}

btnAddContact.addEventListener('click', openCreateModal);
btnCancelContact.addEventListener('click', closeContactModal);
contactModal.addEventListener('click', (event) => {
  if (event.target === contactModal) closeContactModal();
});

contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  contactFormErrorBox.hidden = true;

  if (!fullNameInput.value.trim()) {
    contactFormErrorText.textContent = 'Vui lòng nhập Họ và tên';
    contactFormErrorBox.hidden = false;
    return;
  }

  btnSubmitContact.disabled = true;
  btnSubmitContact.textContent = 'Đang lưu...';

  const body = {
    full_name: fullNameInput.value.trim(),
    phone: phoneInput.value.trim(),
    date_of_birth: birthDateInput.value || null,
    address: addressInput.value.trim(),
    occupation: occupationInput.value.trim(),
    hobby: hobbyInput.value.trim(),
    note: noteInput.value.trim(),
  };

  try {
    if (editingContactId === null) {
      await apiFetch('/contacts', { method: 'POST', body: JSON.stringify(body) });
    } else {
      await apiFetch(`/contacts/${editingContactId}`, { method: 'PUT', body: JSON.stringify(body) });
    }
    closeContactModal();
    await loadContacts();
  } catch (err) {
    contactFormErrorText.textContent = err.message;
    contactFormErrorBox.hidden = false;
  } finally {
    btnSubmitContact.disabled = false;
    btnSubmitContact.textContent = editingContactId === null ? 'Tạo đối tác' : 'Lưu thay đổi';
  }
});

contactsTbody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === 'edit') {
    const contact = contactsCache.find((c) => String(c.id) === id);
    if (contact) openEditModal(contact);
    return;
  }

  if (action === 'delete' && !confirm('Xóa đối tác này? Không thể hoàn tác.')) {
    return;
  }

  button.disabled = true;
  try {
    if (action === 'delete') {
      await apiFetch(`/contacts/${id}`, { method: 'DELETE' });
    }
    await loadContacts();
  } catch (err) {
    renderContactsError(err.message);
    button.disabled = false;
  }
});

(async function init() {
  currentUser = await initLayout('contacts');
  if (!currentUser) return;

  btnAddContact.innerHTML = `${icon('plus', 16)} Thêm đối tác mới`;
  document.querySelector('.search-box .input-icon').innerHTML = icon('search', 16);
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });

  await loadContacts();

  // Ho tro mo san modal Sua tu URL (?edit=ID) - dung khi dieu huong tu contact-detail.html,
  // cung pattern da dung o warranties.js.
  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    const contact = contactsCache.find((c) => String(c.id) === editId);
    if (contact) openEditModal(contact);
  }
})();
