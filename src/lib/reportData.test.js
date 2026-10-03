import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildReportData, firstDayOfThisMonthStr, reportDmy } from './reportData';
import { txBalanceAfter } from './ledger';
import { NOW, START, END, PERIOD_KEY, tx, accounts, categories, transactions, byId } from './__fixtures__/report-scenario';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const build = (over = {}) => buildReportData({
  startDate: START, endDate: END, transactions, categories, accounts, sections: ['overview'], spendingPoolByPeriod: {}, ...over,
});
const parseMoney = (s) => Number(String(s).replace(/[^\d-]/g, ''));

describe('tiện ích ngày', () => {
  it('reportDmy: YYYY-MM-DD -> DD/MM/YYYY (cắt bỏ phần giờ nếu có)', () => {
    expect(reportDmy('2026-09-05')).toBe('05/09/2026');
    expect(reportDmy('2026-09-05T10:30:00')).toBe('05/09/2026');
  });
  it('firstDayOfThisMonthStr: ngày 1 của tháng hiện tại', () => {
    expect(firstDayOfThisMonthStr()).toBe('2026-09-01');
  });
});

describe('buildReportData — thông tin chung', () => {
  it('ngày hiển thị dạng DD/MM/YYYY, giữ nguyên sections, có thời điểm tạo', () => {
    const sections = ['overview', 'funds'];
    const r = build({ sections });
    expect(r.startDate).toBe('21/08/2026');
    expect(r.endDate).toBe('20/09/2026');
    expect(r.sections).toBe(sections);
    expect(typeof r.generatedAt).toBe('string');
    expect(r.generatedAt.length).toBeGreaterThan(5);
  });
});

describe('buildReportData — tài sản đầu / cuối kỳ', () => {
  const o = build().overview;
  it('tổng tài sản = Ví + Vàng + Quỹ, đầu và cuối kỳ', () => {
    // Ví: 1tr + 15tr = 16tr -> 17,6tr | Vàng: 2tr -> 2,1tr | Quỹ: 3tr -> 3,6tr
    expect(o.assetsStart).toBe('21,000,000đ');
    expect(o.assetsEnd).toBe('23,300,000đ');
    expect(o.assetsChange).toBe('+2,300,000đ');
    expect(o.assetsChangePct).toBe('+11.0%');
    expect(o.assetsPositive).toBe(true);
  });
  it('bảng cơ cấu tài sản theo nhóm', () => {
    expect(o.composition).toEqual([
      { label: 'Ví', start: '16,000,000đ', end: '17,600,000đ', diff: '1,600,000đ' },
      { label: 'Vàng', start: '2,000,000đ', end: '2,100,000đ', diff: '100,000đ' },
      { label: 'Quỹ', start: '3,000,000đ', end: '3,600,000đ', diff: '600,000đ' },
    ]);
    expect(o.compositionTotal).toEqual({ label: 'Tổng tài sản', start: '21,000,000đ', end: '23,300,000đ', diff: '2,300,000đ' });
  });
  it('donut cơ cấu cuối kỳ: phần trăm cộng lại đúng 100, mỗi nhóm có màu riêng', () => {
    expect(o.assetDonut.map((x) => x.label)).toEqual(['Ví', 'Vàng', 'Quỹ']);
    expect(o.assetDonut.map((x) => x.pctLabel)).toEqual(['75.5%', '9.0%', '15.5%']);
    expect(o.assetDonut.reduce((s, x) => s + x.pctNum, 0)).toBeCloseTo(100, 6);
    expect(new Set(o.assetDonut.map((x) => x.color)).size).toBe(3);
  });
  it('nhóm không có tài khoản thì không hiện', () => {
    const r = build({ accounts: accounts.filter((a) => a.type !== 'gold') });
    expect(r.overview.composition.map((g) => g.label)).toEqual(['Ví', 'Quỹ']);
    expect(r.walletGroups.map((g) => g.title)).toEqual(['Ví']);
  });
});

