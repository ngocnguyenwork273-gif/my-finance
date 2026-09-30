import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // ngày / kỳ
  localDateStr, dateToPeriodKey, currentPeriodKey, transactionPeriodKey, periodKeyToRange, buildPeriods,
  tagPeriodNote, parsePeriodTag, stripPeriodTag, stripOverLimitTag, displayTxNote,
  limitPeriodSuffix, periodDaysFor, dailyLimitFor, todaySpentInCategory,
  // quỹ
  firstProfitCreditDate, allocationInterestEligibleDate, isInitialAllocationTx, findInitialAllocation,
  compareTxTime, fundBalance, fundBalanceWithProfit, fundBalanceAtDate, fundTransactionsWithBalance,
  fundDailyProfitHistory, fundBalanceAsOf,
  // ví
  accountBalance, accountBalanceAtDate, walletBalanceAsOf,
  // báo cáo
  aggregatePeriodData, periodPool, calculateFinancialsFromTxs, calculatePeriodFinancials,
  calculateFinancialsForPeriods, computeAccumulationBeforeSpendTarget, periodKeysForMonths,
  computePeriodBuckets, periodBucketMatch, buildCategorySeriesFor, bucketTotalsFor,
  getPeriodStartEnd, getPreviousPeriod, inclusiveDays,
  // tiện ích hiển thị
  fundRateStyle, priorityRank, sortGoals, durationText,
} from './finance';

/* ------------------------------------------------------------------------------
   Quy ước test
   - "Hôm nay" cố định = Thứ Tư 30/09/2026 12:00 (giờ VN) bằng fake timers.
   - Múi giờ cố định Asia/Ho_Chi_Minh (xem vitest.global-setup.js).
   - Mốc lịch tham chiếu (2026): T2 21/09 · T3 22/09 · T4 23/09 · T5 24/09 · T6 25/09
     · T7 26/09 · CN 27/09 · T2 28/09 · T3 29/09 · T4 30/09 (hôm nay) · T5 01/10.
   - Lãi suất 36.5%/năm => lãi mỗi ngày đúng 0,1% (36.5 / 100 / 365 = 0.001) cho dễ tính nhẩm.
   ------------------------------------------------------------------------------ */
const NOW = new Date(2026, 8, 30, 12, 0, 0);
const d = (y, m, day, h = 0, mi = 0, s = 0) => new Date(y, m - 1, day, h, mi, s);

