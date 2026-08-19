// Logic trang "Chinh sua mau in" (migration 028, viet lai hoan toan o migration 040 theo yeu cau
// nguoi dung 2026-08-19 - chuyen tu contenteditable + cau hinh cot bang rieng sang 1 o soan ma
// HTML/CSS THAT (<textarea>) + panel token bam-de-chen + xem truoc bang <iframe> co lap CSS, xem
// docs/DECISIONS.md.
//
// TONG QUAT HOA cho nhieu loai phieu (giu nguyen tu migration 030): `hasItems` (tu API /tokens)
// quyet dinh co hien panel "Token tung dong san pham" hay khong, va co truyen items/itemTokenBuilder
// vao renderPrintTemplate() luc xem truoc hay khong. PRINT_TYPE_HANDLERS[templateType]
// (print-template-render.js) cung cap du lieu mau + ham tinh token dung cho dung loai phieu dang mo.

const templateType = new URLSearchParams(window.location.search).get('type') || 'stock_issue';

const errorBox = document.getElementById('template-error');
const errorText = document.getElementById('template-error-text');
const successBox = document.getElementById('template-success');

const sourceTextarea = document.getElementById('template-source');
const tokenPanelDocument = document.getElementById('token-panel-document');
const tokenPanelItem = document.getElementById('token-panel-item');
const itemTokenSection = document.getElementById('item-token-section');
const orientationToggle = document.getElementById('orientation-toggle');
const previewFrame = document.getElementById('preview-frame');
const btnUpload = document.getElementById('btn-upload-template');
const templateFileInput = document.getElementById('template-file-input');
const btnDownload = document.getElementById('btn-download-template');
const btnInsertImage = document.getElementById('btn-insert-image');
const imageFileInput = document.getElementById('image-file-input');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');

let hasItems = true; // tu API /tokens - quyet dinh co hien panel token "Item." + truyen items luc render preview
let currentOrientation = 'portrait';
let previewDebounceTimer = null;

function showError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function hideMessages() {
  errorBox.hidden = true;
  successBox.hidden = true;
}

// Chen 1 doan text vao dung vi tri con tro dang dung trong textarea (hoac cuoi noi dung neu
// textarea dang khong duoc focus/khong co vi tri con tro nao ghi nhan duoc) - giu nguyen con tro
// ngay sau doan vua chen + refocus, giong hanh vi "chen truong thong tin" cua ban contenteditable cu.
function insertAtCursor(text) {
  const start = sourceTextarea.selectionStart ?? sourceTextarea.value.length;
  const end = sourceTextarea.selectionEnd ?? sourceTextarea.value.length;
  const before = sourceTextarea.value.slice(0, start);
  const after = sourceTextarea.value.slice(end);
  sourceTextarea.value = `${before}${text}${after}`;
  const newCursor = start + text.length;
  sourceTextarea.focus();
  sourceTextarea.setSelectionRange(newCursor, newCursor);
  schedulePreviewUpdate();
}

function renderTokenPanel(container, tokens) {
  container.innerHTML = tokens
    .map(
      (t) => `
      <button type="button" class="pt-token-chip" data-key="${t.key}" title="Chèn {{${t.key}}}">
        <span class="pt-token-chip-label">${t.label}</span>
        <span class="pt-token-chip-syntax">{{${t.key}}}</span>
      </button>`
    )
    .join('');
}

// --- Tai len/Tai ve file .html (them 2026-08-19, theo yeu cau nguoi dung) - tien ich soan thao
// ngoai trinh duyet, KHONG phai luu vao he thong (van phai bam "Luu mau" moi ghi vao DB). ---
function handleTemplateFileSelected(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    sourceTextarea.value = String(reader.result || '');
    schedulePreviewUpdate();
  };
  reader.onerror = () => showError('Không đọc được nội dung file đã chọn');
  reader.readAsText(file, 'utf-8');
}

