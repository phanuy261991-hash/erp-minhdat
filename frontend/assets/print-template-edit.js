// Logic trang "Chinh sua mau in" (migration 028, menu Cau hinh). Trinh soan thao rich-text
// (contenteditable) cho vung "Dau trang"/"Chan trang", chi bat/tat + sap xep cot cho bang san
// pham (khong ve bang tay - da chot pham vi voi nguoi dung, xem docs/DECISIONS.md). Khung xem
// truoc ben phai dung du lieu mau CO DINH (xem PRINT_TYPE_HANDLERS trong print-template-render.js),
// khong goi API du lieu that.
//
// TONG QUAT HOA cho nhieu loai phieu (migration 030, "Giay de nghi tam ung" - loai phieu THU 2,
// khong co bang san pham): `hasTable` (tu API /tokens) quyet dinh co hien khoi "Cot bang san
// pham"/checkbox "So tien viet bang chu" hay khong, va co goi renderPrintTable() luc xem truoc
// hay khong. PRINT_TYPE_HANDLERS[templateType] cung cap du lieu mau + ham tinh token dung cho
// dung loai phieu dang mo - khong con hardcode rieng cho stock_issue.

const templateType = new URLSearchParams(window.location.search).get('type') || 'stock_issue';

const errorBox = document.getElementById('template-error');
const errorText = document.getElementById('template-error-text');
const successBox = document.getElementById('template-success');

const headerEditable = document.getElementById('header-editable');
const footerEditable = document.getElementById('footer-editable');
const columnsListEl = document.getElementById('columns-list');
const orientationToggle = document.getElementById('orientation-toggle');
const previewSheet = document.getElementById('preview-sheet');
const tokenMenu = document.getElementById('token-menu');
const btnInsertToken = document.getElementById('btn-insert-token');
const btnInsertImage = document.getElementById('btn-insert-image');
const imageFileInput = document.getElementById('image-file-input');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');
const showAmountWordsCheckbox = document.getElementById('show-amount-words-checkbox');
const columnsSection = document.getElementById('columns-section');
const amountWordsSection = document.getElementById('amount-words-section');
const headerSectionDesc = document.getElementById('header-section-desc');
const footerSectionDesc = document.getElementById('footer-section-desc');

let tokensData = null; // { header: [...], footer: [...] } tu API /tokens
let tableColumnsMeta = []; // [{key,label,numeric}] tu API /tokens
let columnsState = []; // [{key,label,numeric,enabled,width}] - nguon su that cho thu tu/bat-tat/do rong cot
let currentOrientation = 'portrait';
let showAmountInWords = true;
let hasTable = true; // tu API /tokens - quyet dinh co hien khoi cau hinh bang/checkbox so tien bang chu
let activeZone = 'header';
// Vi tri con tro luc bam "Chen hinh anh" (them 2026-08-06) - phai chup lai NGAY luc click, truoc
// khi mo hop thoai chon file: hop thoai chiem focus lam mat vung chon dang co trong contenteditable,
// nhung 1 doi tuong Range da tao van con hop le de insertNode() sau khi nguoi dung chon xong file
// (khac voi doc lai window.getSelection() luc do - se khong con tro dung vi tri nua).
let pendingImageRange = null;

function showError(message) {
  errorText.textContent = message;
  errorBox.hidden = false;
}

function hideMessages() {
  errorBox.hidden = true;
  successBox.hidden = true;
}

function getActiveEditable() {
  return activeZone === 'footer' ? footerEditable : headerEditable;
}

// Chip token da chen (ca ban seed tu server lan ban moi chen trong phien lam viec) can co san
// nut "x" nho de xoa - them vao neu con thieu (ban seed tu migration 028 chua co san nut nay).
function ensureTokenRemoveButtons(container) {
  container.querySelectorAll('.pt-token').forEach((chip) => {
    if (!chip.querySelector('.pt-token-remove')) {
      const removeBtn = document.createElement('span');
      removeBtn.className = 'pt-token-remove';
      removeBtn.contentEditable = 'false';
      removeBtn.textContent = '×';
      chip.appendChild(removeBtn);
    }
  });
}

