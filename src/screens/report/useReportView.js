/* ==============================================================================
   Toàn bộ state, dữ liệu dẫn xuất và hành động của màn Báo cáo. Component trình bày (ReportMobile/ReportDesktop/ReportModals) chỉ việc đọc kết quả.
   ============================================================================== */
import { useLayoutEffect, useRef, useState } from 'react';
import { useAppData, useShell } from '../../context';
import { confirmDialog, toast, useEscapeKey } from '../../feedback';
import { AlertTriangle, CircleDollarSign, PiggyBank, Target, TrendingDown, TrendingUp, Wallet } from '../../icons';
import { calculateFinancialsForPeriods, calculateFinancialsFromTxs, calculatePeriodFinancials, compareTxTime, currentPeriodKey, dateToPeriodKey, financialMonthRange, financialMultiMonthRange, fundBalanceAsOf, localDateStr, periodKeysForMonths, periodKeyToRange, todayDateStr, walletBalanceAsOf } from '../../lib/finance';
import { formatMoney, txDeleteDescription } from '../../lib/format';

// Layout app dùng <main className="overflow-y-auto"> làm vùng cuộn thật sự (cả mobile lẫn
// desktop) chứ KHÔNG phải window/document — nên các chỗ "neo vị trí card, cuộn bù lại"
// phải cuộn đúng phần tử này, không phải window.scrollBy (sẽ không có tác dụng gì).
function findScrollableAncestor(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

export function useReportView() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, theme } = useShell();
  const { transactions, categories, accounts, goals, spendingPoolByPeriod, reload, softDelete, onOpenFund: openFund } = useAppData();
  const [editingTx, setEditingTx] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  // Bộ lọc "Hoạt động gần đây": lọc theo Loại giao dịch trước (Thu nhập / Chi tiêu /
  // Nạp quỹ / Rút quỹ / Chuyển khoản...), sau đó lọc thêm theo Danh mục cụ thể bên trong loại đó.
  // FIX: đổi từ string đơn sang mảng để cho phép chọn NHIỀU loại cùng lúc (vd Chi tiêu + Nạp
  // quỹ). Mảng rỗng = "Tất cả loại" (giữ đúng hành vi mặc định như trước).
  const [activityKindFilters, setActivityKindFilters] = useState([]);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('all');

  // Neo vị trí card "Hoạt động gần đây" khi đổi filter, tránh giật layout.
  // Có 2 bản DOM (mobile + desktop) cùng tồn tại, chỉ 1 bản đang hiển thị (display khác none)
  // tại 1 thời điểm — nên cần check offsetParent để biết đang neo theo bản nào.
  const activityAnchorMobileRef = useRef(null);
  const activityAnchorDesktopRef = useRef(null);
  const activityScrollAnchorRef = useRef(null);

  function getVisibleActivityAnchor() {
    const mobile = activityAnchorMobileRef.current;
    if (mobile && mobile.offsetParent !== null) return mobile;
    const desktop = activityAnchorDesktopRef.current;
    if (desktop && desktop.offsetParent !== null) return desktop;
    return null;
  }

  function captureActivityScrollAnchor() {
    const el = getVisibleActivityAnchor();
    if (el) activityScrollAnchorRef.current = el.getBoundingClientRect().top;
  }

  useLayoutEffect(() => {
    if (activityScrollAnchorRef.current == null) return;
    const el = getVisibleActivityAnchor();
    if (el) {
      const delta = el.getBoundingClientRect().top - activityScrollAnchorRef.current;
      if (delta) findScrollableAncestor(el).scrollBy(0, delta);
    }
    activityScrollAnchorRef.current = null;
  }, [activityKindFilters, activityCategoryFilter]);

  async function handleDeleteTx(tx) {
    if (!(await confirmDialog('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload && reload();
  }
  // Time range state
  // FIX: dùng kỳ tài chính hiện tại (21 -> 20) làm mặc định, KHÔNG dùng tháng lịch thường.
  // Lý do: từ ngày 21 trở đi, giao dịch đã thuộc về kỳ tài chính của tháng SAU (xem dateToPeriodKey),
  // nếu mặc định theo tháng lịch thì giao dịch vừa nhập sau ngày 20 sẽ rơi ra ngoài kỳ đang xem
  // và không hiển thị trong Báo cáo (Chi tiêu/Thu nhập hiện 0đ dù đã có dữ liệu).
  const [defaultPeriodYear, defaultPeriodMonth] = currentPeriodKey().split('-').map(Number);
  const [timeType, setTimeType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriodMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(defaultPeriodMonth / 3));
  const [selectedHalf, setSelectedHalf] = useState(defaultPeriodMonth <= 6 ? 1 : 2);
  const [selectedYear, setSelectedYear] = useState(defaultPeriodYear);
  const [selectedDay, setSelectedDay] = useState(todayDateStr());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    return localDateStr(d);
  });
  const [customStart, setCustomStart] = useState(localDateStr(periodKeyToRange(currentPeriodKey()).start));
  const [customEnd, setCustomEnd] = useState(todayDateStr());

  // Neo vị trí card "Thu nhập đã đi đâu?" khi đổi bộ chọn thời gian (Ngày/Tuần/Tháng/Quý/
  // 6 tháng/Năm/Tùy chỉnh) — card này có vài dòng chỉ hiện có điều kiện (Tích lũy trước chi,
  // Chi tiêu từ quỹ...) nên đổi kỳ là chiều cao card thay đổi đột ngột, gây giật trang.
  const incomeCardMobileRef = useRef(null);
  const incomeCardDesktopRef = useRef(null);
  const incomeCardScrollAnchorRef = useRef(null);

  function getVisibleIncomeCardAnchor() {
    const mobile = incomeCardMobileRef.current;
    if (mobile && mobile.offsetParent !== null) return mobile;
    const desktop = incomeCardDesktopRef.current;
    if (desktop && desktop.offsetParent !== null) return desktop;
    return null;
  }

  // Gắn vào onClickCapture/onChangeCapture của cả khối chọn kỳ (mobile + desktop) — chạy
  // ở pha capture nên luôn chạy TRƯỚC khi state đổi, không cần sửa từng ô chọn riêng lẻ.
  function captureIncomeCardScrollAnchor() {
    const el = getVisibleIncomeCardAnchor();
    if (el) incomeCardScrollAnchorRef.current = el.getBoundingClientRect().top;
  }

  useLayoutEffect(() => {
    if (incomeCardScrollAnchorRef.current == null) return;
    const el = getVisibleIncomeCardAnchor();
    if (el) {
      const delta = el.getBoundingClientRect().top - incomeCardScrollAnchorRef.current;
      if (delta) findScrollableAncestor(el).scrollBy(0, delta);
    }
    incomeCardScrollAnchorRef.current = null;
  }, [timeType, selectedMonth, selectedQuarter, selectedHalf, selectedYear, selectedDay, selectedWeek, customStart, customEnd]);

  // Compute start/end based on type — Tháng/Quý/6 tháng/Năm đều dựa trên
  // financial period (kỳ 21 → 20) của hệ thống, không dùng tháng lịch đơn giản.
  const getPeriod = () => {
    let start, end;
    const y = selectedYear;
    if (timeType === 'day') {
      const d = new Date(selectedDay);
      start = new Date(d); start.setHours(0,0,0,0);
      end = new Date(d); end.setHours(23,59,59,999);
    } else if (timeType === 'week') {
      const d = new Date(selectedWeek);
      start = new Date(d); start.setHours(0,0,0,0);
      end = new Date(d); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
    } else if (timeType === 'month') {
      ({ start, end } = financialMonthRange(y, selectedMonth));
    } else if (timeType === 'quarter') {
      const q = selectedQuarter;
      ({ start, end } = financialMultiMonthRange(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]));
    } else if (timeType === '6month') {
      const h = selectedHalf;
      const months = h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
      ({ start, end } = financialMultiMonthRange(y, months));
    } else if (timeType === 'year') {
      ({ start, end } = financialMultiMonthRange(y, [1,2,3,4,5,6,7,8,9,10,11,12]));
    } else if (timeType === 'custom') {
      start = new Date(customStart); start.setHours(0,0,0,0);
      end = new Date(customEnd); end.setHours(23,59,59,999);
    } else {
      // fallback: kỳ hiện tại
      ({ start, end } = periodKeyToRange(currentPeriodKey()));
    }
    return { start, end };
  };

  const { start, end } = getPeriod();
  const periodTxs = transactions.filter(t => {
    const d = new Date(t.date || t.created_at);
    return d >= start && d <= end;
  });

  // ==== [PHASE 3] Danh sách periodKey (kỳ 21->20) tương ứng với khoảng đang chọn ====
  // Dùng để tính Thu nhập được chi ĐÚNG theo từng kỳ thay vì gộp transaction theo ngày.
  const monthPeriodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const periodKeysInRange = (() => {
    if (timeType === 'month') return [monthPeriodKey];
    if (timeType === 'quarter') { const q = selectedQuarter; return periodKeysForMonths(selectedYear, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]); }
    if (timeType === '6month') { const h = selectedHalf; return periodKeysForMonths(selectedYear, h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]); }
    if (timeType === 'year') return periodKeysForMonths(selectedYear, [1,2,3,4,5,6,7,8,9,10,11,12]);
    return null; // day / week / custom — không map thẳng theo kỳ
  })();

  // ===== Danh sách giao dịch chi tiết trong khoảng thời gian đang filter =====
  // "Nguồn trừ/cộng" cho biết tiền được cộng vào đâu (thu nhập, quỹ) hay trừ từ đâu (ví, quỹ, thu nhập kỳ).
  function getTxSource(tx) {
    const cat = categories.find((c) => c.id === tx.category_id);
    if (tx.type === 'income') return { label: cat?.name ? `Thu nhập · ${cat.name}` : 'Thu nhập' };
    if (tx.type === 'allocation') return { label: `Góp quỹ · ${cat?.name || 'Quỹ'}` };
    if (cat?.is_fund) return { label: `Rút từ quỹ · ${cat?.name || 'Quỹ'}` };
    if (tx.account_id) {
      const acc = accounts.find((a) => a.id === tx.account_id);
      return { label: `Ví · ${acc?.name || 'Không rõ'}` };
    }
    return { label: 'Thu nhập kỳ' };
  }
  const allPeriodTxsSorted = [...periodTxs].sort((a, b) => compareTxTime(b, a));
  function groupTxsByDate(txs) {
    const groups = {};
    txs.forEach((tx) => {
      const key = new Date(tx.date || tx.created_at).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }
  function formatTxDateLabel(dateStr) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }
  // Nhãn "Tháng .../Năm ..." dùng làm dòng ngăn cách giữa các tháng trong danh sách
  // "Hoạt động gần đây" — giúp dễ nhận biết ranh giới tháng khi danh sách kéo dài nhiều tháng.
  function formatTxMonthLabel(dateStr) {
    const pk = dateToPeriodKey(new Date(dateStr));
    const [py, pm] = pk.split('-').map(Number);
    const { start: pStart, end: pEnd } = periodKeyToRange(pk);
    const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `Kỳ tháng ${pm}/${py} (${dm(pStart)} - ${dm(pEnd)})`;
  }
  // So 2 key ngày (toDateString) có cùng KỲ tài chính (21 → 20) hay không — quyết định có chèn
  // dòng ngăn cách kỳ phía trên nhóm ngày đang xét hay không. Trước đây so theo tháng dương lịch
  // nên ranh giới bị cắt giữa kỳ (ngày 30/9 | 1/10) thay vì ở ngày 20 | 21.
  function isSameTxMonth(keyA, keyB) {
    if (!keyA || !keyB) return false;
    return dateToPeriodKey(new Date(keyA)) === dateToPeriodKey(new Date(keyB));
  }
  // (đã thay bằng groupedFilteredTxs/sortedFilteredTxKeys bên dưới, có áp thêm bộ lọc)

  // ===== Bộ lọc "Hoạt động gần đây" theo Loại giao dịch + Danh mục =====
  const ACTIVITY_KIND_LABELS = {
    income: 'Thu nhập',
    expense: 'Chi tiêu',
    fund_withdraw: 'Rút quỹ',
    allocation: 'Nạp quỹ',
    transfer: 'Chuyển khoản',
    adjustment: 'Cập nhật số dư',
  };
  function getTxKind(tx) {
    const cat = categories.find((c) => c.id === tx.category_id);
    if (tx.type === 'income') return 'income';
    if (tx.type === 'allocation') return 'allocation';
    if (tx.type === 'expense') return cat?.is_fund ? 'fund_withdraw' : 'expense';
    if (tx.type === 'transfer') return 'transfer';
    if (tx.type === 'adjustment') return 'adjustment';
    return 'other';
  }
  // Chỉ liệt kê những Loại thực sự có giao dịch trong kỳ đang xem, theo đúng thứ tự cố định.
  const activityKindsPresent = ['income', 'expense', 'fund_withdraw', 'allocation', 'transfer', 'adjustment']
    .filter((k) => allPeriodTxsSorted.some((tx) => getTxKind(tx) === k));
  // Danh mục cụ thể bên trong (các) Loại đang chọn (rỗng khi chọn "Tất cả loại", hoặc khi
  // (các) loại đang chọn không có danh mục như Chuyển khoản / Cập nhật số dư).
  const activityCategoryOptions = activityKindFilters.length === 0 ? [] : (() => {
    const seen = new Map();
    allPeriodTxsSorted
      .filter((tx) => activityKindFilters.includes(getTxKind(tx)) && tx.category_id)
      .forEach((tx) => {
        const cat = categories.find((c) => c.id === tx.category_id);
        if (cat && !seen.has(cat.id)) seen.set(cat.id, cat);
      });
    return Array.from(seen.values());
  })();
  function handleActivityKindChange(nextKinds) {
    captureActivityScrollAnchor();
    setActivityKindFilters(nextKinds);
    setActivityCategoryFilter('all');
  }
  function handleActivityCategoryChange(nextCat) {
    captureActivityScrollAnchor();
    setActivityCategoryFilter(nextCat);
  }
  const filteredActivityTxs = allPeriodTxsSorted.filter((tx) => {
    if (activityKindFilters.length > 0 && !activityKindFilters.includes(getTxKind(tx))) return false;
    if (activityCategoryFilter !== 'all' && tx.category_id !== activityCategoryFilter) return false;
    return true;
  });
  const groupedFilteredTxs = groupTxsByDate(filteredActivityTxs);
  const sortedFilteredTxKeys = Object.keys(groupedFilteredTxs).sort((a, b) => new Date(b) - new Date(a));

  

  

  // ==== [PHASE 3] Aggregate — chuyển sang calculatePeriodFinancials/calculateFinancialsForPeriods ====
  // Giữ nguyên TÊN biến cũ (income/allocation/expenseFromIncome/totalActualExpense/remaining) để
  // không phải sửa lại toàn bộ JSX bên dưới đang tham chiếu các tên này — nhưng GIÁ TRỊ giờ được
  // tính đúng theo logic Thu nhập được chi mới, KHÔNG còn dùng remaining = income - allocation - expense.
  const financials = periodKeysInRange
    ? calculateFinancialsForPeriods(periodKeysInRange, transactions, categories, spendingPoolByPeriod)
    : calculateFinancialsFromTxs(periodTxs, categories, null);
  const agg = financials;
  const income = financials.totalIncome;
  const allocation = financials.allocationFromSpendingPool;
  const expenseFromIncome = financials.expenseFromSpendingPool;
  const expenseFromFund = financials.expenseFromFund;
  const totalActualExpense = financials.totalActualExpense;
  const remaining = financials.remainingAfterSpend;
  // Các số liệu MỚI theo yêu cầu nghiệp vụ — dùng cho section "Thu nhập đã đi đâu?" + hover card
  const { incomeForSpendingPool, specialIncome, spendingPool, accumulationBeforeSpend, isOverSpendingPool } = financials;

  // Previous period — cùng logic financial period với getPeriod()
  const getPrevPeriod = () => {
    if (timeType === 'day') {
      const d = new Date(selectedDay); d.setDate(d.getDate()-1);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      return { start: s, end: e };
    } else if (timeType === 'week') {
      const d = new Date(selectedWeek); d.setDate(d.getDate()-7);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setDate(e.getDate()+6); e.setHours(23,59,59,999);
      return { start: s, end: e };
    } else if (timeType === 'month') {
      let m = selectedMonth - 1; let y = selectedYear;
      if (m === 0) { m = 12; y--; }
      return financialMonthRange(y, m);
    } else if (timeType === 'quarter') {
      let q = selectedQuarter - 1; let y = selectedYear;
      if (q === 0) { q = 4; y--; }
      return financialMultiMonthRange(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]);
    } else if (timeType === '6month') {
      let h = selectedHalf - 1; let y = selectedYear;
      if (h === 0) { h = 2; y--; }
      const months = h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
      return financialMultiMonthRange(y, months);
    } else if (timeType === 'year') {
      return financialMultiMonthRange(selectedYear - 1, [1,2,3,4,5,6,7,8,9,10,11,12]);
    } else if (timeType === 'custom') {
      const dur = end - start;
      const ps = new Date(start); ps.setTime(ps.getTime() - dur - 1000);
      const pe = new Date(end); pe.setTime(pe.getTime() - dur - 1000);
      return { start: ps, end: pe };
    }
    return null;
  };

  const prev = getPrevPeriod();
  const prevPeriodKeysInRange = (() => {
    if (timeType === 'month') { let m = selectedMonth - 1, y = selectedYear; if (m === 0) { m = 12; y--; } return [`${y}-${String(m).padStart(2, '0')}`]; }
    if (timeType === 'quarter') { let q = selectedQuarter - 1, y = selectedYear; if (q === 0) { q = 4; y--; } return periodKeysForMonths(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]); }
    if (timeType === '6month') { let h = selectedHalf - 1, y = selectedYear; if (h === 0) { h = 2; y--; } return periodKeysForMonths(y, h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]); }
    if (timeType === 'year') return periodKeysForMonths(selectedYear - 1, [1,2,3,4,5,6,7,8,9,10,11,12]);
    return null;
  })();
  let prevFinancials = { totalIncome: 0, allocationFromSpendingPool: 0, expenseFromSpendingPool: 0, expenseFromFund: 0, totalActualExpense: 0, remainingAfterSpend: 0 };
  if (prev) {
    if (prevPeriodKeysInRange) {
      prevFinancials = calculateFinancialsForPeriods(prevPeriodKeysInRange, transactions, categories, spendingPoolByPeriod);
    } else {
      const prevTxs = transactions.filter(t => {
        const d = new Date(t.date || t.created_at);
        return d >= prev.start && d <= prev.end;
      });
      prevFinancials = calculateFinancialsFromTxs(prevTxs, categories, null);
    }
  }
  const prevAgg = { income: prevFinancials.totalIncome, allocation: prevFinancials.allocationFromSpendingPool, expenseFromIncome: prevFinancials.expenseFromSpendingPool, expenseFromFund: prevFinancials.expenseFromFund, totalActualExpense: prevFinancials.totalActualExpense, remaining: prevFinancials.remainingAfterSpend };

  // ===== CHỐT SỔ TÀI SẢN ĐẦU / CUỐI KỲ (nguyên tắc kế toán: cut-off + số dư đầu kỳ = số dư cuối kỳ trước) =====
  // - Cuối kỳ = số dư CHỐT cuối ngày cuối kỳ (cuối ngày 20).
  // - Đầu kỳ  = số dư CHỐT cuối ngày liền trước ngày bắt đầu (cuối ngày 20 của kỳ trước), nên
  //   đầu kỳ này luôn BẰNG cuối kỳ trước; mọi giao dịch/lãi của ngày 21 thuộc hẳn kỳ mới.
  //   (Trước đây quỹ bị tính luôn cả ngày 21 vào đầu kỳ vì hàm tính theo ngày, còn ví thì không.)
  // - Kỳ CHƯA kết thúc: chỉ ghi nhận những gì đã xảy ra tới hiện tại, không cộng lãi dự kiến
  //   của những ngày chưa tới. Ví: mọi giao dịch có ngày ≤ hôm nay. Quỹ: fundBalanceWithProfit
  //   (lãi tới hết hôm qua + giao dịch hôm nay) — đúng số dư quỹ đang hiển thị ở các màn khác.
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const openingCutoff = new Date(start.getTime() - 1); // 23:59:59.999 ngày liền trước kỳ
  const totalAccountsEnd = accounts.reduce((s, a) => s + walletBalanceAsOf(a, transactions, end), 0);
  const fundCats = categories.filter(c => c.is_fund);
  const totalFundsEnd = fundCats.reduce((s, c) => s + fundBalanceAsOf(c, transactions, end), 0);
  const totalAssetsEnd = totalAccountsEnd + totalFundsEnd;
  // Tài sản đầu kỳ (chốt cuối ngày liền trước kỳ)
  const totalAccountsStart = accounts.reduce((s, a) => s + walletBalanceAsOf(a, transactions, openingCutoff), 0);
  const totalFundsStart = fundCats.reduce((s, c) => s + fundBalanceAsOf(c, transactions, openingCutoff), 0);
  const totalAssetsStart = totalAccountsStart + totalFundsStart;
  const isPeriodOngoing = end > endOfToday; // kỳ chưa kết thúc -> "cuối kỳ" thực chất là "tính đến hôm nay"
  const assetChange = totalAssetsStart > 0 ? ((totalAssetsEnd - totalAssetsStart) / totalAssetsStart) * 100 : null;

  // Income breakdown
  const incomeCats = categories.filter(c => c.type === 'income');
  const incomeBreakdown = incomeCats.map(c => ({
    ...c,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

  // Expense breakdown — chỉ tính danh mục chi tiêu thường (không gồm quỹ, quỹ đã có mục riêng ở trên)
  const expenseCats = categories.filter(c => c.type === 'expense' && !c.is_fund);
  const expenseBreakdown = expenseCats.map(c => ({
    ...c,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    fromIncome: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense' && t.account_id === null).reduce((s, t) => s + Number(t.amount), 0),
    fromWallet: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense' && t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

  // Hover-card breakdown data (dùng đúng periodTxs / mốc "end" của filter thời gian đang chọn)
  const incomeDetailItems = incomeBreakdown.map(c => ({ key: c.id, name: c.name, amount: c.amount }));
  const poolIncomeDetailItems = incomeBreakdown.filter(c => c.include_in_spending_pool !== false).map(c => ({ key: c.id, name: c.name, amount: c.amount }));
  // Các mục cấu thành "Còn lại" của kỳ — luôn liệt kê đủ cả 3 mục (Thu nhập được chi,
  // Nạp quỹ, Chi tiêu) dù mục đó có phát sinh biến động (giao dịch) trong kỳ hay không.
  const expenseFundWithdrawn = fundCats.map(c => ({
    key: c.id,
    name: c.name,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
  })).filter(c => c.amount > 0);
  const expenseDetailItems = [
    ...expenseBreakdown.map(c => ({ key: c.id, name: c.name, amount: c.amount })),
    ...expenseFundWithdrawn,
  ].sort((a, b) => b.amount - a.amount);
  const assetWalletItems = accounts.filter(a => a.type !== 'gold').map(a => ({ key: a.id, name: a.name, amount: walletBalanceAsOf(a, transactions, end) }));
  const assetGoldItems = accounts.filter(a => a.type === 'gold').map(a => ({ key: a.id, name: a.name, amount: walletBalanceAsOf(a, transactions, end) }));
  const assetFundItems = fundCats.map(c => ({ key: c.id, name: c.name, amount: fundBalanceAsOf(c, transactions, end) }));
  // "Còn lại" của kỳ = Thu nhập được chi còn lại + số dư cuối kỳ của TỪNG quỹ + TỪNG ví
  // (không gộp tổng), liệt kê đủ mọi quỹ/ví hiện có, dù kỳ đó quỹ/ví đó có biến động số dư hay không.
  const remainingWalletTotal = assetWalletItems.reduce((s, w) => s + w.amount, 0);
  const remainingFundTotal = assetFundItems.reduce((s, f) => s + f.amount, 0);
  const totalRemainingAll = remaining + remainingFundTotal + remainingWalletTotal;

  // Fund data
  const fundData = fundCats.map(c => {
    const balanceNow = fundBalanceAsOf(c, transactions, end); // chốt cuối kỳ (hoặc tới hôm nay nếu kỳ chưa kết thúc)
    const contributed = periodTxs.filter(t => t.category_id === c.id && t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
    const withdrawn = periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const target = Number(c.target_amount || 0);
    const progress = target > 0 ? Math.min(100, (balanceNow / target) * 100) : 0;
    return { ...c, balanceNow, contributed, withdrawn, target, progress };
  }).filter(f => f.contributed > 0 || f.withdrawn > 0 || f.balanceNow > 0).sort((a,b) => b.contributed - a.contributed);
  // FIX "% sau mỗi dòng quỹ lên tới vài trăm %": % này trước đây lấy contributed (nạp quỹ
  // CỦA RIÊNG quỹ đó trong kỳ, tính TẤT CẢ nguồn — kể cả nạp lần đầu và nạp thẳng từ ví)
  // chia cho `allocation` = financials.allocationFromSpendingPool, vốn là một con số KHÁC
  // hẳn về bản chất: chỉ tính phần nạp quỹ lấy từ "Thu nhập được chi" của kỳ, và CỐ Ý loại
  // trừ khoản nạp lần đầu lẫn khoản nạp thẳng từ ví/tài khoản (xem định nghĩa ở
  // calculatePeriodFinancials). Vì 2 con số đo 2 phạm vi khác nhau (không phải tử số luôn
  // là 1 phần của mẫu số), tỉ lệ này hoàn toàn có thể vượt 100%, thậm chí vài trăm % —
  // không phải lỗi hiển thị nhỏ mà là sai bản chất phép tính. Đổi mẫu số thành tổng
  // "contributed" của TẤT CẢ quỹ trong kỳ — đúng ý nghĩa "quỹ này chiếm bao nhiêu % trong
  // tổng tiền đã nạp vào mọi quỹ kỳ này", luôn ở khoảng 0-100% và cộng dồn lại ra đúng 100%.
  const totalContributedAllFunds = fundData.reduce((s, f) => s + f.contributed, 0);

  // Trends: if year, show 12 tháng (kỳ tài chính); if quarter/6month, show các tháng trong đó.
  // Luôn tính theo financial period (21 → 20), không dùng tháng lịch.
  const trendData = (() => {
    function monthsAgg(year, monthList) {
      return monthList.map((m) => {
        const pk = `${year}-${String(m).padStart(2, '0')}`;
        const a = calculatePeriodFinancials(pk, transactions, categories, spendingPoolByPeriod?.[pk]);
        return { label: `Th${m}`, month: m, year, income: a.totalIncome, allocation: a.allocationFromSpendingPool, expenseFromIncome: a.expenseFromSpendingPool, expenseFromFund: a.expenseFromFund, totalActualExpense: a.totalActualExpense, remaining: a.remainingAfterSpend };
      });
    }
    if (timeType === 'year') return monthsAgg(selectedYear, [1,2,3,4,5,6,7,8,9,10,11,12]);
    if (timeType === 'quarter') { const sm = (selectedQuarter-1)*3; return monthsAgg(selectedYear, [sm+1, sm+2, sm+3]); }
    if (timeType === '6month') { const sm = (selectedHalf-1)*6; return monthsAgg(selectedYear, Array.from({length:6}, (_,i)=>sm+i+1)); }
    return [];
  })();

  // Tổng kết năm (chỉ khi đang xem theo Năm) — dựa trên trendData 12 tháng đã tính ở trên
  const yearSummary = (() => {
    if (timeType !== 'year' || trendData.length === 0) return null;
    const pick = (key) => trendData.reduce((best, m) => (m[key] > (best ? best[key] : -Infinity) ? m : best), null);
    return {
      topIncomeMonth: pick('income'),
      topAllocationMonth: pick('allocation'),
      topExpenseMonth: pick('totalActualExpense'),
      topRemainingMonth: pick('remaining'),
    };
  })();

  // Insights
  const insights = [];
  const incomeChange = prevAgg.income > 0 ? ((income - prevAgg.income) / prevAgg.income) * 100 : null;
  if (incomeChange !== null && Math.abs(incomeChange) > 5) {
    insights.push({
      icon: incomeChange > 0 ? TrendingUp : TrendingDown,
      title: incomeChange > 0 ? 'Thu nhập tăng' : 'Thu nhập giảm',
      desc: `Thu nhập ${incomeChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(incomeChange))}% so với kỳ trước.`,
      color: incomeChange > 0 ? 'text-turquoise' : 'text-cotton-candy'
    });
  }
  const savingRate = income > 0 ? Math.round((allocation / income) * 100) : 0;
  insights.push({
    icon: PiggyBank,
    title: 'Tỷ lệ góp quỹ',
    desc: `Bạn đã dành ${savingRate}% thu nhập để góp quỹ.`,
    color: 'text-turquoise'
  });
  if (expenseBreakdown.length > 0) {
    const top = expenseBreakdown[0];
    insights.push({
      icon: Wallet,
      title: 'Chi tiêu lớn nhất',
      desc: `Danh mục "${top.name}" chiếm ${totalActualExpense > 0 ? Math.round((top.amount / totalActualExpense) * 100) : 0}% tổng chi.`,
      color: 'text-cotton-candy'
    });
  }
  if (isOverSpendingPool) {
    insights.push({
      icon: AlertTriangle,
      title: 'Vượt Thu nhập được chi',
      desc: `Nạp quỹ + chi tiêu từ Thu nhập được chi đã vượt quá số tiền được phép chi (${formatMoney(spendingPool)}) của kỳ.`,
      color: 'text-cotton-candy'
    });
  }
  if (assetChange !== null && Math.abs(assetChange) > 3) {
    insights.push({
      icon: CircleDollarSign,
      title: assetChange > 0 ? 'Tài sản tăng' : 'Tài sản giảm',
      desc: `Tổng tài sản ${assetChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(assetChange))}% so với đầu kỳ.`,
      color: assetChange > 0 ? 'text-turquoise' : 'text-cotton-candy'
    });
  }
  // Goal progress
  const activeGoals = goals.filter(g => g.status !== 'Hoàn thành');
  if (activeGoals.length > 0) {
    const goal = activeGoals[0];
    const pct = goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
    insights.push({
      icon: Target,
      title: `Mục tiêu "${goal.name}"`,
      desc: `Đạt ${Math.round(pct)}% mục tiêu.`,
      color: 'text-lavender'
    });
  }

  // Drilldown state
  const [drilldownCategory, setDrilldownCategory] = useState(null);
  const [drilldownTransactions, setDrilldownTransactions] = useState([]);
  const [showDrilldown, setShowDrilldown] = useState(false);
  useEscapeKey(() => setShowDrilldown(false), showDrilldown);

  // Ledger modal state — dùng cho nút "Xem chi tiết" trong popup hover của các thẻ
  // tổng kết (Thu nhập / Thu nhập được chi / Thu nhập đặc biệt / Chi tiêu).
  const [ledgerModal, setLedgerModal] = useState(null); // { title, txs } | null

  // Danh sách giao dịch thô (chưa gộp theo danh mục) cho từng thẻ — dùng để render
  // bảng chi tiết trong TxLedgerModal, khớp với cách tính income/spendingPool/specialIncome/
  // totalActualExpense ở trên (calculateFinancialsFromTxs).
  const incomeLedgerTxs = periodTxs.filter((t) => t.type === 'income');
  const poolIncomeLedgerTxs = periodTxs.filter((t) => {
    if (t.type !== 'income') return false;
    const c = categories.find((c2) => c2.id === t.category_id);
    return c ? c.include_in_spending_pool !== false : true;
  });
  const expenseLedgerTxs = periodTxs.filter((t) => t.type === 'expense');

  function openDrilldown(categoryId, txType = 'expense') {
    const cat = categories.find(c => c.id === categoryId);
    const txs = periodTxs.filter(t => t.category_id === categoryId && t.type === txType)
      .sort((a,b) => compareTxTime(b, a));
    setDrilldownCategory(cat);
    setDrilldownTransactions(txs);
    setShowDrilldown(true);
  }

  // Format period label for header
  const getPeriodLabel = () => {
    if (timeType === 'day') return `Ngày ${new Date(selectedDay).toLocaleDateString('vi-VN')}`;
    if (timeType === 'week') return `Tuần ${new Date(selectedWeek).toLocaleDateString('vi-VN')} - ${new Date(new Date(selectedWeek).getTime()+6*86400000).toLocaleDateString('vi-VN')}`;
    if (timeType === 'month') return `Tháng ${selectedMonth}/${selectedYear}`;
    if (timeType === 'quarter') return `Quý ${selectedQuarter}/${selectedYear}`;
    if (timeType === '6month') return `${selectedHalf === 1 ? 'H1' : 'H2'}/${selectedYear}`;
    if (timeType === 'year') return `Năm ${selectedYear}`;
    if (timeType === 'custom') return `${new Date(customStart).toLocaleDateString('vi-VN')} - ${new Date(customEnd).toLocaleDateString('vi-VN')}`;
    return '';
  };

  const periodLabel = getPeriodLabel();

  // Mọi thứ các component trình bày bên dưới cần dùng
  return {
    accounts, accumulationBeforeSpend, ACTIVITY_KIND_LABELS, activityAnchorDesktopRef, activityAnchorMobileRef, activityCategoryFilter,
    activityCategoryOptions, activityKindFilters, activityKindsPresent, agg, allocation, allPeriodTxsSorted,
    assetChange, assetFundItems, assetGoldItems, assetWalletItems, captureIncomeCardScrollAnchor, categories,
    customEnd, customStart, drilldownCategory, drilldownTransactions, editingTx, expenseBreakdown,
    expenseDetailItems, expenseFromFund, expenseFromIncome, expenseLedgerTxs, filteredActivityTxs, formatTxDateLabel,
    formatTxMonthLabel, fundData, getTxSource, goals, groupedFilteredTxs, handleActivityCategoryChange,
    handleActivityKindChange, handleDeleteTx, income, incomeBreakdown, incomeCardDesktopRef, incomeCardMobileRef,
    incomeDetailItems, incomeForSpendingPool, incomeLedgerTxs, insights, isOverSpendingPool, isPeriodOngoing,
    isSameTxMonth, ledgerModal, openDrilldown, openFund, periodLabel, poolIncomeDetailItems,
    poolIncomeLedgerTxs, prevAgg, reload, remaining, selectedDay, selectedHalf,
    selectedMonth, selectedQuarter, selectedWeek, selectedYear, setCustomEnd, setCustomStart,
    setEditingTx, setLedgerModal, setScreen, setSelectedDay, setSelectedHalf, setSelectedMonth,
    setSelectedQuarter, setSelectedWeek, setSelectedYear, setShowDrilldown, setShowExportModal, setTimeType,
    showDrilldown, showExportModal, sortedFilteredTxKeys, specialIncome, spendingPool, spendingPoolByPeriod,
    theme, timeType, totalActualExpense, totalAssetsEnd, totalAssetsStart, totalContributedAllFunds,
    totalRemainingAll, transactions, trendData, yearSummary,
  };
}
