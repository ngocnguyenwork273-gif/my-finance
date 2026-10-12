import { describe, it, expect } from 'vitest';
import { validateTransactionForm, inlineErrors, requiredText, requiredAmount } from './validation';

// Trạng thái form "đầy đủ và hợp lệ" làm nền; mỗi test chỉ đổi đúng thứ cần thử
const ok = (over = {}) => ({
  type: 'expense', amount: '150000', selectedCategory: 'c1', isFundCategory: false, expenseSource: 'a1', selectedPeriod: '2026-10',
  periodOverLimit: false, fundOverBalance: false, sourceOverBalance: false, ...over,
});
const fields = (errs) => errs.map((e) => e.field);

describe('validateTransactionForm — dữ liệu hợp lệ', () => {
  it('chi tiêu từ ví / thu nhập / nạp quỹ hợp lệ -> không có lỗi', () => {
    expect(validateTransactionForm(ok())).toEqual([]);
    expect(validateTransactionForm(ok({ type: 'income', expenseSource: null }))).toEqual([]);
    expect(validateTransactionForm(ok({ type: 'allocation', expenseSource: 'income' }))).toEqual([]);
    expect(validateTransactionForm(ok({ type: 'allocation', expenseSource: 'a1' }))).toEqual([]);
    expect(validateTransactionForm(ok({ isFundCategory: true, expenseSource: null }))).toEqual([]);   // chi từ quỹ: không cần nguồn tiền
  });
});

describe('validateTransactionForm — thiếu dữ liệu bắt buộc (lỗi hiện dưới ô)', () => {
  it('số tiền trống, bằng 0 hoặc "0"', () => {
    for (const amount of ['', null, undefined, 0, '0']) {
      const e = validateTransactionForm(ok({ amount }));
      expect(e).toEqual([{ field: 'amount', message: 'Vui lòng nhập số tiền', inline: true }]);
    }
  });
  it('chưa chọn danh mục', () => {
    expect(validateTransactionForm(ok({ selectedCategory: null }))).toEqual([{ field: 'category', message: 'Vui lòng chọn danh mục', inline: true }]);
  });
  it('GOM nhiều lỗi một lần theo thứ tự trên xuống dưới của form (không dừng ở lỗi đầu tiên)', () => {
    const e = validateTransactionForm(ok({ amount: '', selectedCategory: null, expenseSource: null }));
    expect(fields(e)).toEqual(['amount', 'category', 'source']);
  });
  it('thu nhập: bắt buộc chọn Kỳ', () => {
    expect(fields(validateTransactionForm(ok({ type: 'income', selectedPeriod: '' })))).toEqual(['period']);
  });
  it('nạp quỹ: bắt buộc chọn nguồn tiền; nguồn là Thu nhập thì bắt buộc Kỳ', () => {
    expect(fields(validateTransactionForm(ok({ type: 'allocation', expenseSource: null })))).toEqual(['source']);
    expect(fields(validateTransactionForm(ok({ type: 'allocation', expenseSource: 'income', selectedPeriod: '' })))).toEqual(['period']);
  });
  it('chi tiêu thường: bắt buộc nguồn tiền; nguồn là Thu nhập thì bắt buộc Kỳ', () => {
    expect(fields(validateTransactionForm(ok({ expenseSource: null })))).toEqual(['source']);
    expect(fields(validateTransactionForm(ok({ expenseSource: 'income', selectedPeriod: null })))).toEqual(['period']);
  });
  it('chi tiêu từ quỹ KHÔNG đòi nguồn tiền hay Kỳ', () => {
    expect(validateTransactionForm(ok({ isFundCategory: true, expenseSource: null, selectedPeriod: null }))).toEqual([]);
  });
});

describe('validateTransactionForm — chặn lưu nhưng không hiện dòng trùng (form đã có cảnh báo đỏ riêng)', () => {
  const blockers = [
    ['nạp quỹ vượt Thu nhập được chi', { type: 'allocation', expenseSource: 'income', periodOverLimit: true }],
    ['nạp quỹ từ ví không đủ số dư', { type: 'allocation', expenseSource: 'a1', sourceOverBalance: true }],
    ['chi từ quỹ vượt số dư quỹ', { isFundCategory: true, expenseSource: null, fundOverBalance: true }],
    ['chi tiêu vượt Thu nhập được chi', { expenseSource: 'income', periodOverLimit: true }],
    ['chi tiêu vượt số dư ví', { expenseSource: 'a1', sourceOverBalance: true }],
  ];
  it.each(blockers)('%s -> có lỗi (chặn lưu), inline = false, thuộc ô số tiền', (_n, over) => {
    const e = validateTransactionForm(ok(over));
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ field: 'amount', inline: false });
    expect(e[0].message.length).toBeGreaterThan(5);
    expect(inlineErrors(e)).toEqual({});         // không hiện thêm dòng trùng dưới ô
  });
  it('thu nhập không bị chặn bởi cờ "vượt" (không áp dụng cho thu nhập)', () => {
    expect(validateTransactionForm(ok({ type: 'income', expenseSource: null, periodOverLimit: true, sourceOverBalance: true, fundOverBalance: true }))).toEqual([]);
  });
});

describe('inlineErrors', () => {
  it('mỗi ô lấy lỗi đầu tiên, bỏ lỗi inline=false', () => {
    const list = [{ field: 'amount', message: 'A', inline: true }, { field: 'amount', message: 'B', inline: true }, { field: 'source', message: 'C', inline: false }, { field: 'category', message: 'D', inline: true }];
    expect(inlineErrors(list)).toEqual({ amount: 'A', category: 'D' });
  });
});

describe('requiredText / requiredAmount', () => {
  it('văn bản: trống, toàn khoảng trắng, null -> báo lỗi; có chữ -> ""', () => {
    for (const v of ['', '   ', null, undefined]) expect(requiredText(v, 'Nhập tên')).toBe('Nhập tên');
    expect(requiredText(' Quỹ du lịch ', 'Nhập tên')).toBe('');
  });
  it('số tiền: trống, 0, không phải số -> báo lỗi; số khác 0 (kể cả âm cho điều chỉnh) -> ""', () => {
    for (const v of ['', '0', 0, null, undefined, 'abc']) expect(requiredAmount(v)).not.toBe('');
    expect(requiredAmount('150000')).toBe('');
    expect(requiredAmount('-20000')).toBe('');
    expect(requiredAmount('', 'Nhập số dư')).toBe('Nhập số dư');
  });
});