describe('buildReportData — thu nhập / chi tiêu và so với kỳ trước', () => {
  const r = build();
  it('tổng thu, tổng chi (chi tiêu thật, KHÔNG gồm nạp quỹ), thu ròng', () => {
    expect(r.overview.income).toBe('14,000,000đ');   // t2 + t3
    expect(r.overview.expense).toBe('430,000đ');     // t4 + t5 + t8
    expect(r.overview.net).toBe('13,570,000đ');
    expect(r.overview.netPositive).toBe(true);
    expect(r.overview.allocation).toBe('800,000đ');  // t6 + t7 (không tính khoản nạp ban đầu)
    expect(r.overview.allocationCountedAsExpense).toBe(false);
  });
  it('giao dịch ngoài kỳ (trước/sau) không bị tính', () => {
    expect(r.txCount).toBe(9);
    expect(r.txs.some((t) => t.amount.includes('999,999'))).toBe(false);
  });
  it('so với kỳ trước (cùng số ngày, liền kề phía trước)', () => {
    // toMatchObject (không phải toEqual): kết quả có thể kèm thêm trường phụ (vd pct cho xuất Excel) mà test này không cần cứng nhắc
    expect(r.overview.incomeVsPrev).toMatchObject({ label: '▲ 40.0% so với kỳ trước', good: true });   // 14tr vs 10tr
    expect(r.overview.expenseVsPrev).toMatchObject({ label: 'Mới so với kỳ trước', good: false });      // kỳ trước chi 0
  });
  it('chi tiêu giảm so với kỳ trước là điều TỐT; thu nhập giảm là điều xấu', () => {
    const prevExpense = tx({ id: 'pe', category_id: 'food', type: 'expense', amount: 1_000_000, date: '2026-08-10' });
    const prevIncome = tx({ id: 'pi', category_id: 'sal', type: 'income', amount: 20_000_000, date: '2026-08-11' });
    const x = build({ transactions: [...transactions, prevExpense, prevIncome] }).overview;
    // thu: 14tr vs (10tr + 20tr) = 30tr -> giảm
    expect(x.incomeVsPrev.label).toMatch(/^▼ 53\.3%/);
    expect(x.incomeVsPrev.good).toBe(false);
    // chi: 430k vs 1tr -> giảm 57%
    expect(x.expenseVsPrev.label).toMatch(/^▼ 57\.0%/);
    expect(x.expenseVsPrev.good).toBe(true);
  });
  it('kỳ nào cũng không có số liệu -> null (không hiện nhãn so sánh)', () => {
    const x = build({ transactions: [] }).overview;
    expect(x.incomeVsPrev).toBeNull();
    expect(x.expenseVsPrev).toBeNull();
  });
});

describe('buildReportData — nhóm theo danh mục / nguồn', () => {
  const r = build();
  it('thu nhập theo danh mục: sắp giảm dần, phần trăm trên tổng thu', () => {
    expect(r.incomeByCat).toEqual([
      { name: 'Lương', count: '1', amount: '12,000,000đ', pct: '85.7%' },
      { name: 'Thưởng', count: '1', amount: '2,000,000đ', pct: '14.3%' },
    ]);
    expect(r.incomeTotal).toEqual({ count: '2', amount: '14,000,000đ' });
  });
  it('chi tiêu theo danh mục: chi trên quỹ ghi riêng là "Rút từ quỹ: ..."', () => {
    expect(r.expenseByCat).toEqual([
      { name: 'Ăn uống', count: '2', amount: '230,000đ', pct: '53.5%' },
      { name: 'Rút từ quỹ: Quỹ khẩn cấp', count: '1', amount: '200,000đ', pct: '46.5%' },
    ]);
    expect(r.expenseTotal).toEqual({ count: '3', amount: '430,000đ' });
  });
  it('chi tiêu theo nguồn tiền: quỹ / Thu nhập được chi / ví', () => {
    expect(r.overview.expenseBySource.map((s) => [s.label, s.amount, s.pct])).toEqual([
      ['Quỹ: Quỹ khẩn cấp', '200,000đ', '46.5%'],
      ['Thu nhập được chi', '150,000đ', '34.9%'],
      ['Ví tiền mặt', '80,000đ', '18.6%'],
    ]);
    expect(r.overview.expenseBySource.reduce((s, x) => s + x.pctNum, 0)).toBeCloseTo(100, 6);
  });
  it('giao dịch không có danh mục được gom vào "Không rõ danh mục"', () => {
    const lonely = tx({ id: 'lo', type: 'expense', amount: 10_000, date: '2026-09-03' });
    const x = build({ transactions: [...transactions, lonely] });
    expect(x.expenseByCat.some((c) => c.name === 'Không rõ danh mục' && c.amount === '10,000đ')).toBe(true);
  });
});

