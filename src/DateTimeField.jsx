/* ==============================================================================
   DateTimeField — DateTimePicker dùng chung cho toàn app, thay thế
   <input type="datetime-local"> (popup giờ mặc định xám xịt của trình duyệt)
   bằng ĐÚNG style liquid-glass của DateField (lịch vanilla-calendar-pro đã skin
   theo Fincheck), có thêm 2 cột chọn Giờ / Phút bên dưới lịch.

   Cách dùng — 1-1 với input cũ, chỉ đổi tag + onChange nhận thẳng giá trị:
     <input type="datetime-local" value={x} onChange={(e) => setX(e.target.value)} className="..." />
     <DateTimeField value={x} onChange={setX} className="..." />

   value / onChange dùng đúng format của input datetime-local: 'YYYY-MM-DDTHH:mm'

   Props: giống hệt DateField (value, onChange, min, max, placeholder, className,
   showIcon, align, clearable, disabled). min/max chỉ áp cho phần NGÀY.

   Khác với DateField: chọn ngày trên lịch KHÔNG tự đóng popup (vì còn phải chọn
   giờ/phút) — bấm nút "Xong" (hoặc click ra ngoài) để đóng.
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/layout.css';
import 'vanilla-calendar-pro/styles/themes/light.css';
import { Calendar as CalendarIcon, X as ClearIcon, Clock as ClockIcon } from 'lucide-react';

const VI_LOCALE = {
  months: {
    long: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    short: ['Th01', 'Th02', 'Th03', 'Th04', 'Th05', 'Th06', 'Th07', 'Th08', 'Th09', 'Th10', 'Th11', 'Th12'],
  },
  weekdays: {
    long: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
    short: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  },
};

const POPUP_WIDTH = 300;
const POPUP_EST_HEIGHT = 470;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function splitValue(value) {
  if (!value) return { date: '', hour: '', minute: '' };
  const [date = '', time = ''] = value.split('T');
  const [hour = '', minute = ''] = time.split(':');
  return { date, hour, minute };
}

function joinValue(date, hour, minute) {
  if (!date) return '';
  const hh = String(hour || '00').padStart(2, '0');
  const mm = String(minute || '00').padStart(2, '0');
  return `${date}T${hh}:${mm}`;
}

function formatDisplay(value) {
  const { date, hour, minute } = splitValue(value);
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const dateStr = d.toLocaleDateString('vi-VN');
  if (hour === '' || minute === '') return dateStr;
  return `${dateStr} ${hour}:${minute}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowParts() {
  const d = new Date();
  return { date: todayStr(), hour: String(d.getHours()).padStart(2, '0'), minute: String(d.getMinutes()).padStart(2, '0') };
}

export default function DateTimeField({
  value,
  onChange,
  min,
  max,
  placeholder = 'Chọn ngày giờ',
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
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  const { date: dateVal, hour: hourVal, minute: minuteVal } = splitValue(value);

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

  // Cập nhật 1 phần (ngày / giờ / phút), giữ nguyên phần còn lại. Nếu ngày chưa
  // có sẵn (value rỗng), mặc định lấy giờ hiện tại thay vì 00:00 cho tự nhiên.
  function commit(nextDate, nextHour, nextMinute) {
    const fallback = (!dateVal && (nextHour === undefined || nextMinute === undefined)) ? nowParts() : null;
    const date = nextDate !== undefined ? nextDate : (dateVal || fallback?.date || todayStr());
    const hour = nextHour !== undefined ? nextHour : (hourVal || fallback?.hour || '00');
    const minute = nextMinute !== undefined ? nextMinute : (minuteVal || fallback?.minute || '00');
    onChange(joinValue(date, hour, minute));
  }

  function clear() {
    onChange('');
    setOpen(false);
  }

  function setToNow() {
    const n = nowParts();
    onChange(joinValue(n.date, n.hour, n.minute));
    setOpen(false);
  }

  function setDateToToday() {
    commit(todayStr(), undefined, undefined);
    setOpen(false);
  }

  // Khởi tạo calendar khi popup mở, huỷ khi đóng
  useEffect(() => {
    if (!open || !calElRef.current || calInstanceRef.current) return;
    const baseDate = dateVal ? new Date(`${dateVal}T00:00:00`) : null;
    calInstanceRef.current = new Calendar(calElRef.current, {
      type: 'default',
      selectionDatesMode: 'single',
      selectedDates: dateVal ? [dateVal] : [],
      selectedMonth: baseDate ? baseDate.getMonth() : undefined,
      selectedYear: baseDate ? baseDate.getFullYear() : undefined,
      displayDateMin: min || undefined,
      displayDateMax: max || undefined,
      firstWeekday: 1,
      locale: VI_LOCALE,
      themeAttrDetect: false,
      selectedTheme: 'light',
      onClickDate(self) {
        commit(self.context.selectedDates[0] || '', undefined, undefined);
      },
    });
    calInstanceRef.current.init();
    return () => {
      calInstanceRef.current?.destroy?.();
      calInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cuộn 2 cột giờ/phút tới vị trí đang chọn mỗi khi mở popup
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      hourListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
      minuteListRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // Đóng khi click ra ngoài / nhấn Esc / cuộn trang
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (popRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function handleKeyDown(e) { if (e.key === 'Escape') setOpen(false); }
    // Lưu ý: sự kiện 'scroll' không nổi bọt (bubble) như click, nên phải bắt ở
    // window bằng capture=true mới nghe được cả khi cuộn các phần tử con nằm
    // sâu bên trong trang. Nhưng vì vậy nó cũng bắt luôn khi người dùng cuộn
    // CHÍNH 2 cột Giờ/Phút bên trong popup — phải loại trừ trường hợp đó ra,
    // nếu không cứ lướt chọn giờ là popup tự đóng ngay (bug "giựt rồi mất").
    function handleReflow(e) {
      if (popRef.current && e?.target && popRef.current.contains(e.target)) return;
      setOpen(false);
    }
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

  const timeBtnClass = (active) =>
    `w-full text-center text-sm py-1.5 rounded-full font-bold transition ${
      active ? 'bg-turquoise text-white' : 'text-blueberry dark:text-white hover:bg-turquoise/10'
    }`;

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

          {/* Chọn giờ : phút — cùng tông turquoise/pill với ngày được chọn trên lịch */}
          <div className="relative flex items-center gap-2 mt-2 pt-3 border-t border-white/20 dark:border-white/10">
            <ClockIcon size={14} className="text-steel dark:text-light-grey flex-shrink-0" />
            <div className="flex-1 flex items-center justify-center gap-1.5">
              <div ref={hourListRef} className="h-28 w-14 overflow-y-auto scrollbar-hide rounded-xl bg-black/[0.03] dark:bg-white/[0.05] py-1">
                {HOURS.map((h) => (
                  <button
                    key={h} type="button" data-active={hourVal === h}
                    onClick={() => commit(undefined, h, undefined)}
                    className={timeBtnClass(hourVal === h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
              <span className="text-blueberry dark:text-white font-bold">:</span>
              <div ref={minuteListRef} className="h-28 w-14 overflow-y-auto scrollbar-hide rounded-xl bg-black/[0.03] dark:bg-white/[0.05] py-1">
                {MINUTES.map((m) => (
                  <button
                    key={m} type="button" data-active={minuteVal === m}
                    onClick={() => commit(undefined, undefined, m)}
                    className={timeBtnClass(minuteVal === m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-between mt-3 pt-2 border-t border-white/20 dark:border-white/10">
            <div className="flex items-center gap-3">
              <button type="button" onClick={setDateToToday} className="text-xs font-bold text-turquoise hover:underline">
                Hôm nay
              </button>
              <button type="button" onClick={setToNow} className="text-xs font-bold text-turquoise hover:underline">
                Bây giờ
              </button>
              {clearable && value && (
                <button type="button" onClick={clear} className="text-xs font-bold text-steel dark:text-light-grey hover:text-cotton-candy flex items-center gap-1">
                  <ClearIcon size={12} /> Xóa
                </button>
              )}
            </div>
            <button
              type="button" onClick={() => setOpen(false)}
              className="text-xs font-bold text-white bg-gradient-primary rounded-full px-3.5 py-1.5 shadow-sm"
            >
              Xong
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
