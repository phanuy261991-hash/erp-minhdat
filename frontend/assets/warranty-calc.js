// Ham dung chung cho module Bao hanh: tinh 2 chieu giua "Thoi gian bao hanh" (so + don vi) va
// "Ngay het han", tinh so ngay con lai, dinh dang hien thi. Dung chung giua warranty-detail.js
// (form them/sua) va customer-detail.js (hien thi the) - xem yeu cau nguoi dung 2026-08-01.

const WARRANTY_UNIT_LABELS = { ngay: 'ngày', thang: 'tháng', nam: 'năm' };

// Ngay dang 'YYYY-MM-DD' (khong gio) -> Date o 00:00 local, tranh lech mui gio khi convert qua lai.
function parseWarrantyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatWarrantyDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Tu "Ngay nghiem thu" + "Thoi gian bao hanh" (so + don vi) -> "Ngay het han". Cong theo LICH
// (setFullYear/setMonth/setDate) thay vi nhan xap xi 365/30 ngay, de "2 nam" tu 2026-08-01 ra
// dung 2028-08-01 (khong lech do nam nhuan) - xem yeu cau nguoi dung 2026-08-01.
function computeExpiryFromDuration(acceptanceDateStr, durationValue, durationUnit) {
  const date = parseWarrantyDate(acceptanceDateStr);
  const value = Number(durationValue) || 0;

  if (durationUnit === 'nam') {
    date.setFullYear(date.getFullYear() + value);
  } else if (durationUnit === 'thang') {
    date.setMonth(date.getMonth() + value);
  } else {
    date.setDate(date.getDate() + value);
  }

  return formatWarrantyDate(date);
}

// Chieu nguoc lai: tu "Ngay het han" -> suy ra "Thoi gian bao hanh" hien thi, dua theo SO NGAY
// chenh lech (khac voi chieu thuan o tren dung lich) - dung dung quy tac nguoi dung yeu cau
// 2026-08-01: >365 ngay hien theo nam, >=30 ngay hien theo thang, duoi 30 ngay hien dung so ngay.
function computeDurationFromExpiry(acceptanceDateStr, expiryDateStr) {
  const totalDays = Math.round((parseWarrantyDate(expiryDateStr) - parseWarrantyDate(acceptanceDateStr)) / 86400000);

  if (totalDays > 365) {
    return { value: Math.round(totalDays / 365), unit: 'nam' };
  }
  if (totalDays >= 30) {
    return { value: Math.round(totalDays / 30), unit: 'thang' };
  }
  return { value: Math.max(totalDays, 0), unit: 'ngay' };
}

function formatWarrantyDuration(value, unit) {
  return `${value} ${WARRANTY_UNIT_LABELS[unit] || unit}`;
}

function formatWarrantyDateVN(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// So ngay con lai tinh tu HOM NAY (00:00 local) den ngay het han - am nghia la da het han.
function warrantyDaysRemaining(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseWarrantyDate(expiryDateStr) - today) / 86400000);
}
