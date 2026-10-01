/* ==============================================================================
   Tính số dư/nguồn tiền sau từng giao dịch cho sổ giao dịch (Dashboard, Báo cáo).
   ============================================================================== */
import { accountBalanceAtDate, calculatePeriodFinancials, compareTxTime, fundBalanceAtDate, isInitialAllocationTx, transactionPeriodKey } from './finance';

// Icon (emoji) hiển thị cho 1 dòng giao dịch. Trước đây chỉ lấy icon của danh mục nên các
// giao dịch KHÔNG có danh mục (Cập nhật số dư ví, thu/chi không gắn danh mục...) hiện ❔.
// Thứ tự ưu tiên: icon danh mục (bỏ qua ❔ mặc định) → icon của ví (với cập nhật số dư/ví)
// → icon mặc định theo loại giao dịch.
export function txIconEmoji(tx, categories, accounts) {
  const cat = (categories || []).find((c) => c.id === tx.category_id);
  if (cat?.icon && cat.icon !== '❔') return cat.icon;
  const acc = tx.account_id ? (accounts || []).find((a) => a.id === tx.account_id) : null;
  if (tx.type === 'adjustment') return acc?.icon || '👛';
  if (tx.type === 'income') return '💵';
  if (tx.type === 'allocation') return '🐷';
  if (tx.type === 'transfer') return '🔁';
  return acc?.icon || '🧾';
}

// Xác định "nguồn trừ" (nơi tiền đi ra) của 1 giao dịch — dùng chung cho cả việc
// hiển thị nhãn LẪN việc gom danh sách nguồn cho bộ lọc trong TxLedgerModal.
export function txSourceInfo(tx, categories, accounts) {
  const cat = categories.find((c) => c.id === tx.category_id);
  const account = tx.account_id ? accounts.find((a) => a.id === tx.account_id) : null;
  if (tx.type === 'expense' && cat?.is_fund) return { key: `fund:${cat.id}`, label: `Quỹ: ${cat.name}` };
  // FIX: "Nạp quỹ lần đầu" là số tiền TỰ NHẬP khi tạo/sửa quỹ (vd số dư quỹ đã có sẵn từ
  // trước khi dùng app) — không hề được trừ ra từ Thu nhập được chi hay từ ví nào cả. Trước
  // đây giao dịch này (allocation, không gắn account_id) lọt xuống nhánh mặc định cuối hàm
  // và bị gắn nhầm nguồn "Thu nhập được chi", khiến báo cáo (cả màn hình lẫn PDF) hiểu sai
  // là khoản này lấy từ thu nhập trong kỳ. Giờ nhận diện riêng bằng isInitialAllocationTx
  // (đúng điều kiện đã dùng ở txBalanceAfter bên dưới) và gắn nhãn "Tự nhập", không tính
  // vào bất kỳ nguồn tiền nào trong app.
  if (tx.type === 'allocation' && isInitialAllocationTx(tx) && !tx.account_id) {
    return { key: 'manual-initial', label: 'Tự nhập (không qua nguồn nào)' };
  }
  if (account) return { key: `account:${account.id}`, label: account.name };
  // Khoản thu nhập: chỉ gắn nhãn "Thu nhập được chi" nếu danh mục thật sự được tính vào
  // Chi pool (include_in_spending_pool !== false). "Thu nhập đặc biệt" (vd: Thưởng Lễ/Tết)
  // chỉ là thu nhập thường, KHÔNG cộng vào Thu nhập được chi nên không được gắn nhãn đó.
  if (tx.type === 'income') {
    const isPoolIncome = cat ? cat.include_in_spending_pool !== false : true;
    return isPoolIncome ? { key: 'pool', label: 'Thu nhập được chi' } : { key: 'special-income', label: 'Thu nhập' };
  }
  return { key: 'pool', label: 'Thu nhập được chi' };
}