let seqId = 0;
// Tạo giao dịch: date = 'YYYY-MM-DD' (giống app lưu), created_at = ISO có giờ phút.
function tx(over) {
  const date = over.date || '2026-09-01';
  const time = over.time || '09:00:00';
  return {
    id: `t${++seqId}`,
    category_id: 'f1',
    account_id: null,
    type: 'allocation',
    amount: 0,
    note: null,
    date,
    created_at: new Date(`${date}T${time}`).toISOString(),
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('môi trường test', () => {
  it('chạy đúng múi giờ Việt Nam (UTC+7)', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(-420);
  });
});

/* ============================== NGÀY & KỲ TÀI CHÍNH (21 → 20) ============================== */
describe('localDateStr', () => {
  it('sau nửa đêm giờ VN vẫn ra đúng ngày hôm nay (không lùi về hôm qua như toISOString)', () => {
    expect(localDateStr(d(2026, 9, 30, 0, 30))).toBe('2026-09-30');
    expect(localDateStr(d(2026, 9, 30, 23, 59))).toBe('2026-09-30');
  });
});

describe('dateToPeriodKey (kỳ 21 → 20)', () => {
  it('ngày 20 vẫn thuộc kỳ của tháng đó, ngày 21 sang kỳ tháng sau', () => {
    expect(dateToPeriodKey(d(2026, 9, 20))).toBe('2026-09');
    expect(dateToPeriodKey(d(2026, 9, 21))).toBe('2026-10');
  });
  it('qua năm: 21/12 thuộc kỳ tháng 1 năm sau', () => {
    expect(dateToPeriodKey(d(2026, 12, 21))).toBe('2027-01');
    expect(dateToPeriodKey(d(2026, 1, 1))).toBe('2026-01');
  });
  it('nhận chuỗi YYYY-MM-DD như field date trong DB', () => {
    expect(dateToPeriodKey('2026-09-20')).toBe('2026-09');
    expect(dateToPeriodKey('2026-09-21')).toBe('2026-10');
  });
  it('currentPeriodKey dùng "hôm nay" (30/09 -> kỳ tháng 10)', () => {
    expect(currentPeriodKey()).toBe('2026-10');
  });
});

describe('periodKeyToRange', () => {
  it('kỳ 2026-10 chạy từ 21/09 00:00:00 đến 20/10 23:59:59', () => {
    const { start, end } = periodKeyToRange('2026-10');
    expect(start).toEqual(d(2026, 9, 21, 0, 0, 0));
    expect(end).toEqual(d(2026, 10, 20, 23, 59, 59));
  });
  it('kỳ tháng 1 bắt đầu từ 21/12 năm trước', () => {
    expect(periodKeyToRange('2026-01').start).toEqual(d(2025, 12, 21));
  });
});

describe('buildPeriods', () => {
  it('sinh đủ 12 kỳ với nhãn đúng', () => {
    const p = buildPeriods(2026);
    expect(p).toHaveLength(12);
    expect(p[0]).toEqual({ key: '2026-01', label: 'Tháng 1 (21/12 - 20/1)' });
    expect(p[11].key).toBe('2026-12');
  });
});

describe('thẻ ghi chú & kỳ của giao dịch', () => {
  it('tagPeriodNote / parsePeriodTag / stripPeriodTag khớp nhau', () => {
    const noted = tagPeriodNote('2026-03', 'Lương');
    expect(noted).toBe('[KY:2026-03] Lương');
    expect(parsePeriodTag(noted)).toBe('2026-03');
    expect(stripPeriodTag(noted)).toBe('Lương');
  });
  it('không có kỳ thì giữ nguyên ghi chú; ghi chú rỗng -> null', () => {
    expect(tagPeriodNote(null, 'abc')).toBe('abc');
    expect(tagPeriodNote(null, '')).toBeNull();
  });
  it('stripOverLimitTag bỏ mọi lần lặp; displayTxNote bỏ cả 2 loại thẻ', () => {
    expect(stripOverLimitTag('[Vượt hạn mức] [Vượt hạn mức] Cà phê')).toBe('Cà phê');
    expect(displayTxNote('[KY:2026-03] [Vượt hạn mức] Cà phê')).toBe('Cà phê');
  });
  it('transactionPeriodKey: thẻ [KY:] thắng ngày giao dịch', () => {
    expect(transactionPeriodKey({ note: '[KY:2026-03] x', date: '2026-09-25' })).toBe('2026-03');
    expect(transactionPeriodKey({ note: 'x', date: '2026-09-25' })).toBe('2026-10');
  });
});

describe('hạn mức chi theo ngày', () => {
  it('quy đổi hạn mức kỳ thành mức trần mỗi ngày', () => {
    expect(periodDaysFor('week')).toBe(7);
    expect(periodDaysFor('year')).toBe(365);
    expect(periodDaysFor(undefined)).toBe(30); // danh mục cũ chưa có limit_period -> tháng
    expect(dailyLimitFor({ monthly_limit: 3_000_000 })).toBe(100_000);
    expect(dailyLimitFor({ monthly_limit: 700_000, limit_period: 'week' })).toBe(100_000);
    expect(dailyLimitFor({ monthly_limit: 0 })).toBeNull();
    expect(dailyLimitFor(null)).toBeNull();
  });
  it('hậu tố hiển thị', () => {
    expect(limitPeriodSuffix('week')).toBe('/tuần');
    expect(limitPeriodSuffix('year')).toBe('/năm');
    expect(limitPeriodSuffix(undefined)).toBe('/tháng');
  });
  it('todaySpentInCategory chỉ cộng chi tiêu của đúng danh mục trong hôm nay', () => {
    const txs = [
      tx({ type: 'expense', category_id: 'a', amount: 30_000, date: '2026-09-30' }),
      tx({ type: 'expense', category_id: 'a', amount: 20_000, date: '2026-09-30' }),
      tx({ type: 'expense', category_id: 'a', amount: 99_000, date: '2026-09-29' }), // hôm qua
      tx({ type: 'expense', category_id: 'b', amount: 77_000, date: '2026-09-30' }), // danh mục khác
      tx({ type: 'income', category_id: 'a', amount: 55_000, date: '2026-09-30' }), // không phải chi
    ];
    expect(todaySpentInCategory(txs, 'a')).toBe(50_000);
  });
});

/* ============================== QUY TẮC KỲ LÃI ĐẦU CỦA QUỸ ============================== */
describe('firstProfitCreditDate / allocationInterestEligibleDate', () => {
  const ymd = (x) => localDateStr(x);
  it('nạp T2–T5: nhận lãi đầu sau 3 ngày (T2 -> T5)', () => {
    expect(ymd(firstProfitCreditDate('2026-09-28'))).toBe('2026-10-01'); // T2 -> T5
    expect(ymd(firstProfitCreditDate('2026-09-30'))).toBe('2026-10-03'); // T4 -> T7
    expect(ymd(firstProfitCreditDate('2026-10-01'))).toBe('2026-10-04'); // T5 -> CN
  });
  it('nạp T6/T7/CN: dời tới Thứ 3 tuần kế tiếp', () => {
    expect(ymd(firstProfitCreditDate('2026-10-02'))).toBe('2026-10-06'); // T6
    expect(ymd(firstProfitCreditDate('2026-10-03'))).toBe('2026-10-06'); // T7
    expect(ymd(firstProfitCreditDate('2026-10-04'))).toBe('2026-10-06'); // CN
  });
  it('gốc bắt đầu sinh lời = ngày nhận lãi đầu − 1 ngày', () => {
    expect(ymd(allocationInterestEligibleDate('2026-09-28'))).toBe('2026-09-30'); // T2 -> T4
    expect(ymd(allocationInterestEligibleDate('2026-10-02'))).toBe('2026-10-05'); // T6 -> T2
  });
});

describe('nhận diện khoản nạp ban đầu', () => {
  it('cờ is_initial, hoặc dữ liệu cũ có ghi chú đúng "Nạp quỹ lần đầu"', () => {
    expect(isInitialAllocationTx({ is_initial: true })).toBe(true);
    expect(isInitialAllocationTx({ note: 'Nạp quỹ lần đầu' })).toBe(true);
    expect(isInitialAllocationTx({ note: '[KY:2026-03] Nạp quỹ lần đầu' })).toBe(true);
    expect(isInitialAllocationTx({ note: 'Nạp thêm' })).toBe(false);
    expect(isInitialAllocationTx({})).toBe(false);
  });
  it('findInitialAllocation ưu tiên cờ, không đoán theo "giao dịch sớm nhất"', () => {
    const early = tx({ id: 'e', date: '2026-01-01', amount: 1 });
    const flagged = tx({ id: 'f', date: '2026-05-01', amount: 2, is_initial: true });
    expect(findInitialAllocation([early, flagged], 'f1').id).toBe('f');
    expect(findInitialAllocation([early], 'f1')).toBeNull();
  });
});

describe('compareTxTime (thứ tự giao dịch)', () => {
  it('khác ngày: theo ngày', () => {
    expect(compareTxTime(tx({ date: '2026-09-01' }), tx({ date: '2026-09-02' }))).toBeLessThan(0);
  });
  it('cùng ngày: phá hòa bằng created_at', () => {
    const a = tx({ date: '2026-09-01', time: '09:00:00' });
    const b = tx({ date: '2026-09-01', time: '09:00:30' });
    expect(compareTxTime(a, b)).toBeLessThan(0);
    expect(compareTxTime(b, a)).toBeGreaterThan(0);
  });
  it('trùng cả created_at: dùng seq', () => {
    const a = tx({ date: '2026-09-01', seq: 1 });
    const b = { ...a, id: 'other', seq: 2 };
    expect(compareTxTime(a, b)).toBeLessThan(0);
  });
});

/* ============================== SỐ DƯ QUỸ ============================== */
describe('fundBalance (không lãi)', () => {
  it('nạp cộng, chi trừ, bỏ qua danh mục khác', () => {
    const txs = [
      tx({ amount: 1_000_000 }),
      tx({ type: 'expense', amount: 250_000 }),
      tx({ category_id: 'other', amount: 9_999_999 }),
    ];
    expect(fundBalance('f1', txs)).toBe(750_000);
  });
});

describe('fundBalanceWithProfit', () => {
  const cat = { id: 'f1', interest_rate: 36.5 }; // 0,1%/ngày
  const flat = { id: 'f1', interest_rate: 0 };

  it('quỹ không lãi: bằng fundBalance, bỏ qua giao dịch ghi ngày tương lai', () => {
    const txs = [
      tx({ amount: 1_000_000, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 200_000, date: '2026-09-10' }),
      tx({ amount: 5_000_000, date: '2026-10-15' }), // tương lai
    ];
    expect(fundBalanceWithProfit(flat, txs)).toBe(800_000);
  });

  it('không có giao dịch -> 0', () => {
    expect(fundBalanceWithProfit(cat, [])).toBe(0);
  });

  it('nạp T2 21/09: lãi kép 0,1%/ngày từ T4 23/09 đến hôm qua (7 ngày)', () => {
    const txs = [tx({ amount: 1_000_000, date: '2026-09-21' })];
    expect(fundBalanceWithProfit(cat, txs)).toBeCloseTo(1_000_000 * 1.001 ** 7, 3);
  });

  it('nạp T6 25/09: gốc chỉ sinh lời từ T2 28/09 (2 ngày lãi)', () => {
    const txs = [tx({ amount: 1_000_000, date: '2026-09-25' })];
    expect(fundBalanceWithProfit(cat, txs)).toBeCloseTo(1_000_000 * 1.001 ** 2, 3);
  });

  it('nạp hôm nay / hôm qua: chưa có lãi, nhưng tiền vẫn cộng vào số dư ngay', () => {
    expect(fundBalanceWithProfit(cat, [tx({ amount: 1_000_000, date: '2026-09-30' })])).toBe(1_000_000);
    expect(fundBalanceWithProfit(cat, [tx({ amount: 1_000_000, date: '2026-09-29' })])).toBe(1_000_000);
  });

  it('rút tiền giữa chừng làm giảm gốc sinh lời ngay lập tức', () => {
    const txs = [
      tx({ amount: 1_000_000, date: '2026-09-21' }),
      tx({ type: 'expense', amount: 500_000, date: '2026-09-26' }),
    ];
    // Lãi 23,24,25/09 trên gốc 1tr (3 ngày) -> rút 500k ngày 26 -> lãi 26,27,28,29/09 (4 ngày) trên phần còn lại
    const expected = (1_000_000 * 1.001 ** 3 - 500_000) * 1.001 ** 4;
    expect(fundBalanceWithProfit(cat, txs)).toBeCloseTo(expected, 3);
  });

  it('cache theo mảng giao dịch, nhưng qua ngày mới thì tính lại (không dùng số cũ)', () => {
    const txs = [tx({ amount: 1_000_000, date: '2026-09-21' })];
    expect(fundBalanceWithProfit(cat, txs)).toBeCloseTo(1_000_000 * 1.001 ** 7, 3);
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0)); // sang 01/10
    expect(fundBalanceWithProfit(cat, txs)).toBeCloseTo(1_000_000 * 1.001 ** 8, 3);
  });

  it('cache theo tham chiếu mảng: mảng mới (sau reload) tính lại từ đầu', () => {
    const a = [tx({ amount: 1_000_000, date: '2026-09-01' })];
    const b = [...a, tx({ amount: 500_000, date: '2026-09-02' })];
    expect(fundBalanceWithProfit(flat, a)).toBe(1_000_000);
    expect(fundBalanceWithProfit(flat, b)).toBe(1_500_000);
  });
});

