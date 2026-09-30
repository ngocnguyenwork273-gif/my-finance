import { describe, it, expect } from 'vitest';
import {
  formatMoney, formatMoneySigned, formatMoneyCompact,
  stripLeadingZeros, evalMoneyExpression, formatWithThousands,
  countRealCharsBefore, indexAfterRealCharCount,
  removeDiacritics, normalizeSearchText, textMatchesSearch,
  sanitizeFileName, txDeleteDescription,
} from './format';

/* ============================== ĐỊNH DẠNG TIỀN ============================== */
describe('formatMoney', () => {
  it('phân cách hàng nghìn bằng dấu phẩy, làm tròn đồng, luôn hiện số dương', () => {
    expect(formatMoney(1234567)).toBe('1,234,567đ');
    expect(formatMoney(0)).toBe('0đ');
    expect(formatMoney(1234.5)).toBe('1,235đ');
    expect(formatMoney(0.4)).toBe('0đ');
    expect(formatMoney(-5000)).toBe('5,000đ'); // bỏ dấu âm theo thiết kế (dùng formatMoneySigned nếu cần dấu)
  });
});

describe('formatMoneySigned', () => {
  it('giữ dấu âm', () => {
    expect(formatMoneySigned(-5000)).toBe('-5,000đ');
    expect(formatMoneySigned(5000)).toBe('5,000đ');
    expect(formatMoneySigned(0)).toBe('0đ');
  });
  it('số âm cực nhỏ (sai số lãi kép) không hiện "-0đ"', () => {
    expect(formatMoneySigned(-0.0000001)).toBe('0đ');
    expect(formatMoneySigned(-0.4)).toBe('0đ');
    expect(formatMoneySigned(-0.6)).toBe('-1đ'); // làm tròn ra 1 thì vẫn có dấu
  });
});

describe('formatMoneyCompact (nhãn trục biểu đồ)', () => {
  it('đơn vị k / tr / tỷ và bỏ ".0"', () => {
    expect(formatMoneyCompact(999)).toBe('999');
    expect(formatMoneyCompact(1000)).toBe('1k');
    expect(formatMoneyCompact(1500)).toBe('1.5k');
    expect(formatMoneyCompact(2_000_000)).toBe('2tr');
    expect(formatMoneyCompact(1_200_000)).toBe('1.2tr');
    expect(formatMoneyCompact(2_500_000_000)).toBe('2.5tỷ');
  });
  it('số âm', () => {
    expect(formatMoneyCompact(-1_500_000)).toBe('-1.5tr');
    expect(formatMoneyCompact(-500)).toBe('-500');
    expect(formatMoneyCompact(-0.4)).toBe('0'); // không hiện "-0"
    expect(formatMoneyCompact(0)).toBe('0');
  });
  it('sát ngưỡng đơn vị: không bao giờ ra "1000k" / "1000tr"', () => {
    expect(formatMoneyCompact(999_999)).toBe('1tr');
    expect(formatMoneyCompact(999_999_999)).toBe('1tỷ');
    expect(formatMoneyCompact(999_949)).toBe('999.9k'); // chưa chạm ngưỡng thì giữ nguyên
  });
});

/* ============================== Ô NHẬP TIỀN ============================== */
describe('stripLeadingZeros', () => {
  it('bỏ số 0 thừa ở đầu mỗi cụm số', () => {
    expect(stripLeadingZeros('012334')).toBe('12334');
    expect(stripLeadingZeros('007+0008')).toBe('7+8');
    expect(stripLeadingZeros('00.5')).toBe('0.5');
  });
  it('không đụng vào số 0 hợp lệ', () => {
    expect(stripLeadingZeros('0')).toBe('0');
    expect(stripLeadingZeros('0.5')).toBe('0.5');
    expect(stripLeadingZeros('100')).toBe('100');
    expect(stripLeadingZeros('1000+0')).toBe('1000+0');
  });
  it('null / rỗng', () => {
    expect(stripLeadingZeros(null)).toBe('');
    expect(stripLeadingZeros('')).toBe('');
  });
});