// Số dư "Thu nhập được chi" (pool) của KỲ chứa giao dịch `tx`, TÍNH NGAY SAU khi giao
// dịch đó xảy ra. Pool là khái niệm ảo theo từng kỳ (21 → 20) chứ không phải 1 ví có
// sẵn số dư trong DB, nên phải tự cộng dồn: spendingPool của kỳ đó, trừ dần các khoản
// nạp quỹ/chi tiêu trừ vào pool theo đúng thứ tự thời gian, tới đúng giao dịch này thì dừng.
function poolBalanceAfterTx(tx, allTx, categories, spendingPoolByPeriod) {
  const periodKey = transactionPeriodKey(tx);
  const financials = calculatePeriodFinancials(periodKey, allTx, categories, spendingPoolByPeriod?.[periodKey]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const poolTxs = allTx
    .filter((t) => transactionPeriodKey(t) === periodKey)
    .filter((t) => {
      if (t.type === 'allocation') return !isInitialAllocationTx(t) && t.account_id === null;
      if (t.type === 'expense') { const c = catById.get(t.category_id); return !(c && c.is_fund) && t.account_id === null; }
      return false;
    })
    .sort(compareTxTime);
  let cumulative = 0;
  for (const t of poolTxs) {
    cumulative += Number(t.amount);
    if (t.id === tx.id) break;
  }
  return financials.spendingPool - cumulative;
}

// Với 1 khoản THU NHẬP, "số dư nguồn sau GD" thể hiện TỔNG THU NHẬP đã cộng dồn trong kỳ
// tính đến đúng giao dịch này (theo thứ tự thời gian) — cộng TẤT CẢ khoản thu trong kỳ,
// không chỉ riêng phần được tính vào "Thu nhập được chi" (vd: Thu nhập đặc biệt vẫn được
// cộng vào đây, dù không cộng vào pool chi tiêu).
function totalIncomeCumulativeAfterTx(tx, allTx) {
  const periodKey = transactionPeriodKey(tx);
  const incomeTxs = allTx
    .filter((t) => transactionPeriodKey(t) === periodKey && t.type === 'income')
    .sort(compareTxTime);
  let cumulative = 0;
  for (const t of incomeTxs) {
    cumulative += Number(t.amount);
    if (t.id === tx.id) break;
  }
  return cumulative;
}

// "Số dư cuối" của giao dịch — DÙNG CHUNG cho "Hoạt động gần đây" (TxDetailRow) và bảng chi
// tiết (TxLedgerRow) để 2 nơi luôn khớp nhau. Quy tắc: tiền lấy từ nguồn nào thì hiện số dư
// của nguồn đó (quỹ / ví / Thu nhập được chi); khoản thu thì hiện tổng thu nhập cộng dồn.
// Trả về null CHỈ khi thật sự không xác định được nguồn (vd: quỹ/ví đã bị xoá).
export function txBalanceAfter(tx, categories, accounts, allTx, spendingPoolByPeriod) {
  const cat = categories.find((c) => c.id === tx.category_id);
  const txDate = new Date(tx.date || tx.created_at);

  // Nạp quỹ LẦN ĐẦU (không lấy từ ví nào): không có "nguồn bị trừ" nên trước đây rơi vào
  // nhánh không có số dư. Hiển thị số dư của CHÍNH quỹ vừa nhận tiền.
  if (tx.type === 'allocation' && isInitialAllocationTx(tx) && !tx.account_id) {
    return cat ? fundBalanceAtDate(cat, allTx, txDate, tx) : null;
  }

  const source = txSourceInfo(tx, categories, accounts);
  if (source.key.startsWith('fund:')) {
    return cat ? fundBalanceAtDate(cat, allTx, txDate, tx) : null;
  }
  if (source.key.startsWith('account:')) {
    const account = accounts.find((a) => a.id === tx.account_id);
    return account ? accountBalanceAtDate(account, allTx, txDate, tx) : null;
  }
  if (source.key === 'pool') {
    const isPoolDeduction = tx.type === 'expense' || (tx.type === 'allocation' && !isInitialAllocationTx(tx));
    if (isPoolDeduction) return poolBalanceAfterTx(tx, allTx, categories, spendingPoolByPeriod);
    if (tx.type === 'income') return totalIncomeCumulativeAfterTx(tx, allTx);
    return null;
  }
  // 'special-income' (Thu nhập đặc biệt, không tính vào Thu nhập được chi): vẫn là 1 khoản
  // thu nên hiện tổng thu nhập cộng dồn, thay vì bỏ trống như trước.
  if (source.key === 'special-income') return totalIncomeCumulativeAfterTx(tx, allTx);
  return null;
}
