/* ==============================================================================
   lib/finance.js — LOGIC TÀI CHÍNH THUẦN (không React, không Supabase, không DOM)
   Tách ra từ App.jsx để test được bằng Vitest (xem finance.test.js).
   Gồm: số dư quỹ/ví (kể cả lãi), kỳ chi tiêu (period), tổng hợp thu-chi cho báo cáo.
   QUY ƯỚC: hàm ở đây chỉ nhận dữ liệu vào và trả kết quả, không gọi mạng, không đụng state.
   ============================================================================== */

export const FUND_RATE_TIERS = [
  { value: 'Không lãi suất', color: '#7E7F90', bg: '#F7F7F8' },
  { value: '<5%/năm', color: '#0DBACC', bg: '#B4F1F1' },
  { value: '5-10%/năm', color: '#9F7FE0', bg: '#E3D6FF' },
  { value: '>10%/năm', color: '#F18AB5', bg: '#FFCDDB' },
];

export const PRIORITY_TERMS = [
  { value: '<1 năm - Siêu ngắn hạn', color: '#F18AB5', bg: '#FFCDDB' },
  { value: '1-3 năm - Hơi ngắn hạn', color: '#0DBACC', bg: '#B4F1F1' },
  { value: '3-5 năm - Ngắn hạn', color: '#74ACEF', bg: '#C1DDFF' },
  { value: '5-10 năm - Hơi dài hạn', color: '#9F7FE0', bg: '#E3D6FF' },
  { value: '>10 năm - Siêu dài hạn', color: '#303150', bg: '#F7F7F8' },
];