describe('fundBalanceAtDate', () => {
  const flat = { id: 'f1', interest_rate: 0 };

  it('2 giao dịch cùng ngày: số dư cuối của giao dịch trước không bị cộng dồn giao dịch sau', () => {
    const t1 = tx({ id: 'a', date: '2026-09-10', time: '10:00:00', amount: 1_000_000 });
    const t2 = tx({ id: 'b', date: '2026-09-10', time: '11:00:00', type: 'expense', amount: 300_000 });
    const txs = [t1, t2];
    const cutoff = d(2026, 9, 10);
    // gọi "cuối ngày" TRƯỚC để kiểm tra cache key không đè nhau
    expect(fundBalanceAtDate(flat, txs, cutoff)).toBe(700_000);
    expect(fundBalanceAtDate(flat, txs, cutoff, t1)).toBe(1_000_000);
    expect(fundBalanceAtDate(flat, txs, cutoff, t2)).toBe(700_000);
  });

  it('khớp fundBalanceWithProfit khi lấy mốc = hôm qua và không có giao dịch hôm nay', () => {
    const cat = { id: 'f1', interest_rate: 36.5 };
    const txs = [
      tx({ amount: 1_000_000, date: '2026-09-21' }),
      tx({ amount: 400_000, date: '2026-09-25' }),
      tx({ type: 'expense', amount: 150_000, date: '2026-09-27' }),
    ];
    expect(fundBalanceAtDate(cat, txs, d(2026, 9, 29))).toBeCloseTo(fundBalanceWithProfit(cat, txs), 6);
  });

  it('fundBalanceAsOf: mốc hôm nay dùng số dư hiện tại, mốc đã qua dùng số dư chốt ngày đó', () => {
    const cat = { id: 'f1', interest_rate: 36.5 };
    const txs = [tx({ amount: 1_000_000, date: '2026-09-21' })];
    expect(fundBalanceAsOf(cat, txs, NOW)).toBeCloseTo(fundBalanceWithProfit(cat, txs), 6);
    expect(fundBalanceAsOf(cat, txs, d(2026, 9, 24))).toBeCloseTo(1_000_000 * 1.001 ** 2, 3); // lãi 23,24
  });
});

