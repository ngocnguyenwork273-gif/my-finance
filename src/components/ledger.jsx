/* ==============================================================================
   Dòng/Modal sổ giao dịch và các danh sách chi tiết thu-chi-tài sản (dùng ở Dashboard và Báo cáo).
   ============================================================================== */
import { useState } from 'react';
import DateField from '../DateField';
import { useEscapeKey } from '../feedback';
import { Trash2, X } from '../icons';
import { compareTxTime, displayTxNote } from '../lib/finance';
import { formatMoney } from '../lib/format';
import { txBalanceAfter, txSourceInfo } from '../lib/ledger';
import { CustomSelect } from './inputs';
// ==============================================================================
// XOÁ GIAO DỊCH TRONG CÁC DÒNG LỊCH SỬ (dùng chung cho mọi màn hình có hiển thị
// lịch sử giao dịch — Trang chủ, Chi tiết quỹ, Chi tiết ví, Báo cáo...).
// Xoá ở đây LUÔN LÀ soft-delete qua softDelete('transactions', ...): giao dịch
// chỉ bị ẩn khỏi ứng dụng (deleted_at được set) và được ghi log restorable vào
// system_logs, để người dùng có thể khôi phục trong 30 ngày ở Cài đặt > Lịch sử
// hệ thống — KHÔNG xoá cứng khỏi database.
// ==============================================================================


export function TxDeleteButton({ onClick, className = '', size = 14 }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title="Xoá giao dịch"
      className={`w-7 h-7 rounded-full hover:bg-cotton-candy-light dark:hover:bg-cotton-candy/10 flex items-center justify-center text-steel dark:text-light-grey hover:text-cotton-candy flex-shrink-0 transition ${className}`}
    >
      <Trash2 size={size} />
    </button>
  );
}

