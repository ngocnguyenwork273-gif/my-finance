/* ==============================================================================
   Xuất báo cáo sang Excel (.xlsx) có định dạng — màu nền tiêu đề, số liệu tô màu
   theo dấu, đóng băng dòng tiêu đề, bộ lọc tự động. Dùng ExcelJS (không dùng được
   'xlsx'/SheetJS bản miễn phí vì không hỗ trợ style khi ghi file).
   Import ĐỘNG từ ReportExport.jsx nên không làm nặng bundle chính.
   YÊU CẦU: npm install exceljs

   Giới hạn thật cần biết: đây là bảng tính được tô màu đẹp, có bộ lọc/đóng băng dòng
   tiêu đề — KHÔNG phải dashboard tương tác hay biểu đồ nhúng kiểu Power BI (các thư
   viện JS miễn phí không làm được việc đó). Nếu cần biểu đồ, mở sheet "Giao dịch"
   trong Excel rồi tự Insert > PivotChart — dữ liệu ở đây đã sạch, phẳng, sẵn sàng để
   làm PivotTable ngay.
   ============================================================================== */
import ExcelJS from 'exceljs';

const ACCENT = {
  overview: '0DBACC',
  income: '12B76A',
  expense: 'E0568F',
  funds: '8E6CF1',
  wallets: '3E9BE0',
  fund_history: 'F0A93E',
  transactions: '7E7F90',
};
const TURQUOISE = '0DBACC', PINK = 'E0568F', INK = '303150', STEEL = '7E7F90';
const argb = (hex) => 'FF' + hex.replace('#', '');
// Pha 1 màu với trắng để ra màu nhạt làm nền dòng "Tổng" (không dùng alpha trong ARGB vì
// Excel/ExcelJS cần đúng 8 ký tự AARRGGBB — nối thêm alpha phía sau như trước là SAI định
// dạng, khiến ô bị tô đen thay vì màu nhạt).
function tint(hex, ratio) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * ratio);
  const toHex = (c) => c.toString(16).padStart(2, '0').toUpperCase();
  return `${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
const MONEY_FMT = '#,##0" đ";-#,##0" đ"';
const PCT_FMT = '0.0%';

function parseVnd(str) {
  if (str == null) return 0;
  const s = String(str).trim();
  if (s === '-' || s === '') return 0;
  const neg = s.startsWith('-');
  const digits = s.replace(/[^\d]/g, '');
  const n = digits ? Number(digits) : 0;
  return neg ? -n : n;
}
function parsePct(str) {
  const n = parseFloat(String(str ?? '').replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n / 100 : 0;
}
// Màu chữ theo dấu — dùng cho các cột "chênh lệch"/"lãi" (0 vẫn coi là trung tính, không tô).
function signColor(n) { return n > 0 ? TURQUOISE : n < 0 ? PINK : INK; }

function titleRow(ws, text, span, opts = {}) {
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, span);
  r.getCell(1).font = { bold: true, size: opts.size || 13, color: { argb: argb(opts.color || INK) } };
  return r.number;
}
function subRow(ws, text, span) {
  const r = ws.addRow([text]);
  ws.mergeCells(r.number, 1, r.number, span);
  r.getCell(1).font = { size: 9, color: { argb: argb(STEEL) } };
  return r.number;
}
// Dòng tiêu đề cột của 1 bảng — nền màu theo accent, chữ trắng đậm.
function headerRow(ws, labels, accentHex) {
  const r = ws.addRow(labels);
  r.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: argb('FFFFFF') } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(accentHex) } };
    cell.alignment = { vertical: 'middle' };
  });
  r.height = 20;
  return r.number;
}
// Dòng "Tổng" cuối bảng — nền nhạt, chữ đậm.
function totalRow(ws, cells, accentHex) {
  const r = ws.addRow(cells);
  r.eachCell((cell) => { cell.font = { bold: true, size: 10 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + tint(accentHex, 0.85) } }; });
  return r;
}
function dataRow(ws, cells) { return ws.addRow(cells); }
function setMoneyCell(row, col, n, color) {
  const cell = row.getCell(col);
  cell.value = n;
  cell.numFmt = MONEY_FMT;
  cell.alignment = { horizontal: 'right' };
  if (color) cell.font = { color: { argb: argb(color) } };
}
function setPctCell(row, col, n) {
  const cell = row.getCell(col);
  cell.value = n;
  cell.numFmt = PCT_FMT;
  cell.alignment = { horizontal: 'right' };
}
function setColWidths(ws, widths) { widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; }); }
function thinBottomBorder(ws, fromRow, toRow, cols) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= cols; c++) ws.getRow(r).getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFEAEAEF' } } };
  }
}

function overviewSheet(wb, data) {
  const o = data.overview;
  const ws = wb.addWorksheet('Tổng quan');
  setColWidths(ws, [34, 16, 16, 16]);

  titleRow(ws, 'Báo cáo tài chính PandaFi', 4, { size: 14 });
  subRow(ws, `Từ ${data.startDate} đến ${data.endDate}`, 4);
  subRow(ws, `Xuất lúc ${data.generatedAt}`, 4);
  ws.addRow([]);

  if (data.insights?.length > 0) {
    data.insights.forEach((it) => {
      const r = ws.addRow([`•  ${it.text}`]);
      ws.mergeCells(r.number, 1, r.number, 4);
      r.getCell(1).font = { bold: true, size: 10, color: { argb: argb(it.tone === 'warn' ? PINK : it.tone === 'good' ? TURQUOISE : INK) } };
    });
    ws.addRow([]);
  }

  headerRow(ws, ['Chỉ số', 'Giá trị', '', ''], ACCENT.overview);
  const metrics = [
    ['Tổng tài sản đầu kỳ', parseVnd(o.assetsStart), null],
    ['Tổng tài sản cuối kỳ', parseVnd(o.assetsEnd), null],
    ['Chênh lệch tài sản', parseVnd(o.assetsChange), 'sign'],
    ['Tổng thu nhập trong kỳ', parseVnd(o.income), TURQUOISE],
    ['Tổng chi tiêu trong kỳ', parseVnd(o.expense), PINK],
    ['Thu nhập - Chi tiêu', parseVnd(o.net), 'sign'],
  ];
  metrics.forEach(([label, value, colorMode]) => {
    const r = dataRow(ws, [label]);
    const color = colorMode === 'sign' ? signColor(value) : colorMode;
    setMoneyCell(r, 2, value, color);
  });
  ws.addRow([]);

  titleRow(ws, 'Cơ cấu tài sản', 4, { size: 11 });
  const compHeadRow = headerRow(ws, ['Nhóm', 'Đầu kỳ', 'Cuối kỳ', 'Chênh lệch'], ACCENT.overview);
  o.composition.forEach((g) => {
    const r = dataRow(ws, [g.label]);
    setMoneyCell(r, 2, parseVnd(g.start));
    setMoneyCell(r, 3, parseVnd(g.end));
    setMoneyCell(r, 4, parseVnd(g.diff), signColor(parseVnd(g.diff)));
  });
  thinBottomBorder(ws, compHeadRow + 1, ws.rowCount, 4);
  const tR = totalRow(ws, [o.compositionTotal.label], ACCENT.overview);
  setMoneyCell(tR, 2, parseVnd(o.compositionTotal.start));
  setMoneyCell(tR, 3, parseVnd(o.compositionTotal.end));
  setMoneyCell(tR, 4, parseVnd(o.compositionTotal.diff), signColor(parseVnd(o.compositionTotal.diff)));
  ws.addRow([]);

  if (o.expenseBySource.length > 0) {
    titleRow(ws, 'Chi tiêu theo nguồn tiền', 4, { size: 11 });
    const h = headerRow(ws, ['Nguồn tiền', 'Số tiền', 'Tỷ trọng', ''], ACCENT.expense);
    o.expenseBySource.forEach((row) => {
      const r = dataRow(ws, [row.label]);
      setMoneyCell(r, 2, parseVnd(row.amount), PINK);
      setPctCell(r, 3, parsePct(row.pct));
    });
    thinBottomBorder(ws, h + 1, ws.rowCount, 3);
    ws.addRow([]);
  }

  if (o.poolAllocation?.hasPool) {
    const p = o.poolAllocation;
    titleRow(ws, 'Thu nhập được chi — góp quỹ theo mục', 4, { size: 11 });
    headerRow(ws, ['Chỉ số', 'Giá trị', '', ''], ACCENT.funds);
    [['Thu nhập được chi', parseVnd(p.pool), null], ['Đã góp quỹ', parseVnd(p.total), ACCENT.funds], ['Còn lại được chi trong kỳ', parseVnd(p.remaining), 'sign']]
      .forEach(([label, value, colorMode]) => {
        const r = dataRow(ws, [label]);
        setMoneyCell(r, 2, value, colorMode === 'sign' ? signColor(value) : colorMode);
      });
    if (p.rows.length > 0) {
      ws.addRow([]);
      const h2 = headerRow(ws, ['Quỹ', 'Số tiền', 'Tỷ trọng', ''], ACCENT.funds);
      p.rows.forEach((row) => {
        const r = dataRow(ws, [row.name]);
        setMoneyCell(r, 2, parseVnd(row.amount), ACCENT.funds);
        setPctCell(r, 3, parsePct(row.pct));
      });
      thinBottomBorder(ws, h2 + 1, ws.rowCount, 3);
    }
  }
}

function catSheet(wb, sheetName, title, accentHex, amountColor, rows, total) {
  const ws = wb.addWorksheet(sheetName);
  setColWidths(ws, [32, 10, 16, 12]);
  titleRow(ws, title, 4);
  ws.addRow([]);
  const h = headerRow(ws, ['Nguồn / Danh mục', 'Số GD', 'Số tiền', 'Tỷ trọng'], accentHex);
  rows.forEach((row) => {
    const r = dataRow(ws, [row.name, Number(row.count)]);
    setMoneyCell(r, 3, parseVnd(row.amount), amountColor);
    setPctCell(r, 4, parsePct(row.pct));
  });
  thinBottomBorder(ws, h + 1, ws.rowCount, 4);
  const tR = totalRow(ws, ['Tổng', Number(total.count)], accentHex);
  setMoneyCell(tR, 3, parseVnd(total.amount), amountColor);
  setPctCell(tR, 4, 1);
  ws.views = [{ state: 'frozen', ySplit: h }];
  ws.autoFilter = { from: { row: h, column: 1 }, to: { row: h, column: 4 } };
}

function fundsSheet(wb, data) {
  const f = data.funds;
  const ws = wb.addWorksheet('Quỹ');
  setColWidths(ws, [26, 16, 14, 14, 12, 16]);
  titleRow(ws, 'Quỹ — số dư cuối kỳ', 6);
  ws.addRow([]);
  const h = headerRow(ws, ['Quỹ', 'Đầu kỳ', 'Nạp', 'Rút', 'Lãi', 'Cuối kỳ'], ACCENT.funds);
  f.rows.forEach((row) => {
    const r = dataRow(ws, [row.name]);
    setMoneyCell(r, 2, parseVnd(row.start));
    setMoneyCell(r, 3, parseVnd(row.deposit), TURQUOISE);
    setMoneyCell(r, 4, parseVnd(row.withdraw), PINK);
    setMoneyCell(r, 5, parseVnd(row.profit), signColor(parseVnd(row.profit)));
    setMoneyCell(r, 6, parseVnd(row.end));
  });
  thinBottomBorder(ws, h + 1, ws.rowCount, 6);
  const tR = totalRow(ws, ['Tổng'], ACCENT.funds);
  setMoneyCell(tR, 2, parseVnd(f.total.start));
  setMoneyCell(tR, 3, parseVnd(f.total.deposit), TURQUOISE);
  setMoneyCell(tR, 4, parseVnd(f.total.withdraw), PINK);
  setMoneyCell(tR, 5, parseVnd(f.total.profit), signColor(parseVnd(f.total.profit)));
  setMoneyCell(tR, 6, parseVnd(f.total.end));
  ws.views = [{ state: 'frozen', ySplit: h }];
  ws.autoFilter = { from: { row: h, column: 1 }, to: { row: h, column: 6 } };
  const note = ws.addRow(['Lãi = số dư cuối kỳ - số dư đầu kỳ - nạp + rút.']);
  note.getCell(1).font = { italic: true, size: 8, color: { argb: argb(STEEL) } };
}

function walletsSheet(wb, data) {
  const ws = wb.addWorksheet('Ví');
  setColWidths(ws, [20, 12, 14, 14, 14, 14, 14, 14]);
  titleRow(ws, 'Ví — tổng quan', 8);
  data.walletGroups.forEach((g) => {
    ws.addRow([]);
    titleRow(ws, g.title, 8, { size: 11, color: ACCENT.wallets });
    const h = headerRow(ws, ['Ví', 'Loại', 'Đầu kỳ', 'Thu vào', 'Chi ra', 'Nạp quỹ', 'Điều chỉnh', 'Cuối kỳ'], ACCENT.wallets);
    g.rows.forEach((row) => {
      const r = dataRow(ws, [row.name, row.typeLabel]);
      setMoneyCell(r, 3, parseVnd(row.start));
      setMoneyCell(r, 4, parseVnd(row.inflow), TURQUOISE);
      setMoneyCell(r, 5, parseVnd(row.outflow), PINK);
      setMoneyCell(r, 6, parseVnd(row.toFund));
      setMoneyCell(r, 7, parseVnd(row.adjust), signColor(parseVnd(row.adjust)));
      setMoneyCell(r, 8, parseVnd(row.end));
    });
    thinBottomBorder(ws, h + 1, ws.rowCount, 8);
    const tR = totalRow(ws, ['Tổng', ''], ACCENT.wallets);
    setMoneyCell(tR, 3, parseVnd(g.total.start));
    setMoneyCell(tR, 4, parseVnd(g.total.inflow), TURQUOISE);
    setMoneyCell(tR, 5, parseVnd(g.total.outflow), PINK);
    setMoneyCell(tR, 6, parseVnd(g.total.toFund));
    setMoneyCell(tR, 7, parseVnd(g.total.adjust), signColor(parseVnd(g.total.adjust)));
    setMoneyCell(tR, 8, parseVnd(g.total.end));
  });
}

function fundHistorySheet(wb, data) {
  const ws = wb.addWorksheet('Lịch sử quỹ');
  setColWidths(ws, [12, 12, 36, 16, 16]);
  titleRow(ws, 'Lịch sử quỹ trong kỳ', 5);
  data.fundHistory.forEach((f) => {
    ws.addRow([]);
    titleRow(ws, f.name, 5, { size: 11, color: ACCENT.fund_history });
    const h = headerRow(ws, ['Ngày', 'Loại', 'Ghi chú', 'Số tiền', 'Số dư sau GD'], ACCENT.fund_history);
    if (f.rows.length === 0) {
      const r = ws.addRow(['(Không có nạp/rút trong kỳ)']);
      ws.mergeCells(r.number, 1, r.number, 5);
      r.getCell(1).font = { italic: true, size: 9, color: { argb: argb(STEEL) } };
    } else {
      f.rows.forEach((row) => {
        const r = dataRow(ws, [row.date, row.kind, row.note]);
        setMoneyCell(r, 4, parseVnd(row.amount), row.tone === 'in' ? TURQUOISE : PINK);
        setMoneyCell(r, 5, parseVnd(row.balance));
      });
      thinBottomBorder(ws, h + 1, ws.rowCount, 5);
    }
  });
}

// Xuất phẳng (không gộp theo ngày như bản xem trước/PDF) — thuận tiện hơn cho việc lọc/pivot
// trong Excel; vẫn giữ cột Ngày trên từng dòng. Có sẵn bộ lọc + đóng băng dòng tiêu đề.
function transactionsSheet(wb, data) {
  const ws = wb.addWorksheet('Giao dịch');
  setColWidths(ws, [12, 12, 20, 16, 32, 16]);
  titleRow(ws, `Tất cả giao dịch trong kỳ (${data.txCount})`, 6);
  const h = headerRow(ws, ['Ngày', 'Loại', 'Danh mục', 'Ví / Nguồn', 'Ghi chú', 'Số tiền'], ACCENT.transactions);
  data.txsByDay.forEach((d) => d.items.forEach((row) => {
    const r = dataRow(ws, [d.date, row.kind, row.cat, row.source, row.note]);
    setMoneyCell(r, 6, parseVnd(row.amount), row.tone === 'in' ? TURQUOISE : row.tone === 'out' ? PINK : null);
  }));
  thinBottomBorder(ws, h + 1, ws.rowCount, 6);
  ws.views = [{ state: 'frozen', ySplit: h }];
  ws.autoFilter = { from: { row: h, column: 1 }, to: { row: h, column: 6 } };
}

export async function buildReportWorkbook(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PandaFi';
  wb.created = new Date();
  const sec = data.sections;
  if (sec.overview) overviewSheet(wb, data);
  if (sec.income_by_cat) catSheet(wb, 'Thu nhập', 'Thu nhập trong kỳ — theo nguồn', ACCENT.income, TURQUOISE, data.incomeByCat, data.incomeTotal);
  if (sec.expense_by_cat) catSheet(wb, 'Chi tiêu', 'Chi tiêu trong kỳ — theo nguồn', ACCENT.expense, PINK, data.expenseByCat, data.expenseTotal);
  if (sec.funds) fundsSheet(wb, data);
  if (sec.wallets) walletsSheet(wb, data);
  if (sec.fund_history) fundHistorySheet(wb, data);
  if (sec.transactions) transactionsSheet(wb, data);
  // Không mục nào được chọn (hiếm khi xảy ra vì nút bị disable) — vẫn xuất được 1 sheet có ghi
  // chú, tránh lỗi "workbook không có sheet nào".
  if (wb.worksheets.length === 0) wb.addWorksheet('Báo cáo').addRow(['Không có mục nào được chọn.']);
  return wb;
}

export async function downloadReportExcel(data, filename) {
  const wb = await buildReportWorkbook(data);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
