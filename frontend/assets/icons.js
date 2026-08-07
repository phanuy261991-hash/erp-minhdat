// Bo icon SVG outline dung chung cho toan bo giao dien - khong dung emoji.
// Moi icon la markup ben trong the <svg> (khong bao gom the svg), goi qua icon(name).
// Style nhat quan: viewBox 24x24, stroke-width 1.8, stroke-linecap/linejoin round.

const ICONS = {
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  package: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M7.5 5.5 16.5 10.5"/>',
  arrowDownTray: '<path d="M12 3v11"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  arrowUpTray: '<path d="M12 21V10"/><path d="M7 15l5-5 5 5"/><path d="M4 3h16"/>',
  users: '<circle cx="8.5" cy="9" r="3.2"/><path d="M2.5 20c0-3.4 2.7-6.2 6-6.2s6 2.8 6 6.2"/><circle cx="17" cy="8.3" r="2.4"/><path d="M14.8 8.6c.6-.3 1.3-.5 2-.5 2.6 0 4.8 2.4 4.8 5.9"/>',
  ledger: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M9.5 12h6"/><path d="M9.5 16h6"/>',
  chartBar: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M2 20h20"/>',
  userCog: '<circle cx="9" cy="8.3" r="3.3"/><path d="M3 20c0-3.5 2.7-6.2 6-6.2s6 2.7 6 6.2"/><circle cx="18" cy="15.5" r="2.1"/><path d="M18 12.7v1M18 17.3v1M15.7 14.2l.8.5M19.5 16.8l.8.5M15.7 16.8l.8-.5M19.5 14.2l.8-.5"/>',
  sidebarCollapse: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M14 9l-2 3 2 3"/>',
  sidebarExpand: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><path d="M12 9l2 3-2 3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  lockOpen: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="16.01"/>',
  shieldCheck: '<path d="M12 3l8 3.5v5.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V6.5L12 3Z"/><path d="M9 12l2 2 4-4"/>',
  building: '<rect x="4" y="3" width="10" height="18" rx="1"/><path d="M14 8h6v13h-6"/><path d="M7 7h1M10 7h1M7 10h1M10 10h1M7 13h1M10 13h1M7 16h1M10 16h1"/>',
  sliders: '<path d="M4 6h10"/><path d="M17 6h3"/><circle cx="14" cy="6" r="2"/><path d="M4 12h3"/><path d="M10 12h10"/><circle cx="7" cy="12" r="2"/><path d="M4 18h10"/><path d="M17 18h3"/><circle cx="14" cy="18" r="2"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  check: '<path d="M5 12.5 9.5 17 19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  warningTriangle: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5"/><path d="M12 17h.01"/>',
  chevronUp: '<path d="M6 15l6-6 6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="1.5"/><path d="M6 17v4h12v-4"/><path d="M8 13h8"/>',
  truck: '<rect x="1" y="7" width="13" height="10" rx="1"/><path d="M14 10h4l3 3v4h-3"/><circle cx="6.5" cy="19" r="2"/><circle cx="17.5" cy="19" r="2"/>',
  tag: '<path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L20 11.5 12.5 19 3 11.5Z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  shield: '<path d="M12 3l8 3.5v5.2c0 5-3.4 8.6-8 9.8-4.6-1.2-8-4.8-8-9.8V6.5L12 3Z"/><path d="M12 8v5"/><path d="M12 16.2h.01"/>',
  arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8"/>',
  moon: '<path d="M20 14.5a8.5 8.5 0 1 1-8-11.2 7 7 0 0 0 8 11.2Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/>',
  wallet: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h12A1.5 1.5 0 0 1 18 7.5V9"/><rect x="3" y="9" width="18" height="11.5" rx="2"/><path d="M15.5 15.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"/>',
  briefcase: '<rect x="2.5" y="7" width="19" height="12.5" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M2.5 12.5h19"/><path d="M10.5 12v1.5h3V12"/>',
  contact: '<rect x="3" y="4" width="14" height="16" rx="2"/><circle cx="10" cy="10" r="2.3"/><path d="M6.3 17c0-2 1.7-3.3 3.7-3.3s3.7 1.3 3.7 3.3"/><path d="M17.5 8h3M17.5 12h3M17.5 16h2"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  cake: '<path d="M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7"/><path d="M4 17c1.2.8 2.3.8 3.5 0 1.2.8 2.3.8 3.5 0 1.2.8 2.3.8 3.5 0 1.2.8 2.3.8 3.5 0"/><path d="M9 12V8M15 12V8"/><path d="M9 5.5c0-1 .8-1 .8-2S9 2 9 2M15 5.5c0-1 .8-1 .8-2S15 2 15 2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
  // 6 icon dinh dang chu + can le, dung rieng cho toolbar trang "Chinh sua mau in" (migration 028).
  bold: '<path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/>',
  italic: '<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>',
  underline: '<path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/>',
  alignLeft: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>',
  alignCenter: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/>',
  alignRight: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>',
  // Nut "Chen hinh anh" o toolbar "Chinh sua mau in" (them 2026-08-06).
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.1 0L4 19"/>',
  // 6 icon moi cho Giao dien di dong (frontend/m/, Dot 1, them 2026-08-06) - CHI THEM, khong sua
  // key cu nao o tren (dung chung file nay giua 2 ban desktop/mobile).
  moreHorizontal: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  mapPin: '<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 20h8"/><path d="M12 17v3"/>',
};

function icon(name, size) {
  const s = size || 18;
  const body = ICONS[name] || '';
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