describe('evalMoneyExpression', () => {
  it('phép tính cơ bản, kết quả làm tròn thành số nguyên đồng', () => {
    expect(evalMoneyExpression('50000+2000')).toBe(52000);
    expect(evalMoneyExpression('10*3')).toBe(30);
    expect(evalMoneyExpression('(1000+500)*2')).toBe(3000);
    expect(evalMoneyExpression('10/4')).toBe(3); // 2.5 -> 3
    expect(evalMoneyExpression('1/3*3')).toBe(1);
    expect(evalMoneyExpression('0.5*10')).toBe(5);
    expect(evalMoneyExpression('-5+2')).toBe(-3);
    expect(evalMoneyExpression('2**3')).toBe(8);
  });
  it('số 0 thừa ở đầu không gây lỗi bát phân (012334 -> 12334)', () => {
    expect(evalMoneyExpression('012334')).toBe(12334);
    expect(evalMoneyExpression('0100+050')).toBe(150);
  });
  it('rỗng -> 0; dấu phẩy hiển thị và ký tự lạ bị bỏ qua', () => {
    expect(evalMoneyExpression('')).toBe(0);
    expect(evalMoneyExpression('   ')).toBe(0);
    expect(evalMoneyExpression(null)).toBe(0);
    expect(evalMoneyExpression('1,000+500')).toBe(1500);
    expect(evalMoneyExpression('abc123')).toBe(123);
  });
  it('biểu thức không hợp lệ hoặc vô hạn -> null (ô tiền giữ giá trị cũ)', () => {
    expect(evalMoneyExpression('1/0')).toBeNull();
    expect(evalMoneyExpression('9**9**9')).toBeNull();
    expect(evalMoneyExpression('5//3')).toBeNull();
    expect(evalMoneyExpression('5++')).toBeNull();
    expect(evalMoneyExpression('()')).toBeNull();
    expect(evalMoneyExpression('5--3')).toBeNull();
  });
  it('AN TOÀN: chuỗi độc hại không thể chạy mã (chỉ giữ lại 0-9 + - * / . ( ) và khoảng trắng)', () => {
    globalThis.__hacked = undefined;
    const attacks = [
      "globalThis.__hacked=1",
      "alert(1)",
      "process.exit(1)",
      "constructor.constructor('globalThis.__hacked=1')()",
      "1;globalThis.__hacked=1",
      "`${globalThis.__hacked=1}`",
      "'+globalThis.__hacked=1+'",
    ];
    for (const a of attacks) evalMoneyExpression(a);
    expect(globalThis.__hacked).toBeUndefined();
  });
});

describe('formatWithThousands', () => {
  it('thêm dấu phẩy vào từng cụm số, kể cả trong biểu thức', () => {
    expect(formatWithThousands('1234567')).toBe('1,234,567');
    expect(formatWithThousands('1000+2000')).toBe('1,000+2,000');
    expect(formatWithThousands('(1000*3)')).toBe('(1,000*3)');
    expect(formatWithThousands('-5000')).toBe('-5,000');
    expect(formatWithThousands('999')).toBe('999');
  });
  it('phần thập phân không bị chèn dấu phẩy', () => {
    expect(formatWithThousands('1234.5678')).toBe('1,234.5678');
  });
  it('rỗng', () => {
    expect(formatWithThousands('')).toBe('');
    expect(formatWithThousands(null)).toBe('');
  });
  it('vòng khứ hồi: hiển thị có dấu phẩy rồi tính lại vẫn ra đúng số ban đầu', () => {
    for (const n of [0, 7, 999, 1000, 123456, 1234567890]) {
      expect(evalMoneyExpression(formatWithThousands(String(n)))).toBe(n);
    }
  });
});

