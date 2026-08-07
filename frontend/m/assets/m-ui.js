// Cac thanh phan UI dung chung cho Giao dien di dong: Bottom sheet (#4), Pull-to-refresh (#7),
// Skeleton (#8), Toast, debounce (dung cho O tim kiem #5), khoi phuc vi tri cuon.
// Nap SAU api.js/icons.js, TRUOC script rieng cua tung trang. Khong phu thuoc DOM co san nao -
// tu tao phan tu can thiet va gan vao document.body.

// ---------------------------------------------------------------------------------------------
// 4. Bottom sheet - tiem <div class="m-sheet-scrim">/<div class="m-sheet"> vao body, dung 1
// instance duy nhat tai 1 thoi diem (mo sheet moi tu dong dong sheet cu neu con mo).
// ---------------------------------------------------------------------------------------------

let _sheetScrimEl = null;
let _sheetEl = null;
let _sheetDrag = null; // { startY, currentY, dragging }

function _ensureSheetDom() {
  if (_sheetScrimEl) return;

  _sheetScrimEl = document.createElement('div');
  _sheetScrimEl.className = 'm-sheet-scrim';
  _sheetScrimEl.hidden = true;
  _sheetScrimEl.addEventListener('click', () => closeBottomSheet());

  _sheetEl = document.createElement('div');
  _sheetEl.className = 'm-sheet';
  _sheetEl.innerHTML = `
    <div class="m-sheet-handle" id="m-sheet-handle"></div>
    <div class="m-sheet-header">
      <h3 class="m-sheet-title" id="m-sheet-title"></h3>
      <button type="button" class="m-sheet-close" id="m-sheet-close" aria-label="Đóng"></button>
    </div>
    <div class="m-sheet-body" id="m-sheet-body"></div>
    <div class="m-sheet-actions" id="m-sheet-actions" hidden></div>
  `;

  document.body.appendChild(_sheetScrimEl);
  document.body.appendChild(_sheetEl);

  document.getElementById('m-sheet-close').innerHTML = icon('close', 20);
  document.getElementById('m-sheet-close').addEventListener('click', () => closeBottomSheet());

  // Keo xuong de dong - nguong >10px moi bat dau theo doi (drag-threshold), tranh nham voi
  // cham nhe hoac cuon noi dung ben trong sheet. Buong tay <40% chieu cao da keo thi bat lai.
  const handle = document.getElementById('m-sheet-handle');
  const header = document.querySelector('#m-sheet-title').parentElement;
  [handle, header].forEach((el) => {
    el.addEventListener('touchstart', _onSheetDragStart, { passive: true });
  });
  _sheetEl.addEventListener('touchmove', _onSheetDragMove, { passive: true });
  _sheetEl.addEventListener('touchend', _onSheetDragEnd);
}

function _onSheetDragStart(event) {
  _sheetDrag = { startY: event.touches[0].clientY, currentY: 0, dragging: false };
}

function _onSheetDragMove(event) {
  if (!_sheetDrag) return;
  const deltaY = event.touches[0].clientY - _sheetDrag.startY;
  if (!_sheetDrag.dragging && deltaY < 10) return; // ngong drag-threshold
  _sheetDrag.dragging = true;
  _sheetDrag.currentY = Math.max(0, deltaY);
  _sheetEl.style.transition = 'none';
  _sheetEl.style.transform = `translateY(${_sheetDrag.currentY}px)`;
}

function _onSheetDragEnd() {
  if (!_sheetDrag || !_sheetDrag.dragging) {
    _sheetDrag = null;
    return;
  }
  _sheetEl.style.transition = '';
  const sheetHeight = _sheetEl.getBoundingClientRect().height || 1;
  if (_sheetDrag.currentY / sheetHeight > 0.4) {
    closeBottomSheet();
  } else {
    _sheetEl.style.transform = '';
  }
  _sheetDrag = null;
}

/**
 * Mo bottom sheet. options: { title, bodyHtml, actionsHtml }
 * bodyHtml/actionsHtml la chuoi HTML da dung (goi vao sau khi mo de gan listener).
 */
function openBottomSheet(options) {
  _ensureSheetDom();
  document.getElementById('m-sheet-title').textContent = options.title || '';
  document.getElementById('m-sheet-body').innerHTML = options.bodyHtml || '';

  const actionsEl = document.getElementById('m-sheet-actions');
  if (options.actionsHtml) {
    actionsEl.innerHTML = options.actionsHtml;
    actionsEl.hidden = false;
  } else {
    actionsEl.hidden = true;
  }

  _sheetEl.style.transform = '';
  _sheetScrimEl.hidden = false;
  // requestAnimationFrame de dam bao transition chay (doi hidden->block ap dung truoc)
  requestAnimationFrame(() => {
    _sheetScrimEl.classList.add('open');
    _sheetEl.classList.add('open');
  });
  document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
  if (!_sheetEl) return;
  _sheetScrimEl.classList.remove('open');
  _sheetEl.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (!_sheetEl.classList.contains('open')) {
      _sheetScrimEl.hidden = true;
    }
  }, 200);
}