// onViewDetail (optional): nếu được truyền, hiện nút "Xem chi tiết" ở cuối popup —
// bấm vào sẽ mở TxLedgerModal liệt kê từng giao dịch (nội dung, ghi chú, ngày, nguồn trừ,
// số dư nguồn sau GD, số tiền) thay vì chỉ xem tổng theo danh mục như popup hover này.
export function BreakdownDetailList({ title, items, total, colorClass, onViewDetail }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-steel dark:text-light-grey mb-2 uppercase tracking-wide">{title}</p>
      {items.length === 0 ? (
        <p className="text-steel dark:text-light-grey text-sm py-1">Không có dữ liệu trong khoảng thời gian này.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-2">
          {items.map((it) => (
            <div key={it.key} className="flex items-center justify-between gap-3">
              <span className="text-blueberry dark:text-white text-sm font-semibold truncate">{it.name}</span>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${colorClass}`}>{formatMoney(it.amount)}</p>
                {total > 0 && <p className="text-[10px] text-steel dark:text-light-grey">{(it.amount / total * 100).toFixed(1)}%</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-light-grey/30 dark:border-[rgba(189,189,203,0.15)] pt-2 mt-1">
        <span className="text-sm font-bold text-blueberry dark:text-white">Tổng</span>
        <span className={`text-sm font-bold ${colorClass}`}>{formatMoney(total)}</span>
      </div>
      {onViewDetail && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
          className={`w-full text-center text-xs font-bold mt-3 py-1.5 rounded-full hover:opacity-80 transition ${colorClass} bg-current/10`}
        >
          Xem chi tiết →
        </button>
      )}
    </div>
  );
}

// Bảng chi tiết từng giao dịch cho 1 nhóm (VD: "Chi tiêu tháng 9/2026") — mở từ nút
// "Xem chi tiết" trong popup hover của các thẻ tổng kết (Thu nhập / Thu nhập được chi /
// Thu nhập đặc biệt / Chi tiêu). Hiển thị: nội dung chi, ghi chú, ngày, nguồn trừ,
// số dư nguồn sau giao dịch, số tiền.
function TxLedgerRow({ tx, categories, accounts, allTx, spendingPoolByPeriod, onDeleteTx }) {
  const txDate = new Date(tx.date || tx.created_at);
  const source = txSourceInfo(tx, categories, accounts);

  const balanceAfter = txBalanceAfter(tx, categories, accounts, allTx, spendingPoolByPeriod);

  const cat = categories.find((c) => c.id === tx.category_id);
  const isOutflow = tx.type === 'expense' || tx.type === 'allocation';
  const dateTimeLabel = `${txDate.toLocaleDateString('vi-VN')} ${txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <tr className="border-b border-[rgba(189,189,203,0.15)] dark:border-[rgba(189,189,203,0.08)] last:border-0">
      <td className="py-2.5 pl-3 pr-3 text-sm text-blueberry dark:text-white font-semibold whitespace-nowrap">{cat?.name || '—'}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{dateTimeLabel}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{source.label}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{balanceAfter !== null ? formatMoney(balanceAfter) : '—'}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey max-w-[200px] truncate">{displayTxNote(tx.note) || '—'}</td>
      <td className={`py-2.5 pr-3 text-sm font-bold text-right whitespace-nowrap ${isOutflow ? 'text-cotton-candy' : 'text-turquoise'}`}>
        {isOutflow ? '-' : '+'}{formatMoney(tx.amount)}
      </td>
      {onDeleteTx && (
        <td className="py-2.5 pr-3 text-right whitespace-nowrap">
          <TxDeleteButton onClick={() => onDeleteTx(tx)} />
        </td>
      )}
    </tr>
  );
}

export function TxLedgerModal({ title, txs, categories, accounts, allTx, spendingPoolByPeriod, onClose, onDeleteTx }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Danh sách nguồn để đổ vào dropdown filter — lấy từ chính tập txs được truyền vào
  // (không lấy từ toàn bộ accounts/funds, để chỉ hiện những nguồn THỰC SỰ xuất hiện ở đây).
  const sourceOptions = (() => {
    const map = new Map();
    txs.forEach((t) => { const s = txSourceInfo(t, categories, accounts); if (!map.has(s.key)) map.set(s.key, s.label); });
    return Array.from(map, ([key, label]) => ({ key, label }));
  })();

  const filtered = txs.filter((t) => {
    const d = new Date(t.date || t.created_at);
    if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    if (sourceFilter !== 'all' && txSourceInfo(t, categories, accounts).key !== sourceFilter) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => compareTxTime(b, a));
  const total = sorted.reduce((s, t) => s + Number(t.amount), 0);
  const hasActiveFilter = dateFrom || dateTo || sourceFilter !== 'all';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="frost-card bg-white dark:bg-[#1e1e32] w-full max-w-5xl rounded-3xl p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-blueberry dark:text-white text-lg">{title}</h3>
            <p className="text-steel dark:text-light-grey text-xs mt-0.5">{sorted.length} giao dịch · Tổng {formatMoney(total)}</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center flex-shrink-0"><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 frost-inset rounded-full px-3 py-1.5">
            <DateField value={dateFrom} onChange={setDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
            <span className="text-steel dark:text-light-grey text-xs">→</span>
            <DateField value={dateTo} onChange={setDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
          </div>
          <CustomSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="" triggerClassName="frost-inset rounded-full text-xs font-semibold px-3 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
            <option value="all">Tất cả nguồn</option>
            {sourceOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </CustomSelect>
          {hasActiveFilter && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSourceFilter('all'); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">
              Xoá lọc
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1 -mx-2 px-2 scrollbar-hide">
          {sorted.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-10">Không có giao dịch nào khớp bộ lọc.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="text-[11px] uppercase font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-night-sky border-b border-[rgba(189,189,203,0.25)]">
                  <th className="py-2.5 pl-3 pr-3 rounded-l-lg">Nội dung</th>
                  <th className="py-2.5 pr-3">Ngày giờ</th>
                  <th className="py-2.5 pr-3">Nguồn</th>
                  <th className="py-2.5 pr-3">Số dư nguồn sau GD</th>
                  <th className="py-2.5 pr-3">Ghi chú</th>
                  <th className={`py-2.5 pr-3 text-right ${onDeleteTx ? '' : 'rounded-r-lg'}`}>Số tiền</th>
                  {onDeleteTx && <th className="py-2.5 pr-3 rounded-r-lg"></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx) => (
                  <TxLedgerRow key={tx.id} tx={tx} categories={categories} accounts={accounts} allTx={allTx} spendingPoolByPeriod={spendingPoolByPeriod} onDeleteTx={onDeleteTx} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssetBreakdownDetail({ wallets, funds, gold, total }) {
  const Section = ({ label, items }) => (items.length === 0 ? null : (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] font-bold text-steel dark:text-light-grey uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-3">
            <span className="text-blueberry dark:text-white text-sm font-semibold truncate">{it.name}</span>
            <span className="text-sm font-bold text-blueberry dark:text-white flex-shrink-0">{formatMoney(it.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  ));
  return (
    <div>
      <p className="text-[11px] font-bold text-steel dark:text-light-grey mb-2 uppercase tracking-wide">Tổng tài sản</p>
      {wallets.length === 0 && funds.length === 0 && gold.length === 0 ? (
        <p className="text-steel dark:text-light-grey text-sm py-1">Không có dữ liệu.</p>
      ) : (
        <>
          <Section label="Ví" items={wallets} />
          <Section label="Quỹ" items={funds} />
          <Section label="Vàng" items={gold} />
        </>
      )}
      <div className="flex items-center justify-between border-t border-light-grey/30 dark:border-[rgba(189,189,203,0.15)] pt-2 mt-1">
        <span className="text-sm font-bold text-blueberry dark:text-white">Tổng tài sản</span>
        <span className="text-sm font-bold text-blueberry dark:text-white">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
