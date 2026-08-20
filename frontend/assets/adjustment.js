// Combobox "Dieu chinh cho phieu" dung chung cho stock-receipts.js va stock-issues.js - tim
// theo ma phieu (PN.../PX...) tren ca 2 loai phieu nhap/xuat, luu adjusts_type/adjusts_id de
// gui kem khi tao phieu moi (xem migration 010, docs/DECISIONS.md muc "Sua/huy phieu da tao").
// Ca 2 trang phai co san markup #adjusts-search/#adjusts-type/#adjusts-id/#adjusts-suggestions
// va nap script nay sau api.js.

let adjustableDocsCache = [];

async function loadAdjustableDocs() {
  const [{ receipts }, { issues }] = await Promise.all([apiFetch('/stock-receipts'), apiFetch('/stock-issues')]);
  // Chi hien phieu da 'da_tru_kho' - phieu con dang nhap (2026-08-20, quy trinh 2 buoc Luu tam/
  // Xuat kho) chua chac chan se duoc xuat kho that, backend cung chan tuong tu neu chon nham
  // (xem readAdjustment() trong stockIssues.routes.js/stockReceipts.routes.js).
  adjustableDocsCache = [
    ...receipts.filter((r) => r.status === 'da_tru_kho').map((r) => ({ type: 'receipt', id: r.id, code: r.code, label: `${r.code} (Phiếu nhập)` })),
    ...issues.filter((i) => i.status === 'da_tru_kho').map((i) => ({ type: 'issue', id: i.id, code: i.code, label: `${i.code} (Phiếu xuất)` })),
  ];
}

function renderAdjustmentSuggestions(keyword) {
  const box = document.getElementById('adjusts-suggestions');
  const kw = keyword.trim().toLowerCase();

  if (!kw) {
    box.innerHTML = '';
    return;
  }

  const matches = adjustableDocsCache.filter((d) => d.code.toLowerCase().includes(kw)).slice(0, 8);

  if (matches.length === 0) {
    box.innerHTML = '<div class="combobox-empty">Không tìm thấy phiếu</div>';
    return;
  }

  box.innerHTML = matches
    .map((d) => `<div class="combobox-option" data-type="${d.type}" data-id="${d.id}" data-label="${d.label}">${d.label}</div>`)
    .join('');
}

function selectAdjustmentDoc(type, id, label) {
  document.getElementById('adjusts-type').value = type;
  document.getElementById('adjusts-id').value = id;
  document.getElementById('adjusts-search').value = label;
  document.getElementById('adjusts-suggestions').innerHTML = '';
}

function resetAdjustmentField() {
  document.getElementById('adjusts-search').value = '';
  document.getElementById('adjusts-type').value = '';
  document.getElementById('adjusts-id').value = '';
  document.getElementById('adjusts-suggestions').innerHTML = '';
}

// Tra ve object rong neu chua chon phieu goc nao - gop truc tiep vao body khi goi POST.
function getAdjustmentPayload() {
  const adjustsType = document.getElementById('adjusts-type').value;
  const adjustsId = document.getElementById('adjusts-id').value;
  if (!adjustsType || !adjustsId) return {};
  return { adjusts_type: adjustsType, adjusts_id: Number(adjustsId) };
}

function initAdjustmentField() {
  const searchInput = document.getElementById('adjusts-search');
  const suggestionsBox = document.getElementById('adjusts-suggestions');
  if (!searchInput) return;

  searchInput.addEventListener('input', (event) => {
    document.getElementById('adjusts-type').value = '';
    document.getElementById('adjusts-id').value = '';
    renderAdjustmentSuggestions(event.target.value);
  });

  suggestionsBox.addEventListener('click', (event) => {
    const option = event.target.closest('.combobox-option');
    if (!option) return;
    selectAdjustmentDoc(option.dataset.type, option.dataset.id, option.dataset.label);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#adjusts-search') && !event.target.closest('#adjusts-suggestions')) {
      suggestionsBox.innerHTML = '';
    }
  });
}
