/* ==============================================================================
   Bộ dữ liệu mẫu DÙNG CHUNG cho test ledger.test.js và reportData.test.js.
   Chỉ dùng trong test (không import từ code của app nên không vào bản build).

   Kỳ báo cáo: 21/08/2026 → 20/09/2026 (kỳ tài chính "2026-09"). "Hôm nay" khi test = 30/09/2026.
   Quỹ không lãi (interest_rate = 0) để nhẩm số cho dễ.

   Sơ đồ giao dịch (account null = lấy từ "Thu nhập được chi"):
     TRƯỚC kỳ  t0  08/08  nạp quỹ ban đầu   Quỹ khẩn cấp        +3.000.000   (is_initial)
               t1  15/08  thu nhập Lương    vào ví Techcombank  10.000.000
     TRONG kỳ  t2  25/08  thu nhập Lương    (không ví)          12.000.000   -> tính vào Thu nhập được chi
               t3  26/08  thu nhập Thưởng   vào ví Techcombank   2.000.000   -> thu nhập đặc biệt
               t4  27/08  chi Ăn uống       (không ví)             150.000   -> trừ Thu nhập được chi
               t5  28/08  chi Ăn uống       từ ví Tiền mặt          80.000
               t6  01/09  nạp quỹ Khẩn cấp  (không ví)             500.000   -> trừ Thu nhập được chi
               t7  02/09  nạp quỹ Du lịch   từ ví Techcombank      300.000
               t8  05/09  rút từ Quỹ khẩn cấp (chi tiêu của quỹ)   200.000
               t9  10/09  điều chỉnh ví Vàng                      +100.000
               t10 12/09  điều chỉnh ví Tiền mặt                   -20.000
     SAU kỳ    t11 25/09  chi Ăn uống       (không ví)             999.999   -> ngoài kỳ
   ============================================================================== */

export const NOW = new Date(2026, 8, 30, 12, 0, 0);          // Thứ Tư 30/09/2026 12:00 (giờ VN)
export const START = '2026-08-21';
export const END = '2026-09-20';
export const PERIOD_KEY = '2026-09';

// Tạo giao dịch: date = 'YYYY-MM-DD' như app lưu; created_at = ISO có giờ (phá hòa khi cùng ngày).
export function tx(over) {
  const date = over.date || '2026-08-25';
  const time = over.time || '09:00:00';
  return {
    id: over.id,
    category_id: null,
    account_id: null,
    type: 'expense',
    amount: 0,
    note: null,
    deleted_at: null,
    created_at: new Date(`${date}T${time}`).toISOString(),
    ...over,
    date,
  };
}

export const accounts = [
  { id: 'a1', name: 'Ví tiền mặt', type: 'cash', initial_balance: 1_000_000, icon: '💵' },
  { id: 'a2', name: 'Techcombank', type: 'bank', initial_balance: 5_000_000 },
  { id: 'a3', name: 'Vàng SJC', type: 'gold', initial_balance: 2_000_000 },
];

export const categories = [
  { id: 'sal', name: 'Lương', type: 'income', icon: '💼' },
  { id: 'bonus', name: 'Thưởng', type: 'income', include_in_spending_pool: false },
  { id: 'food', name: 'Ăn uống', type: 'expense', icon: '🍜' },
  { id: 'fund1', name: 'Quỹ khẩn cấp', type: 'expense', is_fund: true, interest_rate: 0 },
  { id: 'fund2', name: 'Quỹ du lịch', type: 'expense', is_fund: true, interest_rate: 0 },
];

export const transactions = [
  tx({ id: 't0', category_id: 'fund1', type: 'allocation', amount: 3_000_000, date: '2026-08-08', is_initial: true, note: 'Nạp quỹ lần đầu' }),
  tx({ id: 't1', category_id: 'sal', type: 'income', amount: 10_000_000, date: '2026-08-15', account_id: 'a2' }),
  tx({ id: 't2', category_id: 'sal', type: 'income', amount: 12_000_000, date: '2026-08-25' }),
  tx({ id: 't3', category_id: 'bonus', type: 'income', amount: 2_000_000, date: '2026-08-26', account_id: 'a2' }),
  tx({ id: 't4', category_id: 'food', type: 'expense', amount: 150_000, date: '2026-08-27' }),
  tx({ id: 't5', category_id: 'food', type: 'expense', amount: 80_000, date: '2026-08-28', account_id: 'a1' }),
  tx({ id: 't6', category_id: 'fund1', type: 'allocation', amount: 500_000, date: '2026-09-01' }),
  tx({ id: 't7', category_id: 'fund2', type: 'allocation', amount: 300_000, date: '2026-09-02', account_id: 'a2' }),
  tx({ id: 't8', category_id: 'fund1', type: 'expense', amount: 200_000, date: '2026-09-05' }),
  tx({ id: 't9', type: 'adjustment', amount: 100_000, date: '2026-09-10', account_id: 'a3' }),
  tx({ id: 't10', type: 'adjustment', amount: -20_000, date: '2026-09-12', account_id: 'a1' }),
  tx({ id: 't11', category_id: 'food', type: 'expense', amount: 999_999, date: '2026-09-25' }),
];

export const byId = Object.fromEntries(transactions.map((t) => [t.id, t]));