export function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Quy tắc "kỳ nhận lợi nhuận đầu tiên" của Túi Thần Tài:
// - Nạp tiền Thứ 2 -> Thứ 5: nhận lợi nhuận kỳ đầu vào "ngày kia" (nạp + 2 ngày)
// - Nạp tiền Thứ 6 -> Chủ nhật: nhận lợi nhuận kỳ đầu vào Thứ 3 tuần kế tiếp
// Getday(): 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
export function firstProfitCreditDate(depositDate) {
  const d = new Date(depositDate);
  d.setHours(0, 0, 0, 0);
  const w = d.getDay();
  let offsetDays;
  if (w >= 1 && w <= 4) {
    // Thứ 2 - Thứ 5: +3 ngày (khớp quy tắc: nạp T2 -> bắt đầu tính lãi T4, nhận lời T5)
    offsetDays = 3;
  } else {
    // Thứ 6 (5), Thứ 7 (6), Chủ nhật (0): dời tới Thứ 3 (2) kế tiếp
    offsetDays = (2 - w + 7) % 7;
    if (offsetDays === 0) offsetDays = 7;
  }
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// Ngày mà 1 khoản NẠP QUỸ (allocation) bắt đầu được cộng vào "gốc sinh lời"
// (interestBase) để tính lãi hàng ngày — áp dụng đúng quy tắc "kỳ nhận lợi
// nhuận đầu tiên" ở trên cho MỌI lần nạp (không chỉ lần nạp đầu tiên của quỹ):
// = firstProfitCreditDate(ngày nạp) - 1 ngày (vì lợi nhuận của "ngày sinh lời X"
// luôn được hiển thị vào ngày X+1, nên gốc phải sẵn sàng từ ngày X = creditDate-1
// để lợi nhuận đầu tiên hiển thị đúng vào creditDate).
// => Nạp T2-T5: gốc bắt đầu sinh lời từ hôm sau (nạp +1 ngày).
// => Nạp T6/T7/CN: gốc bắt đầu sinh lời từ đúng Thứ 2 tuần kế tiếp.
// Tiền nạp vẫn được cộng vào SỐ DƯ (balance) ngay lập tức để hiển thị đúng —
// chỉ riêng phần TÍNH LÃI là bị delay theo quy tắc này.
export function allocationInterestEligibleDate(depositDate) {
  const creditDate = firstProfitCreditDate(depositDate);
  const eligible = new Date(creditDate);
  eligible.setDate(eligible.getDate() - 1);
  return eligible;
}

// FIX: xác định giao dịch "nạp ban đầu" của 1 quỹ CHỈ dựa vào cờ is_initial (được set khi
// tạo quỹ hoặc khi nhập/sửa "Số tiền nạp quỹ lần đầu" trong form chỉnh sửa quỹ).
// KHÔNG fallback về "giao dịch allocation có ngày sớm nhất" nữa — cách cũ khiến 1 lần nạp
// quỹ bình thường (qua nút Nạp quỹ) bị nhầm hiển thị thành "Nạp quỹ ban đầu" chỉ vì nó
// tình cờ là khoản nạp đầu tiên theo thời gian, dù người dùng chưa hề khai báo số tiền ban
// đầu ở form Sửa quỹ. Nếu quỹ chưa từng khai báo "Số tiền nạp quỹ lần đầu" thì đơn giản là
// KHÔNG có dòng "ban đầu" nào cả — mọi khoản nạp/rút đều hiển thị là Nạp quỹ/Rút quỹ bình thường.
// FIX: dùng CHUNG 1 cách nhận diện "khoản nạp quỹ ban đầu" cho cả findInitialAllocation
// (hiển thị ở form Sửa quỹ) VÀ calculateFinancialsFromTxs (tính Còn lại/Thu nhập được chi).
// Trước đây 2 nơi lệch nhau: findInitialAllocation có fallback nhận diện qua ghi chú cho
// dữ liệu cũ chưa có cờ is_initial, còn calculateFinancialsFromTxs chỉ check is_initial —
// khiến 1 khoản nạp ban đầu (không lấy từ nguồn nào) vẫn bị trừ vào Thu nhập được chi,
// làm "Còn lại" bị âm sai dù Chi tiêu thực tế rất nhỏ.
export function isInitialAllocationTx(t) {
  if (t.is_initial === true) return true;
  // Dữ liệu cũ tạo trước khi có cột is_initial sẽ không có cờ này — nhận diện tạm qua
  // ĐÚNG nội dung ghi chú "Nạp quỹ lần đầu" (form Tạo quỹ luôn ghi note y hệt chuỗi này
  // khi tạo khoản nạp ban đầu). An toàn hơn hẳn cách đoán "giao dịch sớm nhất" trước đây
  // vì không thể bị nhầm với 1 khoản nạp bình thường chỉ vì nó tình cờ có ngày sớm hơn —
  // chỉ khớp khi đúng là dòng do chính flow "nạp ban đầu" tạo ra.
  return stripPeriodTag(t.note || '') === 'Nạp quỹ lần đầu';
}

export function findInitialAllocation(transactions, categoryId) {
  const allocations = transactions.filter((t) => t.category_id === categoryId && t.type === 'allocation');
  return allocations.find((t) => t.is_initial === true) || allocations.find(isInitialAllocationTx) || null;
}

// FIX: "date" của giao dịch được lưu dạng .toISOString().slice(0,16) — chỉ có độ chính xác
// TỚI PHÚT, không có giây. Khi 2 giao dịch cùng danh mục/ví được tạo trong cùng 1 phút, so
// sánh "new Date(a.date) - new Date(b.date)" bị HÒA (tie) → thứ tự hiển thị và cách tính
// "số dư cuối" (fundBalanceAtDate/accountBalanceAtDate) không phân biệt được giao dịch nào
// thực sự xảy ra trước, dẫn tới số dư cuối hiển thị sai (gồm luôn cả giao dịch xảy ra SAU nó).
//
// compareTxTime() phá tie bằng created_at (luôn có đủ giây/mili giây) khi 2 "date" bằng nhau.
// LƯU Ý: so sánh bằng HIỆU SỐ NGUYÊN trực tiếp (createdA - createdB), KHÔNG cộng/chia thập
// phân vào timestamp gốc — vì nếu tie-break của 2 dòng rơi vào 2 PHÚT khác nhau của created_at
// (vd 1 dòng lúc 19:20:58, dòng kia 19:21:03, dù "date" cả 2 đều lưu là "19:20" hoặc "19:21")
// thì cách lấy "phần dư trong phút" (modulo) sẽ so sai vì không biết dòng nào thuộc phút nào —
// so hiệu số nguyên tuyệt đối luôn cho kết quả đúng trong mọi trường hợp.
// Nếu created_at CŨNG trùng nhau tuyệt đối (thường gặp với data seed thủ công/script, insert
// hàng loạt cùng lúc) thì fallback cuối cùng sang "seq" — cột bigserial tăng tự động ở DB, do
// chính Postgres cấp lúc insert nên KHÔNG BAO GIỜ trùng, phản ánh đúng thứ tự vật lý dòng được
// tạo ra. Cần: `alter table transactions add column seq bigserial;` và thêm "seq" vào câu
// select transactions ở loadAll().
// Dùng hàm này ở MỌI chỗ cần sắp xếp hoặc xác định thứ tự trước/sau giữa 2 giao dịch.
export function compareTxTime(a, b) {
  const baseA = new Date(a.date || a.created_at).getTime();
  const baseB = new Date(b.date || b.created_at).getTime();
  if (baseA !== baseB) return baseA - baseB;
  const createdA = new Date(a.created_at || a.date).getTime();
  const createdB = new Date(b.created_at || b.date).getTime();
  if (createdA !== createdB) return createdA - createdB;
  return (a.seq || 0) - (b.seq || 0);
}

export function fundBalance(categoryId, transactions) {
  return transactions
    .filter((t) => t.category_id === categoryId)
    .reduce((s, t) => {
      if (t.type === 'allocation') return s + Number(t.amount);
      if (t.type === 'expense') return s - Number(t.amount);
      return s;
    }, 0);
}

// Cache kết quả tính lãi theo quỹ — tránh lặp lại vòng lặp tốn kém mỗi lần render.
// Cache được khóa theo: mảng transactions hiện tại (WeakMap tự giải phóng khi data cũ bị thay),
// + id quỹ + lãi suất + ngày hôm nay (để qua ngày mới thì tự tính lại đúng).
export const _fundBalanceCache = new WeakMap();

export function fundBalanceWithProfit(category, transactions) {
  let cacheForTx = _fundBalanceCache.get(transactions);
  if (!cacheForTx) {
    cacheForTx = new Map();
    _fundBalanceCache.set(transactions, cacheForTx);
  }
  const todayKey = new Date().toDateString();
  const cacheKey = `${category.id}_${category.interest_rate}_${todayKey}`;
  if (cacheForTx.has(cacheKey)) return cacheForTx.get(cacheKey);

  const result = _computeFundBalanceWithProfit(category, transactions);
  cacheForTx.set(cacheKey, result);
  return result;
}

export function _computeFundBalanceWithProfit(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));

  if (history.length === 0) return 0;

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  // changesByDay: tổng số dư THỰC (hiển thị) — nạp/rút cộng trừ ngay theo ngày giao dịch.
  // eligibleChangesByDay: phần "gốc sinh lời" dùng để TÍNH LÃI — khoản nạp chỉ được cộng
  // vào gốc sinh lời kể từ allocationInterestEligibleDate() (delay theo quy tắc kỳ đầu),
  // khoản rút thì trừ khỏi gốc sinh lời ngay lập tức (rút rồi thì không còn sinh lời nữa).
  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    // Lợi nhuận = Gốc sinh lời * Tỷ suất/365 — GIỮ NGUYÊN số thập phân, không làm tròn
    // xuống ở đây để lãi kép không bị hao hụt dần mỗi ngày; chỉ làm tròn khi HIỂN THỊ
    // (xem formatMoney).
    if (interestBase > 0 && dailyRate > 0) {
      const profit = interestBase * dailyRate;
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  balance += changesByDay[today.getTime()] || 0;
  return balance;
}

// Cache tương tự fundBalanceWithProfit — Report và FundDetail gọi hàm này rất nhiều lần
// (mỗi quỹ x nhiều mốc ngày), nếu không cache thì vòng lặp từng-ngày chạy lại liên tục gây lag.
export const _fundBalanceAtDateCache = new WeakMap();