// Bo nut "x" (chi phuc vu thao tac trong trinh soan thao) truoc khi luu xuong server - trang in
// that chi can <span data-token> tinh gon, khong can nut xoa.
function serializeEditableHtml(sourceEl) {
  const clone = sourceEl.cloneNode(true);
  clone.querySelectorAll('.pt-token-remove').forEach((el) => el.remove());
  return clone.innerHTML;
}

function getInsertionRange(zone) {
  const editable = zone === 'footer' ? footerEditable : headerEditable;
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (editable.contains(range.commonAncestorContainer)) {
      return range;
    }
  }
  const range = document.createRange();
  range.selectNodeContents(editable);
  range.collapse(false);
  return range;
}

function insertToken(tokenKey, label) {
  const range = getInsertionRange(activeZone);
  const chip = document.createElement('span');
  chip.className = 'pt-token';
  chip.contentEditable = 'false';
  chip.dataset.token = tokenKey;
  chip.textContent = label;
  const removeBtn = document.createElement('span');
  removeBtn.className = 'pt-token-remove';
  removeBtn.contentEditable = 'false';
  removeBtn.textContent = '×';
  chip.appendChild(removeBtn);

  range.deleteContents();
  range.insertNode(chip);
  range.setStartAfter(chip);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  updatePreview();
}

// Chen 1 the <img> vao dung vi tri con tro da chup luc bam nut (2026-08-06, dung cho hinh anh
// dinh kem mau in - vd ma QR thanh toan). width mac dinh vua phai (140px, du ro cho ma QR ma
// khong choan het khung in) - trinh duyet Chrome/Edge tu hien nut keo-giai o goc anh khi bam vao
// trong vung contenteditable, khong can tu viet co che resize rieng.
function insertImage(range, url) {
  const img = document.createElement('img');
  img.src = url;
  img.className = 'pt-inline-image';
  img.style.width = '140px';
  range.deleteContents();
  range.insertNode(img);
  range.setStartAfter(img);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  updatePreview();
}

async function handleImageFileSelected(event) {
  const file = event.target.files[0];
  event.target.value = ''; // cho phep chon lai dung file nay o lan sau
  const range = pendingImageRange;
  pendingImageRange = null;
  if (!file || !range) return;

  if (file.size > 3 * 1024 * 1024) {
    showError('Hình ảnh vượt quá dung lượng cho phép (3MB)');
    return;
  }

  hideMessages();
  const previousLabel = btnInsertImage.textContent;
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
    insertImage(range, data.url);
  } catch (err) {
    showError(err.message);
  } finally {
    btnInsertImage.disabled = false;
    btnInsertImage.textContent = previousLabel;
  }
}

function renderTokenMenu() {
  const list = tokensData ? tokensData[activeZone] || [] : [];
  tokenMenu.innerHTML = list
    .map((t) => `<button type="button" class="pt-token-menu-item" data-key="${t.key}" data-label="${t.label}">${t.label}</button>`)
    .join('');
}

function toggleTokenMenu(forceHide) {
  const shouldHide = forceHide !== undefined ? forceHide : !tokenMenu.hidden;
  if (!shouldHide) {
    renderTokenMenu();
  }
  tokenMenu.hidden = shouldHide;
}

// --- Toolbar dinh dang chu (execCommand - du dung cho nhu cau dinh dang don gian, khong can
// thu vien rich-text ngoai, dung nguyen tac "khong phu thuoc CDN/build step" cua du an) ---

// document.execCommand() KHONG dinh dang duoc noi dung contenteditable="false" (chip token) -
// day la gioi han chuan cua trinh duyet (bo qua toan bo "dao" khong the sua trong 1 vung
// contenteditable co the sua), phat hien qua phan hoi nguoi dung 2026-08-06: bam "B" khi da chon
// dung 1 chip khong co tac dung gi, dù van hoat dong binh thuong voi chu thuong. Vi vay voi 3
// lenh dinh dang (bold/italic/underline), phai TU boc/go bo the <strong>/<em>/<u> quanh CHINH
// chip token bang tay (DOM), song song voi goi execCommand nhu cu cho phan chu thuong con lai
// trong cung vung chon (execCommand van chay binh thuong tren text, khong anh huong gi nhau).
const CHIP_FORMAT_TAGS = { bold: 'STRONG', italic: 'EM', underline: 'U' };
const CHIP_FORMAT_TAGS_VALUES = new Set(Object.values(CHIP_FORMAT_TAGS));