function handleDownloadTemplate() {
  const blob = new Blob([sourceTextarea.value], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mau-in-${templateType}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Chen hinh anh (giu nguyen co che upload cua ban cu, chi doi cach chen tu DOM <img> sang
// chen doan text "<img src="...">" vao dung vi tri con tro trong textarea). ---
async function handleImageFileSelected(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  if (file.size > 3 * 1024 * 1024) {
    showError('Hình ảnh vượt quá dung lượng cho phép (3MB)');
    return;
  }

  hideMessages();
  btnInsertImage.disabled = true;
  btnInsertImage.textContent = 'Đang tải lên...';

  try {
    const formData = new FormData();
    formData.append('file', file);
    // Khong dung apiFetch: no luon gan Content-Type: application/json, se pha hong boundary cua
    // multipart/form-data ma trinh duyet tu sinh khi gui FormData (giong products.js#import).
    const response = await fetch(`/api/print-templates/${templateType}/images`, {
      method: 'POST',
      credentials: 'same-origin',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Tải hình ảnh lên thất bại');
    }
    insertAtCursor(`<img src="${data.url}" style="max-width:100%">`);
  } catch (err) {
    showError(err.message);
  } finally {
    btnInsertImage.disabled = false;
    btnInsertImage.innerHTML = `${icon('image', 15)} Chèn hình ảnh`;
  }
}

// --- Khung xem truoc: renderPrintTemplate() dung du lieu mau CO DINH (PRINT_TYPE_HANDLERS trong
// print-template-render.js), ket qua duoc dua vao <iframe sandbox> qua .srcdoc de CO LAP hoan
// toan CSS nguoi dung tu viet trong mau (khong ro ri ra trang quan tri, va nguoc lai) - dam bao
// xem truoc = giong het ban in that (constraint quan trong nhat cua he thong nay). ---
function updatePreview() {
  const typeHandler = PRINT_TYPE_HANDLERS[templateType];
  if (!typeHandler) return;

  const tokenValues = typeHandler.buildTokenValues(typeHandler.sampleData);
  const rendered = renderPrintTemplate({
    templateHtml: sourceTextarea.value,
    tokenValues,
    items: typeHandler.items,
    itemTokenBuilder: typeHandler.itemTokenBuilder,
  });

  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:40px;font-family:"Open Sans",Arial,sans-serif;font-size:14px;color:#000;background:#fff;}</style></head><body>${rendered}</body></html>`;
  previewFrame.srcdoc = doc;
}

function schedulePreviewUpdate() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(updatePreview, 250);
}

function setOrientation(value) {
  currentOrientation = value;
  orientationToggle.querySelectorAll('.pt-orientation-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
  });
  previewFrame.classList.toggle('pt-preview-iframe-el--landscape', value === 'landscape');
}

function applyTemplateToEditor(data) {
  sourceTextarea.value = data.template_html || '';
  setOrientation(data.orientation || 'portrait');
  updatePreview();
}

async function loadTemplate() {
  const [tokensRes, templateRes] = await Promise.all([
    apiFetch(`/print-templates/${templateType}/tokens`),
    apiFetch(`/print-templates/${templateType}`),
  ]);

  hasItems = tokensRes.hasItems !== false;
  renderTokenPanel(tokenPanelDocument, tokensRes.tokens.document);
  itemTokenSection.hidden = !hasItems;
  if (hasItems) {
    renderTokenPanel(tokenPanelItem, tokensRes.tokens.item);
  }

  document.getElementById('template-title').textContent = `Chỉnh sửa mẫu in: ${templateRes.template.name}`;
  applyTemplateToEditor(templateRes.template);
}

async function handleReset() {
  if (!confirm('Đặt lại mẫu in về mặc định? Các thay đổi chưa lưu sẽ mất.')) return;
  hideMessages();
  try {
    const def = await apiFetch(`/print-templates/${templateType}/default`);
    applyTemplateToEditor(def);
  } catch (err) {
    showError(err.message);
  }
}

async function handleSave() {
  hideMessages();
  btnSave.disabled = true;
  const previousLabel = btnSave.textContent;
  btnSave.textContent = 'Đang lưu...';

  const payload = {
    template_html: sourceTextarea.value,
    orientation: currentOrientation,
  };

  try {
    await apiFetch(`/print-templates/${templateType}`, { method: 'PUT', body: JSON.stringify(payload) });
    successBox.hidden = false;
  } catch (err) {
    showError(err.message);
  } finally {
    btnSave.disabled = false;
    btnSave.textContent = previousLabel;
  }
}

// --- Su kien ---
sourceTextarea.addEventListener('input', schedulePreviewUpdate);

tokenPanelDocument.addEventListener('click', (event) => {
  const chip = event.target.closest('.pt-token-chip');
  if (!chip) return;
  insertAtCursor(`{{${chip.dataset.key}}}`);
});
tokenPanelItem.addEventListener('click', (event) => {
  const chip = event.target.closest('.pt-token-chip');
  if (!chip) return;
  insertAtCursor(`{{${chip.dataset.key}}}`);
});

btnUpload.addEventListener('click', () => templateFileInput.click());
templateFileInput.addEventListener('change', handleTemplateFileSelected);

btnDownload.addEventListener('click', handleDownloadTemplate);

btnInsertImage.addEventListener('click', () => imageFileInput.click());
imageFileInput.addEventListener('change', handleImageFileSelected);

orientationToggle.querySelectorAll('.pt-orientation-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setOrientation(btn.dataset.value);
    updatePreview();
  });
});

btnReset.addEventListener('click', handleReset);
btnSave.addEventListener('click', handleSave);

(async function init() {
  const currentUser = await initLayout('print-templates');
  if (!currentUser) return;

  document.getElementById('btn-back').innerHTML = `${icon('arrowLeft', 16)} Quay lại`;
  document.querySelectorAll('.alert-icon-slot').forEach((slot) => {
    slot.innerHTML = icon('alertCircle', 16);
  });
  btnUpload.innerHTML = `${icon('arrowUpTray', 15)} Tải mẫu lên`;
  btnDownload.innerHTML = `${icon('arrowDownTray', 15)} Tải mẫu về`;
  btnInsertImage.innerHTML = `${icon('image', 15)} Chèn hình ảnh`;

  try {
    await loadTemplate();
  } catch (err) {
    if (err.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    showError(err.message);
  }
})();