export function fundBalanceAtDate(category, transactions, cutoffDate, cutoffTx = null) {
  let cacheForTx = _fundBalanceAtDateCache.get(transactions);
  if (!cacheForTx) {
    cacheForTx = new Map();
    _fundBalanceAtDateCache.set(transactions, cacheForTx);
  }
  const cutoffKey = new Date(cutoffDate).toDateString();
  // FIX: thêm id của cutoffTx vào cache key — nếu không, 2 giao dịch khác nhau cùng ngày sẽ
  // vô tình dùng chung 1 kết quả cache (kết quả của giao dịch được tính trước).
  const cacheKey = `${category.id}_${category.interest_rate}_${cutoffKey}_${cutoffTx ? cutoffTx.id : 'day-end'}`;
  if (cacheForTx.has(cacheKey)) return cacheForTx.get(cacheKey);

  const result = _computeFundBalanceAtDate(category, transactions, cutoffDate, cutoffTx);
  cacheForTx.set(cacheKey, result);
  return result;
}

export function _computeFundBalanceAtDate(category, transactions, cutoffDate, cutoffTx = null) {
  const rate = Number(category.interest_rate || 0);
  const dailyRate = rate / 100 / 365;
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));

  if (history.length === 0) return 0;

  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const endDate = toDay(cutoffDate); // inclusive? we process until endDate (including that day)
  // FIX: khi biết chính xác giao dịch nào đang được tính "số dư cuối" (cutoffTx), dùng
  // compareTxTime() để loại các giao dịch xảy ra SAU nó trong CÙNG NGÀY — trước đây gộp cả ngày
  // thành 1 cục nên 2 giao dịch cùng ngày (nhất là cùng phút) luôn ra cùng 1 số dư cuối, kể cả
  // giao dịch xảy ra sau (điều này khiến dòng hiển thị trước có số dư đã trừ/cộng nhầm phần
  // của giao dịch xảy ra sau nó).

  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const day = toDay(t.date || t.created_at).getTime();
    if (cutoffTx && day === endDate.getTime() && compareTxTime(t, cutoffTx) > 0) return;
    const key = day;
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    if (interestBase > 0 && dailyRate > 0) {
      const profit = interestBase * dailyRate;
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return balance;
}

export const _accountBalanceAtDateCache = new WeakMap();
export function accountBalanceAtDate(account, transactions, cutoffDate, cutoffTx = null) {
  // FIX HIỆU NĂNG: trước đây hàm này KHÔNG cache — mỗi lần gọi đều lọc lại TOÀN BỘ mảng
  // transactions. Riêng chart "Biến động tài sản" ở Trang chủ gọi hàm này cho MỖI ví × MỖI
  // ngày trong tháng (vd 5 ví × 30 ngày = 150 lần quét), và khối tính toán đó lại KHÔNG bọc
  // useMemo nên chạy lại mỗi khi Trang chủ re-render (đổi theme, hover thẻ...) — đây chính là
  // lý do biểu đồ này load/hiện chậm hơn hẳn các thẻ khác. Cache theo cùng kiểu WeakMap như
  // fundBalanceAtDate: khoá theo chính mảng transactions (tự "sạch" cache khi mảng đổi tham
  // chiếu, tức sau khi reload/thêm giao dịch) + account.id + ngày cutoff.
  let cacheForTx = _accountBalanceAtDateCache.get(transactions);
  if (!cacheForTx) {
    cacheForTx = new Map();
    _accountBalanceAtDateCache.set(transactions, cacheForTx);
  }
  const cutoffKey = new Date(cutoffDate).toISOString();
  // FIX: thêm id của cutoffTx vào cache key, giống fundBalanceAtDate.
  const cacheKey = `${account.id}_${cutoffKey}_${cutoffTx ? cutoffTx.id : 'plain-date'}`;
  if (cacheForTx.has(cacheKey)) return cacheForTx.get(cacheKey);

  // FIX: nếu biết chính xác giao dịch đang xét (cutoffTx), so sánh bằng compareTxTime() — có
  // tie-break theo created_at — thay vì so trực tiếp "d <= cutoffDate". Trước đây khi 2 giao
  // dịch trùng NHAU tới phút (date chỉ lưu chính xác tới phút), cả 2 đều thoả "d <= cutoffDate"
  // nên số dư cuối của giao dịch xảy ra TRƯỚC lại vô tình cộng luôn cả giao dịch xảy ra SAU nó.
  const delta = transactions
    .filter((t) => {
      if (t.account_id !== account.id) return false;
      if (cutoffTx) return compareTxTime(t, cutoffTx) <= 0;
      const d = new Date(t.date || t.created_at);
      return d <= cutoffDate;
    })
    .reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount);
      if (t.type === 'expense' || t.type === 'allocation') return s - Number(t.amount); // tiền rời khỏi ví
      return s + Number(t.amount); // adjustment
    }, 0);
  const result = Number(account.initial_balance || 0) + delta;
  cacheForTx.set(cacheKey, result);
  return result;
}

export function fundTransactionsWithBalance(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const dailyRate = rate / 100 / 365;
  const txs = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));
  if (txs.length === 0) return [];

  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(txs[0].date || txs[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const txsByDay = {};
  // Gốc sinh lời được cộng vào theo ngày ĐỦ ĐIỀU KIỆN (quy tắc kỳ đầu), không phải
  // ngày giao dịch thực tế — xem allocationInterestEligibleDate()
  const eligibleChangesByDay = {};
  txs.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    (txsByDay[key] = txsByDay[key] || []).push(t);
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  const result = [];
  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    (txsByDay[cursor.getTime()] || []).forEach((t) => {
      balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
      result.push({ ...t, balanceAfter: balance });
    });
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    if (interestBase > 0 && dailyRate > 0) {
      const profit = interestBase * dailyRate;
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  (txsByDay[today.getTime()] || []).forEach((t) => {
    balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    result.push({ ...t, balanceAfter: balance });
  });
  return result;
}

export function fundDailyProfitHistory(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));

  if (history.length === 0 || rate <= 0) return [];

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  const days = [];
  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    let profit = 0;
    if (interestBase > 0 && dailyRate > 0) {
      profit = interestBase * dailyRate;
      balance += profit;
      interestBase += profit;
    }
    // FIX: trước đây chỉ push khi profit > 0, khiến những ngày lãi làm tròn xuống
    // còn 0đ (gốc sinh lời còn nhỏ, hoặc vừa rút bớt) bị ẩn hẳn khỏi lịch sử thay vì
    // hiển thị "0đ" — nhìn giống như bị "mất" dòng lợi nhuận của ngày đó.
    // Giờ luôn ghi nhận đủ mọi ngày trong chuỗi, kể cả ngày lãi = 0đ.
    days.push({ date: new Date(cursor), profit, balance });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.reverse();
}

