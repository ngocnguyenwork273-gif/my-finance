/* ==============================================================================
   Loại ví và kiểu hiển thị thẻ ví.
   ============================================================================== */

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'gold', label: 'Vàng' },
  { value: 'debt', label: 'Thu nợ' },
  { value: 'other', label: 'Khác' },
];

const ACCOUNT_TYPE_STYLES = {
  cash: 'linear-gradient(135deg, #B4F1F1, #0DBACC)',
  bank: 'linear-gradient(135deg, #C1DDFF, #74ACEF)',
  ewallet: 'linear-gradient(135deg, #E3D6FF, #9F7FE0)',
  gold: 'linear-gradient(135deg, #FFCDDB, #F18AB5)',
  debt: 'linear-gradient(135deg, #F18AB5, #9F7FE0)',
  other: 'linear-gradient(135deg, #BDBDCB, #7E7F90)',
};

export function accountCardGradient(type) { return ACCOUNT_TYPE_STYLES[type] || ACCOUNT_TYPE_STYLES.other; }

// ==============================================================================
// TÌM KIẾM KHÔNG DẤU + VIẾT TẮT — dùng chung cho mọi ô search trong app (giao dịch,
// quỹ, mục tiêu...). Ví dụ: gõ "suc khoe", "sk", "khoe" đều khớp "Sức khỏe".
// ==============================================================================




// ==============================================================================
// XOÁ GIAO DỊCH TRONG CÁC DÒNG LỊCH SỬ (dùng chung cho mọi màn hình có hiển thị
// lịch sử giao dịch — Trang chủ, Chi tiết quỹ, Chi tiết ví, Báo cáo...).
// Xoá ở đây LUÔN LÀ soft-delete qua softDelete('transactions', ...): giao dịch
// chỉ bị ẩn khỏi ứng dụng (deleted_at được set) và được ghi log restorable vào
// system_logs, để người dùng có thể khôi phục trong 30 ngày ở Cài đặt > Lịch sử
// hệ thống — KHÔNG xoá cứng khỏi database.
// ==============================================================================
