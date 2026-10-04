/* ==============================================================================
   Toàn bộ state, dữ liệu dẫn xuất và hành động của màn Tổng quan. Component trình bày (DashboardMobile/DashboardDesktop/DashboardModals) chỉ việc đọc kết quả.
   ============================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmojiCircle } from '../../components/ui';
import { useAppData, useShell } from '../../context';
import { confirmDialog, toast, useEscapeKey } from '../../feedback';
import { Wifi } from '../../icons';
import { ACCOUNT_TYPES, accountCardGradient } from '../../lib/accountStyles';
import { accountBalance, bucketTotalsFor, buildCategorySeriesFor, compareTxTime, computePeriodBuckets, currentPeriodKey, filteredTxsForCard, fundBalanceAsOf, fundBalanceWithProfit, inclusiveDays, isInitialAllocationTx, isRangeInFuture, localDateStr, periodKeyToRange, todayDateStr, transactionPeriodKey, walletBalanceAsOf } from '../../lib/finance';
import { formatMoney, txDeleteDescription } from '../../lib/format';
import { circumference } from '../DashboardParts';

// Cắt bỏ các cột (bucket) nằm HOÀN TOÀN trong tương lai ở CUỐI dãy — các cột này chưa có dữ
// liệu nên trước đây bị vẽ thành 1 dải cột rỗng kéo dài tới hết trục, gây cảm giác biểu đồ
// "trống trải" dù dữ liệu thực tế chỉ có ở phần đầu. Luôn giữ lại tối thiểu 1 cột.
function trimFutureBuckets(buckets) {
  let lastIdx = buckets.length - 1;
  while (lastIdx > 0 && isRangeInFuture(buckets[lastIdx].start ?? buckets[lastIdx].rangeStart)) lastIdx--;
  return buckets.slice(0, lastIdx + 1);
}

export function useDashboardView() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, displayName, avatarUrl, theme, openSettings } = useShell();
  const { transactions, categories, accounts, goals, loading, initialLoadDone, onOpenFund, onOpenAccount, reload, softDelete, spendingPoolByPeriod } = useAppData();
  async function handleDeleteTx(tx) {
    if (!(await confirmDialog('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }
  const [editingTx, setEditingTx] = useState(null);
  // FIX: legend "Tổng thu nhập"/"Tổng chi tiêu" (desktop) trước đây cắt cứng .slice(0, 4),
  // phần danh mục còn lại biến mất không dấu vết (% các dòng hiện ra không cộng đủ 100%,
  // gây khó hiểu). Giờ mặc định vẫn chỉ hiện 4 dòng đầu nhưng có nút "Xem tất cả X danh
  // mục" để mở rộng — cùng cách làm với SpendingDonut ở mobile.
  const [showAllIncomeYearLegend, setShowAllIncomeYearLegend] = useState(false);
  const [showAllExpenseYearLegend, setShowAllExpenseYearLegend] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  useEscapeKey(() => setShowAddWidget(false), showAddWidget);
  const [showWalletPopover, setShowWalletPopover] = useState(false);
  // Bật/tắt khi rê chuột vào khối "Tổng quan tài sản" — dùng để nâng z-index của CẢ khối
  // này lên trên các card anh em (Ví, Thu/chi theo danh mục,...) mỗi khi 1 trong 3 popup
  // hover bên trong (Tiền ví/Tiền quỹ/Tổng cộng) đang mở, để popup không bị các card khác
  // đè lên/che mất (bản thân mỗi frost-card có isolation:isolate nên z-index nâng ở BÊN
  // TRONG không tự thoát ra ngoài được, phải nâng luôn z-index của card cha chứa nó).
  const [assetOverviewHovered, setAssetOverviewHovered] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletActiveIndex, setWalletActiveIndex] = useState(0);
  const walletTouchStartX = useRef(null);
  const walletWheelLocked = useRef(false);
  const walletStackRef = useRef(null);
  function goToWalletIndex(idx) {
    setWalletActiveIndex((_cur) => {
      const clamped = Math.max(0, Math.min(accounts.length - 1, idx));
      return clamped;
    });
  }
  function walletStep(dir) {
    setWalletActiveIndex((cur) => Math.max(0, Math.min(accounts.length - 1, cur + dir)));
  }
  function handleWalletTouchStart(e) {
    walletTouchStartX.current = e.touches[0].clientX;
  }
  function handleWalletTouchEnd(e) {
    if (walletTouchStartX.current == null) return;
    const deltaX = e.changedTouches[0].clientX - walletTouchStartX.current;
    walletTouchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    walletStep(deltaX < 0 ? 1 : -1);
  }
  function handleWalletWheel(e) {
    // Luôn chặn scroll của cả trang ngay khi con trỏ đang ở trên chồng thẻ ví —
    // kể cả khi delta còn nhỏ hoặc đã ở thẻ đầu/cuối. Trước đây preventDefault chỉ
    // được gọi khi CÒN thẻ để lật, nên lúc ở biên hoặc lướt nhẹ, sự kiện wheel lọt
    // xuống trang phía dưới khiến cả dashboard bị cuộn theo — đúng lỗi người dùng
    // gặp. Giờ thẻ tự "nuốt" toàn bộ scroll khi hover, trang không cuộn theo nữa.
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 12) return;
    const dir = delta > 0 ? 1 : -1;
    if ((dir === 1 && walletActiveIndex >= accounts.length - 1) || (dir === -1 && walletActiveIndex <= 0)) return;
    if (walletWheelLocked.current) return;
    walletWheelLocked.current = true;
    walletStep(dir);
    setTimeout(() => { walletWheelLocked.current = false; }, 380);
  }
  // FIX: "Unable to preventDefault inside passive event listener invocation." — từ React 17,
  // React tự gắn onWheel ở chế độ passive nên preventDefault() trong handler JSX (onWheel={...})
  // bị trình duyệt bỏ qua. Gắn listener THỦ CÔNG với { passive: false } thì preventDefault()
  // mới có tác dụng thật, đúng mục đích chặn trang cuộn theo khi đang lướt đổi thẻ ví.
  useEffect(() => {
    const el = walletStackRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWalletWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWalletWheel);
  });
  function walletStackStyle(depth) {
    if (depth < 0) return { transform: 'translateY(14px) scale(0.92)', opacity: 0, zIndex: 0, pointerEvents: 'none' };
    if (depth === 0) return { transform: 'translateY(0px) scale(1)', opacity: 1, zIndex: 30 };
    if (depth === 1) return { transform: 'translateY(-10px) scale(0.97)', opacity: 0.85, zIndex: 20, pointerEvents: 'none' };
    if (depth === 2) return { transform: 'translateY(-18px) scale(0.94)', opacity: 0.55, zIndex: 10, pointerEvents: 'none' };
    return { transform: 'translateY(-18px) scale(0.94)', opacity: 0, zIndex: 0, pointerEvents: 'none' };
  }
  useEffect(() => {
    setWalletActiveIndex((cur) => Math.max(0, Math.min(accounts.length - 1, cur)));
  }, [accounts.length]);
  // BỘ LỌC THỜI GIAN DUY NHẤT CHO TOÀN BỘ DASHBOARD (nút cạnh "Thêm widget") — không còn
  // bộ lọc riêng ở từng card nữa. Đổi ở đây sẽ tự động đồng bộ TẤT CẢ card/chart có yếu
  // tố thời gian (Biến động tài sản, Thu/chi theo danh mục, Hoạt động gần đây, Tổng thu
  // nhập/chi tiêu, Phân tích chi phí...) ở cả bản desktop lẫn mobile, vì tất cả đều đọc
  // trực tiếp từ globalFilter/global* bên dưới — không còn state riêng để lệch nhau nữa.
  const [globalPeriod, setGlobalPeriod] = useState('month');
  const [globalYear, setGlobalYear] = useState(new Date().getFullYear());
  const [globalPeriodKey, setGlobalPeriodKey] = useState(currentPeriodKey());
  const [globalWeekStart, setGlobalWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return localDateStr(d); });
  const [globalWeekEnd, setGlobalWeekEnd] = useState(() => todayDateStr());
  // Object filter dùng chung cho MỌI card (thay cho các bộ lọc riêng từng card trước
  // đây) — truyền thẳng vào computePeriodBuckets/buildCategorySeriesFor/bucketTotalsFor/
  // filteredTxsForCard như 1 filter bình thường.
  const globalFilter = { period: globalPeriod, year: globalYear, periodKey: globalPeriodKey, weekStart: globalWeekStart, weekEnd: globalWeekEnd };
  function applyGlobalPeriod(val) {
    setGlobalPeriod(val);
    const y = new Date().getFullYear();
    const pk = currentPeriodKey();
    if (val === 'month') { setGlobalYear(y); setGlobalPeriodKey(pk); }
    else if (val === 'year') { setGlobalYear(y); }
  }
  
  const fundCategories = categories.filter((c) => c.is_fund);
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');

  // Buckets + chuỗi số liệu cho từng card — tất cả dùng CHUNG globalFilter (bộ lọc thời
  // gian duy nhất của Dashboard), không còn bộ lọc riêng cho từng card nữa.
  const mobileBuckets = trimFutureBuckets(computePeriodBuckets(globalFilter));

  // Dữ liệu cho 2 card mới trên Trang chủ (mobile): "Chi tiêu theo danh mục" (donut)
  // và "Thu và Chi" (cột) — TÁCH RIÊNG thành 2 card thay vì gộp chung 1 card, và cùng
  // đi theo mobileComboFilter (đồng bộ với GlobalPeriodWidget / bộ lọc chung Dashboard).
  const mobileSpendingTxs = [
    ...filteredTxsForCard(transactions, globalFilter, mobileBuckets, 'expense'),
    // Loại trừ khoản "Nạp quỹ lần đầu" (is_initial): đây là số dư tự nhập khi tạo quỹ,
    // không phải tiền lấy ra từ thu nhập/ví trong kỳ nên không được tính là chi tiêu.
    ...filteredTxsForCard(transactions, globalFilter, mobileBuckets, 'allocation').filter((t) => !isInitialAllocationTx(t)),
  ];
  const mobileSpendingByCat = expenseCats
    .map((c) => ({ ...c, amount: mobileSpendingTxs.filter((t) => t.category_id === c.id).reduce((s, t) => s + Number(t.amount), 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const mobileSpendingTotal = mobileSpendingByCat.reduce((s, c) => s + c.amount, 0) || 1;

  // Donut "Tổng thu nhập theo danh mục" (mobile, trên Trang chủ) — tỷ trọng % từng loại
  // thu nhập trong kỳ, dùng chung mobileComboFilter với card "Chi tiêu theo danh mục" bên
  // dưới để 2 biểu đồ luôn khớp cùng khoảng thời gian.
  const mobileIncomeTxs = filteredTxsForCard(transactions, globalFilter, mobileBuckets, 'income');
  const mobileIncomeByCat = incomeCats
    .map((c) => ({ ...c, amount: mobileIncomeTxs.filter((t) => t.category_id === c.id).reduce((s, t) => s + Number(t.amount), 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const mobileIncomeTotal = mobileIncomeByCat.reduce((s, c) => s + c.amount, 0) || 1;

  const mobileIncTotals = bucketTotalsFor(transactions, 'income', mobileBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  const mobileExpTotals = bucketTotalsFor(transactions, 'expense', mobileBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  const mobileTrendBuckets = mobileBuckets.map((b, i) => ({ label: b.label, inc: mobileIncTotals[i] || 0, exp: mobileExpTotals[i] || 0 }));
  const mobileMaxTrend = Math.max(...mobileTrendBuckets.flatMap((b) => [b.inc, b.exp]), 1);

  const incomeCardBuckets = trimFutureBuckets(computePeriodBuckets(globalFilter));
  const incomeCardSeries = buildCategorySeriesFor(transactions, incomeCats, 'income', incomeCardBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  // maxVal = TỔNG THU NHẬP CẢ KỲ đang chọn (cộng dồn tất cả các cột/bucket trong kỳ,
  // vd cả tháng nếu bộ lọc là Tháng, cả năm nếu bộ lọc là Năm) — KHÔNG phải giá trị cột
  // cao nhất — để trục tung phản ánh đúng quy mô tổng thu nhập của kỳ đó.
  const incomeCardBucketTotals = incomeCardBuckets.map((b, bi) => incomeCardSeries.reduce((s, c) => s + (c.values[bi] || 0), 0));
  const incomeCardMax = Math.max(incomeCardBucketTotals.reduce((s, v) => s + v, 0), 1);

  const expenseCardBuckets = trimFutureBuckets(computePeriodBuckets(globalFilter));
  const expenseCardSeries = buildCategorySeriesFor(transactions, expenseCats, ['expense', 'allocation'], expenseCardBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  // maxVal = TỔNG THU NHẬP CẢ KỲ đang chọn (theo đúng bộ lọc riêng của card Chi tiêu,
  // expenseCardFilter) — GIỐNG incomeCardMax ở trên, KHÔNG phải tổng chi tiêu, để trục
  // tung của 2 card "Thu nhập theo danh mục" / "Chi tiêu theo danh mục" luôn cùng 1 mốc
  // quy chiếu (tổng thu nhập của kỳ) và so sánh được trực quan với nhau.
  const expenseCardIncomeTotals = bucketTotalsFor(transactions, 'income', expenseCardBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  const expenseCardMax = Math.max(expenseCardIncomeTotals.reduce((s, v) => s + v, 0), 1);

  // Card "Phân tích chi phí" — cột CHỒNG (stacked) từng loại chi tiêu (mỗi loại 1 màu),
  // đường liền là "Tổng chi" theo từng cột, đường nét đứt là "Thu nhập" để so sánh.
  // costMaxVal phải dựa trên TỔNG CẢ CỘT (sum theo bucket) chứ không phải giá trị lớn
  // nhất của 1 danh mục riêng lẻ — nếu không cột chồng sẽ bị tràn ra ngoài khung.
  const costBuckets = trimFutureBuckets(computePeriodBuckets(globalFilter));
  const costExpenseSeries = buildCategorySeriesFor(transactions, expenseCats, 'expense', costBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  const costIncomeTotals = bucketTotalsFor(transactions, 'income', costBuckets, globalFilter.period, globalFilter.periodKey, globalFilter.year);
  const costBucketTotals = costBuckets.map((b, bi) => costExpenseSeries.reduce((s, c) => s + (c.values[bi] || 0), 0));
  const costMaxVal = Math.max(...costBucketTotals, ...costIncomeTotals, 1);

  // Ledger modal ("Xem chi tiết") cho 2 card "Thu nhập/Chi tiêu theo danh mục" — cùng
  // TxLedgerModal đang dùng ở màn Báo cáo, lấy đúng danh sách giao dịch thô đang được
  // lọc theo bộ lọc thời gian chung (globalFilter) của Dashboard.
  const [ledgerModal, setLedgerModal] = useState(null); 

  const totalFunds = fundCategories.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalAccounts = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalAssets = totalFunds + totalAccounts;

  // Danh sách chi tiết cho popup hover ở khối "Tổng quan tài sản" — cùng cách tính với
  // "báo cáo" (Report) để số liệu khớp nhau, chỉ khác là lấy số dư HIỆN TẠI thay vì
  // số dư cuối kỳ đã chọn.
  const overviewWalletItems = accounts.filter((a) => a.type !== 'gold').map((a) => ({ key: a.id, name: a.name, amount: accountBalance(a, transactions) }));
  const overviewGoldItems = accounts.filter((a) => a.type === 'gold').map((a) => ({ key: a.id, name: a.name, amount: accountBalance(a, transactions) }));
  const overviewFundItems = fundCategories.map((c) => ({ key: c.id, name: c.name, amount: fundBalanceWithProfit(c, transactions) }));

  const now = new Date();
  const curPeriodKey = currentPeriodKey(now);
  const { start: curPeriodStart, end: curPeriodEnd } = periodKeyToRange(curPeriodKey);

  // Thẻ "Thu nhập được chi kỳ này" đã được gỡ khỏi Dashboard theo yêu cầu — việc cài đặt
  // Thu nhập được chi cho từng kỳ nay chuyển sang mục Cài đặt > Danh mục (xem CategorySection).

  const prevPeriodDate = new Date(curPeriodStart); prevPeriodDate.setDate(prevPeriodDate.getDate() - 1);

  const monthLabels = [];
  const monthTotals = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const sum = transactions.filter((t) => { const td = new Date(t.created_at); return t.type === 'expense' && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }).reduce((s, t) => s + Number(t.amount), 0);
    monthLabels.push(`Th${d.getMonth() + 1}`);
    monthTotals.push(sum);
  }

  // FIX: trước đây Math.round((end - start) / 86400000) + 1 ra 31 cho kỳ 30 ngày (end là 23:59:59 nên phần lẻ đã
  // tròn lên đủ 1 ngày, +1 nữa là thừa) -> chart "Biến động tài sản" có thêm cột thứ 31 ("21 → 21").
  const daysInMonth = inclusiveDays(curPeriodStart, curPeriodEnd);

  // Buckets cho chart "Biến động tài sản" ở Tổng quan tài sản — đi theo globalPeriod
  // (Tuần/Tháng/Năm) của widget lọc chung. Mỗi cột là SỐ DƯ LUỸ KẾ của Tiền ví và Tiền
  // quỹ TÍNH ĐẾN cuối mốc đó (snapshot tài sản tại thời điểm đó) — khác với thu/chi phát
  // sinh trong kỳ — để đúng nghĩa "biến động tài sản" theo thời gian.
  // FIX HIỆU NĂNG: đây là khối tính toán NẶNG nhất Trang chủ (lặp qua từng ví × từng
  // quỹ × từng ngày trong kỳ). Trước đây KHÔNG bọc useMemo nên chạy lại từ đầu ở MỌI lần
  // Trang chủ re-render (đổi theme, hover 1 thẻ bất kỳ...), khiến biểu đồ có cảm giác
  // "load" lâu hơn hẳn các thẻ khác dù dữ liệu đã tải xong. Giờ chỉ tính lại khi 1 trong
  // các giá trị phụ thuộc thực sự đổi.
  const trendBuckets = useMemo(() => {
    // Mọi cột đều CHỐT SỔ cuối khoảng của cột đó (xem walletBalanceAsOf/fundBalanceAsOf): cột đã
    // qua = số dư cuối ngày; cột đang diễn ra = tính đến hiện tại; cột còn nằm hẳn trong tương lai
    // = 0 (chưa có số liệu), thay vì kéo dài số dư hiện tại hoặc cộng lãi dự kiến.
    const snapshot = (label, rangeStart, cutoff) => {
      if (isRangeInFuture(rangeStart)) return { label, rangeStart, wallet: 0, fund: 0, total: 0 };
      const wallet = accounts.reduce((s, a) => s + walletBalanceAsOf(a, transactions, cutoff), 0);
      const fund = fundCategories.reduce((s, c) => s + fundBalanceAsOf(c, transactions, cutoff), 0);
      return { label, rangeStart, wallet, fund, total: wallet + fund };
    };
    if (globalPeriod === 'year') {
      // Mỗi cột = 1 KỲ tài chính (21 → 20), chốt cuối ngày 20 — không phải tháng dương lịch.
      return Array.from({ length: 12 }, (_, i) => {
        const { start: pStart, end: pEnd } = periodKeyToRange(`${globalYear}-${String(i + 1).padStart(2, '0')}`);
        return snapshot(`Th${i + 1}`, pStart, pEnd);
      });
    }
    if (globalPeriod === 'month') {
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(curPeriodStart); d.setDate(d.getDate() + i);
        const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
        const cutoff = new Date(d); cutoff.setHours(23, 59, 59, 999);
        return snapshot(String(d.getDate()), dayStart, cutoff);
      });
    }
    // week: theo khoảng ngày -> ngày người dùng chọn (globalWeekStart -> globalWeekEnd),
    // không còn cố định 7 ngày gần nhất.
    const wBuckets = computePeriodBuckets({ period: 'week', weekStart: globalWeekStart, weekEnd: globalWeekEnd });
    return wBuckets.map((b) => snapshot(b.label, b.start, b.end));
  }, [globalPeriod, globalYear, daysInMonth, curPeriodStart, accounts, transactions, fundCategories, globalWeekStart, globalWeekEnd]);
  const trendBucketsTrimmed = trimFutureBuckets(trendBuckets);
  // maxTrend tính theo total (luôn là giá trị lớn nhất mỗi cột) để đủ chỗ cho cột "Tổng" mới
  const maxTrend = Math.max(...trendBucketsTrimmed.map((b) => b.total), 1);
  const fmtDMY = (iso) => { const [, m, d] = String(iso).split('-'); return `${d}/${m}`; };
  const trendTitle = globalPeriod === 'year' ? `Biến động tài sản theo kỳ (Năm ${globalYear})` : globalPeriod === 'month' ? 'Biến động tài sản theo ngày (kỳ hiện tại)' : `Biến động tài sản theo ngày (${fmtDMY(globalWeekStart)} - ${fmtDMY(globalWeekEnd)})`;

  // Thay cho catTotalsForYear (có bộ lọc Tháng/Năm RIÊNG) trước đây — giờ đọc thẳng
  // globalFilter (bộ lọc thời gian DUY NHẤT của Dashboard), hỗ trợ cả 3 chế độ Tuần/
  // Tháng/Năm giống các card khác, để "Tổng thu nhập"/"Tổng chi tiêu" luôn ăn theo bộ
  // lọc chung, không còn dropdown Tháng/Năm riêng của card nữa.
  function catTotalsForGlobalFilter(cats, txTypes) {
    const typesArr = Array.isArray(txTypes) ? txTypes : [txTypes];
    return cats
      .map((c) => ({
        ...c,
        amount: transactions
          .filter((t) => {
            if (t.category_id !== c.id || !typesArr.includes(t.type)) return false;
            // Loại trừ khoản "Nạp quỹ lần đầu" (is_initial) — số dư tự nhập khi tạo quỹ,
            // không phải tiền lấy ra từ thu nhập/ví trong kỳ nên không tính là chi tiêu.
            if (t.type === 'allocation' && isInitialAllocationTx(t)) return false;
            if (globalFilter.period === 'month') return transactionPeriodKey(t) === globalFilter.periodKey;
            if (globalFilter.period === 'year') return Number(transactionPeriodKey(t).split('-')[0]) === globalFilter.year;
            // week: theo khoảng ngày globalWeekStart -> globalWeekEnd người dùng chọn.
            const d = new Date(t.date || t.created_at);
            const rangeStart = new Date(globalFilter.weekStart); rangeStart.setHours(0, 0, 0, 0);
            const rangeEnd = new Date(globalFilter.weekEnd); rangeEnd.setHours(23, 59, 59, 999);
            return d >= rangeStart && d <= rangeEnd;
          })
          .reduce((s, t) => s + Number(t.amount), 0),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }
  function pieSegments(catList, totalVal) {
    let acc = 0;
    return catList.map((c) => {
      const pct = c.amount / totalVal;
      const dash = pct * circumference;
      const offset = acc;
      acc += dash;
      return { ...c, pct, dash, offset };
    });
  }
  // SegmentDonut giờ dùng bản chung ở module scope (đầu file) — KHÔNG khai báo lại ở
  // đây nữa (xem ghi chú cạnh SpendingDonut/CategoryBarChart/TrendBarChart/SegmentDonut).
  const incomeByCatYear = catTotalsForGlobalFilter(incomeCats, 'income');
  const totalIncomeYear = incomeByCatYear.reduce((s, c) => s + c.amount, 0) || 1;
  const incomeYearSegments = pieSegments(incomeByCatYear, totalIncomeYear);
  // Tính cả giao dịch loại 'allocation' (nạp quỹ) vào "Tổng chi tiêu" — đồng nhất với
  // cách card "Chi tiêu theo danh mục" bên Mobile đang tính (nạp quỹ cũng là một hình
  // thức chi tiền ra khỏi phần chi tiêu tự do, xem thêm ghi chú ở mobileSpendingByCat).
  const expenseByCatYear = catTotalsForGlobalFilter(expenseCats, ['expense', 'allocation']);
  const totalExpenseYear = expenseByCatYear.reduce((s, c) => s + c.amount, 0) || 1;
  const expenseYearSegments = pieSegments(expenseByCatYear, totalExpenseYear);

  function groupTransactionsByDate(txs) {
    const groups = {};
    txs.forEach(tx => {
      const date = new Date(tx.date || tx.created_at);
      const key = date.toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }

  function formatDateLabel(dateStr) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  // "Hoạt động gần đây" giờ ăn theo globalFilter (bộ lọc chung của Dashboard) — không
  // còn dropdown Tuần/Tháng/Năm riêng của card này nữa.
  const recentTxList = (() => {
    let list = transactions;
    if (globalFilter.period === 'month') {
      list = transactions.filter((t) => transactionPeriodKey(t) === globalFilter.periodKey);
    } else if (globalFilter.period === 'year') {
      list = transactions.filter((t) => Number(transactionPeriodKey(t).split('-')[0]) === globalFilter.year);
    } else {
      const rangeStart = new Date(globalFilter.weekStart); rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(globalFilter.weekEnd); rangeEnd.setHours(23, 59, 59, 999);
      list = transactions.filter((t) => { const d = new Date(t.date || t.created_at); return d >= rangeStart && d <= rangeEnd; });
    }
    return [...list].sort((a, b) => compareTxTime(b, a)).slice(0, 5);
  })();

  const groupedRecentTx = groupTransactionsByDate(recentTxList);
  const sortedGroupKeys = Object.keys(groupedRecentTx).sort((a, b) => new Date(b) - new Date(a));

  // Trong dashboard mobile, thêm carousel ví
  const mobileWalletCarousel = (
    <div className="mt-4 px-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-steel dark:text-light-grey text-xs font-semibold">Ví của bạn</p>
        <button onClick={() => setScreen('accounts')} className="text-steel dark:text-light-grey text-xs font-bold">Xem tất cả</button>
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        <div className="flex gap-3 py-1">
          {accounts.length === 0 ? (
            <div className="snap-start shrink-0 w-full frost-inset rounded-2xl p-4 text-center text-steel dark:text-light-grey text-sm">
              Chưa có ví nào. Bấm + để thêm.
            </div>
          ) : (
            accounts.map((acc) => {
              // Dãy số trang trí kiểu thẻ ngân hàng, lấy từ id ví — chỉ để hiển thị,
              // không phải số tài khoản/thẻ thật.
              const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
              return (
                <div key={acc.id} className="snap-start shrink-0 w-full max-w-[420px]">
                  <button
                    onClick={() => onOpenAccount(acc.id, 'dashboard')}
                    style={{ background: accountCardGradient(acc.type) }}
                    className="w-full text-left rounded-[1.75rem] p-5 relative overflow-hidden shadow-lg shadow-black/10"
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15" />
                    <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-black/10" />

                    <div className="relative flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-6 rounded-md bg-white/35 border border-white/40" />
                        <EmojiCircle emoji={acc.icon} size={30} bg="rgba(255,255,255,0.16)" />
                      </div>
                      <Wifi size={20} className="text-white/85 rotate-90" />
                    </div>

                    <p className="relative text-white/90 font-bold text-base sm:text-lg tracking-[0.2em] mt-5">•••• •••• •••• {maskedDigits}</p>

                    <div className="relative flex items-end justify-between mt-4 gap-2">
                      <div className="min-w-0">
                        <p className="text-white/70 text-[10px] font-semibold uppercase truncate">{acc.name}</p>
                        <p className="text-white font-extrabold text-xl mt-0.5 truncate">{formatMoney(accountBalance(acc, transactions))}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-white/60 text-[9px] font-semibold uppercase">Loại ví</p>
                        <p className="text-white/90 text-xs font-bold whitespace-nowrap">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // Mọi thứ các component trình bày bên dưới cần dùng
  return {
    accounts, applyGlobalPeriod, assetOverviewHovered, avatarUrl, categories, costBuckets,
    costExpenseSeries, costIncomeTotals, costMaxVal, displayName, editingTx, expenseCardBuckets,
    expenseCardMax, expenseCardSeries, expenseYearSegments, formatDateLabel, fundCategories, globalFilter,
    globalPeriod, globalPeriodKey, globalWeekEnd, globalWeekStart, globalYear, goals,
    goToWalletIndex, groupedRecentTx, handleDeleteTx, handleWalletTouchEnd, handleWalletTouchStart, incomeCardBuckets,
    incomeCardMax, incomeCardSeries, incomeYearSegments, initialLoadDone, ledgerModal, loading,
    maxTrend, mobileIncomeByCat, mobileIncomeTotal, mobileMaxTrend, mobileSpendingByCat, mobileSpendingTotal,
    mobileTrendBuckets, mobileWalletCarousel, onOpenAccount, onOpenFund, openSettings, overviewFundItems,
    overviewGoldItems, overviewWalletItems, recentTxList, reload, setAssetOverviewHovered, setEditingTx,
    setGlobalPeriodKey, setGlobalWeekEnd, setGlobalWeekStart, setGlobalYear, setLedgerModal, setScreen,
    setShowAddWallet, setShowAddWidget, setShowAllExpenseYearLegend, setShowAllIncomeYearLegend, setShowWalletPopover, showAddWallet,
    showAddWidget, showAllExpenseYearLegend, showAllIncomeYearLegend, showWalletPopover, sortedGroupKeys, spendingPoolByPeriod,
    theme, totalAccounts, totalAssets, totalExpenseYear, totalFunds, totalIncomeYear,
    transactions, trendBucketsTrimmed, trendTitle, walletActiveIndex, walletStackRef, walletStackStyle,
  };
}