export function accountBalance(acc, transactions) {
  // Số dư HIỆN TẠI của ví: chỉ tính giao dịch có ngày ≤ hết hôm nay (cut-off). Giao dịch ghi ngày
  // tương lai chưa phát sinh nên chưa tính — giống quỹ (fundBalanceWithProfit cũng bỏ qua ngày
  // tương lai) và khớp walletBalanceAsOf(hôm nay) của Báo cáo, để mọi màn hình ra cùng 1 số.
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const delta = transactions
    .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment' || t.type === 'allocation') && new Date(t.date || t.created_at) <= endOfToday)
    .reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount);
      if (t.type === 'expense' || t.type === 'allocation') return s - Number(t.amount); // tiền rời khỏi ví (chi tiêu hoặc chuyển sang quỹ)
      return s + Number(t.amount);
    }, 0);
  return Number(acc.initial_balance || 0) + delta;
}

export function fundRateStyle(cat) {
  const rate = Number(cat.interest_rate || 0);
  if (rate <= 0) return FUND_RATE_TIERS[0];
  if (rate < 5) return FUND_RATE_TIERS[1];
  if (rate < 10) return FUND_RATE_TIERS[2];
  return FUND_RATE_TIERS[3];
}

export function priorityStyle(value) {
  return PRIORITY_TERMS.find((p) => p.value === value) || { color: '#7E7F90', bg: '#F7F7F8' };
}

export function priorityRank(value) {
  const idx = PRIORITY_TERMS.findIndex((p) => p.value === value);
  return idx === -1 ? PRIORITY_TERMS.length : idx;
}

export function sortGoals(list) {
  return [...list].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    return priorityRank(a.priority_term) - priorityRank(b.priority_term);
  });
}

