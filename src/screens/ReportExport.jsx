/* ==============================================================================
   Modal xuất báo cáo (xem trước, in, tải PDF) và cài đặt các mục báo cáo.
   ============================================================================== */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import DateField from '../DateField';
import { useEscapeKey } from '../feedback';
import { Download, FileText, Loader2, X } from '../icons';
import { currentPeriodKey, localDateStr, periodKeyToRange, todayDateStr } from '../lib/finance';
import { buildReportData, firstDayOfThisMonthStr, reportDmy } from '../lib/reportData';
import { ReportHtmlPreview } from './ReportParts';

const REPORT_SECTIONS = [
  { key: 'overview', label: 'Tổng quan (tài sản đầu/cuối kỳ, thu nhập, chi tiêu)', shortLabel: 'Tổng quan' },
  { key: 'income_by_cat', label: 'Thu nhập trong kỳ — theo nguồn', shortLabel: 'Thu nhập' },
  { key: 'expense_by_cat', label: 'Chi tiêu trong kỳ — theo nguồn', shortLabel: 'Chi tiêu' },
  { key: 'funds', label: 'Quỹ — số dư cuối kỳ', shortLabel: 'Quỹ' },
  { key: 'wallets', label: 'Ví — tổng quan (gồm những ví nào, số dư đầu/cuối)', shortLabel: 'Ví' },
  { key: 'fund_history', label: 'Lịch sử quỹ (nạp/rút trong kỳ)', shortLabel: 'Lịch sử quỹ' },
  { key: 'transactions', label: 'Tất cả giao dịch trong kỳ', shortLabel: 'Giao dịch' },
];

// Nhớ lựa chọn mục báo cáo của lần xuất gần nhất (trên chính máy này) để lần sau khỏi tick lại.
const REPORT_SECTIONS_STORAGE_KEY = 'pandafi-report-sections';

function loadSavedSections() {
  try {
    const saved = JSON.parse(localStorage.getItem(REPORT_SECTIONS_STORAGE_KEY) || '{}');
    return Object.fromEntries(REPORT_SECTIONS.map((s) => [s.key, s.key in saved ? !!saved[s.key] : true]));
  } catch {
    return Object.fromEntries(REPORT_SECTIONS.map((s) => [s.key, true]));
  }
}

