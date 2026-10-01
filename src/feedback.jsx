/* ==============================================================================
   Phản hồi người dùng & hạ tầng modal: toast() thay alert(), confirmDialog() thay confirm(), và useEscapeKey() để Esc / nút Back Android đóng modal trên cùng.
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';

const TOAST_EVENT = 'app:toast';

export function toast(message, type = 'error') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message: String(message), type } }));
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    function onToast(e) {
      const { message, type } = e.detail;
      const id = Date.now() + Math.random();
      // Tránh chồng nhiều toast giống hệt nhau; tối đa 3 toast cùng lúc.
      setItems((prev) => [...prev.filter((t) => t.message !== message), { id, message, type }].slice(-3));
      const ms = Math.min(9000, 3500 + message.length * 40);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), ms);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);
  if (!items.length) return null;
  const tone = { error: 'bg-cotton-candy text-white', info: 'bg-blueberry text-white', success: 'bg-turquoise text-white' };
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4"
         style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
      {items.map((t) => (
        <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'}
             onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
             className={`pointer-events-auto max-w-md w-full cursor-pointer whitespace-pre-line rounded-2xl px-4 py-3 text-sm font-bold shadow-lg ${tone[t.type] || tone.error}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

const _modalStack = []; // modal đang mở, phần tử cuối = modal trên cùng

export function closeTopModal() {
  const top = _modalStack[_modalStack.length - 1];
  if (!top) return false;
  top.handler?.();
  return true;
}

export function useEscapeKey(onClose, enabled = true) {
  // enabled: dùng cho modal nằm inline trong component lớn (chỉ đăng ký khi modal đang mở)
  const entryRef = useRef({ handler: onClose });
  useEffect(() => { entryRef.current.handler = onClose; });
  useEffect(() => {
    if (!enabled) return;
    const entry = entryRef.current;
    _modalStack.push(entry);
    function onKey(e) { if (e.key === 'Escape' && _modalStack[_modalStack.length - 1] === entry) entry.handler?.(); }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = _modalStack.indexOf(entry);
      if (i >= 0) _modalStack.splice(i, 1);
    };
  }, [enabled]);
}

/* confirmDialog(message, opts) — thay window.confirm(). Trả về Promise<boolean>, dùng: if (!(await confirmDialog('...'))) return;
   opts: { title, confirmText, cancelText, danger }. Esc / nút Back / bấm nền = Hủy. */

const CONFIRM_EVENT = 'app:confirm';

export function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: { id: Date.now() + Math.random(), message: String(message), resolve, ...opts } }));
  });
}

function ConfirmDialog({ req, onDone }) {
  useEscapeKey(() => onDone(false));
  const { message, title = 'Xác nhận', confirmText = 'Đồng ý', cancelText = 'Hủy', danger = false } = req;
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => onDone(false)}>
      <div role="alertdialog" aria-modal="true" aria-label={title}
           className="bg-white dark:bg-[#1e1e32] rounded-3xl p-6 max-w-sm w-full shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="text-blueberry dark:text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-steel dark:text-light-grey text-sm whitespace-pre-line mb-5">{message}</p>
        <div className="flex gap-3">
          {/* autoFocus vào nút Hủy: lỡ bấm Enter cũng không xóa nhầm */}
          <button autoFocus onClick={() => onDone(false)}
                  className="flex-1 py-2.5 rounded-full text-sm font-bold bg-ice-cream dark:bg-white/10 text-blueberry dark:text-white">
            {cancelText}
          </button>
          <button onClick={() => onDone(true)}
                  className={`flex-1 py-2.5 rounded-full text-sm font-bold text-white shadow-md ${danger ? 'bg-cotton-candy' : 'bg-gradient-primary'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmHost() {
  const [queue, setQueue] = useState([]); // nhiều yêu cầu cùng lúc thì hỏi lần lượt
  useEffect(() => {
    function onConfirm(e) { setQueue((q) => [...q, e.detail]); }
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => window.removeEventListener(CONFIRM_EVENT, onConfirm);
  }, []);
  const current = queue[0];
  if (!current) return null;
  return (
    <ConfirmDialog key={current.id} req={current}
                   onDone={(result) => { current.resolve(result); setQueue((q) => q.slice(1)); }} />
  );
}
