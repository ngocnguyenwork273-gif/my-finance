/* ==============================================================================
   Xuất báo cáo sang Excel (.xlsx) — dùng thư viện SheetJS (xlsx), import ĐỘNG từ
   ReportExport.jsx nên không làm nặng bundle chính (giống cách làm với react-pdf).
   YÊU CẦU: npm install xlsx

   Khác với PDF/bản xem trước (chỉ cần hiển thị chuỗi đã định dạng sẵn), Excel cần SỐ THẬT
   để người dùng tự SUM/tính toán tiếp — nên các cột tiền ở đây được chuyển ngược từ chuỗi
   ("1.234.567đ", "-500.000đ", "-") về number bằng parseVnd(), thay vì giữ nguyên dạng chữ.
   ============================================================================== */
import * as XLSX from 'xlsx';

function parseVnd(str) {
  if (str == null) return 0;
  const s = String(str).trim();
  if (s === '-' || s === '') return 0;
  const neg = s.trim().startsWith('-');
  const digits = s.replace(/[^\d]/g, '');
  const n = digits ? Number(digits) : 0;
  return neg ? -n : n;
}
function parsePct(str) {
  const n = parseFloat(String(str ?? '').replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n / 100 : 0;
}

// Tạo 1 sheet từ mảng mảng (AOA) + độ rộng cột tuỳ chọn.
function aoaSheet(rows, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  return ws;
}

function overviewSheet(data) {
  const o = data.overview;
  const rows = [
    ['Báo cáo tài chính PandaFi'],
    [`Từ ${data.startDate} đến ${data.endDate}`],
    [`Xuất lúc ${data.generatedAt}`],
    [],
    ['Chỉ số', 'Giá trị'],
    ['Tổng tài sản đầu kỳ', parseVnd(o.assetsStart)],
    ['Tổng tài sản cuối kỳ', parseVnd(o.assetsEnd)],
    ['Chênh lệch tài sản', parseVnd(o.assetsChange)],
    ['Tổng thu nhập trong kỳ', parseVnd(o.income)],
    ['Tổng chi tiêu trong kỳ', parseVnd(o.expense)],
    ['Thu nhập - Chi tiêu', parseVnd(o.net)],
    [],
    ['Cơ cấu tài sản'],
    ['Nhóm', 'Đầu kỳ', 'Cuối kỳ', 'Chênh lệch'],
    ...o.composition.map((g) => [g.label, parseVnd(g.start), parseVnd(g.end), parseVnd(g.diff)]),
    [o.compositionTotal.label, parseVnd(o.compositionTotal.start), parseVnd(o.compositionTotal.end), parseVnd(o.compositionTotal.diff)],
  ];
  if (o.expenseBySource.length > 0) {
    rows.push([], ['Chi tiêu theo nguồn tiền'], ['Nguồn tiền', 'Số tiền', 'Tỷ trọng']);
    o.expenseBySource.forEach((r) => rows.push([r.label, parseVnd(r.amount), parsePct(r.pct)]));
  }
  if (o.poolAllocation?.hasPool) {
    const p = o.poolAllocation;
    rows.push(
      [], ['Thu nhập được chi — góp quỹ theo mục'],
      ['Thu nhập được chi', parseVnd(p.pool)],
      ['Đã góp quỹ', parseVnd(p.total)],
      ['Còn lại được chi trong kỳ', parseVnd(p.remaining)],
      [],
      ['Quỹ', 'Số tiền', 'Tỷ trọng'],
    );
    p.rows.forEach((r) => rows.push([r.name, parseVnd(r.amount), parsePct(r.pct)]));
  }
  if (data.insights?.length > 0) {
    rows.push([], ['Nhận xét tự động'], ...data.insights.map((it) => [it.text]));
  }
  return aoaSheet(rows, [32, 18, 14, 14]);
}

function catSheet(title, rows, total) {
  const aoa = [
    [title],
    ['Nguồn / Danh mục', 'Số GD', 'Số tiền', 'Tỷ trọng'],
    ...rows.map((r) => [r.name, Number(r.count), parseVnd(r.amount), parsePct(r.pct)]),
    ['Tổng', Number(total.count), parseVnd(total.amount), 1],
  ];
  return aoaSheet(aoa, [30, 10, 16, 12]);
}

function fundsSheet(data) {
  const f = data.funds;
  const rows = [
    ['Quỹ — số dư cuối kỳ'],
    ['Quỹ', 'Đầu kỳ', 'Nạp', 'Rút', 'Lãi', 'Cuối kỳ'],
    ...f.rows.map((r) => [r.name, parseVnd(r.start), parseVnd(r.deposit), parseVnd(r.withdraw), parseVnd(r.profit), parseVnd(r.end)]),
    [f.total.name, parseVnd(f.total.start), parseVnd(f.total.deposit), parseVnd(f.total.withdraw), parseVnd(f.total.profit), parseVnd(f.total.end)],
  ];
  return aoaSheet(rows, [26, 16, 14, 14, 12, 16]);
}

function walletsSheet(data) {
  const rows = [['Ví — tổng quan']];
  data.walletGroups.forEach((g) => {
    rows.push([], [g.title], ['Ví', 'Loại', 'Đầu kỳ', 'Thu vào', 'Chi ra', 'Nạp quỹ', 'Điều chỉnh', 'Cuối kỳ']);
    g.rows.forEach((r) => rows.push([r.name, r.typeLabel, parseVnd(r.start), parseVnd(r.inflow), parseVnd(r.outflow), parseVnd(r.toFund), parseVnd(r.adjust), parseVnd(r.end)]));
    rows.push([g.total.name, '', parseVnd(g.total.start), parseVnd(g.total.inflow), parseVnd(g.total.outflow), parseVnd(g.total.toFund), parseVnd(g.total.adjust), parseVnd(g.total.end)]);
  });
  return aoaSheet(rows, [20, 12, 14, 14, 14, 14, 14, 14]);
}

function fundHistorySheet(data) {
  const rows = [['Lịch sử quỹ trong kỳ']];
  data.fundHistory.forEach((f) => {
    rows.push([], [f.name], ['Ngày', 'Loại', 'Ghi chú', 'Số tiền', 'Số dư sau GD']);
    if (f.rows.length === 0) rows.push(['(Không có nạp/rút trong kỳ)']);
    f.rows.forEach((r) => rows.push([r.date, r.kind, r.note, parseVnd(r.amount), parseVnd(r.balance)]));
  });
  return aoaSheet(rows, [12, 12, 36, 16, 16]);
}

// Xuất phẳng (không gộp theo ngày như bản xem trước/PDF) — thuận tiện hơn cho việc lọc/pivot
// trong Excel; vẫn giữ cột Ngày trên từng dòng.
function transactionsSheet(data) {
  const rows = [
    [`Tất cả giao dịch trong kỳ (${data.txCount})`],
    ['Ngày', 'Loại', 'Danh mục', 'Ví / Nguồn', 'Ghi chú', 'Số tiền'],
  ];
  data.txsByDay.forEach((d) => d.items.forEach((r) => rows.push([d.date, r.kind, r.cat, r.source, r.note, parseVnd(r.amount)])));
  return aoaSheet(rows, [12, 12, 20, 16, 30, 16]);
}

export function buildReportWorkbook(data) {
  const sec = data.sections;
  const wb = XLSX.utils.book_new();
  if (sec.overview) XLSX.utils.book_append_sheet(wb, overviewSheet(data), 'Tổng quan');
  if (sec.income_by_cat) XLSX.utils.book_append_sheet(wb, catSheet('Thu nhập trong kỳ — theo nguồn', data.incomeByCat, data.incomeTotal), 'Thu nhập');
  if (sec.expense_by_cat) XLSX.utils.book_append_sheet(wb, catSheet('Chi tiêu trong kỳ — theo nguồn', data.expenseByCat, data.expenseTotal), 'Chi tiêu');
  if (sec.funds) XLSX.utils.book_append_sheet(wb, fundsSheet(data), 'Quỹ');
  if (sec.wallets) XLSX.utils.book_append_sheet(wb, walletsSheet(data), 'Ví');
  if (sec.fund_history) XLSX.utils.book_append_sheet(wb, fundHistorySheet(data), 'Lịch sử quỹ');
  if (sec.transactions) XLSX.utils.book_append_sheet(wb, transactionsSheet(data), 'Giao dịch');
  // Không mục nào được chọn (hiếm khi xảy ra vì nút bị disable) — vẫn xuất được 1 sheet rỗng
  // có ghi chú, tránh lỗi "workbook không có sheet nào" từ SheetJS.
  if (wb.SheetNames.length === 0) XLSX.utils.book_append_sheet(wb, aoaSheet([['Không có mục nào được chọn.']]), 'Báo cáo');
  return wb;
}

export function downloadReportExcel(data, filename) {
  const wb = buildReportWorkbook(data);
  XLSX.writeFile(wb, filename);
}