describe('buildReportData — Thu nhập được chi (pool) và nạp quỹ', () => {
  it('chưa cài đặt pool: lấy tổng thu nhập tính vào chi pool (không gồm thu nhập đặc biệt)', () => {
    const p = build().overview.poolAllocation;
    expect(p.hasPool).toBe(true);
    expect(p.pool).toBe('12,000,000đ');                 // t2; "Thưởng" bị loại
    expect(p.rows).toEqual([{ name: 'Quỹ khẩn cấp', amount: '500,000đ', pct: '4.2%', pctNum: expect.closeTo(4.1667, 3) }]);
    expect(p.total).toBe('500,000đ');
    expect(p.totalPct).toBe('4.2%');
    expect(p.nonFundExpense).toBe('150,000đ');          // chỉ t4 (t5 từ ví, t8 từ quỹ không tính)
    expect(p.remaining).toBe('11,350,000đ');
    expect(p.remainingPositive).toBe(true);
  });
  it('đã cài đặt pool cho kỳ: dùng số đã cài', () => {
    const p = build({ spendingPoolByPeriod: { [PERIOD_KEY]: 8_000_000 } }).overview.poolAllocation;
    expect(p.pool).toBe('8,000,000đ');
    expect(p.remaining).toBe('7,350,000đ');
    expect(p.rows[0].pct).toBe('6.3%');                 // 500k / 8tr
  });
  it('nạp quá pool: số còn lại âm và cờ remainingPositive tắt', () => {
    const p = build({ spendingPoolByPeriod: { [PERIOD_KEY]: 100_000 } }).overview.poolAllocation;
    expect(p.remaining).toBe('-550,000đ');
    expect(p.remainingPositive).toBe(false);
  });
  it('nạp quỹ bằng tiền VÍ không bị trừ vào pool', () => {
    // t7 nạp 300k từ ví Techcombank vào Quỹ du lịch: không có trong bảng góp quỹ từ pool
    const p = build().overview.poolAllocation;
    expect(p.rows.map((r) => r.name)).toEqual(['Quỹ khẩn cấp']);
  });
  it('không có thu nhập cũng không nạp quỹ -> hasPool = false', () => {
    expect(build({ transactions: [] }).overview.poolAllocation).toEqual({ hasPool: false });
  });
  it('NHẤT QUÁN với sổ giao dịch: "còn lại" = số dư pool sau giao dịch pool cuối kỳ', () => {
    const cfg = { [PERIOD_KEY]: 8_000_000 };
    const fromReport = parseMoney(build({ spendingPoolByPeriod: cfg }).overview.poolAllocation.remaining);
    const fromLedger = txBalanceAfter(byId.t6, categories, accounts, transactions, cfg);   // t6 là giao dịch pool cuối cùng
    expect(fromReport).toBe(fromLedger);
  });
});