describe('fundTransactionsWithBalance & fundDailyProfitHistory', () => {
  const cat = { id: 'f1', interest_rate: 36.5 };
  const flat = { id: 'f1', interest_rate: 0 };

  it('balanceAfter đúng từng bước (quỹ không lãi)', () => {
    const txs = [
      tx({ amount: 1_000_000, date: '2026-09-10' }),
      tx({ type: 'expense', amount: 300_000, date: '2026-09-12' }),
    ];
    expect(fundTransactionsWithBalance(flat, txs).map((r) => r.balanceAfter)).toEqual([1_000_000, 700_000]);
  });

  it('dòng cuối (giao dịch hôm nay) khớp fundBalanceWithProfit', () => {
    const txs = [
      tx({ amount: 1_000_000, date: '2026-09-21' }),
      tx({ type: 'expense', amount: 100_000, date: '2026-09-30' }),
    ];
    const rows = fundTransactionsWithBalance(cat, txs);
    expect(rows.at(-1).balanceAfter).toBeCloseTo(fundBalanceWithProfit(cat, txs), 6);
  });

  it('lịch sử lãi ngày: đủ mọi ngày (kể cả 0đ), mới nhất trước, tổng lãi = số dư − gốc', () => {
    const txs = [tx({ amount: 1_000_000, date: '2026-09-21' })];
    const days = fundDailyProfitHistory(cat, txs);
    expect(days).toHaveLength(9); // 21/09 .. 29/09
    expect(localDateStr(days[0].date)).toBe('2026-09-29');
    expect(days.at(-1).profit).toBe(0); // 21/09: chưa đủ điều kiện sinh lời, vẫn có dòng 0đ
    const sum = days.reduce((s, x) => s + x.profit, 0);
    expect(sum).toBeCloseTo(fundBalanceWithProfit(cat, txs) - fundBalance('f1', txs), 6);
    expect(days.find((x) => localDateStr(x.date) === '2026-09-23').profit).toBeCloseTo(1000, 6);
  });

  it('quỹ không lãi -> không có lịch sử lãi', () => {
    expect(fundDailyProfitHistory(flat, [tx({ amount: 1_000_000 })])).toEqual([]);
  });
});

