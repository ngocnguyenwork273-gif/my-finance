/* ==============================================================================
   DateField — DatePicker dùng chung cho toàn app, thay thế <input type="date">
   Dựa trên vanilla-calendar-pro (https://github.com/uvarov-frontend/vanilla-calendar-pro)
   nhưng được "thay áo" hoàn toàn theo bộ mã màu + phong cách liquid glass của Fincheck
   (xem khối CSS ".vc-glass" trong App.jsx).

   Cách dùng — 1-1 với input cũ, chỉ đổi tag + onChange nhận thẳng giá trị:
     <input type="date" value={x} onChange={(e) => setX(e.target.value)} className="..." />
     <DateField value={x} onChange={setX} className="..." />

   Props:
     value      string 'YYYY-MM-DD' | ''
     onChange   (value: string) => void
     min, max   string 'YYYY-MM-DD' (tương ứng thuộc tính min/max của input date cũ)
     placeholder string, mặc định 'Chọn ngày'
     className  className áp cho phần tử trigger (copy nguyên className của input cũ)
     showIcon   boolean, mặc định true — tắt cho các ô ngày nhỏ/hẹp (dạng "từ ngày → đến ngày")
     align      'left' | 'right' — hướng mở popup lịch, dùng 'right' cho ô nằm sát mép phải
     clearable  boolean, mặc định true — hiện nút "Xóa" khi đã có giá trị
     disabled   boolean
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/layout.css';
import 'vanilla-calendar-pro/styles/themes/light.css';
import { Calendar as CalendarIcon, X as ClearIcon } from 'lucide-react';

const VI_LOCALE = {
  months: {
    long: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    short: ['Th01', 'Th02', 'Th03', 'Th04', 'Th05', 'Th06', 'Th07', 'Th08', 'Th09', 'Th10', 'Th11', 'Th12'],
  },
  // FIX: thư viện vanilla-calendar-pro yêu cầu đúng tên khoá "weekdays" (có "s"),
  // để "weekday" (thiếu "s") sẽ khiến getLocale() throw lỗi ngay khi init() -> trắng trang.
  weekdays: {
    long: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
    short: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  },
};

const POPUP_WIDTH = 300;
const POPUP_EST_HEIGHT = 360;

function formatDisplay(value) {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = 'Chọn ngày',
  className = '',
  showIcon = true,
  align = 'left',
  clearable = true,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const calElRef = useRef(null);
  const calInstanceRef = useRef(null);

  function computePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let top = r.bottom + 8;
    if (top + POPUP_EST_HEIGHT > window.innerHeight - 8) {
      top = Math.max(8, r.top - 8 - POPUP_EST_HEIGHT);
    }
    let left = align === 'right' ? r.right - POPUP_WIDTH : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - POPUP_WIDTH - 8));
    setPos({ top, left });
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) { setOpen(false); return; }
    computePosition();
    setOpen(true);
  }

  function pick(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  // Khởi tạo calendar khi popup mở, huỷ khi đóng
  useEffect(() => {
    if (!open || !calElRef.current || calInstanceRef.current) return;
    const baseDate = value ? new Date(`${value}T00:00:00`) : null;
    calInstanceRef.current = new Calendar(calElRef.current, {
      type: 'default',
      selectionDatesMode: 'single',
      selectedDates: value ? [value] : [],
      selectedMonth: baseDate ? baseDate.getMonth() : undefined,
      selectedYear: baseDate ? baseDate.getFullYear() : undefined,
      displayDateMin: min || undefined,
      displayDateMax: max || undefined,
      firstWeekday: 1,
      locale: VI_LOCALE,
      // FIX: bản vanilla-calendar-pro đang dùng bị crash (TypeError: themeAttrDetect.replace
      // is not a function) khi themeAttrDetect=false mà KHÔNG có selectedTheme cố định — vì
      // lúc đó nó vẫn cố tự dò theme hệ thống rồi gọi .replace() lên giá trị false. Chỉ định
      // thẳng selectedTheme: 'light' (khớp với file light.css duy nhất đang import ở trên,
      // còn dark mode của app tự xử lý qua class .vc-glass) để bỏ qua hẳn bước dò lỗi đó.
      themeAttrDetect: false,
      selectedTheme: 'light',
      onClickDate(self) {
        pick(self.context.selectedDates[0] || '');
      },
    });
    calInstanceRef.current.init();
    return () => {
      calInstanceRef.current?.destroy?.();
      calInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Đóng khi click ra ngoài / nhấn Esc / cuộn trang (kể cả cuộn bên trong modal)
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleKeyDown(e) { if (e.key === 'Escape') setOpen(false); }
    function handleReflow() { setOpen(false); }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReflow, true);
    window.addEventListener('resize', handleReflow);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReflow, true);
      window.removeEventListener('resize', handleReflow);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className="truncate" style={{ opacity: value ? 1 : 0.55 }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        {showIcon && <CalendarIcon size={14} className="opacity-60 flex-shrink-0" />}
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          role="dialog"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPUP_WIDTH, zIndex: 999 }}
          className="vc-glass glass-surface dark:glass-surface-dark relative rounded-2xl p-3 shadow-card overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div ref={calElRef} />
          <div className="relative flex items-center justify-between mt-1 pt-2 border-t border-white/20 dark:border-white/10">
            <button type="button" onClick={() => pick(todayStr())} className="text-xs font-bold text-turquoise hover:underline">
              Hôm nay
            </button>
            {clearable && value && (
              <button type="button" onClick={() => pick('')} className="text-xs font-bold text-steel dark:text-light-grey hover:text-cotton-candy flex items-center gap-1">
                <ClearIcon size={12} /> Xóa
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
