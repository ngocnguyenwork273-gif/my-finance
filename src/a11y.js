/* ==============================================================================
   Trợ năng (a11y) cho phần tử không phải <button> nhưng bấm được (vd dòng giao dịch dạng <div>).
   - clickable(handler): thêm role="button", tabIndex=0 và phím Enter / Space — dùng cho phần tử "lá"
     (bên trong KHÔNG có nút/liên kết khác, vì role="button" biến mọi thứ bên trong thành chữ thường).
   - keyActivatable(handler): chỉ thêm tabIndex=0 và phím Enter / Space, KHÔNG đổi role — dùng cho dòng/thẻ
     có chứa nút khác bên trong (vd nút xóa) hoặc là <tr>.
   Cả hai: handler rỗng (undefined/false) thì trả {} => phần tử không bấm được, không nhận focus.
   Phím gõ ở phần tử con (input, nút bên trong...) bị bỏ qua để không kích hoạt nhầm cả dòng.
   Cách dùng:  <div {...clickable(() => setEditingTx(tx))} className="...">
   ============================================================================== */
function onKeyActivate(handler) {
  return (e) => {
    if (e.target !== e.currentTarget) return;                     // phím đến từ phần tử con: không xử lý
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }   // preventDefault: Space không cuộn trang
  };
}

export function clickable(handler) {
  if (!handler) return {};
  return { onClick: handler, role: 'button', tabIndex: 0, onKeyDown: onKeyActivate(handler) };
}

export function keyActivatable(handler) {
  if (!handler) return {};
  return { onClick: handler, tabIndex: 0, onKeyDown: onKeyActivate(handler) };
}
