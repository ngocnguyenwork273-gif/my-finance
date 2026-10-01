/* ==============================================================================
   Màn Báo cáo.
   ============================================================================== */
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import DateField from '../DateField';
import { CustomSelect } from '../components/inputs';
import { AssetBreakdownDetail, BreakdownDetailList, TxDeleteButton, TxLedgerModal } from '../components/ledger';
import { ChartTooltip, EmojiCircle, HoverDetailCard, ProgressBar } from '../components/ui';
import { useAppData, useShell } from '../context';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { EditTransaction } from '../forms/EditTransaction';
import { useChartTooltip } from '../hooks';
import { AlertTriangle, CircleDollarSign, Clock, FileText, PiggyBank, Target, TrendingDown, TrendingUp, Wallet, X } from '../icons';
import { calculateFinancialsForPeriods, calculateFinancialsFromTxs, calculatePeriodFinancials, compareTxTime, currentPeriodKey, dateToPeriodKey, displayTxNote, financialMonthRange, financialMultiMonthRange, fundBalanceAsOf, localDateStr, periodKeyToRange, periodKeysForMonths, stripPeriodTag, todayDateStr, walletBalanceAsOf } from '../lib/finance';
import { formatMoney, formatMoneySigned, txDeleteDescription } from '../lib/format';
import { txBalanceAfter, txIconEmoji } from '../lib/ledger';
import { ReportExportModal } from './ReportExport';
import { MonthlyTrendChart, MultiSelectFilter, RemainingBreakdownDetail } from './ReportParts';

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

