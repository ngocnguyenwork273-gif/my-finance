/* ==============================================================================
   Ô nhập dùng chung: MoneyInput (nhập tiền có biểu thức) và CustomSelect.
   ============================================================================== */
import { Children, useEffect, useRef, useState } from 'react';
import { ChevronDown } from '../icons';
import { countRealCharsBefore, evalMoneyExpression, formatWithThousands, indexAfterRealCharCount, stripLeadingZeros } from '../lib/format';

export function MoneyInput({ value, onChange, placeholder, className }) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState(''); // luôn KHÔNG có dấu phẩy — dùng để tính toán
  const inputRef = useRef(null);
  const pendingCursor = useRef(null); // số ký tự thật trước con trỏ, để khôi phục vị trí sau khi format lại

  function handleFocus() { setFocused(true); setRawText(value ? stripLeadingZeros(String(value)) : ''); }

  function handleChange(e) {
    const typed = e.target.value;
    const cursorPos = e.target.selectionStart ?? typed.length;
    if (typed.includes('=')) {
      // người dùng gõ dấu "=" -> tính ngay, không đợi rời ô
      const expr = typed.replace('=', '');
      const cleaned = expr.replace(/[^0-9+\-*/.() ]/g, '');
      const result = evalMoneyExpression(cleaned);
      onChange(result !== null ? String(result) : (value || ''));
      setRawText('');
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    // Ghi nhớ số ký tự thật trước con trỏ (loại bỏ dấu phẩy hiển thị) để canh lại
    // vị trí con trỏ sau khi định dạng lại có thêm/bớt dấu phẩy.
    pendingCursor.current = countRealCharsBefore(typed, cursorPos);
    // vẫn cho gõ số + các phép toán, không chặn ký tự toán tử như trước; bỏ dấu phẩy hiển thị
    const nextRaw = stripLeadingZeros(typed.replace(/[^0-9+\-*/.() ]/g, ''));
    // Nếu vừa có số 0 thừa bị bỏ đi thì con trỏ cũng phải lùi tương ứng, nếu không
    // con trỏ sẽ nhảy sai 1 ký tự so với chỗ người dùng đang gõ.
    const removed = typed.replace(/[^0-9+\-*/.() ]/g, '').length - nextRaw.length;
    if (removed > 0) pendingCursor.current = Math.max(0, pendingCursor.current - removed);
    setRawText(nextRaw);
  }

  function commit() {
    const result = evalMoneyExpression(rawText);
    onChange(result !== null ? String(result) : (value || ''));
  }

  function handleBlur() { setFocused(false); commit(); }
  function handleKeyDown(e) { if (e.key === 'Enter') { e.currentTarget.blur(); } }

  // Luôn hiện dấu phẩy ngăn cách hàng nghìn — cả khi đang gõ lẫn khi đã rời ô.
  const displayValue = focused ? formatWithThousands(rawText) : (value ? Number(value).toLocaleString('en-US') : '');

  useEffect(() => {
    if (focused && inputRef.current && pendingCursor.current != null) {
      const pos = indexAfterRealCharCount(inputRef.current.value, pendingCursor.current);
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  }, [displayValue, focused]);

  return (
    <input ref={inputRef} type="text" inputMode="text" value={displayValue}
      onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown}
      placeholder={placeholder} className={className} />
  );
}

// ==============================================================================
// CUSTOM SELECT — thay thế thẻ select gốc của trình duyệt dùng chung toàn app.
// Lý do: danh sách lựa chọn của select gốc do hệ điều hành/trình duyệt tự vẽ
// (native picker), không thể tô theo theme sáng/tối của app — trên mobile
// thường ra nền trắng/xanh dương mặc định, lệch hẳn với giao diện tối.
// API giữ tương thích với select gốc: nhận value/onChange (onChange nhận object
// dạng { target: { value } } giống sự kiện thật) và các <option> con y hệt,
// nên chỉ cần đổi tên thẻ select/select thành CustomSelect/CustomSelect.
// - className: áp cho khung ngoài (dùng cho margin, width tổng thể, ví dụ mb-3)
// - triggerClassName: áp cho nút hiển thị giá trị đang chọn (dùng lại nguyên
//   className cũ của select gốc để giữ đúng màu nền/bo góc/padding sẵn có)
// - align: 'left' | 'right' — căn menu theo cạnh nào của nút trigger
// ==============================================================================
export function CustomSelect({ value, onChange, children, className = '', triggerClassName = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children)
    .filter((opt) => opt && opt.props)
    .map((opt) => ({ value: opt.props.value, label: opt.props.children, disabled: opt.props.disabled }));
  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClassName} flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{selected ? selected.label : ''}</span>
        <ChevronDown size={14} className={`flex-shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute' }} className={`z-40 mt-1 ${align === 'right' ? 'right-0' : 'left-0'} min-w-full frost-card rounded-2xl shadow-card overflow-hidden`}>
            {/* Blob màu mờ cố định (không cuộn theo list) — cho hiệu ứng kính lỏng
                rõ ràng ngay cả khi nền phía sau phẳng/không có gì để blur. */}
            <div className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full bg-turquoise/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-lavender/25 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent" />
            <div className="relative max-h-64 overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => { onChange({ target: { value: o.value } }); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm whitespace-nowrap hover:bg-white/40 dark:hover:bg-white/10 transition disabled:opacity-40 ${String(o.value) === String(value) ? 'text-turquoise font-bold' : 'text-blueberry dark:text-white'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
