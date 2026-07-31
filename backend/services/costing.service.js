// Service tinh gia von san pham - ho tro 2 phuong phap chon qua warehouse_settings.costing_method:
// 'binh_quan_gia_quyen' (mac dinh) va 'fifo'. Xem docs/DECISIONS.md muc "Gia von san pham".
//
// stock_lots luon duoc duy tri va tru dan theo thu tu cu nhat truoc (FIFO vat ly) bat ke
// costing_method dang chon - lo hang la su that vat ly (nhap luc nao, gia bao nhieu), con
// costing_method chi quyet dinh CACH TINH gia von ghi lai cho phieu xuat de bao cao.

const db = require('../db/database');

const DEFAULT_COSTING_METHOD = 'binh_quan_gia_quyen';

function getCostingMethod() {
  const row = db.prepare("SELECT value FROM warehouse_settings WHERE key = 'costing_method'").get();
  return row ? row.value : DEFAULT_COSTING_METHOD;
}

// Gia von binh quan gia quyen hien tai: tinh on-the-fly tu cac lo con lai (khong luu so co
// dinh) = tong gia tri con lai / tong so luong con lai. Tra ve 0 neu khong con ton kho.
function getWeightedAverageCost(productId) {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(quantity_remaining * unit_cost), 0) AS total_value,
             COALESCE(SUM(quantity_remaining), 0) AS total_qty
      FROM stock_lots
      WHERE product_id = ? AND quantity_remaining > 0
    `)
    .get(productId);
  return row.total_qty > 0 ? row.total_value / row.total_qty : 0;
}

// Tru dan cac lo con lai theo thu tu cu nhat truoc cho 1 dong phieu xuat, tra ve unit_cost
// de ghi vao stock_movements.unit_cost - theo dung costing_method dang chon:
// - 'binh_quan_gia_quyen': dung gia binh quan TRUOC khi tru (perpetual moving average -
//   xuat hang khong lam doi gia binh quan cua phan con lai).
// - 'fifo': dung gia thuc te cua dung cac lo bi tru cho lan xuat nay.
function consumeStockForIssue(productId, quantity, costingMethod) {
  const weightedAvgBeforeConsume = getWeightedAverageCost(productId);

  const lots = db
    .prepare(`
      SELECT id, unit_cost, quantity_remaining
      FROM stock_lots
      WHERE product_id = ? AND quantity_remaining > 0
      ORDER BY created_at ASC, id ASC
    `)
    .all(productId);

  const updateLot = db.prepare('UPDATE stock_lots SET quantity_remaining = ? WHERE id = ?');
  let remainingToConsume = quantity;
  let consumedValue = 0;

  for (const lot of lots) {
    if (remainingToConsume <= 0) break;
    const take = Math.min(lot.quantity_remaining, remainingToConsume);
    updateLot.run(lot.quantity_remaining - take, lot.id);
    consumedValue += take * lot.unit_cost;
    remainingToConsume -= take;
  }

  // Xuat vuot qua tong cac lo con lai (vd khi allow_negative_stock dang bat) - phan vuot
  // khong co lo goc de tra gia, dung gia binh quan gan nhat lam gia tham chieu.
  if (remainingToConsume > 0) {
    consumedValue += remainingToConsume * weightedAvgBeforeConsume;
  }

  if (costingMethod === 'fifo') {
    return quantity > 0 ? consumedValue / quantity : 0;
  }
  return weightedAvgBeforeConsume;
}

module.exports = { DEFAULT_COSTING_METHOD, getCostingMethod, getWeightedAverageCost, consumeStockForIssue };
