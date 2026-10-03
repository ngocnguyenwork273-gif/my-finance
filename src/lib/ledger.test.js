import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { txIconEmoji, txSourceInfo, txBalanceAfter } from './ledger';
import { NOW, tx, accounts, categories, transactions, byId } from './__fixtures__/report-scenario';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

/* ============================== ICON HIỂN THỊ ============================== */
describe('txIconEmoji', () => {
  it('ưu tiên icon của danh mục', () => {
    expect(txIconEmoji(byId.t4, categories, accounts)).toBe('🍜');
  });
  it('bỏ qua icon mặc định ❔ của danh mục, rơi xuống icon theo loại giao dịch', () => {
    const cats = [{ id: 'x', icon: '❔' }];
    expect(txIconEmoji({ category_id: 'x', type: 'income' }, cats, accounts)).toBe('💵');
    expect(txIconEmoji({ category_id: 'x', type: 'allocation' }, cats, accounts)).toBe('🐷');
  });
  it('giao dịch không có danh mục: dùng icon ví hoặc icon mặc định theo loại', () => {
    expect(txIconEmoji({ type: 'adjustment', account_id: 'a1' }, [], accounts)).toBe('💵'); // icon của ví a1
    expect(txIconEmoji({ type: 'adjustment', account_id: 'a2' }, [], accounts)).toBe('👛'); // ví không có icon
    expect(txIconEmoji({ type: 'income' }, [], accounts)).toBe('💵');
    expect(txIconEmoji({ type: 'transfer' }, [], accounts)).toBe('🔁');
    expect(txIconEmoji({ type: 'expense' }, [], accounts)).toBe('🧾');
    expect(txIconEmoji({ type: 'expense', account_id: 'a1' }, [], accounts)).toBe('💵');
  });
  it('không lỗi khi danh sách danh mục/ví là undefined', () => {
    expect(txIconEmoji({ type: 'expense' }, undefined, undefined)).toBe('🧾');
  });
});

/* ============================== NGUỒN TRỪ TIỀN ============================== */
describe('txSourceInfo', () => {
  it('chi tiêu trên danh mục quỹ -> nguồn là chính quỹ đó (thắng cả khi có ví)', () => {
    expect(txSourceInfo(byId.t8, categories, accounts)).toEqual({ key: 'fund:fund1', label: 'Quỹ: Quỹ khẩn cấp' });
    const withWallet = { ...byId.t8, account_id: 'a1' };
    expect(txSourceInfo(withWallet, categories, accounts).key).toBe('fund:fund1');
  });
  it('có ví -> nguồn là ví', () => {
    expect(txSourceInfo(byId.t5, categories, accounts)).toEqual({ key: 'account:a1', label: 'Ví tiền mặt' });
    expect(txSourceInfo(byId.t3, categories, accounts)).toEqual({ key: 'account:a2', label: 'Techcombank' });
  });
  it('không ví: chi tiêu / nạp quỹ trừ vào "Thu nhập được chi"', () => {
    expect(txSourceInfo(byId.t4, categories, accounts)).toEqual({ key: 'pool', label: 'Thu nhập được chi' });
    expect(txSourceInfo(byId.t6, categories, accounts)).toEqual({ key: 'pool', label: 'Thu nhập được chi' });
  });
  it('thu nhập thường -> "Thu nhập được chi"; thu nhập đặc biệt (không tính vào chi pool) -> "Thu nhập"', () => {
    expect(txSourceInfo(byId.t2, categories, accounts)).toEqual({ key: 'pool', label: 'Thu nhập được chi' });
    const special = tx({ id: 'sp', category_id: 'bonus', type: 'income', amount: 1 });
    expect(txSourceInfo(special, categories, accounts)).toEqual({ key: 'special-income', label: 'Thu nhập' });
  });
  it('thu nhập không gắn danh mục: mặc định tính vào Thu nhập được chi', () => {
    expect(txSourceInfo(tx({ id: 'nc', type: 'income', amount: 1 }), categories, accounts).key).toBe('pool');
  });
  it('ví đã bị xoá (không còn trong danh sách): không còn coi là nguồn ví', () => {
    const orphan = tx({ id: 'o', category_id: 'food', type: 'expense', account_id: 'ghost', amount: 1 });
    expect(txSourceInfo(orphan, categories, accounts).key).toBe('pool');
  });
});