// Toggle: neu chip dang duoc boc DUY NHAT boi 1 the dung tagName (khong con chu/token nao khac
// chung the do) thi go bo (tat dinh dang) - nguoc lai thi boc them 1 lop moi (bat dinh dang).
function toggleTokenChipFormat(chip, tagName) {
  const parent = chip.parentElement;
  if (parent && parent.tagName === tagName && parent.childNodes.length === 1) {
    parent.replaceWith(chip);
  } else {
    const wrapper = document.createElement(tagName);
    chip.replaceWith(wrapper);
    wrapper.appendChild(chip);
  }
}

function applyFormatCommand(cmd) {
  const tagName = CHIP_FORMAT_TAGS[cmd];
  if (tagName) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editable = getActiveEditable();
      if (editable.contains(range.commonAncestorContainer)) {
        editable.querySelectorAll('.pt-token').forEach((chip) => {
          if (range.intersectsNode(chip)) toggleTokenChipFormat(chip, tagName);
        });
      }
    }
  }
  document.execCommand(cmd, false, null);
  updatePreview();
}

// Buoc "fontSize=7" la ky thuat pho bien de tao <font size="7"> bao quanh vung chon, sau do
// thay bang <span style="font-size:...px"> that su (thay vi dung thang bang do 1-7 mac dinh cua
// trinh duyet, khong dieu chinh duoc theo px).
function applyFontSizeDelta(deltaPx) {
  const editable = getActiveEditable();
  document.execCommand('fontSize', false, '7');
  editable.querySelectorAll('font[size="7"]').forEach((el) => {
    const span = document.createElement('span');
    const baseSize = parseFloat(getComputedStyle(el.parentElement).fontSize) || 14;
    const newSize = Math.max(10, Math.min(28, Math.round(baseSize + deltaPx)));
    span.style.fontSize = `${newSize}px`;
    while (el.firstChild) span.appendChild(el.firstChild);
    el.replaceWith(span);
  });
  updatePreview();
}

// --- Cot bang san pham: bat/tat + sap xep thu tu + chinh do rong (khong keo-tha) ---
// savedColumns co the o dang mang chuoi cu ["key",...] hoac mang object moi [{key,width},...] -
// normalizeTableColumns() (print-template-render.js) tu quy doi ve dang object thong nhat.
function buildInitialColumnState(meta, savedColumns) {
  const metaByKey = {};
  meta.forEach((c) => {
    metaByKey[c.key] = c;
  });
  const normalizedSaved = normalizeTableColumns(savedColumns);
  const state = normalizedSaved
    .filter((c) => metaByKey[c.key])
    .map((c) => ({ ...metaByKey[c.key], enabled: true, width: c.width }));
  const usedKeys = new Set(state.map((c) => c.key));
  const evenWidth = meta.length > 0 ? Math.round((100 / meta.length) * 10) / 10 : 0;
  meta.forEach((c) => {
    if (!usedKeys.has(c.key)) state.push({ ...c, enabled: false, width: evenWidth });
  });
  return state;
}

function renderColumnsList() {
  columnsListEl.innerHTML = columnsState
    .map(
      (c, index) => `
      <div class="pt-column-row">
        <label class="pt-column-checkbox">
          <input type="checkbox" data-key="${c.key}" data-action="toggle" ${c.enabled ? 'checked' : ''} />
          <span>${c.label}</span>
        </label>
        <div class="pt-column-width">
          <input type="number" min="1" max="100" step="1" data-key="${c.key}" data-action="width" value="${Math.round(c.width)}" ${c.enabled ? '' : 'disabled'} />
          <span class="pt-column-width-suffix">%</span>
        </div>
        <div class="pt-column-move">
          <button type="button" data-key="${c.key}" data-action="up" title="Lên" ${index === 0 ? 'disabled' : ''}>${icon('chevronUp', 14)}</button>
          <button type="button" data-key="${c.key}" data-action="down" title="Xuống" ${index === columnsState.length - 1 ? 'disabled' : ''}>${icon('chevronDown', 14)}</button>
        </div>
      </div>`
    )
    .join('');
}

