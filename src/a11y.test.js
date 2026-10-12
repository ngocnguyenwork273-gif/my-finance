import { describe, it, expect, vi } from 'vitest';
import { clickable, keyActivatable } from './a11y';

// Sự kiện bàn phím giả: target === currentTarget nghĩa là phím gõ ngay trên chính phần tử
const key = (k, over = {}) => { const el = {}; return { key: k, target: el, currentTarget: el, preventDefault: vi.fn(), ...over }; };

describe('clickable', () => {
  it('có role="button", focus được bằng Tab và vẫn giữ onClick cho chuột', () => {
    const h = vi.fn();
    const p = clickable(h);
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(0);
    expect(p.onClick).toBe(h);
  });
  it('Enter và Space kích hoạt đúng 1 lần và chặn hành vi mặc định (Space không cuộn trang)', () => {
    const h = vi.fn();
    const { onKeyDown } = clickable(h);
    for (const k of ['Enter', ' ']) { const e = key(k); onKeyDown(e); expect(e.preventDefault).toHaveBeenCalledTimes(1); }
    expect(h).toHaveBeenCalledTimes(2);
  });
  it('phím khác không kích hoạt và không chặn mặc định (Tab, mũi tên, chữ cái...)', () => {
    const h = vi.fn();
    const { onKeyDown } = clickable(h);
    for (const k of ['Tab', 'ArrowDown', 'Escape', 'a', 'Shift']) { const e = key(k); onKeyDown(e); expect(e.preventDefault).not.toHaveBeenCalled(); }
    expect(h).not.toHaveBeenCalled();
  });
  it('phím gõ ở phần tử CON (vd nút xóa hay ô nhập bên trong) không kích hoạt cả dòng', () => {
    const h = vi.fn();
    const { onKeyDown } = clickable(h);
    const e = key('Enter', { target: {}, currentTarget: {} });      // target khác currentTarget
    onKeyDown(e);
    expect(h).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();                 // và không nuốt phím của nút con
  });
  it('truyền sự kiện cho handler (để handler dùng được e.stopPropagation() như khi bấm chuột)', () => {
    const h = vi.fn();
    const e = key('Enter');
    clickable(h).onKeyDown(e);
    expect(h).toHaveBeenCalledWith(e);
  });
  it('không có handler (điều kiện tắt) -> không thêm gì: không role, không focus', () => {
    expect(clickable(undefined)).toEqual({});
    expect(clickable(false)).toEqual({});
    expect(clickable(null)).toEqual({});
  });
});

describe('keyActivatable (dòng có nút khác bên trong, hoặc <tr>)', () => {
  it('KHÔNG đổi role (giữ nguyên ngữ nghĩa của dòng/bảng) nhưng focus được và có Enter/Space', () => {
    const h = vi.fn();
    const p = keyActivatable(h);
    expect(p.role).toBeUndefined();
    expect(p.tabIndex).toBe(0);
    expect(p.onClick).toBe(h);
    const e = key('Enter'); p.onKeyDown(e);
    expect(h).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).toHaveBeenCalled();
  });
  it('nút con bên trong (target khác currentTarget) vẫn tự xử lý phím của nó', () => {
    const h = vi.fn();
    const e = key(' ', { target: {}, currentTarget: {} });
    keyActivatable(h).onKeyDown(e);
    expect(h).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
  it('handler rỗng -> {}', () => {
    expect(keyActivatable(undefined)).toEqual({});
  });
});