// ---------------------------------------------------------------------------------------------
// 7. Pull-to-refresh - chi dung o man danh sach. BAT BUOC container da co
// overscroll-behavior-y:contain (m-style.css .m-content) de trinh duyet khong tu tai lai trang.
// ---------------------------------------------------------------------------------------------

const PULL_THRESHOLD_PX = 64;

/**
 * Gan pull-to-refresh vao 1 container cuon (thuong la #m-content).
 * onRefresh: async function - goi lai API, tra ve khi xong.
 */
function initPullToRefresh(containerEl, onRefresh) {
  const indicator = document.createElement('div');
  indicator.className = 'm-pull-indicator';
  indicator.innerHTML = `<span class="m-pull-indicator-icon">${icon('refresh', 22)}</span>`;
  containerEl.insertBefore(indicator, containerEl.firstChild);
  const iconEl = indicator.querySelector('.m-pull-indicator-icon');

  let startY = 0;
  let pulling = false;
  let refreshing = false;

  containerEl.addEventListener(
    'touchstart',
    (event) => {
      if (containerEl.scrollTop <= 0 && !refreshing) {
        startY = event.touches[0].clientY;
        pulling = true;
      } else {
        pulling = false;
      }
    },
    { passive: true }
  );

  containerEl.addEventListener(
    'touchmove',
    (event) => {
      if (!pulling || refreshing) return;
      const delta = event.touches[0].clientY - startY;
      if (delta <= 0) return;
      const clamped = Math.min(delta, PULL_THRESHOLD_PX * 1.4);
      indicator.style.height = `${clamped}px`;
      const rotateDeg = (clamped / PULL_THRESHOLD_PX) * 360;
      iconEl.style.transform = `rotate(${rotateDeg}deg)`;
    },
    { passive: true }
  );

  containerEl.addEventListener('touchend', async () => {
    if (!pulling || refreshing) {
      pulling = false;
      return;
    }
    pulling = false;
    const heightNow = parseFloat(indicator.style.height || '0');
    if (heightNow >= PULL_THRESHOLD_PX) {
      refreshing = true;
      iconEl.classList.add('spinning');
      indicator.style.height = `${PULL_THRESHOLD_PX}px`;
      try {
        await onRefresh();
      } finally {
        iconEl.classList.remove('spinning');
        indicator.style.height = '0px';
        refreshing = false;
      }
    } else {
      indicator.style.height = '0px';
    }
  });
}

// ---------------------------------------------------------------------------------------------
// 8. Skeleton loading - dung dung hinh dang The danh sach (#3) de khong lam layout nhay khi
// du lieu tai xong. Chi hien neu tai lau hon ~200ms (tranh chop vo nghia tren LAN da nhanh).
// ---------------------------------------------------------------------------------------------

function skeletonListHtml(count) {
  const card = `
    <div class="m-skeleton-card">
      <div class="m-skeleton-block m-skeleton-block--title"></div>
      <div style="display:flex; gap:14px;">
        <div class="m-skeleton-block m-skeleton-block--short"></div>
        <div class="m-skeleton-block m-skeleton-block--tiny"></div>
      </div>
    </div>
  `;
  return `<div class="m-skeleton-list">${card.repeat(count || 5)}</div>`;
}

/**
 * Chay 1 tac vu tai du lieu (loadFn: () => Promise<html thanh cong>), chi hien skeleton
 * neu loadFn chay lau hon 200ms. containerEl.innerHTML se duoc gan bang ket qua loadFn tra ve.
 */
async function loadWithSkeleton(containerEl, loadFn, skeletonCount) {
  let showedSkeleton = false;
  const timer = setTimeout(() => {
    showedSkeleton = true;
    containerEl.innerHTML = skeletonListHtml(skeletonCount);
  }, 200);

  try {
    const html = await loadFn();
    clearTimeout(timer);
    containerEl.innerHTML = html;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
  return showedSkeleton;
}

// ---------------------------------------------------------------------------------------------
// Toast - dung chung 1 stack, giong tinh than toast-stack cua layout.js (desktop) nhung
// vi tri/kich thuoc rieng cho mobile (day man hinh, tren tab bar).
// ---------------------------------------------------------------------------------------------

function _ensureMToastStack() {
  let stack = document.getElementById('m-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'm-toast-stack';
    stack.className = 'm-toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function showMobileToast(message) {
  const stack = _ensureMToastStack();
  const el = document.createElement('div');
  el.className = 'm-toast';
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('m-toast--leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, 3000);
}

// ---------------------------------------------------------------------------------------------
// Debounce (dung cho O tim kiem #5 - khong loc lai danh sach tren moi keystroke)
// ---------------------------------------------------------------------------------------------

function debounce(fn, waitMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

// ---------------------------------------------------------------------------------------------
// Khoi phuc vi tri cuon khi quay lai danh sach (sessionStorage, mat khi dong tab - dung y).
// ---------------------------------------------------------------------------------------------

function saveScrollPos(key, containerEl) {
  sessionStorage.setItem(`m_scroll_${key}`, String(containerEl.scrollTop));
}

function restoreScrollPos(key, containerEl) {
  const saved = sessionStorage.getItem(`m_scroll_${key}`);
  if (saved) containerEl.scrollTop = Number(saved);
}