/* ============================== SỐ DƯ VÍ ============================== */
describe('accountBalance / accountBalanceAtDate / walletBalanceAsOf', () => {
  const acc = { id: 'w1', initial_balance: 5_000_000 };
  const txs = [
    tx({ account_id: 'w1', type: 'income', amount: 2_000_000, date: '2026-09-01' }),
    tx({ account_id: 'w1', type: 'expense', amount: 500_000, date: '2026-09-02' }),
    tx({ account_id: 'w1', type: 'allocation', amount: 1_000_000, date: '2026-09-03' }), // chuyển sang quỹ
    tx({ account_id: 'w1', type: 'adjustment', amount: 100_000, date: '2026-09-04' }),
    tx({ account_id: 'w1', type: 'income', amount: 9_999_999, date: '2026-10-05' }), // tương lai
    tx({ account_id: 'w2', type: 'income', amount: 8_888_888, date: '2026-09-01' }), // ví khác
  ];

  it('số dư hiện tại = số dư đầu + thu − chi − chuyển quỹ + điều chỉnh, bỏ ngày tương lai', () => {
    expect(accountBalance(acc, txs)).toBe(5_600_000);
  });
  it('walletBalanceAsOf(hôm nay) luôn khớp accountBalance (mọi màn hình ra cùng 1 số)', () => {
    expect(walletBalanceAsOf(acc, txs, NOW)).toBe(accountBalance(acc, txs));
  });
  it('mốc đã qua: chỉ tính giao dịch tới hết ngày đó', () => {
    expect(walletBalanceAsOf(acc, txs, d(2026, 9, 2, 23, 59, 59))).toBe(6_500_000);
  });
  it('cùng ngày, cutoffTx tách đúng giao dịch trước/sau', () => {
    const a = tx({ id: 'x1', account_id: 'w1', type: 'income', amount: 100, date: '2026-09-20', time: '08:00:00' });
    const b = tx({ id: 'x2', account_id: 'w1', type: 'expense', amount: 40, date: '2026-09-20', time: '09:00:00' });
    const acc2 = { id: 'w1', initial_balance: 0 };
    const list = [a, b];
    const cutoff = d(2026, 9, 20, 23, 59, 59);
    expect(accountBalanceAtDate(acc2, list, cutoff)).toBe(60);
    expect(accountBalanceAtDate(acc2, list, cutoff, a)).toBe(100);
    expect(accountBalanceAtDate(acc2, list, cutoff, b)).toBe(60);
  });
});

/* ============================== TỔNG HỢP THU – CHI ============================== */
describe('aggregatePeriodData', () => {
  it('tách chi từ Thu nhập / ví / quỹ; remaining = thu − nạp − chi từ thu nhập', () => {
    const cats = [{ id: 'c1' }, { id: 'f1', is_fund: true }];
    const txs = [
      tx({ type: 'income', category_id: 'c1', amount: 1000 }),
      tx({ type: 'allocation', category_id: 'f1', amount: 200 }),
      tx({ type: 'expense', category_id: 'c1', account_id: null, amount: 100 }),
      tx({ type: 'expense', category_id: 'c1', account_id: 'w1', amount: 50 }),
      tx({ type: 'expense', category_id: 'f1', account_id: null, amount: 30 }),
    ];
    expect(aggregatePeriodData(txs, cats)).toEqual({
      income: 1000, allocation: 200, expenseFromIncome: 100, expenseFromWallet: 50,
      expenseFromFund: 30, totalActualExpense: 180, remaining: 700,
    });
  });
});

describe('periodPool', () => {
  it('cộng thu/chi theo thẻ [KY:]', () => {
    const txs = [
      tx({ type: 'income', amount: 1000, note: '[KY:2026-10] a' }),
      tx({ type: 'expense', amount: 300, note: '[KY:2026-10] b' }),
      tx({ type: 'allocation', amount: 200, note: '[KY:2026-10] c' }),
      tx({ type: 'expense', amount: 999, note: '[KY:2026-09] khác kỳ' }),
    ];
    expect(periodPool(txs, '2026-10')).toEqual({ total: 1000, used: 500, remaining: 500 });
  });
});