export function Report() {
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

  // Component filter dùng chung cho cả bản mobile lẫn desktop của "Hoạt động gần đây".
  function ActivityFilterBar({ compact = false }) {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'mb-4'}`}>
        <MultiSelectFilter
          label="Tất cả loại"
          options={activityKindsPresent.map((k) => ({ value: k, label: ACTIVITY_KIND_LABELS[k] }))}
          selected={activityKindFilters}
          onChange={handleActivityKindChange}
          triggerClassName={`frost-inset rounded-full font-bold outline-none text-blueberry dark:text-white ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}
        />
        {activityCategoryOptions.length > 0 && (
          <CustomSelect
            value={activityCategoryFilter}
            onChange={(e) => handleActivityCategoryChange(e.target.value)}
            triggerClassName={`frost-inset rounded-full font-bold outline-none text-blueberry dark:text-white ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}
          >
            <option value="all">Tất cả danh mục</option>
            {activityCategoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>
            ))}
          </CustomSelect>
        )}
      </div>
    );
  }

  function TxDetailRow({ tx }) {
    const cat = categories.find((c) => c.id === tx.category_id);
    const src = getTxSource(tx);
    const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
    const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
    const timeLabel = new Date(tx.created_at || tx.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
    // [SET] Đặt số dư mới: ghi chú hiển thị con số thực tế "Số dư mới" thay vì
    // chữ tĩnh "Đặt số dư mới" chung chung, để người dùng biết ngay giá trị đã đặt.
    const noteText = isDirectSet
      ? (balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : stripPeriodTag((tx.note || '').replace('[SET] ', '')))
      : displayTxNote(tx.note);
    return (
      <div onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
        <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={40} bg={tx.type === 'expense' ? '#E3D6FF' : '#B4F1F1'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-blueberry dark:text-white font-bold text-sm truncate">{tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'))}</p>
            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full flex-shrink-0">Vượt hạn mức</span>}
          </div>
          {noteText && <p className="text-steel dark:text-light-grey text-xs truncate">{noteText}</p>}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-steel dark:text-light-grey text-[11px] flex items-center gap-1"><Clock size={11} />{timeLabel}</span>
            <span className="text-[11px] font-semibold text-baby-blue">{src.label}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`font-bold text-sm ${tx.type === 'expense' ? 'text-cotton-candy' : tx.type === 'adjustment' ? (Number(tx.amount) < 0 ? 'text-cotton-candy' : 'text-turquoise') : 'text-turquoise'}`}>{tx.type === 'expense' ? '-' : tx.type === 'adjustment' ? (Number(tx.amount) < 0 ? '-' : '+') : '+'}{formatMoney(tx.amount)}</p>
          {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
        </div>
        <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
      </div>
    );
  }

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

  // Stacked bar component
  // Donut chart dùng chung — thay cho StackedBar cũ (thanh ngang) theo yêu cầu đổi
  // sang biểu đồ tròn, có tooltip khi hover từng phần + chú thích màu bên cạnh.
  function DonutChart({ data, total: totalOverride }) {
    const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
    const [hoverIdx, setHoverIdx] = useState(null); // index lát đang hover, để lát đó nổi bật + các lát khác mờ đi
    const sumValues = data.reduce((s, d) => s + d.value, 0);
    // Cho phép truyền total riêng (vd: Thu nhập được chi) thay vì tự cộng dồn data —
    // để % hiển thị khớp với phần chữ bên cạnh, và khi tiêu vượt mức thì các lát cắt
    // sẽ chồng lấn ra ngoài 100% một chút thay vì luôn khép tròn đủ 100% gây hiểu lầm.
    const total = totalOverride != null && totalOverride > 0 ? totalOverride : sumValues;
    if (total === 0) return <div className="text-center text-steel dark:text-light-grey py-6">Không có dữ liệu</div>;
    let cumulative = 0;
    const segments = data.filter((d) => d.value > 0).map((d) => {
      const pct = (d.value / total) * 100;
      const seg = { ...d, pct, dashoffset: -cumulative };
      cumulative += pct;
      return seg;
    });
    return (
      <div ref={wrapRef} className="relative flex items-center gap-6 flex-wrap justify-center">
        <ChartTooltip tip={tip} />
        <svg viewBox="0 0 42 42" className="w-36 h-36 flex-shrink-0 -rotate-90">
          <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-ice-cream dark:stroke-[#2b2b46]" />
          {segments.map((seg, i) => {
            const isHovered = hoverIdx === i;
            const isDimmed = hoverIdx !== null && !isHovered;
            return (
              <circle
                key={i}
                cx="21" cy="21" r="15.9155" fill="none"
                stroke={seg.color} strokeWidth={isHovered ? 6.5 : 5}
                strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                strokeDashoffset={seg.dashoffset}
                className="cursor-pointer"
                style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.18s ease, stroke-width 0.18s ease' }}
                onMouseMove={(e) => { setHoverIdx(i); showTip(e, { label: seg.label, value: formatMoney(seg.value), pct: Math.round(seg.pct) }); }}
                onMouseLeave={() => { setHoverIdx(null); hideTip(); }}
              />
            );
          })}
        </svg>
        <div className="flex flex-col gap-2">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-center gap-2 cursor-pointer rounded-lg px-1 -mx-1 transition-opacity duration-150"
              style={{ opacity: hoverIdx !== null && hoverIdx !== i ? 0.4 : 1 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-blueberry dark:text-white text-sm font-semibold">{seg.label}</span>
              <span className="text-steel dark:text-light-grey text-xs">{formatMoney(seg.value)} ({Math.round(seg.pct)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <h1 className="text-blueberry dark:text-white text-lg font-bold">Báo cáo</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowExportModal(true)} title="Xuất báo cáo PDF" className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><FileText size={17} className="text-blueberry dark:text-white" /></button>
              <button aria-label="Đóng" onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
            </div>
          </div>
          <div onClickCapture={captureIncomeCardScrollAnchor} onChangeCapture={captureIncomeCardScrollAnchor} className="px-5 mt-2">
            <CustomSelect value={timeType} onChange={(e) => setTimeType(e.target.value)} className="" triggerClassName="w-full frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="quarter">Quý</option>
              <option value="6month">6 tháng</option>
              <option value="year">Năm</option>
              <option value="custom">Tùy chỉnh</option>
            </CustomSelect>
            {timeType === 'day' && <DateField value={selectedDay} onChange={setSelectedDay} className="w-full justify-between mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />}
            {timeType === 'week' && <DateField value={selectedWeek} onChange={setSelectedWeek} className="w-full justify-between mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />}
            {timeType === 'month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m}</option>)}
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === 'quarter' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === '6month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedHalf} onChange={(e) => setSelectedHalf(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>H1</option><option value={2}>H2</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === 'year' && (
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
            )}
            {timeType === 'custom' && (
              <div className="flex gap-2 mt-2">
                <DateField value={customStart} onChange={setCustomStart} className="flex-1 justify-between frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />
                <DateField value={customEnd} onChange={setCustomEnd} align="right" className="flex-1 justify-between frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />
              </div>
            )}
          </div>
          <div className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Tổng quan</h2>
            <p className="text-steel dark:text-light-grey text-[11px] mb-2">Chạm vào 1 dòng để xem chi tiết</p>
            <div className="grid grid-cols-1 gap-2">
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<AssetBreakdownDetail wallets={assetWalletItems} funds={assetFundItems} gold={assetGoldItems} total={totalAssetsEnd} />}>
                <span className="text-steel dark:text-light-grey">Tài sản (cuối kỳ)</span><span className="font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Tổng thu nhập" items={incomeDetailItems} total={income} colorClass="text-turquoise" onViewDetail={() => setLedgerModal({ title: `Thu nhập — ${periodLabel}`, txs: incomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập{specialIncome > 0 && <span className="block text-[10px] text-lavender font-semibold">Trong đó, đặc biệt: {formatMoney(specialIncome)}</span>}</span><span className="font-bold text-turquoise">{formatMoney(income)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Thu nhập được chi" items={poolIncomeDetailItems} total={spendingPool} colorClass="text-baby-blue" onViewDetail={() => setLedgerModal({ title: `Thu nhập được chi — ${periodLabel}`, txs: poolIncomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập được chi</span><span className="font-bold text-baby-blue">{formatMoney(spendingPool)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Chi tiêu</span><span className="font-bold text-cotton-candy">{formatMoney(totalActualExpense)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<RemainingBreakdownDetail pool={remaining} funds={assetFundItems} wallets={assetWalletItems} total={totalRemainingAll} />}>
                <span className="text-steel dark:text-light-grey">Còn lại</span><span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</span>
              </HoverDetailCard>
            </div>
          </div>
          <div ref={incomeCardMobileRef} className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-1">Thu nhập đã đi đâu?</h2>
            <p className="text-steel dark:text-light-grey text-[11px] mb-3">Tổng thu nhập → Thu nhập được chi + Thu nhập đặc biệt</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Tổng thu nhập</span><span className="font-bold text-blueberry dark:text-white">{formatMoney(income)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey pl-3">— Thu nhập tính vào Thu nhập được chi</span><span className="font-semibold text-baby-blue">{formatMoney(incomeForSpendingPool)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey pl-3">— Thu nhập đặc biệt</span><span className="font-semibold text-lavender">{formatMoney(specialIncome)}</span></div>
            </div>
            <div className="border-t border-[rgba(126,127,144,0.2)] dark:border-[rgba(189,189,203,0.15)] my-3" />
            <p className="text-steel dark:text-light-grey text-xs font-bold mb-1">Trong Thu nhập được chi ({formatMoney(spendingPool)})</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Nạp quỹ</span><span className="font-bold text-baby-blue">{formatMoney(allocation)}</span></div>
              <div className="flex justify-between"><span>Chi tiêu</span><span className="font-bold text-cotton-candy">{formatMoney(expenseFromIncome)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-bold">Dư sau chi</span><span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</span></div>
            </div>
            {accumulationBeforeSpend > 0 && (
              <p className="text-xs text-lavender mt-2 font-semibold">Tích lũy trước chi: {formatMoney(accumulationBeforeSpend)}</p>
            )}
            {expenseFromFund > 0 && (
              <p className="text-xs text-steel dark:text-light-grey mt-2">Chi từ tiền đã tích lũy (quỹ): <span className="font-bold text-blueberry dark:text-white">{formatMoney(expenseFromFund)}</span> — không trừ vào Dư sau chi.</p>
            )}
            {isOverSpendingPool && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Đã sử dụng vượt quá Thu nhập được chi của kỳ này.</p>}
          </div>
          <div className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Top chi tiêu</h2>
            {expenseBreakdown.slice(0,3).map(c => (
              <div key={c.id} className="flex justify-between py-1"><span>{c.name}</span><span className="font-bold text-cotton-candy">{formatMoney(c.amount)}</span></div>
            ))}
          </div>

          <div data-report-anchor="recent-activity" ref={activityAnchorMobileRef} className="px-5 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-base">Hoạt động gần đây</h2>
              <ActivityFilterBar compact />
            </div>
            {filteredActivityTxs.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-4">
                {allPeriodTxsSorted.length === 0 ? 'Không có giao dịch nào trong khoảng thời gian này.' : 'Không có giao dịch nào khớp bộ lọc.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedFilteredTxKeys.map((key, i) => (
                  <Fragment key={key}>
                    {!isSameTxMonth(key, sortedFilteredTxKeys[i - 1]) && (
                      <div className="flex items-center gap-2 mt-1 first:mt-0">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-turquoise whitespace-nowrap">{formatTxMonthLabel(key)}</span>
                        <div className="flex-1 h-px bg-[rgba(189,189,203,0.25)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-steel dark:text-light-grey mb-1">{formatTxDateLabel(key)}</p>
                      <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                        {groupedFilteredTxs[key].map((tx) => <TxDetailRow key={tx.id} tx={tx} />)}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-[600px] -left-10" />
        <div className="relative flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Báo cáo &amp; Phân tích</h1>
            <button onClick={() => setShowExportModal(true)} className="frost-inset rounded-full text-sm font-bold px-4 py-2 flex items-center gap-2 text-blueberry dark:text-white"><FileText size={15} className="text-turquoise" /> Xuất PDF</button>
          </div>
          <div onClickCapture={captureIncomeCardScrollAnchor} onChangeCapture={captureIncomeCardScrollAnchor} className="flex items-center gap-2 flex-wrap">
            <CustomSelect value={timeType} onChange={(e) => setTimeType(e.target.value)} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="quarter">Quý</option>
              <option value="6month">6 tháng</option>
              <option value="year">Năm</option>
              <option value="custom">Tùy chỉnh</option>
            </CustomSelect>
            {timeType === 'day' && <DateField value={selectedDay} onChange={setSelectedDay} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />}
            {timeType === 'week' && <DateField value={selectedWeek} onChange={setSelectedWeek} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />}
            {timeType === 'month' && (
              <>
                <CustomSelect value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m}</option>)}
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === 'quarter' && (
              <>
                <CustomSelect value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === '6month' && (
              <>
                <CustomSelect value={selectedHalf} onChange={(e) => setSelectedHalf(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>H1</option><option value={2}>H2</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === 'year' && (
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
            )}
            {timeType === 'custom' && (
              <>
                <DateField value={customStart} onChange={setCustomStart} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />
                <DateField value={customEnd} onChange={setCustomEnd} align="right" className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />
              </>
            )}
          </div>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-2">Tổng kết {periodLabel}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><p className="text-steel dark:text-light-grey text-sm">Thu nhập</p><p className="text-xl font-bold text-turquoise">{formatMoney(income)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Góp quỹ</p><p className="text-xl font-bold text-baby-blue">{formatMoney(allocation)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Chi tiêu</p><p className="text-xl font-bold text-cotton-candy">{formatMoney(totalActualExpense)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Tài sản đầu kỳ</p><p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsStart)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Tài sản cuối kỳ</p><p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</p></div>
          </div>
          {assetChange !== null && (
            <p className={`text-sm mt-2 ${assetChange >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>
              {assetChange >= 0 ? '▲' : '▼'} {Math.abs(Math.round(assetChange))}% so với đầu kỳ
            </p>
          )}
          {isPeriodOngoing && (
            <p className="text-steel dark:text-light-grey text-xs mt-1">Kỳ chưa kết thúc — Tài sản cuối kỳ đang tính đến hôm nay. Tài sản đầu kỳ chốt cuối ngày liền trước kỳ (bằng cuối kỳ trước).</p>
          )}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-6 mb-6">
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<AssetBreakdownDetail wallets={assetWalletItems} funds={assetFundItems} gold={assetGoldItems} total={totalAssetsEnd} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Tổng tài sản</p>
            <p className="text-blueberry dark:text-white text-2xl font-bold">{formatMoney(totalAssetsEnd)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Tổng thu nhập" items={incomeDetailItems} total={income} colorClass="text-turquoise" onViewDetail={() => setLedgerModal({ title: `Thu nhập — ${periodLabel}`, txs: incomeLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Thu nhập</p>
            <p className="text-turquoise text-2xl font-bold">{formatMoney(income)}</p>
            {specialIncome > 0 && (
              <p className="text-lavender text-[11px] font-semibold mt-1">Trong đó, đặc biệt: {formatMoney(specialIncome)}</p>
            )}
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Thu nhập được chi" items={poolIncomeDetailItems} total={spendingPool} colorClass="text-baby-blue" onViewDetail={() => setLedgerModal({ title: `Thu nhập được chi — ${periodLabel}`, txs: poolIncomeLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Thu nhập được chi</p>
            <p className="text-baby-blue text-2xl font-bold">{formatMoney(spendingPool)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Chi tiêu</p>
            <p className="text-cotton-candy text-2xl font-bold">{formatMoney(totalActualExpense)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            align="right"
            detail={<RemainingBreakdownDetail pool={remaining} funds={assetFundItems} wallets={assetWalletItems} total={totalRemainingAll} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Còn lại</p>
            <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p>
          </HoverDetailCard>
        </div>

 <div ref={incomeCardDesktopRef} className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Thu nhập đã đi đâu?</h2>
          <p className="text-steel dark:text-light-grey text-xs font-semibold mb-4">Tổng thu nhập → Thu nhập được chi + Thu nhập đặc biệt (không tự động tăng Thu nhập được chi)</p>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-steel dark:text-light-grey">Tổng thu nhập</span>
                  <span className="font-bold text-blueberry dark:text-white">{formatMoney(income)}</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-steel dark:text-light-grey">— Thu nhập tính vào Thu nhập được chi</span>
                  <span className="font-semibold text-baby-blue">{formatMoney(incomeForSpendingPool)}</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-steel dark:text-light-grey">— Thu nhập đặc biệt</span>
                  <span className="font-semibold text-lavender">{formatMoney(specialIncome)}</span>
                </div>
                {accumulationBeforeSpend > 0 && (
                  <div className="flex justify-between pl-3">
                    <span className="text-steel dark:text-light-grey">— Tích lũy trước chi</span>
                    <span className="font-semibold text-lavender">{formatMoney(accumulationBeforeSpend)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-[rgba(126,127,144,0.2)] dark:border-[rgba(189,189,203,0.15)] my-4" />
              <p className="text-steel dark:text-light-grey text-xs font-bold mb-2">Trong Thu nhập được chi ({formatMoney(spendingPool)})</p>
              <div className="space-y-2">
                <button onClick={() => setScreen('funds')} className="w-full flex justify-between text-left hover:opacity-70 transition">
                  <span className="text-steel dark:text-light-grey">Nạp quỹ</span>
                  <span className="font-bold text-baby-blue">{formatMoney(allocation)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((allocation/spendingPool)*100)}%)</span>}</span>
                </button>
                <div className="flex justify-between">
                  <span className="text-steel dark:text-light-grey">Chi tiêu</span>
                  <span className="font-bold text-cotton-candy">{formatMoney(expenseFromIncome)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((expenseFromIncome/spendingPool)*100)}%)</span>}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Dư sau chi</span>
                  <span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((remaining/spendingPool)*100)}%)</span>}</span>
                </div>
              </div>
              {expenseFromFund > 0 && (
                <p className="text-xs text-steel dark:text-light-grey mt-3">Chi tiêu từ tiền đã tích lũy (quỹ): <span className="font-bold text-blueberry dark:text-white">{formatMoney(expenseFromFund)}</span> — không trừ vào Dư sau chi ở trên.</p>
              )}
            </div>
            <div className="flex-1">
              <DonutChart total={spendingPool} data={[
                { label: 'Nạp quỹ', value: allocation, color: '#74ACEF' },
                { label: 'Chi tiêu', value: expenseFromIncome, color: '#F18AB5' },
                { label: 'Dư sau chi', value: Math.max(0, remaining), color: '#0DBACC' }
              ]} />
              {isOverSpendingPool && <p className="text-cotton-candy text-xs mt-2 text-center">⚠️ Đã sử dụng vượt quá Thu nhập được chi của kỳ này.</p>}
            </div>
          </div>
        </div>

 {/* Thu nhập theo danh mục & Chi tiêu theo danh mục — đặt ngang hàng nhau (grid 2 cột
            trên desktop, xếp dọc trên màn hẹp) thay vì tách rời như trước. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="frost-card rounded-3xl p-6 min-w-0">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Thu nhập theo danh mục</h2>
            {incomeBreakdown.length === 0 ? <p className="text-steel dark:text-light-grey">Không có thu nhập.</p> : (
              <div className="grid grid-cols-2 gap-2">
                {incomeBreakdown.map(c => (
                  <button key={c.id} onClick={() => openDrilldown(c.id, 'income')} className="flex justify-between frost-inset rounded-xl px-4 py-2 text-left hover:bg-turquoise/10 transition">
                    <span>{c.icon} {c.name}</span>
                    <span className="font-bold text-turquoise">{formatMoney(c.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="frost-card rounded-3xl p-6 min-w-0">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Chi tiêu theo danh mục</h2>
            {expenseBreakdown.length === 0 ? <p className="text-steel dark:text-light-grey">Không có chi tiêu.</p> : (
              <div className="grid grid-cols-1 gap-3">
                {expenseBreakdown.map(c => {
                  const total = c.fromIncome + c.fromWallet;
                  const nonFundTotal = expenseFromIncome + agg.expenseFromWallet;
                  const pct = nonFundTotal > 0 ? Math.round((total / nonFundTotal) * 100) : 0;
                  return (
                    <button key={c.id} onClick={() => openDrilldown(c.id)} className="frost-inset rounded-xl px-4 py-3 text-left hover:bg-turquoise/10 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blueberry dark:text-white">{c.icon} {c.name}</span>
                        <span className="font-bold text-cotton-candy">{formatMoney(total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-light-grey/30 rounded-full mt-1">
                        <div className="h-full bg-cotton-candy rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-steel dark:text-light-grey mt-1">
                        <span>{pct}%</span>
                        <span>{c.fromIncome > 0 ? `Từ thu nhập: ${formatMoney(c.fromIncome)}` : ''}</span>
                        <span>{c.fromWallet > 0 ? `Từ ví: ${formatMoney(c.fromWallet)}` : ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Hoạt động quỹ</h2>
          {fundData.length === 0 ? <p className="text-steel dark:text-light-grey">Không có hoạt động quỹ.</p> : (
            <>
              <div className="space-y-3">
                {fundData.slice(0,5).map(f => (
                  <button key={f.id} onClick={() => openFund(f.id, 'report')} className="w-full flex items-center justify-between border-b last:border-0 py-2 text-left hover:bg-turquoise/5 transition rounded-lg px-1">
                    <div><p className="font-bold text-blueberry dark:text-white">{f.icon} {f.name}</p><p className="text-xs text-steel dark:text-light-grey">Số dư hiện tại: {formatMoney(f.balanceNow)}</p></div>
                    <div className="text-right">
                      {f.contributed > 0 && <p className="text-sm text-turquoise">+{formatMoney(f.contributed)} {totalContributedAllFunds > 0 && <span className="text-xs font-semibold">({Math.round((f.contributed/totalContributedAllFunds)*100)}%)</span>}</p>}
                      {f.withdrawn > 0 && <p className="text-sm text-cotton-candy">-{formatMoney(f.withdrawn)}</p>}
                      {f.target > 0 && <p className="text-xs text-steel dark:text-light-grey">{Math.round(f.progress)}% mục tiêu</p>}
                    </div>
                  </button>
                ))}
                {fundData.length > 5 && (
                  <button onClick={() => setScreen('funds')} className="text-turquoise text-sm font-semibold hover:underline">
                    Xem thêm {fundData.length - 5} quỹ khác
                  </button>
                )}
              </div>
            </>
          )}
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Chi tiêu từ tiền đã tích lũy</h2>
          <p className="text-steel dark:text-light-grey text-xs font-semibold mb-4">Đây là các khoản chi sử dụng tiền đã tích lũy trong quỹ — không tính vào "Còn lại từ thu nhập"</p>
          {fundData.filter(f => f.withdrawn > 0).length === 0 ? (
            <p className="text-steel dark:text-light-grey">Không có khoản chi nào từ quỹ trong kỳ.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fundData.filter(f => f.withdrawn > 0).map(f => {
                const pct = expenseFromFund > 0 ? Math.round((f.withdrawn / expenseFromFund) * 100) : 0;
                return (
                  <button key={f.id} onClick={() => openDrilldown(f.id, 'expense')} className="frost-inset rounded-xl px-4 py-3 text-left hover:bg-cotton-candy/10 transition">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blueberry dark:text-white">{f.icon} Quỹ {f.name}</span>
                      <span className="font-bold text-cotton-candy">{formatMoney(f.withdrawn)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-light-grey/30 rounded-full mt-1">
                      <div className="h-full bg-cotton-candy rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-steel dark:text-light-grey mt-1">{pct}% tổng chi từ quỹ</p>
                  </button>
                );
              })}
              <div className="md:col-span-2 flex justify-between border-t pt-3 mt-1">
                <span className="font-bold text-blueberry dark:text-white">Tổng chi từ quỹ</span>
                <span className="font-bold text-cotton-candy">{formatMoney(expenseFromFund)}</span>
              </div>
            </div>
          )}
        </div>

        {yearSummary && (
 <div className="frost-card rounded-3xl p-6 mb-6">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Tổng kết năm {selectedYear}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div><p className="text-steel dark:text-light-grey text-sm">Tổng thu nhập năm</p><p className="text-lg font-bold text-turquoise">{formatMoney(income)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Đã nạp quỹ năm</p><p className="text-lg font-bold text-baby-blue">{formatMoney(allocation)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Đã chi từ thu nhập</p><p className="text-lg font-bold text-cotton-candy">{formatMoney(expenseFromIncome)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Còn lại từ thu nhập</p><p className={`text-lg font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Tổng chi từ quỹ</p><p className="text-lg font-bold text-cotton-candy">{formatMoney(expenseFromFund)}</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {yearSummary.topIncomeMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng thu nhập cao nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topIncomeMonth.label} — {formatMoney(yearSummary.topIncomeMonth.income)}</p></div>}
              {yearSummary.topAllocationMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng nạp quỹ nhiều nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topAllocationMonth.label} — {formatMoney(yearSummary.topAllocationMonth.allocation)}</p></div>}
              {yearSummary.topExpenseMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng chi tiêu cao nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topExpenseMonth.label} — {formatMoney(yearSummary.topExpenseMonth.totalActualExpense)}</p></div>}
              {yearSummary.topRemainingMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng còn lại nhiều nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topRemainingMonth.label} — {formatMoney(yearSummary.topRemainingMonth.remaining)}</p></div>}
            </div>
          </div>
        )}

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">So với kỳ trước</h2>
          <div className="grid grid-cols-4 gap-4">
            <div><p className="text-steel dark:text-light-grey text-sm">Thu nhập</p><p className="text-xl font-bold">{formatMoney(income)}</p>
              {prevAgg.income > 0 && <span className={`text-xs ${income >= prevAgg.income ? 'text-turquoise' : 'text-cotton-candy'}`}>{income >= prevAgg.income ? '▲' : '▼'} {Math.abs(Math.round(((income - prevAgg.income)/prevAgg.income)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Góp quỹ</p><p className="text-xl font-bold">{formatMoney(allocation)}</p>
              {prevAgg.allocation > 0 && <span className={`text-xs ${allocation >= prevAgg.allocation ? 'text-turquoise' : 'text-cotton-candy'}`}>{allocation >= prevAgg.allocation ? '▲' : '▼'} {Math.abs(Math.round(((allocation - prevAgg.allocation)/prevAgg.allocation)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Chi tiêu</p><p className="text-xl font-bold">{formatMoney(totalActualExpense)}</p>
              {prevAgg.totalActualExpense > 0 && <span className={`text-xs ${totalActualExpense <= prevAgg.totalActualExpense ? 'text-turquoise' : 'text-cotton-candy'}`}>{totalActualExpense <= prevAgg.totalActualExpense ? '▼' : '▲'} {Math.abs(Math.round(((totalActualExpense - prevAgg.totalActualExpense)/prevAgg.totalActualExpense)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Còn lại</p><p className={`text-xl font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p>
              {prevAgg.remaining > 0 && <span className={`text-xs ${remaining >= prevAgg.remaining ? 'text-turquoise' : 'text-cotton-candy'}`}>{remaining >= prevAgg.remaining ? '▲' : '▼'} {Math.abs(Math.round(((remaining - prevAgg.remaining)/prevAgg.remaining)*100))}%</span>}
            </div>
          </div>
        </div>

        {(timeType === 'year' || timeType === 'quarter' || timeType === '6month') && trendData.length > 0 && (
 <div className="frost-card rounded-3xl p-6 mb-6">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Xu hướng theo tháng</h2>
            <MonthlyTrendChart trendData={trendData} />
          </div>
        )}

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Mục tiêu tài chính</h2>
          {goals.length === 0 ? <p className="text-steel dark:text-light-grey">Chưa có mục tiêu.</p> : (
            <div className="space-y-3">
              {goals.slice(0,5).map(g => {
                const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between"><span className="font-bold text-blueberry dark:text-white">{g.name}</span><span className="text-steel dark:text-light-grey">{Math.round(pct)}%</span></div>
                    <ProgressBar pct={pct} colorClass={g.status === 'Hoàn thành' ? 'bg-turquoise' : 'bg-baby-blue'} />
                    <div className="flex justify-between text-xs text-steel dark:text-light-grey mt-1">
                      <span>{formatMoney(g.current_amount || 0)} / {formatMoney(g.target_amount || 0)}</span>
                      <span>Còn thiếu {formatMoney(Math.max(0, (g.target_amount||0) - (g.current_amount||0)))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Nhận xét {periodLabel}</h2>
          {insights.length === 0 ? <p className="text-steel dark:text-light-grey">Chưa có nhận xét.</p> : (
            <div className="grid grid-cols-2 gap-4">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 frost-inset rounded-xl p-4">
                  <ins.icon size={20} className={`${ins.color} flex-shrink-0`} />
                  <div><p className="font-bold text-blueberry dark:text-white">{ins.title}</p><p className="text-steel dark:text-light-grey text-sm">{ins.desc}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

 <div data-report-anchor="recent-activity" ref={activityAnchorDesktopRef} className="frost-card rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
            <span className="text-steel dark:text-light-grey text-xs font-semibold">{periodLabel} · {filteredActivityTxs.length} giao dịch</span>
          </div>
          <ActivityFilterBar />
          {filteredActivityTxs.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-6">
              {allPeriodTxsSorted.length === 0 ? 'Không có giao dịch nào trong khoảng thời gian này.' : 'Không có giao dịch nào khớp bộ lọc.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-1">
              {sortedFilteredTxKeys.map((key, i) => (
                <Fragment key={key}>
                  {!isSameTxMonth(key, sortedFilteredTxKeys[i - 1]) && (
                    <div className="flex items-center gap-2 mt-1 first:mt-0">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-turquoise whitespace-nowrap">{formatTxMonthLabel(key)}</span>
                      <div className="flex-1 h-px bg-[rgba(189,189,203,0.25)]" />
                    </div>
                  )}
                <div>
                  <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatTxDateLabel(key)}</p>
                  <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                    {groupedFilteredTxs[key].map((tx) => <TxDetailRow key={tx.id} tx={tx} />)}
                  </div>
                </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {showDrilldown && drilldownCategory && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDrilldown(false)}>
 <div className="frost-card w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blueberry dark:text-white">Chi tiết "{drilldownCategory.name}"</h3>
                <button aria-label="Đóng" onClick={() => setShowDrilldown(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
              </div>
              {drilldownTransactions.length === 0 ? <p className="text-steel dark:text-light-grey">Không có giao dịch.</p> : (
                <div className="space-y-2">
                  {drilldownTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between border-b py-2">
                      <div>
                        <p className="text-sm text-blueberry dark:text-white">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</p>
                        <p className="text-xs text-steel dark:text-light-grey">{displayTxNote(tx.note) || 'Không có ghi chú'}</p>
                      </div>
                      <span className="font-bold text-cotton-candy">{formatMoney(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {ledgerModal && (
        <TxLedgerModal
          title={ledgerModal.title}
          txs={ledgerModal.txs}
          categories={categories}
          accounts={accounts}
          allTx={transactions}
          spendingPoolByPeriod={spendingPoolByPeriod}
          onClose={() => setLedgerModal(null)}
          onDeleteTx={handleDeleteTx}
        />
      )}
      {showExportModal && (
        <ReportExportModal onClose={() => setShowExportModal(false)} transactions={transactions} categories={categories} accounts={accounts} spendingPoolByPeriod={spendingPoolByPeriod} />
      )}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={() => { reload && reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