describe('buildReportData — bảng Ví', () => {
  const groups = build().walletGroups;
  it('chia nhóm Ví / Vàng, hiện đúng nhãn loại ví', () => {
    expect(groups.map((g) => g.title)).toEqual(['Ví', 'Vàng']);
    expect(groups[0].rows.map((r) => [r.name, r.typeLabel])).toEqual([['Ví tiền mặt', 'Tiền mặt'], ['Techcombank', 'Ngân hàng']]);
  });
  it('từng ví: số đầu kỳ, thu vào, chi ra, chuyển sang quỹ, điều chỉnh, số cuối kỳ ("-" nếu bằng 0)', () => {
    expect(groups[0].rows[0]).toMatchObject({ start: '1,000,000đ', inflow: '-', outflow: '80,000đ', toFund: '-', adjust: '-20,000đ', end: '900,000đ' });
    expect(groups[0].rows[1]).toMatchObject({ start: '15,000,000đ', inflow: '2,000,000đ', outflow: '-', toFund: '300,000đ', adjust: '-', end: '16,700,000đ' });
    expect(groups[1].rows[0]).toMatchObject({ start: '2,000,000đ', adjust: '100,000đ', end: '2,100,000đ' });
  });
  it('dòng tổng của nhóm = cộng các ví trong nhóm', () => {
    expect(groups[0].total).toEqual({
      name: 'Tổng', typeLabel: '', start: '16,000,000đ', inflow: '2,000,000đ', outflow: '80,000đ', toFund: '300,000đ', adjust: '-20,000đ', end: '17,600,000đ',
    });
  });
  it('tổng cuối kỳ các nhóm ví khớp với phần "Ví + Vàng" của cơ cấu tài sản', () => {
    const walletsEnd = groups.reduce((s, g) => s + parseMoney(g.total.end), 0);
    const comp = build().overview.composition;
    expect(walletsEnd).toBe(parseMoney(comp[0].end) + parseMoney(comp[1].end));
  });
});

describe('buildReportData — bảng Quỹ', () => {
  const r = build();
  it('mỗi quỹ: đầu kỳ, nạp, rút, lãi, cuối kỳ', () => {
    expect(r.funds.rows).toEqual([
      { name: 'Quỹ khẩn cấp', start: '3,000,000đ', deposit: '500,000đ', withdraw: '200,000đ', profit: '-', end: '3,300,000đ' },
      { name: 'Quỹ du lịch', start: '0đ', deposit: '300,000đ', withdraw: '-', profit: '-', end: '300,000đ' },
    ]);
    expect(r.funds.total).toEqual({ name: 'Tổng', start: '3,000,000đ', deposit: '800,000đ', withdraw: '200,000đ', profit: '-', end: '3,600,000đ' });
  });
  it('lợi nhuận tự sinh = số cuối − số đầu − nạp + rút (quỹ có lãi suất, không có giao dịch trong kỳ)', () => {
    // Quỹ 36,5%/năm = 0,1%/ngày; nạp 1tr ngày T7 01/08 => gốc sinh lời từ T2 03/08, tới hết 31/08 là 29 ngày, tới hết 10/09 là 39 ngày
    const fund = { id: 'fi', name: 'Quỹ lãi', is_fund: true, interest_rate: 36.5 };
    const init = tx({ id: 'i0', category_id: 'fi', type: 'allocation', amount: 1_000_000, date: '2026-08-01', is_initial: true });
    const x = buildReportData({ startDate: '2026-09-01', endDate: '2026-09-10', transactions: [init], categories: [fund], accounts: [], sections: [], spendingPoolByPeriod: {} });
    const row = x.funds.rows[0];
    const expectedProfit = 1_000_000 * (1.001 ** 39 - 1.001 ** 29);
    expect(Math.abs(parseMoney(row.profit) - expectedProfit)).toBeLessThanOrEqual(1);
    // không nạp/rút => số cuối − số đầu = lãi (3 số được làm tròn đồng riêng nên cho phép lệch tối đa 1đ)
    expect(Math.abs(parseMoney(row.end) - parseMoney(row.start) - parseMoney(row.profit))).toBeLessThanOrEqual(1);
    expect(x.fundHistory[0].name).toBe('Quỹ lãi · lãi 36.5%/năm');
  });
  it('lịch sử từng quỹ: chỉ giao dịch trong kỳ, kèm số dư sau mỗi giao dịch', () => {
    expect(r.fundHistory[0].name).toBe('Quỹ khẩn cấp');
    expect(r.fundHistory[0].rows).toEqual([
      { date: '01/09/2026', kind: 'Nạp quỹ', note: '', amount: '+500,000đ', tone: 'in', balance: '3,500,000đ' },
      { date: '05/09/2026', kind: 'Rút quỹ', note: '', amount: '-200,000đ', tone: 'out', balance: '3,300,000đ' },
    ]);
    expect(r.fundHistory[1].rows).toEqual([
      { date: '02/09/2026', kind: 'Nạp quỹ', note: '', amount: '+300,000đ', tone: 'in', balance: '300,000đ' },
    ]);
  });
  it('số cuối của dòng lịch sử cuối = số cuối kỳ trong bảng quỹ', () => {
    const last = r.fundHistory[0].rows.at(-1).balance;
    expect(last).toBe(r.funds.rows[0].end);
  });
  it('báo cáo không có quỹ -> bảng quỹ rỗng, tổng bằng 0', () => {
    const x = build({ categories: categories.filter((c) => !c.is_fund) });
    expect(x.funds.rows).toEqual([]);
    expect(x.funds.total.end).toBe('0đ');
    expect(x.fundHistory).toEqual([]);
  });
});