export function durationText(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr), end = new Date(endStr);
  if (end < start) return null;
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) { months -= 1; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} năm`);
  if (months > 0) parts.push(`${months} tháng`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);
  return parts.join(' ');
}

export const PERIOD_TAG_RE = /^\[KY:(\d{4}-\d{2})\]\s?/;
export function tagPeriodNote(periodKey, note) { return periodKey ? `[KY:${periodKey}] ${note || ''}`.trim() : (note || null); }
export function parsePeriodTag(note) { const m = (note || '').match(PERIOD_TAG_RE); return m ? m[1] : null; }
export function stripPeriodTag(note) { return (note || '').replace(PERIOD_TAG_RE, ''); }
// Tag "[Vượt hạn mức]" chỉ là cờ kỹ thuật để hiện NHÃN "Vượt hạn mức" trên dòng giao dịch — không
// nên lặp lại trong phần ghi chú hiển thị. Bỏ mọi lần xuất hiện (dữ liệu cũ có thể bị lặp 2-3 lần).
export const OVER_LIMIT_TAG_RE = /\[Vượt hạn mức\]\s*/g;
export function stripOverLimitTag(note) { return (note || '').replace(OVER_LIMIT_TAG_RE, '').trim(); }
// Ghi chú dùng để HIỂN THỊ trên dòng lịch sử: bỏ tag kỳ + tag vượt hạn mức.
export function displayTxNote(note) { return stripOverLimitTag(stripPeriodTag(note)); }
// Hậu tố hiển thị kỳ áp dụng cho hạn mức chi của danh mục (Tuần/Tháng/Năm) — dùng chung
// cho cảnh báo vượt hạn mức khi nhập giao dịch. Mặc định "Tháng" cho danh mục cũ chưa có
// limit_period (dữ liệu tạo trước khi có tính năng chọn kỳ).
export function limitPeriodSuffix(period) { return period === 'week' ? '/tuần' : period === 'year' ? '/năm' : '/tháng'; }
// Số ngày quy đổi cho mỗi kỳ hạn mức — dùng để chia hạn mức theo kỳ (Tuần/Tháng/Năm) thành
// một mức trần trung bình mỗi NGÀY, vì việc kiểm tra vượt hạn mức được làm theo tổng chi
// trong ngày hôm nay của danh mục, không phải theo từng giao dịch riêng lẻ.
export function periodDaysFor(period) { return period === 'week' ? 7 : period === 'year' ? 365 : 30; }
// Mức trần chi mỗi ngày quy đổi từ hạn mức kỳ của danh mục (null nếu danh mục chưa đặt hạn mức).
export function dailyLimitFor(cat) { return cat?.monthly_limit ? Number(cat.monthly_limit) / periodDaysFor(cat.limit_period) : null; }
// Ngày hôm nay theo giờ địa phương, định dạng 'YYYY-MM-DD' — khớp định dạng field `date` của giao dịch.
// Ngày (YYYY-MM-DD) theo GIỜ ĐỊA PHƯƠNG. KHÔNG dùng d.toISOString().slice(0,10) trực tiếp: nó trả
// ngày theo UTC nên ở VN (UTC+7) từ 00:00–07:00 sáng sẽ ra NGÀY HÔM TRƯỚC → giao dịch/bộ lọc
// bị lệch sang kỳ/ngày sai.
export function localDateStr(d = new Date()) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
export function todayDateStr() { return localDateStr(new Date()); }
// Tổng đã chi trong ngày hôm nay của 1 danh mục (chỉ tính giao dịch loại 'expense', không tính quỹ).
export function todaySpentInCategory(transactions, categoryId) {
  const today = todayDateStr();
  return (transactions || [])
    .filter((t) => t.type === 'expense' && t.category_id === categoryId && (t.date || (t.created_at || '').slice(0, 10)) === today)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function buildPeriods(year) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let startM = m - 1;
    if (startM === 0) startM = 12;
    return {
      key: `${year}-${String(m).padStart(2, '0')}`,
      label: `Tháng ${m} (21/${startM} - 20/${m})`,
    };
  });
}
export function dateToPeriodKey(d) {
  const date = new Date(d);
  let m = date.getMonth() + 1, y = date.getFullYear();
  if (date.getDate() > 20) { m += 1; if (m > 12) { m = 1; y += 1; } }
  return `${y}-${String(m).padStart(2, '0')}`;
}
export function currentPeriodKey(today = new Date()) {
  return dateToPeriodKey(today);
}
export function transactionPeriodKey(t) {
  return parsePeriodTag(t.note) || dateToPeriodKey(t.date || t.created_at);
}

// ==== TỰ ĐỘNG TÍNH & NẠP "TÍCH LŨY TRƯỚC CHI" =====================================
// Quy tắc nghiệp vụ (theo xác nhận của người dùng):
//   Tích lũy trước chi (của 1 kỳ) = Tổng "Lương cơ bản" thực nhận trong kỳ
//                                   + "Tiền cơm" CỐ ĐỊNH mỗi kỳ (không lấy từ giao dịch thật,
//                                     vì tiền cơm thường được trả gộp vài tháng 1 lần)
//                                   − "Thu nhập được chi" (số người dùng tự cài đặt cho kỳ đó)
// Số này được TỰ ĐỘNG nạp (allocation, nguồn = Thu nhập, account_id = null) vào quỹ
// "Tích lũy trước chi" — không cần thao tác tay. Nếu công thức ra ≤ 0 thì không nạp gì
// (và tự xoá khoản đã nạp trước đó nếu thu nhập được chi tăng lên làm số cần tích lũy về 0).
//
// ⚠️ QUAN TRỌNG: 2 tên category dưới đây phải khớp CHÍNH XÁC (kể cả hoa/thường, dấu cách)
// với tên bạn đã đặt trong Danh mục. Nếu tên thực tế khác, sửa lại 2 hằng số này.
export const MEAL_ALLOWANCE_FIXED_PER_PERIOD = 600000; // "Tiền cơm" cố định mỗi kỳ
export const BASE_SALARY_CATEGORY_NAME = 'Lương cơ bản';
export const ACCUMULATION_FUND_CATEGORY_NAME = 'Tích lũy trước chi';
// Tính số tiền ĐÚNG (theo công thức) cần có trong quỹ "Tích lũy trước chi" của 1 kỳ.
// Trả về null nếu chưa đủ điều kiện để tính (chưa có category "Lương cơ bản", hoặc kỳ đó
// chưa cài đặt "Thu nhập được chi") — null nghĩa là "chưa biết", KHÔNG phải là 0.
export function computeAccumulationBeforeSpendTarget(periodKey, transactions, categories, spendingPoolByPeriod) {
  const baseSalaryCat = (categories || []).find((c) => c.name === BASE_SALARY_CATEGORY_NAME);
  if (!baseSalaryCat) return null;
  const spendingPool = spendingPoolByPeriod ? spendingPoolByPeriod[periodKey] : undefined;
  if (spendingPool == null || spendingPool === '') return null;
  const baseSalaryTotal = (transactions || [])
    .filter((t) => !t.deleted_at && t.type === 'income' && t.category_id === baseSalaryCat.id && transactionPeriodKey(t) === periodKey)
    .reduce((s, t) => s + Number(t.amount), 0);
  return Math.max(baseSalaryTotal + MEAL_ALLOWANCE_FIXED_PER_PERIOD - Number(spendingPool), 0);
}

export function periodPool(transactions, periodKey) {
  const total = transactions.filter((t) => t.type === 'income' && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  const used = transactions.filter((t) => (t.type === 'allocation' || t.type === 'expense') && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  return { total, used, remaining: total - used };
}
export function periodKeyToRange(periodKey) {
  const [y, m] = periodKey.split('-').map(Number);
  let startM = m - 1, startY = y;
  if (startM === 0) { startM = 12; startY = y - 1; }
  const start = new Date(startY, startM - 1, 21, 0, 0, 0);
  const end = new Date(y, m - 1, 20, 23, 59, 59);
  return { start, end };
}

// ===== CHỐT SỔ SỐ DƯ TÀI SẢN TẠI 1 MỐC (cut-off) — dùng chung cho Báo cáo và Trang chủ =====
// - Mốc đã qua hẳn (trước hôm nay): số dư chốt CUỐI NGÀY của mốc đó (ví: mọi giao dịch có ngày ≤ mốc;
//   quỹ: gốc + lãi tới hết ngày đó).
// - Mốc là hôm nay/tương lai: chỉ ghi nhận những gì đã xảy ra tới hiện tại, KHÔNG cộng lãi dự kiến
//   cho ngày chưa tới. Ví: mọi giao dịch có ngày ≤ hôm nay. Quỹ: fundBalanceWithProfit (lãi tới hết
//   hôm qua + giao dịch hôm nay) — đúng số dư quỹ đang hiển thị ở các màn khác.
export function assetCutoffIsNotPast(cutoff) {
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  return new Date(cutoff) >= startOfToday;
}
export function walletBalanceAsOf(account, transactions, cutoff) {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  return accountBalanceAtDate(account, transactions, assetCutoffIsNotPast(cutoff) ? endOfToday : cutoff);
}
export function fundBalanceAsOf(category, transactions, cutoff) {
  return assetCutoffIsNotPast(cutoff) ? fundBalanceWithProfit(category, transactions) : fundBalanceAtDate(category, transactions, cutoff);
}
// Mốc bắt đầu của 1 khoảng nằm hoàn toàn trong tương lai -> chưa có số liệu để chốt.
export function isRangeInFuture(rangeStart) {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  return new Date(rangeStart) > endOfToday;
}

// Danh sách năm cố định cho các dropdown lọc "Năm" trong Dashboard: 2025 -> 2035.
export const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2025 + i);
export const PERIOD_WEEK_DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Số ngày lịch từ start đến end, TÍNH CẢ 2 ĐẦU (vd 24/09 → 30/09 = 7 ngày).
// FIX: trước đây dùng Math.round((end - start) / 86400000) + 1 với end = 23:59:59 → phần lẻ gần
// 1 ngày bị làm tròn LÊN thành đủ ngày rồi lại +1 nữa => thừa 1 ngày: biểu đồ Tuần có 8 cột
// (thừa cột ngày mai) và cột cuối của biểu đồ Tháng ghi "15-21" thay vì "15-20".
// Giờ so mốc 00:00 của 2 đầu nên kết quả luôn chính xác.
export function inclusiveDays(start, end) {
  const a = new Date(start); a.setHours(0, 0, 0, 0);
  const b = new Date(end); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000) + 1;
}

// Sinh danh sách bucket thời gian dùng chung cho các chart lọc theo Tuần/Tháng/Năm.
// - week: khoảng ngày tuỳ chọn (weekStart -> weekEnd), mỗi bucket là 1 ngày.
// - year: 12 kỳ tài chính (21 → 20) của năm được chọn.
// - month: chia kỳ tài chính (21 -> 20) hiện tại thành 5 khoảng.
export function computePeriodBuckets({ period, year, periodKey, weekStart, weekEnd }) {
  if (period === 'week') {
    const start = new Date(weekStart || new Date()); start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd || weekStart || new Date()); end.setHours(23, 59, 59, 999);
    if (end < start) {
      const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
      return [{ label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`, start, end: dayEnd }];
    }
    const totalDays = Math.min(62, inclusiveDays(start, end));
    return Array.from({ length: totalDays }, (_, i) => {
      const dayStart = new Date(start); dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
      return { label: `${String(dayStart.getDate()).padStart(2, '0')}/${String(dayStart.getMonth() + 1).padStart(2, '0')}`, start: dayStart, end: dayEnd };
    });
  }
  if (period === 'year') {
    // Mỗi cột = 1 KỲ tài chính (21 tháng trước → 20 tháng này), không phải tháng dương lịch.
    return Array.from({ length: 12 }, (_, i) => {
      const { start, end } = periodKeyToRange(`${year}-${String(i + 1).padStart(2, '0')}`);
      return { label: `Th${i + 1}`, start, end };
    });
  }
  const { start: periodStart, end: periodEnd } = periodKeyToRange(periodKey);
  const totalDays = inclusiveDays(periodStart, periodEnd);
  const chunks = 5;
  const base = Math.floor(totalDays / chunks) || 1;
  const cursor = new Date(periodStart);
  const buckets = [];
  for (let i = 0; i < chunks; i++) {
    const daysInChunk = i === chunks - 1 ? totalDays - base * (chunks - 1) : base;
    const start = new Date(cursor);
    const end = new Date(cursor); end.setDate(end.getDate() + daysInChunk - 1); end.setHours(23, 59, 59, 999);
    buckets.push({ label: `${start.getDate()}-${end.getDate()}`, start, end });
    cursor.setDate(cursor.getDate() + daysInChunk);
  }
  return buckets;
}
export function periodBucketMatch(t, b, bi, buckets, period, year) {
  if (period === 'year') {
    const [py, pm] = transactionPeriodKey(t).split('-').map(Number);
    return py === year && pm === bi + 1;
  }
  const d = new Date(t.date || t.created_at);
  if (period === 'week') return d >= b.start && d <= b.end;
  // month (kỳ 21->20): giao dịch ngoài khoảng hiển thị dồn vào bucket đầu/cuối
  if (d < buckets[0].start) return bi === 0;
  if (d > buckets[buckets.length - 1].end) return bi === buckets.length - 1;
  return d >= b.start && d <= b.end;
}
// Chuỗi số liệu theo từng danh mục, cho 1 card lọc thời gian độc lập.
export function buildCategorySeriesFor(transactions, cats, txTypes, buckets, period, periodKey, year) {
  const typesArr = Array.isArray(txTypes) ? txTypes : [txTypes];
  const isPeriodMode = period === 'month';
  return cats
    .map((c) => {
      let catTx = transactions.filter((t) => t.category_id === c.id && typesArr.includes(t.type) && !(t.type === 'allocation' && isInitialAllocationTx(t)));
      if (isPeriodMode) catTx = catTx.filter((t) => transactionPeriodKey(t) === periodKey);
      const values = buckets.map((b, bi) => catTx.filter((t) => periodBucketMatch(t, b, bi, buckets, period, year)).reduce((s, t) => s + Number(t.amount), 0));
      return { ...c, values, total: values.reduce((s, v) => s + v, 0) };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}
// Tổng theo bucket (không chia theo danh mục) — dùng cho đường xu hướng thu nhập.
export function bucketTotalsFor(transactions, txType, buckets, period, periodKey, year) {
  const isPeriodMode = period === 'month';
  let txs = transactions.filter((t) => t.type === txType);
  if (isPeriodMode) txs = txs.filter((t) => transactionPeriodKey(t) === periodKey);
  return buckets.map((b, bi) => txs.filter((t) => periodBucketMatch(t, b, bi, buckets, period, year)).reduce((s, t) => s + Number(t.amount), 0));
}
// Giao dịch thô đang được lọc bởi 1 bộ lọc thời gian độc lập (dùng cho modal "Xem chi tiết").
export function filteredTxsForCard(transactions, filter, buckets, txType) {
  let txs = transactions.filter((t) => t.type === txType);
  if (filter.period === 'month') {
    txs = txs.filter((t) => transactionPeriodKey(t) === filter.periodKey);
  } else if (filter.period === 'year') {
    txs = txs.filter((t) => Number(transactionPeriodKey(t).split('-')[0]) === filter.year);
  } else {
    const rangeStart = buckets[0].start, rangeEnd = buckets[buckets.length - 1].end;
    txs = txs.filter((t) => { const d = new Date(t.date || t.created_at); return d >= rangeStart && d <= rangeEnd; });
  }
  return txs;
}
export function labelForCardFilter(filter) {
  if (filter.period === 'month') return `Tháng ${Number(filter.periodKey.split('-')[1])} (${buildPeriods(filter.year).find((p) => p.key === filter.periodKey)?.label.match(/\(([^)]+)\)/)?.[1] || ''})`;
  if (filter.period === 'year') return `Năm ${filter.year}`;
  const dmy = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  return `${dmy(filter.weekStart)} - ${dmy(filter.weekEnd)}`;
}

// Gộp nhiều "kỳ tài chính" (21 → 20) liên tiếp thành 1 khoảng — dùng cho filter
// Quý / 6 tháng / Năm của Report để KHÔNG phá vỡ financial period (không dùng
// tháng lịch đơn giản 1 → cuối tháng).
export function financialMonthRange(year, month) {
  return periodKeyToRange(`${year}-${String(month).padStart(2, '0')}`);
}
export function financialMultiMonthRange(year, months) {
  const first = financialMonthRange(year, months[0]);
  const last = financialMonthRange(year, months[months.length - 1]);
  return { start: first.start, end: last.end };
}

// ========== TIME RANGE HELPERS ==========
export function getPeriodStartEnd(type, value, year) {
  // value: for month: month number (1-12), for quarter: 1-4, for half: 1 or 2, for year: year, for day: date string, for week: week number? We'll handle week separately.
  // For simplicity, we'll use a date range object.
  let start, end;
  const now = new Date();
  const currentYear = now.getFullYear();
  if (type === 'day') {
    const d = new Date(value);
    start = new Date(d); start.setHours(0,0,0,0);
    end = new Date(d); end.setHours(23,59,59,999);
  } else if (type === 'week') {
    // value is a date representing the week start? We'll use a week picker; for now assume value is a date string of the Monday of that week.
    const d = new Date(value);
    start = new Date(d); start.setHours(0,0,0,0);
    end = new Date(d); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
  } else if (type === 'month') {
    const m = value; // 1-12
    const y = year || currentYear;
    start = new Date(y, m-1, 1, 0,0,0);
    end = new Date(y, m, 0, 23,59,59);
  } else if (type === 'quarter') {
    const q = value; // 1-4
    const y = year || currentYear;
    const startMonth = (q-1)*3;
    start = new Date(y, startMonth, 1, 0,0,0);
    end = new Date(y, startMonth+3, 0, 23,59,59);
  } else if (type === '6month') {
    const h = value; // 1 or 2
    const y = year || currentYear;
    const startMonth = (h-1)*6;
    start = new Date(y, startMonth, 1, 0,0,0);
    end = new Date(y, startMonth+6, 0, 23,59,59);
  } else if (type === 'year') {
    const y = value || currentYear;
    start = new Date(y, 0, 1, 0,0,0);
    end = new Date(y, 11, 31, 23,59,59);
  } else if (type === 'custom') {
    start = new Date(value.start); start.setHours(0,0,0,0);
    end = new Date(value.end); end.setHours(23,59,59,999);
  } else {
    // default to current month
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);
  }
  return { start, end };
}

export function getPreviousPeriod(type, value, year) {
  // returns { start, end } for previous period of same length
  if (type === 'day') {
    const d = new Date(value);
    d.setDate(d.getDate() - 1);
    return getPeriodStartEnd('day', d.toISOString().slice(0,10));
  } else if (type === 'week') {
    const d = new Date(value);
    d.setDate(d.getDate() - 7);
    return getPeriodStartEnd('week', d.toISOString().slice(0,10));
  } else if (type === 'month') {
    let m = value - 1;
    let y = year;
    if (m === 0) { m = 12; y--; }
    return getPeriodStartEnd('month', m, y);
  } else if (type === 'quarter') {
    let q = value - 1;
    let y = year;
    if (q === 0) { q = 4; y--; }
    return getPeriodStartEnd('quarter', q, y);
  } else if (type === '6month') {
    let h = value - 1;
    let y = year;
    if (h === 0) { h = 2; y--; }
    return getPeriodStartEnd('6month', h, y);
  } else if (type === 'year') {
    const y = (value || new Date().getFullYear()) - 1;
    return getPeriodStartEnd('year', y);
  } else if (type === 'custom') {
    // previous same duration: shift both start and end by same duration
    const dur = new Date(value.end) - new Date(value.start);
    const prevStart = new Date(value.start); prevStart.setTime(prevStart.getTime() - dur - 1000); // roughly same length
    const prevEnd = new Date(value.end); prevEnd.setTime(prevEnd.getTime() - dur - 1000);
    return { start: prevStart, end: prevEnd };
  }
  return null;
}

// Filter transactions within date range (using date field)
export function filterTransactionsByDate(transactions, start, end) {
  return transactions.filter(t => {
    const d = new Date(t.date || t.created_at);
    return d >= start && d <= end;
  });
}

// Aggregate period data. "Quỹ" và "danh mục chi tiêu thường" được phân biệt qua
// category.is_fund (không suy luận qua account_id) để không lẫn số liệu khi
// khoản chi từ quỹ và khoản chi từ nguồn tiền "Thu nhập" đều có account_id = null.
export function aggregatePeriodData(txs, categories) {
  const fundIds = new Set((categories || []).filter((c) => c.is_fund).map((c) => c.id));
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const allocation = txs.filter(t => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const normalExpenses = txs.filter(t => t.type === 'expense' && !fundIds.has(t.category_id));
  const fundExpenses = txs.filter(t => t.type === 'expense' && fundIds.has(t.category_id));
  const expenseFromIncome = normalExpenses.filter(t => t.account_id === null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromWallet = normalExpenses.filter(t => t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromFund = fundExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalActualExpense = expenseFromIncome + expenseFromWallet + expenseFromFund;
  const remaining = income - allocation - expenseFromIncome;
  return { income, allocation, expenseFromIncome, expenseFromWallet, expenseFromFund, totalActualExpense, remaining };
}

// ==== [PHASE 1 — logic tài chính mới theo yêu cầu nghiệp vụ Excel] ====================
// calculatePeriodFinancials: hàm aggregation DUY NHẤT cho 1 "kỳ thu nhập" (21 → 20).
// KHÔNG dùng remaining = income - allocation - expense nữa.
// Dashboard/Report nên chuyển sang gọi hàm này thay cho aggregatePeriodData/periodPool
// (việc thay thế các nơi gọi cũ sẽ làm ở các bước tiếp theo, chưa động vào ở bước này
// để không phá vỡ những màn hình chưa sẵn sàng dùng logic mới).
//
// spendingPoolOverride: số tiền "được phép chi" do người dùng tự cài đặt cho kỳ này
// (lưu ở bảng period_spending_pool). Nếu chưa cài đặt (null/undefined) thì mặc định
// spendingPool = incomeForSpendingPool (giống Ví dụ 1 trong yêu cầu: tích lũy trước chi = 0).
export function calculatePeriodFinancials(periodKey, transactions, categories, spendingPoolOverride) {
  const periodTxs = (transactions || []).filter((t) => transactionPeriodKey(t) === periodKey);
  return { periodKey, ...calculateFinancialsFromTxs(periodTxs, categories, spendingPoolOverride) };
}

// Core: tính toàn bộ 10 khái niệm tài chính từ 1 danh sách transaction ĐÃ được lọc sẵn
// (theo kỳ, theo ngày, theo khoảng tuỳ chọn...). Dùng chung cho Dashboard/Report ở mọi chế độ xem.
export function calculateFinancialsFromTxs(txs, categories, spendingPoolOverride) {
  const catById = new Map((categories || []).map((c) => [c.id, c]));
  const fundIds = new Set((categories || []).filter((c) => c.is_fund).map((c) => c.id));
  const periodTxs = txs || [];

  // 1-2. Tổng thu nhập + thu nhập tính Chi pool / thu nhập đặc biệt
  const incomeTxs = periodTxs.filter((t) => t.type === 'income');
  const totalIncome = incomeTxs.reduce((s, t) => s + Number(t.amount), 0);
  const incomeForSpendingPool = incomeTxs
    .filter((t) => {
      const cat = catById.get(t.category_id);
      // Dữ liệu cũ chưa có include_in_spending_pool -> coi như true để không đổi hành vi cũ
      return cat ? cat.include_in_spending_pool !== false : true;
    })
    .reduce((s, t) => s + Number(t.amount), 0);
  const specialIncome = totalIncome - incomeForSpendingPool;

  // 5. Chi pool = số tiền người dùng cho phép chi trong kỳ (mặc định = thu nhập tính Chi pool)
  const spendingPool = spendingPoolOverride != null && spendingPoolOverride !== ''
    ? Number(spendingPoolOverride)
    : incomeForSpendingPool;

  // 6. Tích lũy trước chi
  const accumulationBeforeSpend = Math.max(incomeForSpendingPool - spendingPool, 0);

  // 8A. Nạp quỹ từ Chi pool
  // Loại trừ khoản "Nạp quỹ lần đầu" (is_initial === true): khoản này không chọn nguồn
  // tiền, không phải chi từ Thu nhập được chi của kỳ — nó chỉ dùng để tính Tổng tài sản.
  // Đồng thời chỉ tính vào Thu nhập được chi những lần nạp quỹ có nguồn = "Thu nhập"
  // (account_id === null). Nạp quỹ từ 1 ví/tài khoản khác (account_id != null) không
  // trừ vào Thu nhập được chi — tiền chỉ chuyển từ ví đó sang quỹ.
  const allocationFromSpendingPool = periodTxs
    .filter((t) => t.type === 'allocation' && !isInitialAllocationTx(t) && t.account_id === null)
    .reduce((s, t) => s + Number(t.amount), 0);

  // 8B/8C. Chi tiêu: phân biệt chi từ quỹ (isFund) vs chi thường (theo nguồn tiền)
  const expenseTxs = periodTxs.filter((t) => t.type === 'expense');
  const fundExpenseTxs = expenseTxs.filter((t) => fundIds.has(t.category_id));
  const nonFundExpenseTxs = expenseTxs.filter((t) => !fundIds.has(t.category_id));
  // Nguồn tiền = "Thu nhập" được lưu với account_id === null
  const expenseFromSpendingPool = nonFundExpenseTxs.filter((t) => t.account_id === null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromWallet = nonFundExpenseTxs.filter((t) => t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromFund = fundExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

  const totalSpentFromSpendingPool = allocationFromSpendingPool + expenseFromSpendingPool;
  const remainingAfterSpend = spendingPool - totalSpentFromSpendingPool;
  const totalActualExpense = expenseFromSpendingPool + expenseFromFund;
  const isOverSpendingPool = totalSpentFromSpendingPool > spendingPool;

  return {
    totalIncome,
    incomeForSpendingPool,
    specialIncome,
    spendingPool,
    accumulationBeforeSpend,
    allocationFromSpendingPool,
    expenseFromSpendingPool,
    expenseFromWallet, // giữ lại để hiển thị breakdown, KHÔNG nằm trong totalActualExpense theo spec
    expenseFromFund,
    totalSpentFromSpendingPool,
    remainingAfterSpend,
    totalActualExpense,
    isOverSpendingPool,
  };
}

// Gộp calculatePeriodFinancials của nhiều kỳ liên tiếp (dùng cho Quý / 6 tháng / Năm)
// — cộng dồn theo từng kỳ, KHÔNG gộp transactions rồi tính 1 lần, vì spendingPool
// là khái niệm theo TỪNG kỳ (mỗi kỳ có thể có Chi pool khác nhau).
export function calculateFinancialsForPeriods(periodKeys, transactions, categories, spendingPoolByPeriod) {
  const results = (periodKeys || []).map((pk) => calculatePeriodFinancials(pk, transactions, categories, spendingPoolByPeriod?.[pk]));
  const sum = (field) => results.reduce((s, r) => s + r[field], 0);
  return {
    periodKeys,
    totalIncome: sum('totalIncome'),
    incomeForSpendingPool: sum('incomeForSpendingPool'),
    specialIncome: sum('specialIncome'),
    spendingPool: sum('spendingPool'),
    accumulationBeforeSpend: sum('accumulationBeforeSpend'),
    allocationFromSpendingPool: sum('allocationFromSpendingPool'),
    expenseFromSpendingPool: sum('expenseFromSpendingPool'),
    expenseFromWallet: sum('expenseFromWallet'),
    expenseFromFund: sum('expenseFromFund'),
    totalSpentFromSpendingPool: sum('totalSpentFromSpendingPool'),
    remainingAfterSpend: sum('remainingAfterSpend'),
    totalActualExpense: sum('totalActualExpense'),
    byPeriod: results,
  };
}

// Sinh danh sách periodKey (kỳ 21->20) liên tiếp cho 1 khoảng Quý/6 tháng/Năm — dùng để
// gọi calculateFinancialsForPeriods thay vì gộp transaction theo ngày (phá vỡ khái niệm Chi pool theo kỳ).
export function periodKeysForMonths(year, months) {
  return months.map((m) => `${year}-${String(m).padStart(2, '0')}`);
}