describe('calculateFinancialsFromTxs', () => {
  const cats = [
    { id: 'salary' },
    { id: 'bonus', include_in_spending_pool: false },
    { id: 'food' },
    { id: 'fund', is_fund: true },
  ];
  const txs = [
    tx({ type: 'income', category_id: 'salary', amount: 10_000_000 }),
    tx({ type: 'income', category_id: 'bonus', amount: 2_000_000 }),
    tx({ type: 'allocation', category_id: 'fund', account_id: null, amount: 1_000_000 }), // từ Thu nhập -> tính
    tx({ type: 'allocation', category_id: 'fund', account_id: 'w1', amount: 500_000 }), // từ ví -> không tính
    tx({ type: 'allocation', category_id: 'fund', account_id: null, amount: 700_000, is_initial: true }), // nạp ban đầu -> loại
    tx({ type: 'expense', category_id: 'food', account_id: null, amount: 2_000_000 }),
    tx({ type: 'expense', category_id: 'food', account_id: 'w1', amount: 300_000 }),
    tx({ type: 'expense', category_id: 'fund', account_id: null, amount: 400_000 }),
  ];

  it('tính đủ các khái niệm với Thu nhập được chi do người dùng cài đặt', () => {
    const r = calculateFinancialsFromTxs(txs, cats, 8_000_000);
    expect(r).toMatchObject({
      totalIncome: 12_000_000,
      incomeForSpendingPool: 10_000_000,
      specialIncome: 2_000_000,
      spendingPool: 8_000_000,
      accumulationBeforeSpend: 2_000_000,
      allocationFromSpendingPool: 1_000_000,
      expenseFromSpendingPool: 2_000_000,
      expenseFromWallet: 300_000,
      expenseFromFund: 400_000,
      totalSpentFromSpendingPool: 3_000_000,
      remainingAfterSpend: 5_000_000,
      totalActualExpense: 2_400_000, // chi ví KHÔNG nằm trong tổng chi thực tế theo spec
      isOverSpendingPool: false,
    });
  });
  it('chưa cài đặt -> Thu nhập được chi mặc định = thu nhập tính Chi pool, không tích lũy', () => {
    const r = calculateFinancialsFromTxs(txs, cats);
    expect(r.spendingPool).toBe(10_000_000);
    expect(r.accumulationBeforeSpend).toBe(0);
  });
  it('vượt Thu nhập được chi thì cờ isOverSpendingPool bật', () => {
    const r = calculateFinancialsFromTxs(txs, cats, 2_500_000);
    expect(r.remainingAfterSpend).toBe(-500_000);
    expect(r.isOverSpendingPool).toBe(true);
  });
  it('dữ liệu rỗng không lỗi', () => {
    expect(calculateFinancialsFromTxs([], [], undefined).totalIncome).toBe(0);
    expect(calculateFinancialsFromTxs(undefined, undefined, undefined).spendingPool).toBe(0);
  });
});

describe('calculatePeriodFinancials / calculateFinancialsForPeriods', () => {
  const cats = [{ id: 'salary' }];
  const txs = [
    tx({ type: 'income', category_id: 'salary', amount: 3_000_000, date: '2026-09-10' }), // kỳ 2026-09
    tx({ type: 'income', category_id: 'salary', amount: 4_000_000, date: '2026-09-25' }), // kỳ 2026-10
  ];
  it('chỉ lấy giao dịch thuộc đúng kỳ', () => {
    const r = calculatePeriodFinancials('2026-09', txs, cats);
    expect(r.periodKey).toBe('2026-09');
    expect(r.totalIncome).toBe(3_000_000);
  });
  it('cộng dồn từng kỳ, mỗi kỳ dùng Chi pool riêng của kỳ đó', () => {
    const r = calculateFinancialsForPeriods(['2026-09', '2026-10'], txs, cats, { '2026-09': 1_000_000 });
    expect(r.totalIncome).toBe(7_000_000);
    expect(r.spendingPool).toBe(1_000_000 + 4_000_000); // 09: đặt tay, 10: mặc định
    expect(r.accumulationBeforeSpend).toBe(2_000_000);
    expect(r.byPeriod).toHaveLength(2);
  });
  it('periodKeysForMonths', () => {
    expect(periodKeysForMonths(2026, [1, 2, 12])).toEqual(['2026-01', '2026-02', '2026-12']);
  });
});

describe('computeAccumulationBeforeSpendTarget', () => {
  const cats = [{ id: 'sal', name: 'Lương cơ bản' }];
  const txs = [
    tx({ type: 'income', category_id: 'sal', amount: 10_000_000, note: '[KY:2026-10] lương' }),
    tx({ type: 'income', category_id: 'sal', amount: 1_000_000, note: '[KY:2026-10] đã xoá', deleted_at: '2026-09-01' }),
    tx({ type: 'income', category_id: 'sal', amount: 7_000_000, note: '[KY:2026-09] kỳ khác' }),
  ];
  it('= lương cơ bản + 600.000 tiền cơm − Thu nhập được chi (bỏ giao dịch đã xoá)', () => {
    expect(computeAccumulationBeforeSpendTarget('2026-10', txs, cats, { '2026-10': 8_000_000 })).toBe(2_600_000);
  });
  it('không âm: Thu nhập được chi lớn hơn thì ra 0', () => {
    expect(computeAccumulationBeforeSpendTarget('2026-10', txs, cats, { '2026-10': 50_000_000 })).toBe(0);
  });
  it('trả null khi chưa đủ điều kiện (chưa biết ≠ 0)', () => {
    expect(computeAccumulationBeforeSpendTarget('2026-10', txs, [], { '2026-10': 1 })).toBeNull(); // không có danh mục Lương cơ bản
    expect(computeAccumulationBeforeSpendTarget('2026-10', txs, cats, {})).toBeNull(); // kỳ chưa cài đặt
    expect(computeAccumulationBeforeSpendTarget('2026-10', txs, cats, { '2026-10': '' })).toBeNull();
  });
});