function moveColumn(key, direction) {
  const index = columnsState.findIndex((c) => c.key === key);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= columnsState.length) return;
  [columnsState[index], columnsState[swapWith]] = [columnsState[swapWith], columnsState[index]];
  renderColumnsList();
  updatePreview();
}

function toggleColumn(key) {
  const col = columnsState.find((c) => c.key === key);
  const enabledCount = columnsState.filter((c) => c.enabled).length;
  if (col.enabled && enabledCount <= 2) {
    alert('Bảng sản phẩm cần giữ tối thiểu 2 cột.');
    renderColumnsList();
    return;
  }
  col.enabled = !col.enabled;
  renderColumnsList();
  updatePreview();
}

// --- Khung xem truoc ---
function updatePreview() {
  const headerMount = document.getElementById('preview-header-mount');
  const tableMount = document.getElementById('preview-table-mount');
  const footerMount = document.getElementById('preview-footer-mount');

  headerMount.innerHTML = headerEditable.innerHTML;
  footerMount.innerHTML = footerEditable.innerHTML;

  const typeHandler = PRINT_TYPE_HANDLERS[templateType];
  const tokenValues = typeHandler ? typeHandler.buildTokenValues(typeHandler.sampleData) : {};
  applyPrintTemplateTokens(headerMount, tokenValues);
  applyPrintTemplateTokens(footerMount, tokenValues);

  if (hasTable) {
    const enabledColumns = columnsState.filter((c) => c.enabled).map((c) => ({ key: c.key, width: c.width }));
    tableMount.innerHTML = renderPrintTable({
      columns: enabledColumns,
      columnsMeta: tableColumnsMeta,
      items: typeHandler.sampleData.issue.items,
      totalAmount: typeHandler.sampleData.issue.total_amount,
      showAmountInWords,
    });
  } else {
    tableMount.innerHTML = '';
  }

  previewSheet.classList.toggle('print-sheet--landscape', currentOrientation === 'landscape');
}

function setOrientation(value) {
  currentOrientation = value;
  orientationToggle.querySelectorAll('.pt-orientation-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === value);
  });
  updatePreview();
}

function applyTemplateToEditor(data) {
  headerEditable.innerHTML = data.header_html;
  footerEditable.innerHTML = data.footer_html;
  ensureTokenRemoveButtons(headerEditable);
  ensureTokenRemoveButtons(footerEditable);
  if (hasTable) {
    columnsState = buildInitialColumnState(tableColumnsMeta, data.table_columns);
    renderColumnsList();
  }
  showAmountInWords = data.show_amount_in_words !== false;
  showAmountWordsCheckbox.checked = showAmountInWords;
  setOrientation(data.orientation);
}

async function loadTemplate() {
  const [tokensRes, templateRes] = await Promise.all([
    apiFetch(`/print-templates/${templateType}/tokens`),
    apiFetch(`/print-templates/${templateType}`),
  ]);
  tokensData = tokensRes.tokens;
  tableColumnsMeta = tokensRes.tableColumns;
  hasTable = tokensRes.hasTable !== false;

  // Loai phieu khong co bang san pham (vd "Giay de nghi tam ung") - an han khoi cau hinh cot +
  // checkbox "So tien viet bang chu" (khong lien quan), doi lai mo ta 2 vung soan thao cho dung
  // ngu canh (khong con nhac toi "bang san pham" vi khong ton tai o loai phieu nay).
  columnsSection.hidden = !hasTable;
  amountWordsSection.hidden = !hasTable;
  headerSectionDesc.textContent = hasTable
    ? 'Hiển thị phía trên bảng sản phẩm - bấm vào vùng bên dưới rồi dùng thanh công cụ ở trên để định dạng hoặc chèn trường thông tin.'
    : 'Phần đầu văn bản - bấm vào vùng bên dưới rồi dùng thanh công cụ ở trên để định dạng hoặc chèn trường thông tin.';
  footerSectionDesc.textContent = hasTable ? 'Hiển thị phía dưới bảng sản phẩm.' : 'Phần cuối văn bản.';

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
    header_html: serializeEditableHtml(headerEditable),
    footer_html: serializeEditableHtml(footerEditable),
    table_columns: columnsState.filter((c) => c.enabled).map((c) => ({ key: c.key, width: c.width })),
    orientation: currentOrientation,
    show_amount_in_words: showAmountInWords,
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
headerEditable.addEventListener('focus', () => {
  activeZone = 'header';
});
footerEditable.addEventListener('focus', () => {
  activeZone = 'footer';
});
[headerEditable, footerEditable].forEach((el) => {
  el.addEventListener('input', updatePreview);
  el.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('.pt-token-remove');
    if (removeBtn) {
      const chip = removeBtn.closest('.pt-token');
      const parent = chip.parentElement;
      chip.remove();
      // Don luon the <strong>/<em>/<u> rong neu chip vua xoa la con duy nhat cua no (them
      // 2026-08-06, cung luc voi toggleTokenChipFormat() o tren) - tranh sot lai the rong vo nghia.
      if (parent && parent !== el && parent.childNodes.length === 0 && CHIP_FORMAT_TAGS_VALUES.has(parent.tagName)) {
        parent.remove();
      }
      updatePreview();
    }
  });
});