describe('vị trí con trỏ khi có dấu phẩy hiển thị', () => {
  it('countRealCharsBefore bỏ qua dấu phẩy', () => {
    expect(countRealCharsBefore('1,234,567', 5)).toBe(4); // "1,234" -> 4 chữ số thật
    expect(countRealCharsBefore('1,234,567', 0)).toBe(0);
    expect(countRealCharsBefore('1,234,567', 99)).toBe(7);
  });
  it('indexAfterRealCharCount là phép ngược lại', () => {
    expect(indexAfterRealCharCount('1,234,567', 4)).toBe(5);
    expect(indexAfterRealCharCount('1,234,567', 0)).toBe(0);
    expect(indexAfterRealCharCount('1,234,567', 99)).toBe(9);
  });
  it('gõ thêm số làm dấu phẩy xuất hiện: con trỏ vẫn đứng sau đúng chữ số vừa gõ', () => {
    // đang gõ "1234" (con trỏ cuối, 4 ký tự thật) -> hiển thị "1,234" -> con trỏ phải ở cuối (vị trí 5)
    const shown = formatWithThousands('1234');
    expect(indexAfterRealCharCount(shown, 4)).toBe(shown.length);
  });
});

/* ============================== TÌM KIẾM KHÔNG DẤU ============================== */
describe('tìm kiếm không dấu', () => {
  it('removeDiacritics xử lý cả Đ/đ', () => {
    expect(removeDiacritics('Đường Nguyễn Huệ')).toBe('Duong Nguyen Hue');
    expect(removeDiacritics(undefined)).toBe('');
  });
  it('normalizeSearchText: bỏ dấu, thường hoá, cắt khoảng trắng', () => {
    expect(normalizeSearchText('  Sức Khỏe ')).toBe('suc khoe');
  });
  it('textMatchesSearch: chứa chuỗi, hoặc khớp chữ cái đầu mỗi từ', () => {
    expect(textMatchesSearch('Sức khỏe', 'suc')).toBe(true);
    expect(textMatchesSearch('Sức khỏe', 'KHOE')).toBe(true);
    expect(textMatchesSearch('Sức khỏe', 'sk')).toBe(true);
    expect(textMatchesSearch('Ăn uống', 'au')).toBe(true);
    expect(textMatchesSearch('Ăn uống', 'xyz')).toBe(false);
    expect(textMatchesSearch('Ăn uống', '')).toBe(true);
    expect(textMatchesSearch('Ăn uống', '   ')).toBe(true);
    expect(textMatchesSearch(undefined, 'a')).toBe(false);
  });
});

/* ============================== TÊN FILE UPLOAD ============================== */
describe('sanitizeFileName (Supabase Storage không nhận dấu/khoảng trắng)', () => {
  it('bỏ dấu, thay ký tự lạ bằng gạch ngang, đuôi file viết thường', () => {
    expect(sanitizeFileName('Ảnh Đại Diện (1).JPG')).toBe('anh-dai-dien-1.jpg');
    expect(sanitizeFileName('a.b.c.PNG')).toBe('a-b-c.png');
  });
  it('tên rỗng sau khi làm sạch -> "file"; không có đuôi thì không thêm', () => {
    expect(sanitizeFileName('???.png')).toBe('file.png');
    expect(sanitizeFileName('README')).toBe('readme');
    expect(sanitizeFileName('.hidden')).toBe('file.hidden');
  });
  it('kết quả chỉ gồm a-z 0-9 - .', () => {
    expect(sanitizeFileName('Hóa đơn tháng 9/2026 – bản cuối!.PDF')).toMatch(/^[a-z0-9.-]+$/);
  });
});

/* ============================== MÔ TẢ LOG XOÁ ============================== */
describe('txDeleteDescription', () => {
  const cats = [{ id: 'c1', name: 'Ăn uống' }];
  it('dùng tên danh mục và số tiền', () => {
    expect(txDeleteDescription({ category_id: 'c1', amount: 150000, type: 'expense' }, cats))
      .toBe('Xoá giao dịch "Ăn uống" 150,000đ');
  });
  it('không tìm thấy danh mục -> tên theo loại giao dịch', () => {
    expect(txDeleteDescription({ category_id: 'x', amount: 1000, type: 'income' }, cats)).toContain('"Thu nhập"');
    expect(txDeleteDescription({ category_id: 'x', amount: 1000, type: 'allocation' }, cats)).toContain('"Nạp quỹ"');
    expect(txDeleteDescription({ category_id: 'x', amount: 1000, type: 'adjustment' }, cats)).toContain('"Cập nhật số dư ví"');
    expect(txDeleteDescription({ category_id: 'x', amount: 1000, type: 'expense' }, undefined)).toContain('"Chi tiêu"');
  });
});