/* ============================== SỐ DƯ NGUỒN SAU GIAO DỊCH ============================== */
describe('txBalanceAfter', () => {
  const pool = { '2026-09': 8_000_000 };       // Thu nhập được chi kỳ 2026-09 do người dùng cài đặt
  const bal = (id, spendingPool = pool, txs = transactions) => txBalanceAfter(byId[id], categories, accounts, txs, spendingPool);

  describe('nguồn là QUỸ', () => {
    it('nạp quỹ lần đầu (không ví): hiện số dư của chính quỹ vừa nhận', () => {
      expect(bal('t0')).toBe(3_000_000);
    });
    it('rút từ quỹ: số dư quỹ ngay sau lần rút (đã cộng các lần nạp trước đó)', () => {
      expect(bal('t8')).toBe(3_000_000 + 500_000 - 200_000);
    });
    it('quỹ đã bị xoá khỏi danh sách -> null (không đoán)', () => {
      const ghost = tx({ id: 'g', category_id: 'ghost', type: 'allocation', amount: 1, is_initial: true });
      expect(txBalanceAfter(ghost, categories, accounts, [ghost], pool)).toBeNull();
    });
  });

  describe('nguồn là VÍ', () => {
    it('chi từ ví: số dư ví ngay sau giao dịch', () => {
      expect(bal('t5')).toBe(1_000_000 - 80_000);
    });
    it('điều chỉnh số dư ví (có thể âm)', () => {
      expect(bal('t10')).toBe(1_000_000 - 80_000 - 20_000);
    });
    it('nạp quỹ bằng tiền ví: hiện số dư VÍ bị trừ, không phải số dư quỹ', () => {
      expect(bal('t7')).toBe(5_000_000 + 10_000_000 + 2_000_000 - 300_000);
    });
    it('thu nhập vào ví: số dư ví sau khi nhận', () => {
      expect(bal('t3')).toBe(5_000_000 + 10_000_000 + 2_000_000);
    });
    it('giao dịch dated SAU không làm đổi số dư "sau giao dịch" của giao dịch trước', () => {
      expect(bal('t5')).toBe(920_000);
      const later = [...transactions, tx({ id: 'zz', account_id: 'a1', type: 'expense', category_id: 'food', amount: 500_000, date: '2026-09-28' })];
      expect(bal('t5', pool, later)).toBe(920_000);
    });
    it('cùng ngày: tách đúng thứ tự theo giờ tạo', () => {
      const a = tx({ id: 'd1', account_id: 'a1', category_id: 'sal', type: 'income', amount: 100, date: '2026-09-15', time: '08:00:00' });
      const b = tx({ id: 'd2', account_id: 'a1', category_id: 'food', type: 'expense', amount: 40, date: '2026-09-15', time: '09:00:00' });
      const list = [...transactions, a, b];
      expect(txBalanceAfter(a, categories, accounts, list, pool)).toBe(900_000 + 100);
      expect(txBalanceAfter(b, categories, accounts, list, pool)).toBe(900_000 + 100 - 40);
    });
  });

  describe('nguồn là "Thu nhập được chi" (pool)', () => {
    it('chi tiêu / nạp quỹ trừ dần pool theo thứ tự thời gian', () => {
      expect(bal('t4')).toBe(8_000_000 - 150_000);
      expect(bal('t6')).toBe(8_000_000 - 150_000 - 500_000);
    });
    it('chưa cài đặt pool kỳ đó: lấy tổng thu nhập tính vào chi pool của kỳ', () => {
      expect(bal('t4', {})).toBe(12_000_000 - 150_000);
      expect(bal('t6', {})).toBe(12_000_000 - 150_000 - 500_000);
    });
    it('nạp quỹ ban đầu, chi từ ví và chi từ quỹ KHÔNG trừ vào pool', () => {
      // t5 (ví), t8 (quỹ), t0 (ban đầu) không nằm trong chuỗi trừ pool: thêm vào không đổi số dư sau t6
      expect(bal('t6')).toBe(7_350_000);
    });
    it('nạp quỹ BAN ĐẦU nằm cùng kỳ chỉ là khởi tạo quỹ, KHÔNG trừ vào pool', () => {
      const ini = tx({ id: 'ini', category_id: 'fund2', type: 'allocation', amount: 700_000, date: '2026-08-30', is_initial: true });
      const list = [...transactions, ini];
      expect(bal('t6', pool, list)).toBe(7_350_000);   // vẫn như khi chưa có khoản nạp ban đầu
      expect(bal('t4', pool, list)).toBe(7_850_000);
    });
    it('thu nhập thường: hiện TỔNG thu nhập cộng dồn trong kỳ tới giao dịch đó', () => {
      expect(bal('t2')).toBe(12_000_000);
    });
  });

  describe('thu nhập đặc biệt (không ví, không tính vào chi pool)', () => {
    it('vẫn hiện tổng thu nhập cộng dồn của kỳ, GỒM cả khoản thu vào ví', () => {
      const sp = tx({ id: 'sp', category_id: 'bonus', type: 'income', amount: 500_000, date: '2026-09-08' });
      const list = [...transactions, sp];
      expect(txBalanceAfter(sp, categories, accounts, list, pool)).toBe(12_000_000 + 2_000_000 + 500_000);
    });
  });

  it('không xác định được nguồn -> null (điều chỉnh không gắn ví)', () => {
    const adj = tx({ id: 'adj', type: 'adjustment', amount: 10, date: '2026-09-08' });
    expect(txBalanceAfter(adj, categories, accounts, [adj], pool)).toBeNull();
  });

  it('nhất quán: số dư ví sau giao dịch CUỐI CÙNG của ví = số dư hiện tại của ví', () => {
    // t10 là giao dịch cuối của ví a1 (t11 không có ví)
    expect(bal('t10')).toBe(900_000);
  });
});