describe('buildReportData — danh sách giao dịch', () => {
  const r = build();
  it('sắp theo thời gian, loại, nguồn, dấu và màu từng dòng', () => {
    expect(r.txs.map((t) => [t.date, t.kind, t.cat, t.source, t.amount, t.tone])).toEqual([
      ['25/08/2026', 'Thu nhập', 'Lương', 'Thu nhập được chi', '+12,000,000đ', 'in'],
      ['26/08/2026', 'Thu nhập', 'Thưởng', 'Techcombank', '+2,000,000đ', 'in'],
      ['27/08/2026', 'Chi tiêu', 'Ăn uống', 'Thu nhập được chi', '-150,000đ', 'out'],
      ['28/08/2026', 'Chi tiêu', 'Ăn uống', 'Ví tiền mặt', '-80,000đ', 'out'],
      ['01/09/2026', 'Nạp quỹ', 'Quỹ khẩn cấp', 'Thu nhập được chi', '500,000đ', undefined],   // chuyển nội bộ: không dấu, không màu
      ['02/09/2026', 'Nạp quỹ', 'Quỹ du lịch', 'Techcombank', '300,000đ', undefined],
      ['05/09/2026', 'Rút quỹ', 'Quỹ khẩn cấp', 'Quỹ: Quỹ khẩn cấp', '-200,000đ', 'out'],
      ['10/09/2026', 'Điều chỉnh ví', '', 'Vàng SJC', '+100,000đ', 'in'],
      ['12/09/2026', 'Điều chỉnh ví', '', 'Ví tiền mặt', '-20,000đ', 'out'],
    ]);
  });
  it('ghi chú được làm sạch: bỏ thẻ [KY:...] và [Vượt hạn mức], tiền tố [SET]', () => {
    const noted = tx({ id: 'n1', category_id: 'food', type: 'expense', amount: 1_000, date: '2026-09-03', note: '[KY:2026-09] [Vượt hạn mức] Cà phê' });
    const noted2 = tx({ id: 'n2', category_id: 'food', type: 'expense', amount: 1_000, date: '2026-09-04', note: '[SET] Ghi chú SET' });
    const x = build({ transactions: [...transactions, noted, noted2] });
    expect(x.txs.find((t) => t.date === '03/09/2026').note).toBe('Cà phê');
    expect(x.txs.find((t) => t.date === '04/09/2026').note).toBe('Ghi chú SET');
  });
  it('gom theo ngày: thay đổi ròng = thu − chi ± điều chỉnh (nạp/rút quỹ là chuyển nội bộ nên không tính)', () => {
    const same = [
      tx({ id: 'x1', category_id: 'sal', type: 'income', amount: 1_000_000, date: '2026-09-15', time: '08:00:00' }),
      tx({ id: 'x2', category_id: 'food', type: 'expense', amount: 400_000, date: '2026-09-15', time: '09:00:00' }),
      tx({ id: 'x3', category_id: 'fund1', type: 'allocation', amount: 100_000, date: '2026-09-15', time: '10:00:00' }),
    ];
    const x = buildReportData({ startDate: '2026-09-15', endDate: '2026-09-15', transactions: same, categories, accounts, sections: [], spendingPoolByPeriod: {} });
    expect(x.txsByDay).toHaveLength(1);
    expect(x.txsByDay[0].items).toHaveLength(3);
    expect(x.txsByDay[0]).toMatchObject({ date: '15/09/2026', net: '600,000đ', netPositive: true, hasNet: true });
  });
  it('ngày chỉ có nạp quỹ: ròng = 0 và không hiện dòng thay đổi ròng', () => {
    const day = r.txsByDay.find((g) => g.date === '01/09/2026');
    expect(day).toMatchObject({ net: '0đ', netPositive: true, hasNet: false });
  });
  it('ngày chi nhiều hơn thu: ròng âm', () => {
    const day = r.txsByDay.find((g) => g.date === '27/08/2026');
    expect(day).toMatchObject({ net: '-150,000đ', netPositive: false, hasNet: true });
  });
});