/* ============================== BUCKET CHO BIỂU ĐỒ ============================== */
describe('computePeriodBuckets', () => {
  const dayKey = (x) => localDateStr(x);

  it('chế độ Tháng: chia kỳ 21→20 thành 5 khoảng liền nhau, phủ đúng từ ngày đầu đến ngày cuối kỳ', () => {
    const b = computePeriodBuckets({ period: 'month', periodKey: '2026-10' });
    expect(b).toHaveLength(5);
    expect(dayKey(b[0].start)).toBe('2026-09-21');
    expect(dayKey(b.at(-1).end)).toBe('2026-10-20'); // KHÔNG được tràn sang 21/10
    for (let i = 1; i < b.length; i++) {
      // khoảng sau bắt đầu ngay ngày kế tiếp của khoảng trước
      const next = new Date(b[i - 1].end); next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0);
      expect(dayKey(b[i].start)).toBe(dayKey(next));
    }
    expect(b.at(-1).label).toBe('15-20');
  });

  it('chế độ Tháng: kỳ ngắn (28 ngày, kỳ 2026-03) vẫn phủ đúng', () => {
    const b = computePeriodBuckets({ period: 'month', periodKey: '2026-03' });
    expect(dayKey(b[0].start)).toBe('2026-02-21');
    expect(dayKey(b.at(-1).end)).toBe('2026-03-20');
  });

  it('chế độ Tuần: 7 ngày -> đúng 7 cột, không dư cột ngày mai', () => {
    const b = computePeriodBuckets({ period: 'week', weekStart: '2026-09-24', weekEnd: '2026-09-30' });
    expect(b).toHaveLength(7);
    expect(b.map((x) => x.label)).toEqual(['24/09', '25/09', '26/09', '27/09', '28/09', '29/09', '30/09']);
  });

  it('chế độ Tuần: 1 ngày -> 1 cột; ngày kết thúc trước ngày bắt đầu -> 1 cột', () => {
    expect(computePeriodBuckets({ period: 'week', weekStart: '2026-09-30', weekEnd: '2026-09-30' })).toHaveLength(1);
    expect(computePeriodBuckets({ period: 'week', weekStart: '2026-09-30', weekEnd: '2026-09-01' })).toHaveLength(1);
  });

  it('chế độ Tuần: giới hạn tối đa 62 cột', () => {
    expect(computePeriodBuckets({ period: 'week', weekStart: '2026-01-01', weekEnd: '2026-12-31' })).toHaveLength(62);
  });

  it('chế độ Năm: 12 kỳ tài chính', () => {
    const b = computePeriodBuckets({ period: 'year', year: 2026 });
    expect(b).toHaveLength(12);
    expect(b[0].label).toBe('Th1');
    expect(dayKey(b[0].start)).toBe('2025-12-21');
  });
});

describe('periodBucketMatch & series theo bucket', () => {
  const buckets = computePeriodBuckets({ period: 'month', periodKey: '2026-10' });
  it('giao dịch nằm trong khoảng nào thì thuộc bucket đó', () => {
    const t = tx({ date: '2026-09-28' }); // thuộc bucket 2 (27/09 – 02/10)
    const hits = buckets.map((b, bi) => periodBucketMatch(t, b, bi, buckets, 'month', 2026));
    expect(hits).toEqual([false, true, false, false, false]);
  });
  it('ngoài khoảng hiển thị dồn vào bucket đầu / cuối', () => {
    const before = tx({ date: '2026-09-01' });
    const after = tx({ date: '2026-12-01' });
    expect(periodBucketMatch(before, buckets[0], 0, buckets, 'month', 2026)).toBe(true);
    expect(periodBucketMatch(after, buckets[4], 4, buckets, 'month', 2026)).toBe(true);
  });
  it('buildCategorySeriesFor: bỏ khoản nạp ban đầu, bỏ danh mục tổng 0, sắp giảm dần', () => {
    const cats = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
    const txs = [
      tx({ type: 'expense', category_id: 'a', amount: 100, date: '2026-09-25' }),
      tx({ type: 'expense', category_id: 'b', amount: 300, date: '2026-09-26' }),
      tx({ type: 'allocation', category_id: 'c', amount: 999, date: '2026-09-26', is_initial: true }),
    ];
    const series = buildCategorySeriesFor(txs, cats, ['expense', 'allocation'], buckets, 'month', '2026-10', 2026);
    expect(series.map((s) => s.id)).toEqual(['b', 'a']);
    expect(series[0].total).toBe(300);
  });
  it('bucketTotalsFor cộng theo từng bucket', () => {
    const txs = [
      tx({ type: 'income', amount: 10, date: '2026-09-22' }),
      tx({ type: 'income', amount: 5, date: '2026-09-23' }),
      tx({ type: 'income', amount: 7, date: '2026-10-10' }),
    ];
    const totals = bucketTotalsFor(txs, 'income', buckets, 'month', '2026-10', 2026);
    expect(totals.reduce((s, v) => s + v, 0)).toBe(22);
    expect(totals[0]).toBe(15);
  });
});

