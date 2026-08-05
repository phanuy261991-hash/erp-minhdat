// Ho tro nhap so tien: o input type="text" gan class "money-input" se tu dong hien dau cham
// phan cach hang nghin NGAY TRONG O NHAP khi go (vd go "1000000" hien ngay "1.000.000"), khong
// dung type="number" vi trinh duyet chan moi ky tu khong phai so/dau tru nen khong the chen dau
// cham. Dung chung cho moi truong tien trong he thong (gia ban/gia von, don gia dong phieu, so
// tien thanh toan/dieu chinh cong no, gia tri hop dong, dot thanh toan, phat sinh, han muc cong
// no, phieu thu/chi So quy...).

function formatMoneyDigits(digits) {
  if (!digits) return '';
  // Number() bo so 0 du thua o dau (vd "007" -> 7) - dung y muon, khong ai can go so 0 dau.
  return Number(digits).toLocaleString('vi-VN');
}

function attachMoneyInputFormatting(input) {
  if (!input || input.dataset.moneyBound === '1') return;
  input.dataset.moneyBound = '1';
  input.setAttribute('inputmode', 'decimal');

  input.addEventListener('input', () => {
    const cursorPos = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/\D/g, '').length;

    input.value = formatMoneyDigits(input.value.replace(/\D/g, ''));

    // Dat lai vi tri con tro dung ngay sau so chu so nguoi dung vua go qua, khong tinh dau cham
    // moi chen vao - tranh con tro nhay ve cuoi o moi lan go giua chung so dai.
    let pos = 0;
    let seenDigits = 0;
    while (pos < input.value.length && seenDigits < digitsBeforeCursor) {
      if (/\d/.test(input.value[pos])) seenDigits += 1;
      pos += 1;
    }
    input.setSelectionRange(pos, pos);
  });
}

function bindMoneyInputs(root = document) {
  root.querySelectorAll('.money-input').forEach(attachMoneyInputFormatting);
}

// Doc gia tri so thuc (bo dau cham) tu 1 o money-input - dung thay Number(input.value) truoc khi
// gui len API.
function getMoneyValue(input) {
  if (!input) return 0;
  const digits = String(input.value || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

// Set gia tri ban dau da co dau cham (vd khi mo modal Sua) - dung thay input.value = so. Phan
// biet null/undefined/'' (de trong, vd "khong gioi han") voi so 0 that su (van hien "0").
function setMoneyValue(input, value) {
  if (!input) return;
  if (value === null || value === undefined || value === '') {
    input.value = '';
    return;
  }
  input.value = (Number(value) || 0).toLocaleString('vi-VN');
}

document.addEventListener('DOMContentLoaded', () => bindMoneyInputs());
