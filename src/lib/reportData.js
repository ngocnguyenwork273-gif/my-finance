/* ==============================================================================
   Dựng dữ liệu báo cáo (thuần): tổng hợp thu chi, tài sản, quỹ... theo khoảng thời gian.
   ============================================================================== */
import { ACCOUNT_TYPES } from './accountStyles';
import { compareTxTime, displayTxNote, fundBalanceAsOf, fundTransactionsWithBalance, isInitialAllocationTx, localDateStr, transactionPeriodKey, walletBalanceAsOf } from './finance';
import { formatMoney, formatMoneySigned } from './format';
import { txSourceInfo } from './ledger';

// Nạp quỹ (chuyển tiền sang quỹ) có tính vào "Tổng chi tiêu" của báo cáo không?
// false: chỉ tính chi tiêu thật (giống thẻ "Chi tiêu" ở trang Báo cáo); nạp quỹ được ghi chú riêng.
// true : gộp cả nạp quỹ vào chi tiêu (giống donut "Chi tiêu theo danh mục" trước đây).
const REPORT_COUNT_FUND_DEPOSIT_AS_EXPENSE = false;

export function firstDayOfThisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function parseLocalDate(str, endOfDay) {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function reportDmy(iso) { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; }

// Gom toàn bộ số liệu báo cáo thành các chuỗi đã định dạng sẵn — ReportPdf.jsx chỉ việc vẽ.
export function buildReportData({ startDate, endDate, transactions, categories, accounts, sections, spendingPoolByPeriod }) {
  const txAll = transactions || [];
  const cats = categories || [];
  const accs = accounts || [];
  const num = (v) => Number(v) || 0;
  const sum = (arr, pick = (t) => num(t.amount)) => arr.reduce((s, x) => s + pick(x), 0);
  const dash = (n, fmt = formatMoney) => (Math.round(n) ? fmt(n) : '-');
  const pctOf = (part, whole) => `${whole > 0 ? ((part / whole) * 100).toFixed(1) : '0.0'}%`;
  const catById = new Map(cats.map((c) => [c.id, c]));
  const fundCats = cats.filter((c) => c.is_fund);
  const txDay = (t) => (t.date ? String(t.date).slice(0, 10) : localDateStr(t.created_at));
  const cleanNote = (n) => displayTxNote(n).replace(/^\[SET\]\s*/, '');

  const start = parseLocalDate(startDate, false);
  const end = parseLocalDate(endDate, true);
  const openingCutoff = new Date(start.getTime() - 1); // 23:59:59.999 ngày liền trước kỳ
  const inRange = (t) => { const d = new Date(t.date || t.created_at); return d >= start && d <= end; };
  const rangeTxs = txAll.filter(inRange).sort(compareTxTime);

  /* ---------- Tài sản đầu / cuối kỳ ---------- */
  const walletStart = new Map(accs.map((a) => [a.id, walletBalanceAsOf(a, txAll, openingCutoff)]));
  const walletEnd = new Map(accs.map((a) => [a.id, walletBalanceAsOf(a, txAll, end)]));
  const fundStart = new Map(fundCats.map((c) => [c.id, fundBalanceAsOf(c, txAll, openingCutoff)]));
  const fundEnd = new Map(fundCats.map((c) => [c.id, fundBalanceAsOf(c, txAll, end)]));
  const isGold = (a) => a.type === 'gold';
  const plainWallets = accs.filter((a) => !isGold(a));
  const goldWallets = accs.filter(isGold);
  const sumMap = (map, items) => items.reduce((s, x) => s + (map.get(x.id) || 0), 0);

  const groupsAgg = [
    { label: 'Ví', s: sumMap(walletStart, plainWallets), e: sumMap(walletEnd, plainWallets), show: plainWallets.length > 0 },
    { label: 'Vàng', s: sumMap(walletStart, goldWallets), e: sumMap(walletEnd, goldWallets), show: goldWallets.length > 0 },
    { label: 'Quỹ', s: sumMap(fundStart, fundCats), e: sumMap(fundEnd, fundCats), show: fundCats.length > 0 },
  ].filter((g) => g.show);
  const assetsStart = sum(groupsAgg, (g) => g.s);
  const assetsEnd = sum(groupsAgg, (g) => g.e);
  const assetsDiff = assetsEnd - assetsStart;
  const ASSET_GROUP_COLORS = { 'Ví': '#0DBACC', 'Vàng': '#D4A017', 'Quỹ': '#8E6CF1' };
  const assetDonut = assetsEnd > 0 ? groupsAgg.filter((g) => g.e > 0).map((g) => ({
    label: g.label,
    amount: formatMoney(g.e),
    pctNum: (g.e / assetsEnd) * 100,
    pctLabel: pctOf(g.e, assetsEnd),
    color: ASSET_GROUP_COLORS[g.label] || '#7E7F90',
  })) : [];

  /* ---------- Thu nhập / chi tiêu ---------- */
  const incomeTxs = rangeTxs.filter((t) => t.type === 'income');
  const totalIncome = sum(incomeTxs);
  const allocTxs = rangeTxs.filter((t) => t.type === 'allocation' && !isInitialAllocationTx(t));
  const totalAlloc = sum(allocTxs);
  const expenseTxs = rangeTxs.filter((t) => t.type === 'expense' || (REPORT_COUNT_FUND_DEPOSIT_AS_EXPENSE && allocTxs.includes(t)));
  const totalExpense = sum(expenseTxs);
  const net = totalIncome - totalExpense;

  /* ---------- So với kỳ trước ---------- */
  // Kỳ trước = cùng số ngày, liền kề ngay trước ngày bắt đầu kỳ này (bất kể kỳ hiện tại
  // dài/ngắn bao nhiêu ngày, để so sánh công bằng thay vì cố định 21→20 hàng tháng).
  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const prevTxs = txAll.filter((t) => { const d = new Date(t.date || t.created_at); return d >= prevStart && d <= prevEnd; });
  const prevIncome = sum(prevTxs.filter((t) => t.type === 'income'));
  const prevAllocTxs = prevTxs.filter((t) => t.type === 'allocation' && !isInitialAllocationTx(t));
  const prevExpense = sum(prevTxs.filter((t) => t.type === 'expense' || (REPORT_COUNT_FUND_DEPOSIT_AS_EXPENSE && prevAllocTxs.includes(t))));
  function vsPrev(cur, prev, higherIsGood) {
    if (prev <= 0) return cur > 0 ? { label: 'Mới so với kỳ trước', good: higherIsGood, pct: null } : null;
    const pct = ((cur - prev) / prev) * 100;
    const rising = pct >= 0;
    return { label: `${rising ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% so với kỳ trước`, good: rising === higherIsGood, pct };
  }
  const incomeVsPrev = vsPrev(totalIncome, prevIncome, true);
  const expenseVsPrev = vsPrev(totalExpense, prevExpense, false);

  function groupBy(txs, keyFn, nameFn) {
    const map = new Map();
    txs.forEach((t) => {
      const k = keyFn(t);
      const cur = map.get(k) || { name: nameFn(t), count: 0, total: 0 };
      cur.count += 1; cur.total += num(t.amount);
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }
  const toCatRows = (groups, whole) => groups.map((g) => ({ name: g.name, count: String(g.count), amount: formatMoney(g.total), pct: pctOf(g.total, whole) }));

  const incomeByCat = toCatRows(groupBy(incomeTxs, (t) => t.category_id || 'none', (t) => catById.get(t.category_id)?.name || 'Không rõ danh mục'), totalIncome);
  const expenseByCatGroups = groupBy(
    expenseTxs,
    (t) => `${t.category_id || 'none'}:${t.type}`,
    (t) => {
      const c = catById.get(t.category_id);
      if (c?.is_fund) return t.type === 'allocation' ? `Nạp quỹ: ${c.name}` : `Rút từ quỹ: ${c.name}`;
      return c?.name || 'Không rõ danh mục';
    },
  );
  const expenseByCat = toCatRows(expenseByCatGroups, totalExpense);
  const expenseBySource = groupBy(expenseTxs, (t) => txSourceInfo(t, cats, accs).key, (t) => txSourceInfo(t, cats, accs).label)
    .map((g) => ({ label: g.name, amount: formatMoney(g.total), pct: pctOf(g.total, totalExpense), pctNum: totalExpense > 0 ? (g.total / totalExpense) * 100 : 0 }));

  /* ---------- Thu nhập được chi: góp quỹ theo mục + còn lại được chi trong kỳ ----------
     "Thu nhập được chi" là số tiền ĐƯỢC PHÉP CHI trong kỳ do tự cấu hình mỗi kỳ (Cài đặt →
     Danh mục → Thu nhập được chi/spendingPoolByPeriod) — KHÔNG PHẢI tổng thu nhập thực nhận.
     Phần dư (Lương cơ bản + Tiền cơm − số này) được tự động chuyển vào quỹ "Tích lũy trước
     chi" (đã hiện sẵn như 1 dòng quỹ trong danh sách bên dưới, không cần xử lý riêng).
     Nếu 1 kỳ nào đó nằm trong khoảng báo cáo mà CHƯA cấu hình số này, tạm lấy tổng thu nhập
     tính vào Chi pool của riêng kỳ đó (danh mục có include_in_spending_pool !== false) để
     không hiển thị sai lệch thành 0.
     Trong khoản "Thu nhập được chi": bao nhiêu % đã góp vào từng quỹ (chỉ tính nạp quỹ lấy
     nguồn = Thu nhập, tức account_id === null; nạp quỹ bằng ví khác không trừ vào đây), và
     còn lại bao nhiêu CHƯA DÙNG ĐẾN trong kỳ (có thể dùng để góp thêm quỹ hoặc chi tiêu). */
  const periodKeysInRange = [...new Set(rangeTxs.map((t) => transactionPeriodKey(t)))];
  const incomeForPoolTxs = incomeTxs.filter((t) => {
    const c = catById.get(t.category_id);
    return c ? c.include_in_spending_pool !== false : true;
  });
  let spendingPoolTotal = 0;
  periodKeysInRange.forEach((pk) => {
    const configured = spendingPoolByPeriod ? spendingPoolByPeriod[pk] : undefined;
    spendingPoolTotal += (configured != null && configured !== '')
      ? Number(configured)
      : sum(incomeForPoolTxs.filter((t) => transactionPeriodKey(t) === pk));
  });
  const poolAllocTxs = allocTxs.filter((t) => t.account_id === null);
  const poolAllocByFundRaw = groupBy(poolAllocTxs, (t) => t.category_id, (t) => catById.get(t.category_id)?.name || 'Không rõ quỹ');
  const poolAllocTotal = sum(poolAllocByFundRaw, (g) => g.total);
  const poolNonFundExpense = sum(rangeTxs.filter((t) => t.type === 'expense' && !catById.get(t.category_id)?.is_fund && t.account_id === null));
  const poolRemaining = spendingPoolTotal - poolAllocTotal - poolNonFundExpense;
  const poolAllocation = (spendingPoolTotal > 0 || poolAllocTotal > 0) ? {
    hasPool: true,
    pool: formatMoney(spendingPoolTotal),
    rows: poolAllocByFundRaw.map((g) => ({
      name: g.name,
      amount: formatMoney(g.total),
      pct: pctOf(g.total, spendingPoolTotal),
      pctNum: spendingPoolTotal > 0 ? (g.total / spendingPoolTotal) * 100 : 0,
    })),
    totalPct: pctOf(poolAllocTotal, spendingPoolTotal),
    total: formatMoney(poolAllocTotal),
    nonFundExpense: poolNonFundExpense > 0 ? formatMoney(poolNonFundExpense) : null,
    remaining: formatMoneySigned(poolRemaining),
    remainingPositive: poolRemaining >= 0,
  } : { hasPool: false };

  /* ---------- Nhận xét tự động ----------
     1-2 câu ngắn gọn, ưu tiên điều ĐÁNG CHÚ Ý NHẤT trước: chi vượt Thu nhập được chi (cảnh
     báo) > danh mục chi tiêu áp đảo (>= 25% tổng chi) > biến động tổng tài sản > biến động
     thu/chi so với kỳ trước. Chỉ dùng số liệu đã tính sẵn ở trên, không query gì thêm. */
  const insightCandidates = [];
  if (poolAllocation.hasPool && poolRemaining < -1) {
    insightCandidates.push({ text: `Đã chi vượt "Thu nhập được chi" ${formatMoney(Math.abs(poolRemaining))} trong kỳ này.`, tone: 'warn' });
  }
  if (expenseByCatGroups.length > 0 && totalExpense > 0) {
    const top = expenseByCatGroups[0];
    const topPct = (top.total / totalExpense) * 100;
    if (topPct >= 25) {
      insightCandidates.push({ text: `"${top.name}" chiếm ${topPct.toFixed(1)}% tổng chi tiêu trong kỳ (${formatMoney(top.total)}).`, tone: 'info' });
    }
  }
  if (assetsStart > 0) {
    const assetPctAbs = Math.abs((assetsDiff / assetsStart) * 100);
    insightCandidates.push({
      text: `Tổng tài sản ${assetsDiff >= 0 ? 'tăng' : 'giảm'} ${assetPctAbs.toFixed(1)}% so với đầu kỳ (${assetsDiff >= 0 ? '+' : '-'}${formatMoney(Math.abs(assetsDiff))}).`,
      tone: assetsDiff >= 0 ? 'good' : 'warn',
    });
  }
  if (incomeVsPrev && incomeVsPrev.pct != null) {
    insightCandidates.push({
      text: `Thu nhập ${incomeVsPrev.pct >= 0 ? 'tăng' : 'giảm'} ${Math.abs(incomeVsPrev.pct).toFixed(1)}% so với kỳ trước.`,
      tone: incomeVsPrev.good ? 'good' : 'warn',
    });
  }
  if (expenseVsPrev && expenseVsPrev.pct != null && Math.abs(expenseVsPrev.pct) >= 15) {
    insightCandidates.push({
      text: `Chi tiêu ${expenseVsPrev.pct >= 0 ? 'tăng' : 'giảm'} ${Math.abs(expenseVsPrev.pct).toFixed(1)}% so với kỳ trước.`,
      tone: expenseVsPrev.good ? 'good' : 'warn',
    });
  }
  const insights = insightCandidates.slice(0, 2);

  /* ---------- Ví ---------- */
  const walletRow = (a) => {
    const mine = rangeTxs.filter((t) => t.account_id === a.id);
    const inflow = sum(mine.filter((t) => t.type === 'income'));
    const outflow = sum(mine.filter((t) => t.type === 'expense'));
    const toFund = sum(mine.filter((t) => t.type === 'allocation'));
    const adjust = sum(mine.filter((t) => t.type === 'adjustment'));
    return {
      name: a.name,
      typeLabel: ACCOUNT_TYPES.find((x) => x.value === a.type)?.label || '',
      startRaw: walletStart.get(a.id) || 0, endRaw: walletEnd.get(a.id) || 0,
      inflowRaw: inflow, outflowRaw: outflow, toFundRaw: toFund, adjustRaw: adjust,
    };
  };
  const walletGroups = [
    { title: 'Ví', items: plainWallets },
    { title: 'Vàng', items: goldWallets },
  ].filter((g) => g.items.length > 0).map((g) => {
    const rows = g.items.map(walletRow);
    const t = (k) => sum(rows, (r) => r[k]);
    return {
      title: g.title,
      rows: rows.map((r) => ({
        name: r.name, typeLabel: r.typeLabel,
        start: formatMoneySigned(r.startRaw), inflow: dash(r.inflowRaw), outflow: dash(r.outflowRaw),
        toFund: dash(r.toFundRaw), adjust: dash(r.adjustRaw, formatMoneySigned), end: formatMoneySigned(r.endRaw),
      })),
      total: {
        name: 'Tổng', typeLabel: '', start: formatMoneySigned(t('startRaw')), inflow: dash(t('inflowRaw')), outflow: dash(t('outflowRaw')),
        toFund: dash(t('toFundRaw')), adjust: dash(t('adjustRaw'), formatMoneySigned), end: formatMoneySigned(t('endRaw')),
      },
    };
  });

  /* ---------- Quỹ: số dư cuối kỳ + lịch sử ---------- */
  const fundRowsRaw = fundCats.map((c) => {
    const mine = rangeTxs.filter((t) => t.category_id === c.id);
    const deposit = sum(mine.filter((t) => t.type === 'allocation'));
    const withdraw = sum(mine.filter((t) => t.type === 'expense'));
    const startB = fundStart.get(c.id) || 0;
    const endB = fundEnd.get(c.id) || 0;
    let profit = endB - startB - deposit + withdraw; // lợi nhuận tự sinh trong kỳ
    if (Math.abs(profit) < 1) profit = 0;
    return { name: c.name, startB, deposit, withdraw, profit, endB };
  });
  const ft = (k) => sum(fundRowsRaw, (r) => r[k]);
  const funds = {
    rows: fundRowsRaw.map((r) => ({
      name: r.name, start: formatMoneySigned(r.startB), deposit: dash(r.deposit), withdraw: dash(r.withdraw),
      profit: dash(r.profit, formatMoneySigned), end: formatMoneySigned(r.endB),
    })),
    total: { name: 'Tổng', start: formatMoneySigned(ft('startB')), deposit: dash(ft('deposit')), withdraw: dash(ft('withdraw')), profit: dash(ft('profit'), formatMoneySigned), end: formatMoneySigned(ft('endB')) },
  };

  const fundHistory = fundCats.map((c) => {
    const rate = num(c.interest_rate);
    const txsInRange = fundTransactionsWithBalance(c, txAll).filter(inRange);
    const rows = txsInRange.map((t) => ({
      date: reportDmy(txDay(t)),
      kind: t.type === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ',
      note: cleanNote(t.note),
      amount: `${t.type === 'allocation' ? '+' : '-'}${formatMoney(t.amount)}`,
      tone: t.type === 'allocation' ? 'in' : 'out',
      balance: formatMoneySigned(t.balanceAfter),
    }));
    // Dãy số dư để vẽ sparkline: bắt đầu từ số dư đầu kỳ, rồi tới số dư sau mỗi giao dịch
    // trong kỳ — nếu không có giao dịch nào thì không có gì để vẽ đường (sẽ ẩn ở nơi hiển thị).
    const sparkline = [fundStart.get(c.id) || 0, ...txsInRange.map((t) => t.balanceAfter)];
    return { name: `${c.name}${rate > 0 ? ` · lãi ${rate}%/năm` : ''}`, rows, sparkline };
  });

  /* ---------- Danh sách giao dịch ---------- */
  const kindLabel = (t) => {
    if (t.type === 'income') return 'Thu nhập';
    if (t.type === 'allocation') return 'Nạp quỹ';
    if (t.type === 'adjustment') return 'Điều chỉnh ví';
    return catById.get(t.category_id)?.is_fund ? 'Rút quỹ' : 'Chi tiêu';
  };
  const txs = rangeTxs.map((t) => {
    let amount, tone;
    if (t.type === 'income') { amount = `+${formatMoney(t.amount)}`; tone = 'in'; }
    else if (t.type === 'expense') { amount = `-${formatMoney(t.amount)}`; tone = 'out'; }
    else if (t.type === 'adjustment') { amount = `${num(t.amount) >= 0 ? '+' : '-'}${formatMoney(t.amount)}`; tone = num(t.amount) >= 0 ? 'in' : 'out'; }
    else { amount = formatMoney(t.amount); tone = undefined; } // nạp quỹ: chuyển nội bộ, không màu
    return {
      date: reportDmy(txDay(t)),
      kind: kindLabel(t),
      cat: catById.get(t.category_id)?.name || '',
      source: txSourceInfo(t, cats, accs).label,
      note: cleanNote(t.note),
      amount, tone,
    };
  });

  // Gộp giao dịch theo ngày để bảng đỡ lặp lại cột Ngày trên từng dòng — mỗi ngày có
  // 1 dòng chia nhóm hiển thị "thay đổi ròng" (thu - chi +/- điều chỉnh; nạp/rút quỹ là
  // chuyển nội bộ nên không tính vào đây vì không đổi tổng tài sản).
  const txsByDay = [];
  rangeTxs.forEach((t, idx) => {
    const row = txs[idx];
    let group = txsByDay[txsByDay.length - 1];
    if (!group || group.date !== row.date) {
      group = { date: row.date, items: [], netRaw: 0 };
      txsByDay.push(group);
    }
    if (t.type === 'income') group.netRaw += num(t.amount);
    else if (t.type === 'expense') group.netRaw -= num(t.amount);
    else if (t.type === 'adjustment') group.netRaw += num(t.amount);
    group.items.push(row);
  });
  txsByDay.forEach((g) => {
    g.net = formatMoneySigned(g.netRaw);
    g.netPositive = g.netRaw >= 0;
    g.hasNet = Math.round(g.netRaw) !== 0;
  });

  return {
    startDate: reportDmy(startDate),
    endDate: reportDmy(endDate),
    generatedAt: new Date().toLocaleString('vi-VN'),
    sections,
    insights,
    overview: {
      assetsStart: formatMoneySigned(assetsStart),
      assetsEnd: formatMoneySigned(assetsEnd),
      assetsChange: `${assetsDiff >= 0 ? '+' : '-'}${formatMoney(assetsDiff)}`,
      assetsChangePct: assetsStart > 0 ? `${assetsDiff >= 0 ? '+' : '-'}${Math.abs((assetsDiff / assetsStart) * 100).toFixed(1)}%` : null,
      assetsPositive: assetsDiff >= 0,
      income: formatMoney(totalIncome),
      expense: formatMoney(totalExpense),
      net: formatMoneySigned(net),
      netPositive: net >= 0,
      composition: groupsAgg.map((g) => ({ label: g.label, start: formatMoneySigned(g.s), end: formatMoneySigned(g.e), diff: formatMoneySigned(g.e - g.s) })),
      compositionTotal: { label: 'Tổng tài sản', start: formatMoneySigned(assetsStart), end: formatMoneySigned(assetsEnd), diff: formatMoneySigned(assetsDiff) },
      assetDonut,
      expenseBySource,
      allocation: totalAlloc > 0 ? formatMoney(totalAlloc) : null,
      allocationCountedAsExpense: REPORT_COUNT_FUND_DEPOSIT_AS_EXPENSE,
      poolAllocation,
      incomeVsPrev, expenseVsPrev,
    },
    incomeByCat, incomeTotal: { count: String(incomeTxs.length), amount: formatMoney(totalIncome) },
    expenseByCat, expenseTotal: { count: String(expenseTxs.length), amount: formatMoney(totalExpense) },
    funds, walletGroups, fundHistory,
    txs, txCount: txs.length, txsByDay,
  };
}

/* ---------- Xem trước ngay trên giao diện (HTML, không cần tạo PDF) ----------
   Dùng lại đúng dữ liệu đã tính trong buildReportData(), chỉ khác cách vẽ: đây là
   div/Tailwind để hiện ngay trong app, không phải PDF. Nút "Tải PDF" bên dưới mới
   thật sự dựng file bằng react-pdf.
   Mỗi mục có 1 màu riêng (accent) để dễ phân biệt — header bảng, dòng tổng và viền trái
   của khối đều tô theo màu đó. */