describe('buildReportData — ranh giới khoảng ngày & số lẻ', () => {
  it('gồm CẢ ngày đầu và ngày cuối, loại ngày liền trước và liền sau', () => {
    const food = (id, amount, date) => tx({ id, category_id: 'food', type: 'expense', amount, date });
    const edge = [food('e0', 1, '2026-08-20'), food('e1', 10, '2026-08-21'), food('e2', 100, '2026-09-20'), food('e3', 1000, '2026-09-21')];
    const x = buildReportData({ startDate: START, endDate: END, transactions: edge, categories, accounts: [], sections: [], spendingPoolByPeriod: {} });
    expect(x.txs.map((t) => t.amount)).toEqual(['-10đ', '-100đ']);
  });
  it('số lẻ nhỏ hơn 1đ hiện "-" (không hiện "0đ" hay "-0đ")', () => {
    const tiny = tx({ id: 'tn', type: 'adjustment', amount: 0.4, date: '2026-09-03', account_id: 'a2' });
    const x = build({ transactions: [...transactions, tiny] });
    expect(x.walletGroups[0].rows[1].adjust).toBe('-');   // ví Techcombank
  });
});

describe('buildReportData — dữ liệu rỗng / thiếu', () => {
  it('không có dữ liệu: không lỗi, toàn số 0', () => {
    const r = buildReportData({ startDate: START, endDate: END, transactions: [], categories: [], accounts: [], sections: [], spendingPoolByPeriod: {} });
    expect(r.overview.assetsStart).toBe('0đ');
    expect(r.overview.assetsEnd).toBe('0đ');
    expect(r.overview.assetsChangePct).toBeNull();       // không chia cho 0
    expect(r.overview.assetDonut).toEqual([]);
    expect(r.overview.composition).toEqual([]);
    expect(r.overview.allocation).toBeNull();
    expect(r.txs).toEqual([]);
    expect(r.txsByDay).toEqual([]);
  });
  it('đầu vào undefined (danh sách chưa tải) vẫn chạy được', () => {
    const r = buildReportData({ startDate: START, endDate: END, sections: [] });
    expect(r.txCount).toBe(0);
    expect(r.funds.rows).toEqual([]);
  });
  it('khoảng ngày chỉ 1 ngày vẫn hoạt động (đầu = cuối)', () => {
    const r = buildReportData({ startDate: '2026-09-01', endDate: '2026-09-01', transactions, categories, accounts, sections: [], spendingPoolByPeriod: {} });
    expect(r.txs.map((t) => t.kind)).toEqual(['Nạp quỹ']);   // chỉ t6
  });
});
