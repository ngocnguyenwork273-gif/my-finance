/* ==============================================================================
   Kiểm tra dữ liệu form (thuần, không React): trả về DANH SÁCH lỗi theo từng ô để giao diện hiện ngay dưới ô sai.
   Mỗi lỗi: { field, message, inline }
     - field  : 'amount' | 'category' | 'source' | 'period' (khớp id="field-<tên>" trong form)
     - inline : true  -> hiện thông báo dưới ô (lỗi thiếu dữ liệu)
                false -> chỉ CHẶN lưu + đưa con trỏ về ô; form đã có sẵn dòng cảnh báo đỏ riêng cho các trường hợp
                         "vượt số dư / vượt Thu nhập được chi" nên không hiện trùng thêm một dòng nữa.
   Dùng chung cho AddTransaction và EditTransaction.
   ============================================================================== */

export function validateTransactionForm({ type, amount, selectedCategory, isFundCategory, expenseSource, selectedPeriod, periodOverLimit, fundOverBalance, sourceOverBalance }) {
  const errors = [];
  const add = (field, message, inline = true) => errors.push({ field, message, inline });

  if (!amount || Number(amount) === 0) add('amount', 'Vui lòng nhập số tiền');
  if (!selectedCategory) add('category', 'Vui lòng chọn danh mục');

  if (type === 'income') {
    if (!selectedPeriod) add('period', 'Vui lòng chọn Kỳ');
  } else if (type === 'allocation') {
    if (!expenseSource) add('source', 'Vui lòng chọn nguồn tiền cho khoản nạp quỹ này');
    else if (expenseSource === 'income') {
      if (!selectedPeriod) add('period', 'Vui lòng chọn Kỳ (nguồn thu nhập để nạp quỹ)');
      else if (periodOverLimit) add('amount', 'Số tiền nạp vượt quá Thu nhập được chi còn lại của kỳ', false);
    } else if (sourceOverBalance) add('amount', 'Số dư nguồn tiền không đủ', false);
  } else if (type === 'expense') {
    if (isFundCategory) {
      // Chi tiêu từ quỹ: trừ thẳng vào quỹ, không cần chọn nguồn tiền
      if (fundOverBalance) add('amount', 'Số dư quỹ không đủ', false);
    } else if (!expenseSource) add('source', 'Vui lòng chọn nguồn tiền cho khoản chi tiêu này');
    else if (expenseSource === 'income') {
      if (!selectedPeriod) add('period', 'Vui lòng chọn Kỳ');
      else if (periodOverLimit) add('amount', 'Số tiền chi vượt quá Thu nhập được chi còn lại của kỳ', false);
    } else if (sourceOverBalance) add('amount', 'Số dư nguồn tiền không đủ', false);
  }
  return errors;
}

// Chuyển danh sách lỗi thành { field: message } chỉ gồm lỗi cần hiện dưới ô (mỗi ô lấy lỗi đầu tiên).
export function inlineErrors(errorList) {
  const out = {};
  for (const e of errorList) if (e.inline && !(e.field in out)) out[e.field] = e.message;
  return out;
}

// Kiểm tra trường văn bản bắt buộc (tên quỹ, tên ví...). Trả về thông báo hoặc '' nếu hợp lệ.
export function requiredText(value, message) {
  return String(value ?? '').trim() ? '' : message;
}

// Kiểm tra số tiền bắt buộc (khác 0). Trả về thông báo hoặc '' nếu hợp lệ.
export function requiredAmount(value, message = 'Vui lòng nhập số tiền') {
  return !value || Number(value) === 0 || Number.isNaN(Number(value)) ? message : '';
}
