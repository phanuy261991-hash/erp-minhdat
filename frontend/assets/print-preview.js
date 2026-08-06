// Popup xem truoc/in phieu dung CHUNG cho moi trang co nut "In phieu" (2026-08-06, theo yeu cau
// nguoi dung - thay the cach cu la mo tab moi rieng qua <a target="_blank">). Cac trang in that
// (print-issue.html/print-project-advance.html) van giu NGUYEN VEN 100% - khong dieu huong sang
// URL rieng nua ma duoc nhung vao 1 <iframe> hien thi nhu popup toan man hinh de tren CHINH trang
// dang dung (vd stock-issues.html/project-detail.html). File nay duoc nap tren CA 2 phia:
// - Trang danh sach (stock-issues.html, project-detail.html): goi openPrintPreview(url) de mo popup.
// - Chinh trang in (print-issue.html, print-project-advance.html): goi goBackFromPrintPage() cho
//   nut "Quay lai" de tu nhan biet dang chay trong popup (dong popup cua trang cha) hay dang duoc
//   mo truc tiep qua URL (dieu huong nhu cu, vd truy cap thang de debug).
//
// KHONG dung them 1 thanh cong cu/nut "Quay lai" rieng cua popup (sua 2026-08-06, sau khi nguoi
// dung phan hoi kem anh chup thay 2 nut "Quay lai" chong len nhau) - trang in duoc nhung vao DA
// CO SAN thanh cong cu rieng ("Quay lai"/"In phieu", .print-toolbar) hien thi ngay ben trong noi
// dung iframe, chi can doi hanh vi nut "Quay lai" do (qua goBackFromPrintPage()) la du, khong can
// ve them 1 lop UI thu 2 phia ngoai.

function ensurePrintPreviewModal() {
  let modal = document.getElementById('print-preview-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'print-preview-modal';
  modal.className = 'print-preview-modal';
  modal.hidden = true;
  modal.innerHTML = `<iframe id="print-preview-frame" class="print-preview-iframe" title="Xem trước bản in"></iframe>`;
  document.body.appendChild(modal);
  return modal;
}

// An popup + don dep iframe (gan 'about:blank' de huy tai nguyen/JS dang chay ben trong, tranh
// giu lai trang thai cu neu mo lai phieu khac ngay sau do).
function closePrintPreview() {
  const modal = document.getElementById('print-preview-modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.getElementById('print-preview-frame').src = 'about:blank';
}

// Mo 1 URL trang in (vd print-issue.html?id=...) trong popup toan man hinh tren trang hien tai.
function openPrintPreview(url) {
  const modal = ensurePrintPreviewModal();
  const iframe = document.getElementById('print-preview-frame');
  iframe.onload = () => {
    if (iframe.src === 'about:blank' || iframe.src.endsWith('about:blank')) return;
    try {
      // Cung mien (cung goc localhost:PORT) nen truy cap thang duoc contentWindow - lang nghe
      // 'afterprint' de TU DONG an popup ngay sau khi hop thoai in dong lai (da in that hoac
      // bam Huy deu tinh - browser khong phan biet 2 truong hop nay qua su kien nay, chap nhan
      // duoc vi "xong viec voi hop thoai in" la dung y nguoi dung yeu cau).
      iframe.contentWindow.addEventListener('afterprint', closePrintPreview, { once: true });
    } catch (err) {
      // Khong nen xay ra vi cung goc - bo qua neu co gi bat thuong, khong lam gay tinh nang chinh.
    }
  };
  iframe.src = url;
  modal.hidden = false;
}

// Dung tren CHINH cac trang in (print-issue.html/print-project-advance.html) cho nut "Quay lai".
function goBackFromPrintPage(fallbackUrl) {
  if (window.parent !== window && typeof window.parent.closePrintPreview === 'function') {
    window.parent.closePrintPreview();
    return;
  }
  if (fallbackUrl) {
    window.location.href = fallbackUrl;
  } else {
    window.history.back();
  }
}

window.openPrintPreview = openPrintPreview;
window.closePrintPreview = closePrintPreview;
window.goBackFromPrintPage = goBackFromPrintPage;