/* ============================== KHOẢNG THỜI GIAN CHO BÁO CÁO ============================== */
describe('getPeriodStartEnd / getPreviousPeriod', () => {
  it('tháng, quý, 6 tháng, năm', () => {
    expect(getPeriodStartEnd('month', 2, 2026)).toEqual({ start: d(2026, 2, 1), end: d(2026, 2, 28, 23, 59, 59) });
    expect(getPeriodStartEnd('quarter', 2, 2026).end).toEqual(d(2026, 6, 30, 23, 59, 59));
    expect(getPeriodStartEnd('6month', 2, 2026).start).toEqual(d(2026, 7, 1));
    expect(getPeriodStartEnd('year', 2026).end).toEqual(d(2026, 12, 31, 23, 59, 59));
  });
  it('kỳ trước: lùi qua đầu năm đúng', () => {
    expect(getPreviousPeriod('month', 1, 2026).start).toEqual(d(2025, 12, 1));
    expect(getPreviousPeriod('quarter', 1, 2026).start).toEqual(d(2025, 10, 1));
    expect(getPreviousPeriod('6month', 1, 2026).start).toEqual(d(2025, 7, 1));
    expect(getPreviousPeriod('year', 2026).start).toEqual(d(2025, 1, 1));
  });
  it('ngày / tuần trước', () => {
    const day = getPreviousPeriod('day', '2026-09-30');
    expect(localDateStr(day.start)).toBe('2026-09-29');
    const week = getPreviousPeriod('week', '2026-09-28');
    expect(localDateStr(week.start)).toBe('2026-09-21');
    expect(localDateStr(week.end)).toBe('2026-09-27');
  });
  it('khoảng tuỳ chọn: lùi đúng bằng độ dài khoảng (không chồng lấn)', () => {
    const cur = { start: d(2026, 9, 10), end: d(2026, 9, 19, 23, 59, 59) };
    const prev = getPreviousPeriod('custom', cur);
    expect(prev.end < cur.start).toBe(true);
  });
  it('kiểu không hỗ trợ -> null', () => {
    expect(getPreviousPeriod('abc', 1, 2026)).toBeNull();
  });
});

/* ============================== TIỆN ÍCH HIỂN THỊ ============================== */
describe('tiện ích hiển thị', () => {
  it('fundRateStyle chia theo bậc lãi suất', () => {
    expect(fundRateStyle({ interest_rate: 0 }).value).toBe('Không lãi suất');
    expect(fundRateStyle({ interest_rate: 4.9 }).value).toBe('<5%/năm');
    expect(fundRateStyle({ interest_rate: 5 }).value).toBe('5-10%/năm');
    expect(fundRateStyle({ interest_rate: 10 }).value).toBe('>10%/năm');
  });
  it('sortGoals: chưa hoàn thành trước, rồi theo độ ưu tiên', () => {
    const goals = [
      { id: 1, status: 'Hoàn thành', priority_term: '<1 năm - Siêu ngắn hạn' },
      { id: 2, status: 'Đang thực hiện', priority_term: '>10 năm - Siêu dài hạn' },
      { id: 3, status: 'Đang thực hiện', priority_term: '<1 năm - Siêu ngắn hạn' },
      { id: 4, status: 'Đang thực hiện', priority_term: 'không rõ' },
    ];
    expect(sortGoals(goals).map((g) => g.id)).toEqual([3, 2, 4, 1]);
    expect(priorityRank('không rõ')).toBe(5);
  });
  it('durationText', () => {
    expect(durationText('2026-01-15', '2026-03-10')).toBe('1 tháng 23 ngày');
    expect(durationText('2024-01-01', '2026-03-01')).toBe('2 năm 2 tháng');
    expect(durationText('2026-01-01', '2026-01-01')).toBe('0 ngày');
    expect(durationText('2026-03-01', '2026-01-01')).toBeNull();
    expect(durationText(null, '2026-01-01')).toBeNull();
  });
});

/* ============================== ĐẾM SỐ NGÀY ============================== */
describe('inclusiveDays (đếm ngày lịch, tính cả 2 đầu)', () => {
  it('các trường hợp cơ bản', () => {
    expect(inclusiveDays(d(2026, 9, 24), d(2026, 9, 24, 23, 59, 59, 999))).toBe(1);
    expect(inclusiveDays(d(2026, 9, 24), d(2026, 9, 30, 23, 59, 59))).toBe(7);
  });
  it('mọi kỳ 21→20 của 2026 có đúng số ngày lịch (28–31), không bao giờ dư 1 ngày', () => {
    for (let m = 1; m <= 12; m++) {
      const { start, end } = periodKeyToRange(`2026-${String(m).padStart(2, '0')}`);
      // đếm bằng cách bước từng ngày làm đối chứng độc lập
      let expected = 0;
      for (const c = new Date(start); c <= end; c.setDate(c.getDate() + 1)) expected++;
      expect(inclusiveDays(start, end)).toBe(expected);
      expect(expected).toBeGreaterThanOrEqual(28);
      expect(expected).toBeLessThanOrEqual(31);
    }
  });
  it('kỳ 2026-10 (21/09 → 20/10) đúng 30 ngày — dùng cho trục ngày chart Biến động tài sản', () => {
    const { start, end } = periodKeyToRange('2026-10');
    expect(inclusiveDays(start, end)).toBe(30);
  });
});
