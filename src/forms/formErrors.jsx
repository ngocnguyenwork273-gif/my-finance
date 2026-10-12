/* ==============================================================================
   Hiện lỗi form ngay dưới ô sai (thay cho toast ở đầu màn hình — trên điện thoại bàn phím che mất và toast tự tắt).
   - FieldError: dòng đỏ dưới ô, role="alert" nên trình đọc màn hình đọc ngay khi xuất hiện.
   - focusField: cuộn tới ô sai đầu tiên và đưa con trỏ vào (container cần có id="field-<tên>").
   Quy ước dùng: lỗi chỉ hiện SAU lần bấm Lưu đầu tiên (state `submitted`) và được TÍNH LẠI mỗi lần render,
   nên tự biến mất ngay khi người dùng sửa đúng — không cần mã dọn lỗi riêng.
   ============================================================================== */
// className: khoảng cách quanh dòng lỗi (mặc định mt-2). Với ô nhập có sẵn lề dưới mb-N, dùng "-mt-(N-1) mb-N" để dòng lỗi sát ô.
export function FieldError({ id, message, className = 'mt-2' }) {
  if (!message) return null;
  return <p id={id} role="alert" className={`text-cotton-candy text-xs font-semibold ${className}`}>{message}</p>;
}

export function focusField(fieldId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const target = el.matches('input,select,textarea,button') ? el : el.querySelector('input,select,textarea,button');
    target?.focus({ preventScroll: true });
  });
}