export function ReportExportModal({ onClose, transactions, categories, accounts, spendingPoolByPeriod }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [step, setStep] = useState('config'); // 'config' | 'preview'
  const [startDate, setStartDate] = useState(firstDayOfThisMonthStr());
  const [endDate, setEndDate] = useState(todayDateStr());
  const [selectedSections, setSelectedSections] = useState(loadSavedSections);
  const [reportData, setReportData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(null); // mục đang bôi đậm trên thanh tab xem trước

  // Nhảy nhanh tới 1 mục trong bản xem trước thay vì phải cuộn dài qua hết — chỉ cuộn khung
  // xem trước (không cuộn cả trang), vì mỗi RSection đã có id="report-sec-<key>" tương ứng.
  function jumpToSection(key) {
    setActiveSection(key);
    document.getElementById(`report-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleSection(key) {
    setSelectedSections((s) => {
      const next = { ...s, [key]: !s[key] };
      try { localStorage.setItem(REPORT_SECTIONS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  const anySelected = REPORT_SECTIONS.some((s) => selectedSections[s.key]);

  // Cảnh báo nhẹ nếu ngày bắt đầu được chọn nằm trước giao dịch đầu tiên trong app — khi đó
  // "tài sản đầu kỳ" trong báo cáo sẽ tính từ 0/số dư khởi tạo, dễ gây hiểu lầm là thiếu dữ liệu.
  const earliestTxDate = useMemo(() => {
    let min = null;
    (transactions || []).forEach((t) => {
      if (t.deleted_at) return;
      const d = (t.date || localDateStr(t.created_at));
      if (!min || d < min) min = d;
    });
    return min;
  }, [transactions]);
  const startsBeforeData = earliestTxDate && startDate < earliestTxDate;

  // Chọn nhanh khoảng thời gian. Kỳ tài chính của app chạy từ ngày 21 tháng trước đến ngày 20;
  // ngày cuối không được vượt quá hôm nay (kỳ chưa kết thúc thì báo cáo tính đến hôm nay).
  function applyPeriodPreset(periodKey) {
    const { start, end } = periodKeyToRange(periodKey);
    const today = todayDateStr();
    const endStr = localDateStr(end) > today ? today : localDateStr(end);
    setStartDate(localDateStr(start));
    setEndDate(endStr);
  }
  function previousPeriodKey() {
    const [y, m] = currentPeriodKey().split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  }
  const presets = [
    { label: 'Kỳ này (21→20)', run: () => applyPeriodPreset(currentPeriodKey()) },
    { label: 'Kỳ trước (21→20)', run: () => applyPeriodPreset(previousPeriodKey()) },
    { label: 'Tháng này', run: () => { setStartDate(firstDayOfThisMonthStr()); setEndDate(todayDateStr()); } },
  ];

  // Xem trước: chỉ tính số liệu rồi hiện thẳng lên giao diện — không đụng tới react-pdf nên tức thì.
  function showPreview() {
    setError('');
    try {
      const data = buildReportData({ startDate, endDate, transactions, categories, accounts, sections: selectedSections, spendingPoolByPeriod });
      setReportData(data);
      setActiveSection(REPORT_SECTIONS.find((s) => selectedSections[s.key])?.key || null);
      setStep('preview');
    } catch (e) {
      setError('Không tính được báo cáo: ' + (e?.message || ''));
    }
  }

  // Tải PDF: lúc này mới tải react-pdf và dựng file thật, dùng đúng reportData đang hiện.
  async function downloadPdf() {
    if (!reportData) return;
    setDownloading(true);
    setError('');
    try {
      const { renderReportPdfBlob } = await import('../ReportPdf');
      const blob = await renderReportPdfBlob(reportData);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bao-cao-pandafi_${startDate}_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      const msg = e?.message || '';
      setError(/Failed to resolve|Cannot find module|Failed to fetch dynamically/.test(msg)
        ? 'Chưa cài thư viện. Chạy "npm install @react-pdf/renderer" rồi khởi động lại dev server.'
        : 'Tạo PDF thất bại: ' + msg);
    }
    setDownloading(false);
  }

  // In: Chrome/Edge/Firefox tự thêm "đầu trang & chân trang" riêng (ngày giờ - tiêu đề trang -
  // URL, lặp lại mỗi trang) khi người dùng bật tuỳ chọn đó trong hộp thoại in — nằm ngoài khả
  // năng tắt bằng CSS của trang web. Mình không tắt được hộ họ, nhưng đổi tạm document.title
  // (tên tab) từ "PandaFi" sang tên + kỳ báo cáo, để nếu phần đầu trang đó CÓ hiện ra thì ít
  // nhất cũng là thông tin hữu ích thay vì chữ "PandaFi" lặp vô nghĩa; trả lại tên tab cũ ngay
  // sau khi đóng hộp thoại in.
  function printReport() {
    if (!reportData) return;
    const prevTitle = document.title;
    document.title = `Bao cao tai chinh ${startDate} - ${endDate}`;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  // Tải Excel: tương tự PDF — chỉ tải thư viện xlsx khi thật sự bấm, dùng đúng reportData đang hiện.
  async function downloadExcel() {
    if (!reportData) return;
    setDownloadingExcel(true);
    setError('');
    try {
      const { downloadReportExcel } = await import('../lib/reportExcel');
      downloadReportExcel(reportData, `bao-cao-pandafi_${startDate}_${endDate}.xlsx`);
    } catch (e) {
      const msg = e?.message || '';
      setError(/Failed to resolve|Cannot find module|Failed to fetch dynamically/.test(msg)
        ? 'Chưa cài thư viện. Chạy "npm install xlsx" rồi khởi động lại dev server.'
        : 'Tạo Excel thất bại: ' + msg);
    }
    setDownloadingExcel(false);
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center p-2 md:p-3" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] rounded-3xl w-[96vw] h-[96vh] max-w-none flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-grey/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-turquoise" />
            <h3 className="font-bold text-blueberry dark:text-white">{step === 'config' ? 'Xuất báo cáo PDF' : 'Xem trước báo cáo'}</h3>
          </div>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        {step === 'config' ? (
          <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
           <div className="max-w-2xl mx-auto">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-2">Khoảng thời gian</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={p.run} className="px-3 py-1.5 rounded-full text-xs font-bold text-blueberry dark:text-white bg-ice-cream dark:bg-night-sky">{p.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-5">
              <DateField value={startDate} onChange={setStartDate} max={endDate} showIcon={false} clearable={false} className="flex-1 justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm text-blueberry dark:text-white" />
              <span className="text-steel dark:text-light-grey text-sm">-</span>
              <DateField value={endDate} onChange={setEndDate} max={todayDateStr()} align="right" showIcon={false} clearable={false} className="flex-1 justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm text-blueberry dark:text-white" />
            </div>
            {startsBeforeData && (
              <p className="text-amber-500 text-xs font-semibold -mt-3 mb-5">
                ⚠️ Ngày bắt đầu nằm trước giao dịch đầu tiên của bạn ({reportDmy(earliestTxDate)}) — "Tổng tài sản đầu kỳ" sẽ tính từ số dư khởi tạo, không có gì để so sánh.
              </p>
            )}
            <p className="text-blueberry dark:text-white font-bold text-sm mb-2">Mục muốn đưa vào báo cáo</p>
            <div className="flex flex-col gap-2 mb-2">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-3 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm font-semibold text-blueberry dark:text-white cursor-pointer">
                  <input type="checkbox" checked={!!selectedSections[s.key]} onChange={() => toggleSection(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
            {!anySelected && <p className="text-cotton-candy text-xs font-semibold mt-1">Chọn ít nhất 1 mục để tạo báo cáo.</p>}
           </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Thanh tab nhảy nhanh tới từng mục — đứng ngoài khung cuộn nên luôn cố định phía
                trên, không bị cuộn trôi mất, và không bị in ra (nằm ngoài vùng print bên dưới). */}
            <div className="flex-shrink-0 overflow-x-auto scrollbar-hide border-b border-light-grey/30 bg-white dark:bg-[#1e1e32] px-5 md:px-8">
              <div className="flex gap-1.5 py-2.5 min-w-max">
                {REPORT_SECTIONS.filter((s) => reportData?.sections?.[s.key]).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => jumpToSection(s.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      activeSection === s.key
                        ? 'bg-gradient-primary text-white'
                        : 'bg-ice-cream dark:bg-night-sky text-steel dark:text-light-grey'
                    }`}
                  >
                    {s.shortLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-5 md:p-8 bg-[#fafafa] dark:bg-[#17172a]">
              {/* id này được style @media print bên dưới dùng để chỉ in đúng vùng báo cáo,
                  ẩn hết phần khung modal/nút bấm khi người dùng bấm "In". */}
              <div id="pandafi-report-print-area">
                {reportData && <ReportHtmlPreview data={reportData} />}
              </div>
            </div>
          </div>
        )}

        {/* Chỉ áp dụng khi đang in (Ctrl+P / nút In) — không ảnh hưởng gì lúc xem bình thường.
            Lưu ý: phần "đầu trang/chân trang" (ngày giờ, tên trang, URL, số trang) lặp lại mỗi
            trang KHÔNG đến từ đây — đó là tuỳ chọn riêng của trình duyệt trong hộp thoại in
            ("Đầu trang và chân trang" / "Headers and footers"), web không tắt được bằng CSS;
            người dùng tự bỏ tick ô đó trong "Chế độ cài đặt khác" nếu không muốn thấy. */}
        <style>{`
          @media print {
            @page { margin: 14mm 12mm; }
            body * { visibility: hidden; }
            #pandafi-report-print-area, #pandafi-report-print-area * { visibility: visible; }
            #pandafi-report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-light-grey/30 flex-shrink-0">
          {error && <p className="text-cotton-candy text-xs font-semibold flex-1">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            {step === 'preview' && (
              <button onClick={() => setStep('config')} className="px-4 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44]">Quay lại</button>
            )}
            {step === 'config' ? (
              <button onClick={showPreview} disabled={!anySelected} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary disabled:opacity-50 shadow-md shadow-turquoise/30">
                Xem trước
              </button>
            ) : (
              <>
                <button onClick={printReport} className="hidden md:block px-5 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44]">
                  In
                </button>
                <button onClick={downloadExcel} disabled={downloadingExcel} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44] disabled:opacity-50">
                  {downloadingExcel ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Tải Excel
                </button>
                <button onClick={downloadPdf} disabled={downloading} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary disabled:opacity-50 shadow-md shadow-turquoise/30">
                  {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Tải PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