document.querySelectorAll('.pt-toolbar-btn[data-cmd]').forEach((btn) => {
  btn.addEventListener('mousedown', (event) => event.preventDefault());
  btn.addEventListener('click', () => applyFormatCommand(btn.dataset.cmd));
});

document.getElementById('btn-font-smaller').addEventListener('mousedown', (event) => event.preventDefault());
document.getElementById('btn-font-smaller').addEventListener('click', () => applyFontSizeDelta(-2));
document.getElementById('btn-font-larger').addEventListener('mousedown', (event) => event.preventDefault());
document.getElementById('btn-font-larger').addEventListener('click', () => applyFontSizeDelta(2));

btnInsertToken.addEventListener('mousedown', (event) => event.preventDefault());
btnInsertToken.addEventListener('click', () => toggleTokenMenu());

// mousedown preventDefault giu nguyen vung chon dang co trong contenteditable (giong nut Dam/
// Nghieng/Chen truong thong tin o tren) - can thiet o day de getInsertionRange() chup dung vi tri,
// truoc khi hop thoai chon file (native, chiem focus toan trang) mo ra.
btnInsertImage.addEventListener('mousedown', (event) => event.preventDefault());
btnInsertImage.addEventListener('click', () => {
  pendingImageRange = getInsertionRange(activeZone);
  imageFileInput.click();
});
imageFileInput.addEventListener('change', handleImageFileSelected);

tokenMenu.addEventListener('mousedown', (event) => {
  if (event.target.closest('.pt-token-menu-item')) event.preventDefault();
});
tokenMenu.addEventListener('click', (event) => {
  const item = event.target.closest('.pt-token-menu-item');
  if (!item) return;
  insertToken(item.dataset.key, item.dataset.label);
  toggleTokenMenu(true);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.pt-token-dropdown')) {
    toggleTokenMenu(true);
  }
});

columnsListEl.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'toggle') {
    toggleColumn(event.target.dataset.key);
  }
});
columnsListEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-action]');
  if (!btn || btn.disabled) return;
  if (btn.dataset.action === 'up' || btn.dataset.action === 'down') {
    moveColumn(btn.dataset.key, btn.dataset.action);
  }
});
// Do rong: cap nhat truc tiep vao state + ve lai khung xem truoc, KHONG goi renderColumnsList()
// (se lam mat focus/con tro dang go dang trong o input).
columnsListEl.addEventListener('input', (event) => {
  if (event.target.dataset.action !== 'width') return;
  const col = columnsState.find((c) => c.key === event.target.dataset.key);
  const value = Number(event.target.value);
  if (col && value > 0) {
    col.width = value;
    updatePreview();
  }
});

showAmountWordsCheckbox.addEventListener('change', () => {
  showAmountInWords = showAmountWordsCheckbox.checked;
  updatePreview();
});

orientationToggle.querySelectorAll('.pt-orientation-btn').forEach((btn) => {
  btn.addEventListener('click', () => setOrientation(btn.dataset.value));
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
  document.querySelectorAll('.pt-toolbar-btn[data-icon]').forEach((btn) => {
    btn.innerHTML = icon(btn.dataset.icon, 15);
  });
  document.getElementById('btn-insert-token').textContent = 'Chèn trường thông tin ▾';

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
