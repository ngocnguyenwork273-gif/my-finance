/* ==============================================================================
   lib/format.js — ĐỊNH DẠNG & XỬ LÝ CHUỖI THUẦN (không React, không Supabase)
   Gồm: định dạng tiền (formatMoney*), ô nhập tiền (evalMoneyExpression, formatWithThousands...),
   tìm kiếm không dấu, chuẩn hoá tên file.
   Tách ra từ App.jsx để test được bằng Vitest (xem format.test.js).
   ============================================================================== */

export function removeDiacritics(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeSearchText(str) {
  return removeDiacritics(str).toLowerCase().trim();
}

export function textMatchesSearch(text, query) {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const t = normalizeSearchText(text);
  if (t.includes(q)) return true;
  // Khớp theo viết tắt chữ cái đầu mỗi từ — ví dụ "Sức khỏe" -> "sk"
  const initials = t.split(/\s+/).filter(Boolean).map((w) => w[0]).join('');
  return initials.includes(q);
}

// Làm tròn CHỈ ở bước hiển thị (Math.round) — các phép tính lãi phía trên (tính lãi
// kép theo ngày) không làm tròn, để không bị hao hụt dần từng ngày; số hiển thị ra
// màn hình vẫn luôn là số nguyên đồng, gọn gàng như trước.
export function formatMoney(n) {
  return Math.round(Math.abs(n)).toLocaleString('en-US') + 'đ';
}

// Giống formatMoney nhưng GIỮ dấu âm — dùng cho các số có thể âm (Dư sau chi...)
// để không bị lệch với phần trăm âm hiển thị bên cạnh, gây hiểu nhầm số liệu.
export function formatMoneySigned(n) {
  // FIX: số âm cực nhỏ (vd -0.0000001 do lãi kép) trước đây hiện "-0đ". Chỉ thêm dấu "-" khi số sau làm tròn khác 0.
  const rounded = Math.round(Math.abs(n));
  return (n < 0 && rounded > 0 ? '-' : '') + rounded.toLocaleString('en-US') + 'đ';
}

// Rút gọn số tiền cho nhãn trục tung của biểu đồ (vd: 1.2tr, 500k) — trục tung
// chỉ cần đọc nhanh độ lớn, không cần chính xác từng đồng như formatMoney.
export function formatMoneyCompact(n) {
  const abs = Math.abs(n);
  const trimZero = (s) => s.replace(/\.0$/, '');
  const units = [[1e9, 'tỷ'], [1e6, 'tr'], [1e3, 'k']];
  for (let i = 0; i < units.length; i++) {
    const [size, suffix] = units[i];
    if (abs < size) continue;
    const text = (n / size).toFixed(1);
    // FIX: làm tròn 1 chữ số thập phân có thể đẩy 999.95k lên "1000k" (đúng ra phải là "1tr"):
    // khi đó nhảy sang đơn vị lớn hơn liền kề.
    if (Math.abs(Number(text)) >= 1000 && i > 0) {
      const [bigSize, bigSuffix] = units[i - 1];
      return trimZero((n / bigSize).toFixed(1)) + bigSuffix;
    }
    return trimZero(text) + suffix;
  }
  return (Math.round(n) || 0).toLocaleString('en-US'); // "|| 0" tránh "-0"
}

export function txDeleteDescription(tx, categories) {
  const cat = (categories || []).find((c) => c.id === tx.category_id);
  const label = cat?.name || (tx.type === 'income' ? 'Thu nhập' : tx.type === 'allocation' ? 'Nạp quỹ' : tx.type === 'adjustment' ? 'Cập nhật số dư ví' : 'Chi tiêu');
  return `Xoá giao dịch "${label}" ${formatMoney(tx.amount)}`;
}

// Supabase Storage object key không chấp nhận dấu tiếng Việt, khoảng trắng, ký tự đặc biệt.
// Chuẩn hoá tên file trước khi upload để tránh lỗi "Invalid key".
export function sanitizeFileName(name) {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > -1 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > -1 ? name.slice(dotIndex + 1) : '';
  const cleanBase = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-') // ký tự khác -> gạch ngang
    .replace(/^-+|-+$/g, '') // bỏ gạch ngang ở đầu/cuối
    .toLowerCase() || 'file';
  const cleanExt = ext.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}

// FIX: cho phép gõ biểu thức cộng/trừ/nhân/chia (vd "50000+2000") rồi tự tính ra kết quả.
// Hỗ trợ 2 kiểu: (1) gõ số thường rồi rời khỏi ô/Enter mới tính; (2) gõ kèm dấu "="
// ở bất kỳ đâu (vd "45000+5000=" hoặc "=45000+5000") sẽ TÍNH NGAY LẬP TỨC, giống máy tính/Excel.
// FIX: bỏ số 0 thừa ở đầu mỗi cụm số ("012334" -> "12334"). Bắt buộc phải làm trước khi
// tính biểu thức: ở strict mode, "012334" bị coi là số bát phân kiểu cũ và ném SyntaxError,
// khiến evalMoneyExpression trả về null -> ô tiền bị xoá trắng thay vì hiện 12,334.
// Không đụng tới "0.5" (sau số 0 là dấu chấm) và cũng không xoá số 0 đứng một mình.
export function stripLeadingZeros(text) {
  return (text || '').replace(/(^|[^\d.])0+(\d)/g, '$1$2');
}

export function evalMoneyExpression(str) {
  const cleaned = stripLeadingZeros((str || '').replace(/[^0-9+\-*/.() ]/g, ''));
  if (!cleaned.trim()) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + cleaned + ')')();
    if (typeof result === 'number' && isFinite(result)) return Math.round(result);
  } catch { /* biểu thức không hợp lệ -> bỏ qua, giữ giá trị cũ */ }
  return null;
}

// Thêm dấu phẩy ngăn cách hàng nghìn vào TỪNG phần số trong chuỗi (chuỗi có thể
// là biểu thức toán như "1000+2000" — MoneyInput cho phép gõ +-*/() để tính nhanh).
// Phần thập phân sau dấu "." KHÔNG bị chèn dấu phẩy.
export function formatWithThousands(text) {
  if (!text) return '';
  return text.split(/([+\-*/()])/).map((part) => {
    if (/^[+\-*/()]$/.test(part)) return part;
    return part.replace(/\d+/g, (digits, offset, str) => {
      // Nếu ngay trước cụm số này là dấu "." thì đây là phần thập phân -> giữ nguyên
      if (str[offset - 1] === '.') return digits;
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
  }).join('');
}

// Đếm số ký tự "thật" (không tính dấu phẩy hiển thị) đứng trước vị trí index trong str.
export function countRealCharsBefore(str, index) {
  let count = 0;
  for (let i = 0; i < index && i < str.length; i++) { if (str[i] !== ',') count++; }
  return count;
}

// Tìm vị trí trong str sao cho có đúng "count" ký tự thật đứng trước nó.
export function indexAfterRealCharCount(str, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== ',') { seen++; if (seen === count) return i + 1; }
  }
  return str.length;
}
