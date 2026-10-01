/* ==============================================================================
   Màn Tổng quan.
   ============================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import DateField from '../DateField';
import { CustomSelect } from '../components/inputs';
import { AssetBreakdownDetail, BreakdownDetailList, TxLedgerModal } from '../components/ledger';
import { AvatarMenu, ChartTooltip, EmojiCircle, HoverDetailCard, ProgressBar } from '../components/ui';
import { useAppData, useShell } from '../context';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { EditAccountModal } from '../forms/EditAccountModal';
import { EditTransaction } from '../forms/EditTransaction';
import { useChartTooltip } from '../hooks';
import { ChevronDown, ChevronRight, Loader2, Plus, Target, Wallet, Wifi, X } from '../icons';
import { ACCOUNT_TYPES, accountCardGradient } from '../lib/accountStyles';
import { YEAR_OPTIONS, accountBalance, bucketTotalsFor, buildCategorySeriesFor, buildPeriods, compareTxTime, computePeriodBuckets, currentPeriodKey, displayTxNote, filteredTxsForCard, fundBalanceAsOf, fundBalanceWithProfit, inclusiveDays, isInitialAllocationTx, isRangeInFuture, labelForCardFilter, localDateStr, periodKeyToRange, periodPool, todayDateStr, transactionPeriodKey, walletBalanceAsOf } from '../lib/finance';
import { formatMoney, formatMoneyCompact, txDeleteDescription } from '../lib/format';
import { txBalanceAfter, txIconEmoji } from '../lib/ledger';
import { CategoryBarChart, DashboardSkeleton, SegmentDonut, SpendingDonut, TrendBarChart, circumference, palette, useDragScroll, useMeasuredWidth } from './DashboardParts';

// Cắt bỏ các cột (bucket) nằm HOÀN TOÀN trong tương lai ở CUỐI dãy — các cột này chưa có dữ
// liệu nên trước đây bị vẽ thành 1 dải cột rỗng kéo dài tới hết trục, gây cảm giác biểu đồ
// "trống trải" dù dữ liệu thực tế chỉ có ở phần đầu. Luôn giữ lại tối thiểu 1 cột.
function trimFutureBuckets(buckets) {
  let lastIdx = buckets.length - 1;
  while (lastIdx > 0 && isRangeInFuture(buckets[lastIdx].start ?? buckets[lastIdx].rangeStart)) lastIdx--;
  return buckets.slice(0, lastIdx + 1);
}

export function Dashboard() {
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
  function GlobalPeriodWidget({ className = '', wrapClassName = '', inactiveClass = 'text-steel dark:text-light-grey' }) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap justify-end ${className}`}>
        <div className={`flex backdrop-blur-md rounded-full p-0.5 flex-shrink-0 ${wrapClassName || 'bg-white/50 dark:bg-white/10'}`}>
          {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
            <button
              key={p.k}
              onClick={() => applyGlobalPeriod(p.k)}
              title="Áp dụng cho tất cả chart trong Dashboard"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${globalPeriod === p.k ? 'bg-turquoise text-white shadow' : inactiveClass}`}
            >
              {p.l}
            </button>
          ))}
        </div>
        {globalPeriod === 'week' && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <DateField value={globalWeekStart} max={globalWeekEnd} showIcon={false} clearable={false}
              onChange={(v) => setGlobalWeekStart(v)}
              className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
            <span className="text-steel dark:text-light-grey text-xs">-</span>
            <DateField value={globalWeekEnd} align="right" max={todayDateStr()} showIcon={false} clearable={false}
              onChange={(v) => setGlobalWeekEnd(v)}
              className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
          </div>
        )}
        {globalPeriod === 'year' && (
          <CustomSelect value={globalYear} onChange={(e) => setGlobalYear(Number(e.target.value))}
            triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] flex-shrink-0">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </CustomSelect>
        )}
        {globalPeriod === 'month' && (
          <>
            <CustomSelect value={globalYear} onChange={(e) => {
              const y = Number(e.target.value);
              setGlobalYear(y);
              setGlobalPeriodKey(`${y}-${globalPeriodKey.split('-')[1]}`);
            }}
              triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] flex-shrink-0">
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={globalPeriodKey} onChange={(e) => setGlobalPeriodKey(e.target.value)}
              triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] max-w-[190px] flex-shrink-0 whitespace-nowrap">
              {buildPeriods(globalYear).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
          </>
        )}
      </div>
    );
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
  const [ledgerModal, setLedgerModal] = useState(null); // { title, txs } | null

  // Biểu đồ kết hợp CỘT CHỒNG DỌC + đường cho card "Phân tích chi phí" — đúng theo ảnh
  // mẫu: mỗi kỳ (theo bộ lọc Tuần/Tháng/Năm) là 1 CỘT dọc (trục hoành = thời gian theo bộ
  // lọc), các loại chi tiêu XẾP CHỒNG lên nhau theo chiều dọc trong cột đó (mỗi loại 1
  // màu, trục tung = số tiền, mốc tối đa lấy theo THU NHẬP cao nhất — xem costMaxVal, tức
  // "tối đa là tổng thu nhập" đúng yêu cầu). Đường liền "Tổng chi" nối đỉnh từng cột (=
  // tổng chi của kỳ đó), có nhãn số tiền hiện ngay phía trên mỗi điểm giống ảnh mẫu; đường
  // nét đứt "Thu nhập" đi kèm để so sánh chi/thu. Rê chuột vào từng đoạn màu (hoặc từng
  // điểm trên đường Tổng chi) để xem tên, số liệu và % (tỷ trọng của loại đó trong tổng
  // chi của kỳ) ngay trong cột đó.
  function IncomeExpenseComboChart({ buckets, series, incomeTotals, maxVal }) {
    const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
    const dragRef = useDragScroll();
    const [hoverKey, setHoverKey] = useState(null); // `${bucketIndex}:${categoryId}` của đoạn đang hover
    const containerWidth = useMeasuredWidth(dragRef);
    if (buckets.length === 0) return null;
    const chartH = 220; // chiều cao vùng vẽ (px)
    const labelColW = 40; // độ rộng cột nhãn số tiền bên trái (trục tung)
    const bucketTotals = buckets.map((b, bi) => series.reduce((s, c) => s + (c.values[bi] || 0), 0));
    // Trục tung: 5 mốc từ 0 đến maxVal (maxVal = tổng thu nhập cao nhất, xem costMaxVal).
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxVal * f);
    const yPct = (v) => Math.min((v / maxVal) * 100, 100); // % chiều cao tính từ đáy lên
    // FIX: cùng vấn đề "trống bên phải" như CategoryBarChart — cột giờ giãn ra đúng bằng bề
    // ngang thực tế của khung chứa (đo qua useMeasuredWidth), luôn lấp đầy 100%; nhiều kỳ
    // vẫn giữ mức tối thiểu + tự cuộn ngang như cũ.
    const bucketMinWidth = 56;
    const bucketWidth = containerWidth > 0
      ? Math.max(bucketMinWidth, containerWidth / buckets.length)
      : bucketMinWidth;
    const plotWidth = Math.max(buckets.length * bucketWidth, 1);
    const xCenter = (bi) => (bi + 0.5) * bucketWidth; // toạ độ px, canh giữa mỗi cột
    const yPx = (v) => chartH - (yPct(v) / 100) * chartH;
    const totalLinePoints = bucketTotals.map((v, bi) => `${xCenter(bi)},${yPx(v)}`).join(' ');
    const incomeLinePoints = incomeTotals.map((v, bi) => `${xCenter(bi)},${yPx(v)}`).join(' ');
    return (
      // FIX: cùng lỗi "số bị che" như CategoryBarChart — nhãn số tiền của điểm Tổng chi
      // cao nhất bị đặt sát mép trên vùng vẽ (top: 0%) rồi đẩy lên thêm qua
      // "bottom: calc(100% + 3px)", nên đè lên viền trên/tiêu đề card khi Tổng chạm mốc cao
      // nhất. Thêm pt-6 (24px) để luôn đủ chỗ hiển thị trọn vẹn.
      <div ref={wrapRef} className="relative min-w-0 pt-6">
        <ChartTooltip tip={tip} />
        <div className="flex min-w-0">
          {/* Cột nhãn số tiền bên trái (trục tung) — cố định, không cuộn theo */}
          <div className="flex flex-col justify-between flex-shrink-0 pr-2" style={{ height: chartH, width: labelColW }}>
            {[...yTicks].reverse().map((v, i) => (
              <span key={i} className="text-[9px] text-steel dark:text-light-grey whitespace-nowrap leading-none">{formatMoneyCompact(v)}</span>
            ))}
          </div>

          {/* Vùng cuộn ngang — chứa CẢ phần vẽ cột lẫn nhãn trục hoành bên dưới, để 2 phần
              luôn khớp cột với nhau dù kéo cuộn tới đâu. Không hiện thanh cuộn (scrollbar-hide)
              — vẫn kéo được bình thường bằng chuột/trackpad, chỉ là không có thanh mảnh hiện ra. */}
          <div ref={dragRef} className="flex-1 min-w-0 overflow-x-auto scrollbar-hide cursor-grab">
            <div style={{ width: plotWidth, minWidth: '100%' }}>
              {/* Vùng vẽ: các cột chồng theo từng kỳ + 2 đường xu hướng (trục hoành = thời gian) */}
              <div className="relative" style={{ height: chartH, overflow: 'visible' }}>
                {/* Lưới ngang mảnh theo mốc số tiền */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {yTicks.map((_, i) => (
                    <div key={i} className="border-t border-dashed border-steel/20 dark:border-light-grey/15 w-full" />
                  ))}
                </div>

                {/* Các cột chồng — mỗi cột là 1 kỳ thời gian, mỗi màu là 1 loại chi tiêu, bề
                    rộng cố định (bucketWidth) + đệm ngang cho thon gọn. Bo góc đầu/cuối cột
                    (không bo giữa các đoạn) + rê chuột vào 1 đoạn sẽ phóng to nhẹ, sáng lên,
                    các đoạn khác mờ đi để dễ phân biệt giữa nhiều thành phần. */}
                <div className="absolute inset-0 flex items-end">
                  {buckets.map((b, bi) => {
                    const bucketTotal = bucketTotals[bi];
                    const visibleAll = series.map((c, i) => ({ c, i, v: c.values[bi] })).filter((s) => s.v > 0);
                    // FIX: cùng vấn đề "sọc dày ở đỉnh cột" như CategoryBarChart — nhiều danh
                    // mục nhỏ đều bị ép minHeight 3px cộng dồn. Gộp phần đuôi (sau
                    // CATEGORY_SEG_LIMIT danh mục lớn nhất, series đã sort giảm dần) thành 1
                    // đoạn "Khác" duy nhất.
                    const CATEGORY_SEG_LIMIT = 6;
                    let visible = visibleAll;
                    if (visibleAll.length > CATEGORY_SEG_LIMIT) {
                      const kept = visibleAll.slice(0, CATEGORY_SEG_LIMIT - 1);
                      const otherV = visibleAll.slice(CATEGORY_SEG_LIMIT - 1).reduce((s, x) => s + x.v, 0);
                      visible = [...kept, { c: { id: `__other_${bi}`, name: `Khác (${visibleAll.length - (CATEGORY_SEG_LIMIT - 1)} danh mục)` }, i: -1, v: otherV, isOther: true }];
                    }
                    return (
                      <div key={bi} className="h-full flex flex-col-reverse items-stretch px-2.5 box-border flex-shrink-0 gap-[2px]" style={{ width: bucketWidth }}>
                        {visible.map((s, vi) => {
                          const { c, i, v } = s;
                          const h = yPct(v);
                          const pct = bucketTotal > 0 ? Math.round((v / bucketTotal) * 100) : 0;
                          const key = `${bi}:${c.id}`;
                          const isHovered = hoverKey === key;
                          const isDimmed = hoverKey !== null && !isHovered;
                          const isBottom = vi === 0;
                          const isTop = vi === visible.length - 1;
                          return (
                            <div
                              key={c.id}
                              className="w-full cursor-pointer"
                              style={{
                                height: `${h}%`,
                                minHeight: v > 0 ? 3 : 0,
                                background: s.isOther ? '#BDBDCB' : palette[i % palette.length],
                                borderTopLeftRadius: isTop ? 6 : 0,
                                borderTopRightRadius: isTop ? 6 : 0,
                                borderBottomLeftRadius: isBottom ? 6 : 0,
                                borderBottomRightRadius: isBottom ? 6 : 0,
                                opacity: isDimmed ? 0.35 : 1,
                                transform: isHovered ? 'scaleX(1.15)' : 'scaleX(1)',
                                transformOrigin: 'center',
                                filter: isHovered ? 'brightness(1.12) saturate(1.15)' : 'none',
                                boxShadow: isHovered ? '0 4px 14px rgba(0,0,0,0.2)' : 'none',
                                position: 'relative',
                                zIndex: isHovered ? 10 : 1,
                                transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
                              }}
                              onMouseMove={(e) => { setHoverKey(key); showTip(e, { label: `${c.name} (${b.label})`, value: formatMoney(v), pct }); }}
                              onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* 2 đường xu hướng: liền = Tổng chi, nét đứt = Thu nhập. ViewBox tính bằng px
                    (khớp bề rộng cuộn thực tế) thay vì % như trước, để đường luôn thẳng hàng
                    với cột dù đang cuộn ngang, và zIndex cao hơn mọi đoạn cột (kể cả hover). */}
                <svg
                  width={plotWidth} height={chartH} viewBox={`0 0 ${plotWidth} ${chartH}`} preserveAspectRatio="none"
                  className="absolute inset-0 pointer-events-none overflow-visible"
                  style={{ zIndex: 15 }}
                >
                  <polyline points={incomeLinePoints} fill="none" stroke="currentColor" className="text-steel/50 dark:text-light-grey/50" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={totalLinePoints} fill="none" stroke="#0DBACC" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Chấm tròn + nhãn số tiền trên mỗi điểm "Tổng chi", rê vào xem số liệu. zIndex
                    cao hơn cả đường xu hướng để nhãn KHÔNG BAO GIỜ bị đường/cột đè lên — đây là
                    nguyên nhân khiến số tiền phía trên đỉnh cột trước đây thỉnh thoảng bị che. */}
                {bucketTotals.map((v, bi) => (
                  <div
                    key={bi}
                    className="absolute cursor-default"
                    style={{ left: xCenter(bi), top: `${100 - yPct(v)}%`, transform: 'translate(-50%, -50%)', zIndex: 16 }}
                    onMouseMove={(e) => showTip(e, { label: `Tổng chi (${buckets[bi].label})`, value: formatMoney(v) })}
                    onMouseLeave={hideTip}
                  >
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)] text-[10px] font-extrabold text-blueberry dark:text-white whitespace-nowrap">{v > 0 ? formatMoneyCompact(v) : ''}</span>
                    <div className="w-2 h-2 rounded-full bg-turquoise border border-white dark:border-night-sky" />
                  </div>
                ))}
              </div>

              {/* Trục hoành: nhãn thời gian theo từng cột — nằm CÙNG vùng cuộn với phần vẽ cột
                  ở trên nên luôn khớp vị trí, không bị lệch khi kéo cuộn. */}
              <div className="flex mt-2">
                {buckets.map((b, bi) => (
                  <div key={bi} className="flex-shrink-0 text-center text-[10px] text-steel dark:text-light-grey whitespace-nowrap truncate px-0.5" style={{ width: bucketWidth }}>{b.label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-3 h-0.5 rounded-full bg-turquoise inline-block" />Tổng chi</span>
          <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-3 h-0.5 rounded-full border-t border-dashed border-steel dark:border-light-grey inline-block" />Thu nhập</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          {series.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
              <span className="text-blueberry dark:text-white text-xs truncate flex-1 min-w-0 font-semibold">{c.name}</span>
              <span className="text-blueberry dark:text-white text-xs font-bold flex-shrink-0">{formatMoney(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

  // Remove outer layout wrapper, just return the content
  // FIX: trước đây Dashboard render NGAY cả khi dữ liệu (transactions/accounts/quỹ...)
  // CHƯA tải xong (mảng rỗng mặc định) — trong khoảnh khắc đó, các biểu đồ tính toán
  // trên dữ liệu rỗng (maxVal về mặc định 1, tổng = 0...) nên hiện ra bị "vỡ"/trông kỳ
  // (cột gần như biến mất, đường xu hướng chạy sát đáy...), rồi mới "giật" về đúng khi
  // dữ liệu thật load xong — đúng như cảm giác "có gì đó che/vỡ lúc mới load trang".
  // Giờ chặn lại: đợi tải xong dữ liệu mới vẽ toàn bộ Trang chủ, tránh hiện trạng thái
  // vỡ/trung gian đó.
  // FIX: trước đây chỉ hiện 1 spinner giữa màn hình trắng lúc tải lần đầu — chuyển trạng thái
  // đột ngột từ trắng sang đầy nội dung, cảm giác giật. Giờ hiện khung "xương" (skeleton) đúng
  // hình dạng Trang chủ thật (mobile + desktop), các khối mờ nhấp nháy nhẹ trong lúc chờ dữ
  // liệu — nhìn mượt và có cảm giác đang tải đúng thứ sắp hiện ra hơn hẳn màn trắng + spinner.
  if (loading && !initialLoadDone) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Mobile version */}
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="min-w-0 flex-1"><p className="text-steel dark:text-light-grey text-sm font-semibold">Chào bạn!</p><h1 className="text-blueberry dark:text-white text-2xl font-extrabold truncate">{displayName || 'Bạn'}</h1></div>
            <div className="flex-shrink-0">
              <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} openSettings={openSettings || (() => setScreen('settings'))} variant="mobile" />
            </div>
          </div>
          <div className="px-5 mt-4">
            <GlobalPeriodWidget />
          </div>
          <div className="px-5 mt-4">
            <HoverDetailCard detail={<AssetBreakdownDetail wallets={overviewWalletItems} funds={overviewFundItems} gold={overviewGoldItems} total={totalAssets} />}>
              <div className="min-w-0">
                <p className="text-steel dark:text-light-grey text-xs font-semibold">Tổng tài sản</p>
                <p className="text-blueberry dark:text-white text-3xl font-extrabold mt-1 truncate">{formatMoney(totalAssets)}</p>
              </div>
            </HoverDetailCard>
            {/* Đường biểu đồ nhỏ mang tính trang trí, cùng phong cách với khu vực
                "Total balance" trong bản thiết kế tham khảo — không đại diện số liệu thật. */}
            <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none" className="w-full mt-3 opacity-60">
              <polyline points="0,18 20,15 40,20 60,9 80,13 100,5 120,11 140,4 160,10 180,2 200,7" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(48,49,80,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Mobile wallet carousel */}
          {mobileWalletCarousel}

          <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity', scrollPaddingLeft: 20, touchAction: 'pan-x' }}>
            {fundCategories.length === 0 ? <p className="text-steel dark:text-light-grey text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p>
              : fundCategories.map((f) => (
                <button key={f.id} onClick={() => onOpenFund(f.id)} style={{ scrollSnapAlign: 'start' }} className="relative flex-shrink-0 w-[150px] text-left active:scale-95 transition">
                  <svg viewBox="0 0 170 175" className="w-full h-auto drop-shadow-md">
                    <defs>
                      <linearGradient id={`piggyBody-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFE1EC" />
                        <stop offset="100%" stopColor="#F6A9C4" />
                      </linearGradient>
                    </defs>
                    {/* Tai — cánh nhọn đặc trưng của heo (không tròn như tai gấu) */}
                    <path d="M20,54 Q10,22 42,8 Q60,24 52,52 Q36,64 20,54 Z" fill={`url(#piggyBody-${f.id})`} />
                    <path d="M150,54 Q160,22 128,8 Q110,24 118,52 Q134,64 150,54 Z" fill={`url(#piggyBody-${f.id})`} />
                    <path d="M28,48 Q23,29 42,20 Q52,29 48,47 Q38,54 28,48 Z" fill="#FFC2D9" />
                    <path d="M142,48 Q147,29 128,20 Q118,29 122,47 Q132,54 142,48 Z" fill="#FFC2D9" />
                    {/* Chân — bầu dục có rãnh chẻ móng, đặc trưng của heo (gấu không có móng chẻ) */}
                    <ellipse cx="52" cy="164" rx="16" ry="11" fill="#F6A9C4" />
                    <ellipse cx="118" cy="164" rx="16" ry="11" fill="#F6A9C4" />
                    <line x1="52" y1="157" x2="52" y2="171" stroke="#E28AAE" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="118" y1="157" x2="118" y2="171" stroke="#E28AAE" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Thân mập tròn — bo góc siêu lớn cho mềm mại */}
                    <rect x="14" y="46" width="142" height="118" rx="59" fill={`url(#piggyBody-${f.id})`} />
                    {/* Má hồng */}
                    <circle cx="46" cy="99" r="13" fill="#F49CB9" opacity="0.55" />
                    <circle cx="124" cy="99" r="13" fill="#F49CB9" opacity="0.55" />
                    {/* Mắt */}
                    <ellipse cx="62" cy="87" rx="5" ry="6" fill="#6B4258" />
                    <ellipse cx="108" cy="87" rx="5" ry="6" fill="#6B4258" />
                    <circle cx="63.5" cy="84.5" r="1.4" fill="#fff" />
                    <circle cx="109.5" cy="84.5" r="1.4" fill="#fff" />
                    {/* Mõm */}
                    <rect x="68" y="99" width="34" height="24" rx="12" fill="#FFC2D9" />
                    <rect x="76.5" y="107" width="4" height="9" rx="2" fill="#D46A93" />
                    <rect x="89.5" y="107" width="4" height="9" rx="2" fill="#D46A93" />
                    {/* Nụ cười — cho mặt vui */}
                    <path d="M72,127 Q85,136 98,127" stroke="#D46A93" strokeWidth="3" strokeLinecap="round" fill="none" />
                    {/* Vệt sáng mềm cho khối tròn đỡ phẳng */}
                    <ellipse cx="55" cy="65" rx="26" ry="14" fill="#fff" opacity="0.25" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center px-2" style={{ top: '62%', bottom: '9%', left: '15%', right: '15%' }}>
                    <p className="text-[#7A3B57] text-[10px] font-bold leading-tight truncate w-full">{f.icon} {f.name}</p>
                    <p className="text-[#7A3B57] font-extrabold text-[11px] leading-tight truncate w-full">{formatMoney(fundBalanceWithProfit(f, transactions))}</p>
                  </div>
                </button>
              ))}
          </div>
          <div className="mt-6 px-5 pt-6 pb-6">
            {goals && goals.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Mục tiêu</h2>
                  <button onClick={() => setScreen('goals')} className="text-turquoise text-sm font-bold">Xem tất cả</button>
                </div>
                <div className="flex flex-col gap-3">
                  {goals.slice(0, 2).map((g) => {
                    const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                          <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar pct={pct} title={`Hiện có: ${formatMoney(g.current_amount || 0)}`} />
                        {g.target_amount > 0 && (
                          <p className="text-steel dark:text-light-grey text-[11px] mt-1">Mục tiêu: {formatMoney(g.target_amount)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              {/* Card riêng #0: Tổng thu nhập theo danh mục (donut) — đặt trên "Chi tiêu theo
                  danh mục" theo đúng thứ tự Thu trước Chi. */}
              <div className="frost-inset rounded-2xl p-4">
                <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Thu nhập theo danh mục</h2>
                {mobileIncomeByCat.length === 0 ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có thu nhập trong khoảng này.</p>
                ) : (
                  <SpendingDonut data={mobileIncomeByCat} total={mobileIncomeTotal} />
                )}
              </div>

              {/* Card riêng #1: Chi tiêu theo danh mục (donut) — tách khỏi card "Thu và Chi"
                  bên dưới để tránh nhồi 2 biểu đồ khác kiểu vào chung 1 khối nhìn rối mắt.
                  Bao gồm cả giao dịch loại 'allocation' (nạp quỹ) vì với người dùng, nạp
                  vào quỹ cũng là một hình thức "chi" tiền ra khỏi phần được chi tiêu tự do. */}
              <div className="frost-inset rounded-2xl p-4">
                <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Chi tiêu theo danh mục</h2>
                {mobileSpendingByCat.length === 0 ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có chi tiêu trong khoảng này.</p>
                ) : (
                  <SpendingDonut data={mobileSpendingByCat} total={mobileSpendingTotal} />
                )}
              </div>

              {/* Card riêng #2: Thu và Chi (biểu đồ cột so sánh theo từng mốc thời gian) */}
              <div className="frost-inset rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-blueberry dark:text-white font-extrabold text-base">Thu và Chi</h2>
                  <div className="flex items-center gap-3 text-xs font-semibold flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-steel dark:text-light-grey"><span className="w-2.5 h-2.5 rounded-full bg-turquoise" />Thu</span>
                    <span className="flex items-center gap-1.5 text-steel dark:text-light-grey"><span className="w-2.5 h-2.5 rounded-full bg-cotton-candy" />Chi</span>
                  </div>
                </div>
                {mobileTrendBuckets.every((b) => b.inc === 0 && b.exp === 0) ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có thu/chi trong khoảng này.</p>
                ) : (
                  <TrendBarChart buckets={mobileTrendBuckets} maxVal={mobileMaxTrend} showYAxis />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
              <button onClick={() => setScreen('report')} className="text-turquoise text-sm font-bold">Xem chi tiết</button>
            </div>
            {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-turquoise" /></div>
              : recentTxList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
              : (
                <div className="flex flex-col gap-4 scrollbar-hide">
                  {sortedGroupKeys.map((key) => (
                    <div key={key}>
                      <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatDateLabel(key)}</p>
                      <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                        {groupedRecentTx[key].map((tx) => {
                          const cat = categories.find((c) => c.id === tx.category_id);
                          const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                          const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                          const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                          const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                          const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
                          const noteText = isDirectSet && balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : (displayTxNote(tx.note) || new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
                          return (
                            <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                              <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={40} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                                  {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                </div>
                                <p className="text-steel dark:text-light-grey text-xs">{noteText}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className={`font-bold text-sm ${isPositive ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                                {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-0" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-64 -left-10" />
        <div className="relative flex items-center justify-between mb-6">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <GlobalPeriodWidget />
            <button onClick={() => setShowAddWidget(true)} className="bg-gradient-primary text-white rounded-full pl-3 pr-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30">
              <Plus size={15} /> Thêm widget
            </button>
          </div>
        </div>
        <div
          className="relative grid gap-6"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateAreas: `
              "chart chart right"
              "incexp incexp right"
              "cost cost goal"
            `,
          }}
        >
          <div
            style={{ gridArea: 'chart' }}
            onMouseEnter={() => setAssetOverviewHovered(true)}
            onMouseLeave={() => setAssetOverviewHovered(false)}
            className={`frost-card rounded-3xl p-6 relative ${assetOverviewHovered ? 'z-[5]' : 'z-0'}`}
          >
            <p className="text-blueberry dark:text-white font-extrabold mb-4">Tổng quan tài sản</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <HoverDetailCard detail={<BreakdownDetailList title="Tiền ví" items={[...overviewWalletItems, ...overviewGoldItems]} total={totalAccounts} colorClass="text-blueberry dark:text-white" />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tiền ví</p>
                <p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAccounts)}</p>
              </HoverDetailCard>
              <HoverDetailCard detail={<BreakdownDetailList title="Tiền quỹ" items={overviewFundItems} total={totalFunds} colorClass="text-blueberry dark:text-white" />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tiền quỹ</p>
                <p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalFunds)}</p>
              </HoverDetailCard>
              <HoverDetailCard align="right" detail={<AssetBreakdownDetail wallets={overviewWalletItems} funds={overviewFundItems} gold={overviewGoldItems} total={totalAssets} />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tổng cộng</p>
                <p className="text-xl font-bold text-turquoise">{formatMoney(totalAssets)}</p>
              </HoverDetailCard>
            </div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-steel dark:text-light-grey text-xs font-semibold">{trendTitle}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-turquoise" />Tiền ví</span>
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-cotton-candy" />Tiền quỹ</span>
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-lavender" />Tổng</span>
              </div>
            </div>
            <TrendBarChart buckets={trendBucketsTrimmed} maxVal={maxTrend} keyA="wallet" keyB="fund" keyC="total" labelA="Tiền ví" labelB="Tiền quỹ" labelC="Tổng" showYAxis />
          </div>

          <div style={{ gridArea: 'right' }} className="flex flex-col gap-6">
            <div className="frost-card rounded-3xl p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Ví</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowAddWallet(true)} className="bg-gradient-primary text-white rounded-full pl-2.5 pr-3 py-1.5 text-xs font-bold flex items-center gap-1 shadow-md shadow-turquoise/30">
                    <Plus size={13} /> Thêm ví
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowWalletPopover((v) => !v)} className="frost-inset w-7 h-7 rounded-full flex items-center justify-center text-steel dark:text-light-grey">
                      <ChevronDown size={14} className={`transition-transform ${showWalletPopover ? 'rotate-180' : ''}`} />
                    </button>
                    {showWalletPopover && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowWalletPopover(false)} />
                        <div style={{ position: 'absolute' }} className="top-9 right-0 bg-white/85 dark:bg-[#1e1e32]/75 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] py-1.5 w-56 z-40 max-h-72 overflow-y-auto overflow-x-hidden scrollbar-hide isolate">
                          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl -z-10" />
                          <div className="pointer-events-none absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl -z-10" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent -z-10" />
                          {accounts.length === 0 ? (
                            <p className="text-steel dark:text-light-grey text-xs text-center py-4 px-4">Chưa có ví nào.</p>
                          ) : accounts.map((acc, idx) => (
                            <button key={acc.id} onClick={() => { setShowWalletPopover(false); goToWalletIndex(idx); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blueberry dark:text-white hover:bg-white/40 dark:hover:bg-white/10 text-left">
                              <EmojiCircle emoji={acc.icon} size={26} bg="#F7F7F8" />
                              <span className="flex-1 min-w-0 truncate font-semibold">{acc.name}</span>
                              <span className="text-steel dark:text-light-grey text-xs flex-shrink-0">{formatMoney(accountBalance(acc, transactions))}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {accounts.length === 0 ? (
                <button onClick={() => setShowAddWallet(true)} className="w-full border-2 border-dashed border-[rgba(189,189,203,0.4)] dark:border-[rgba(189,189,203,0.2)] rounded-3xl py-8 flex flex-col items-center gap-1.5 text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise transition">
                  <Wallet size={22} />
                  <span className="text-xs font-bold">Chưa có ví nào — bấm để thêm ví đầu tiên</span>
                </button>
              ) : (
                <div
                  ref={walletStackRef}
                  className="relative isolate w-full overflow-hidden"
                  style={{ height: 172 }}
                  onTouchStart={handleWalletTouchStart}
                  onTouchEnd={handleWalletTouchEnd}
                >
                  {accounts.map((acc, idx) => {
                    const depth = idx - walletActiveIndex;
                    if (depth < -1 || depth > 3) return null;
                    const style = walletStackStyle(depth);
                    // Dãy số trang trí kiểu thẻ ngân hàng, lấy từ id ví — chỉ để hiển thị,
                    // không phải số tài khoản/thẻ thật (đồng bộ kiểu thẻ với bản mobile).
                    const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
                    return (
                      <button
                        key={acc.id}
                        id={`wallet-card-${acc.id}`}
                        onClick={() => { if (depth === 0) onOpenAccount(acc.id, 'dashboard'); else goToWalletIndex(idx); }}
                        className="absolute inset-0 rounded-2xl p-5 text-left shadow-card hover:shadow-lg overflow-hidden"
                        style={{
                          ...style,
                          background: accountCardGradient(acc.type),
                          transition: 'transform 320ms cubic-bezier(.22,.9,.32,1), opacity 320ms ease, box-shadow 200ms ease',
                        }}
                      >
                        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15" />
                        <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-black/10" />

                        <div className="relative flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-6 rounded-md bg-white/35 border border-white/40" />
                            <EmojiCircle emoji={acc.icon} size={30} bg="rgba(255,255,255,0.16)" />
                          </div>
                          <Wifi size={18} className="text-white/85 rotate-90" />
                        </div>

                        <p className="relative text-white/90 font-bold text-base tracking-[0.2em] mt-4">•••• {maskedDigits}</p>

                        <div className="relative flex items-end justify-between mt-3 gap-2">
                          <div className="min-w-0">
                            <p className="text-white/70 text-[10px] font-semibold uppercase truncate">{acc.name}</p>
                            <p className="text-white font-extrabold text-lg mt-0.5 truncate">{formatMoney(accountBalance(acc, transactions))}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-white/60 text-[9px] font-semibold uppercase">Loại ví</p>
                            <p className="text-white/90 text-xs font-bold whitespace-nowrap">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {showAddWallet && <EditAccountModal onClose={() => setShowAddWallet(false)} onSaved={reload} isNew={true} />}
            </div>

            <div className="frost-card rounded-3xl p-6 flex-1">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-blueberry dark:text-white font-extrabold">Hoạt động gần đây</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setScreen('report');
                      // Nhảy thẳng tới khối "Hoạt động gần đây" trong màn Báo cáo, không cần
                      // người dùng tự cuộn lên tìm — đợi 1 nhịp để Report render xong rồi mới
                      // scrollIntoView (bản mobile/desktop của Report cùng tồn tại trong DOM,
                      // chỉ khác CSS ẩn/hiện, nên tìm khối đang thực sự hiển thị mà cuộn tới).
                      setTimeout(() => {
                        const targets = document.querySelectorAll('[data-report-anchor="recent-activity"]');
                        const visible = Array.from(targets).find((el) => el.offsetParent !== null);
                        (visible || targets[0])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    title="Xem chi tiết"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-turquoise hover:bg-turquoise/10 transition flex-shrink-0"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              {loading ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-turquoise" /></div>
                : recentTxList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-4">Không có giao dịch nào.</p>
                : (
                  <div className="flex flex-col gap-3 scrollbar-hide">
                    {sortedGroupKeys.map((key) => (
                      <div key={key}>
                        <p className="text-xs font-bold text-steel dark:text-light-grey mb-1">{formatDateLabel(key)}</p>
                        <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                          {groupedRecentTx[key].map((tx) => {
                            const cat = categories.find((c) => c.id === tx.category_id);
                            const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                            // FIX: với khoản chi tiêu KHÔNG phải quỹ (danh mục thường, VD "Điện thoại")
                            // và được trừ trực tiếp từ thu nhập của kỳ (không qua ví), hiển thị thêm
                            // "Thu nhập kỳ còn lại" — tương tự cách quỹ hiển thị "Số dư" sau mỗi giao dịch.
                            const isFromPeriodIncome = tx.type === 'expense' && tx.account_id == null && !cat?.is_fund;
                            const periodRemaining = isFromPeriodIncome ? periodPool(transactions, transactionPeriodKey(tx)).remaining : null;
                            const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                            const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                            const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                            const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
                            const timeOrNote = isDirectSet && balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                                <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={36} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-blueberry dark:text-white font-bold text-sm truncate">{label}</p>
                                    {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                  </div>
                                  <p className="text-steel dark:text-light-grey text-xs">{timeOrNote}</p>
                                  {isFromPeriodIncome && (
                                    <p className="text-[11px] text-steel dark:text-light-grey">Thu nhập kỳ còn lại: <span className={`font-semibold ${periodRemaining < 0 ? 'text-cotton-candy' : 'text-turquoise'}`}>{formatMoney(periodRemaining)}</span></p>
                                  )}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className={`font-bold text-sm ${isPositive ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                                  {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div style={{ gridArea: 'incexp' }} className="grid grid-cols-2 gap-6 items-stretch">
            <div className="frost-card rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Tổng thu nhập</h3>
              </div>
              {incomeYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <SegmentDonut segments={incomeYearSegments} centerLabel="Tổng" centerValue={formatMoney(totalIncomeYear)} />
                  <div className="flex flex-col gap-2 text-sm w-full max-w-xs mx-auto">
                    {(showAllIncomeYearLegend ? incomeYearSegments : incomeYearSegments.slice(0, 4)).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                    {incomeYearSegments.length > 4 && (
                      <button onClick={() => setShowAllIncomeYearLegend((v) => !v)} className="text-turquoise text-xs font-bold text-left mt-1 hover:underline">
                        {showAllIncomeYearLegend ? 'Thu gọn' : `Xem tất cả ${incomeYearSegments.length} danh mục`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="frost-card rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Tổng chi tiêu</h3>
              </div>
              {expenseYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <SegmentDonut segments={expenseYearSegments} centerLabel="Tổng" centerValue={formatMoney(totalExpenseYear)} />
                  <div className="flex flex-col gap-2 text-sm w-full max-w-xs mx-auto">
                    {(showAllExpenseYearLegend ? expenseYearSegments : expenseYearSegments.slice(0, 4)).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                    {expenseYearSegments.length > 4 && (
                      <button onClick={() => setShowAllExpenseYearLegend((v) => !v)} className="text-turquoise text-xs font-bold text-left mt-1 hover:underline">
                        {showAllExpenseYearLegend ? 'Thu gọn' : `Xem tất cả ${expenseYearSegments.length} danh mục`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ gridArea: 'cost' }} className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-blueberry dark:text-white font-extrabold">Phân tích chi phí</h3>
            </div>
            {costExpenseSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong khoảng này.</p> : (
              <IncomeExpenseComboChart buckets={costBuckets} series={costExpenseSeries} incomeTotals={costIncomeTotals} maxVal={costMaxVal} />
            )}
          </div>

          <div style={{ gridArea: 'goal' }} className="frost-card rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blueberry dark:text-white font-extrabold">Mục tiêu</h3>
              <button onClick={() => setScreen('goals')} className="text-turquoise text-xs font-bold">Xem tất cả</button>
            </div>
            {/* FIX: trước đây rỗng chỉ có 1 dòng chữ "Chưa có mục tiêu nào." căn giữa theo
                py-4, còn thẻ này lại cao bằng thẻ "Phân tích chi phí" bên cạnh (chart khá cao)
                nên phần lớn thẻ là khoảng trống vô nghĩa. Giờ khối rỗng chiếm trọn phần còn
                lại của thẻ (flex-1) và có icon + lời mời tạo mục tiêu, biến chỗ trống thành
                1 lời gọi hành động thay vì chỉ là khoảng trắng. */}
            {(!goals || goals.length === 0) ? (
              <button
                onClick={() => setScreen('goals')}
                className="flex-1 flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-steel/25 dark:border-light-grey/20 hover:border-turquoise/50 hover:bg-turquoise/5 transition-colors py-6"
              >
                <Target size={22} className="text-steel dark:text-light-grey" />
                <p className="text-steel dark:text-light-grey text-sm">Chưa có mục tiêu nào.</p>
                <span className="text-turquoise text-xs font-bold">+ Tạo mục tiêu đầu tiên</span>
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                        <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} colorClass="bg-turquoise" title={`Hiện có: ${formatMoney(g.current_amount || 0)}`} />
                      {g.target_amount > 0 && (
                        <p className="text-steel dark:text-light-grey text-[11px] mt-1">Mục tiêu: {formatMoney(g.target_amount)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="frost-card rounded-3xl p-6 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-blueberry dark:text-white font-extrabold">Thu nhập theo danh mục</h3>
              <button onClick={() => setLedgerModal({ title: `Thu nhập theo danh mục — ${labelForCardFilter(globalFilter)}`, txs: filteredTxsForCard(transactions, globalFilter, incomeCardBuckets, 'income') })} title="Xem chi tiết" className="w-7 h-7 rounded-full flex items-center justify-center text-turquoise hover:bg-turquoise/10 transition flex-shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>
            {incomeCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập trong khoảng này.</p> : (
              <CategoryBarChart series={incomeCardSeries} maxVal={incomeCardMax} buckets={incomeCardBuckets} />
            )}
          </div>

          <div className="frost-card rounded-3xl p-6 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-blueberry dark:text-white font-extrabold">Chi tiêu theo danh mục</h3>
              <button onClick={() => setLedgerModal({ title: `Chi tiêu theo danh mục — ${labelForCardFilter(globalFilter)}`, txs: [...filteredTxsForCard(transactions, globalFilter, expenseCardBuckets, 'expense'), ...filteredTxsForCard(transactions, globalFilter, expenseCardBuckets, 'allocation').filter((t) => !isInitialAllocationTx(t))] })} title="Xem chi tiết" className="w-7 h-7 rounded-full flex items-center justify-center text-cotton-candy hover:bg-cotton-candy/10 transition flex-shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>
            {expenseCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu trong khoảng này.</p> : (
              <CategoryBarChart series={expenseCardSeries} maxVal={expenseCardMax} buckets={expenseCardBuckets} />
            )}
          </div>
        </div>
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

      {showAddWidget && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={() => setShowAddWidget(false)}>
          <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blueberry dark:text-white">Thêm widget</h3>
              <button aria-label="Đóng" onClick={() => setShowAddWidget(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
            </div>
            <p className="text-steel dark:text-light-grey text-sm">Tính năng tuỳ chỉnh widget cho Dashboard đang được xây dựng — bạn sẽ sớm chọn được dữ liệu và nội dung muốn hiển thị ở đây.</p>
          </div>
        </div>
      )}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={() => { reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
