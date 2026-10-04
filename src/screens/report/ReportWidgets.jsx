/* ==============================================================================
   Các widget nhỏ dùng trong màn Báo cáo (thanh lọc hoạt động, dòng chi tiết giao dịch, biểu đồ donut).
   ============================================================================== */
import { useState } from 'react';
import { CustomSelect } from '../../components/inputs';
import { TxDeleteButton } from '../../components/ledger';
import { ChartTooltip, EmojiCircle } from '../../components/ui';
import { useChartTooltip } from '../../hooks';
import { Clock } from '../../icons';
import { displayTxNote, stripPeriodTag } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { txBalanceAfter, txIconEmoji } from '../../lib/ledger';
import { MultiSelectFilter } from '../ReportParts';

// Component filter dùng chung cho cả bản mobile lẫn desktop của "Hoạt động gần đây".
export function ActivityFilterBar({ v, compact = false }) {
  const { ACTIVITY_KIND_LABELS, activityCategoryFilter, activityCategoryOptions, activityKindFilters, activityKindsPresent, handleActivityCategoryChange, handleActivityKindChange } = v;
  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? '' : 'mb-4'}`}>
      <MultiSelectFilter
        label="Tất cả loại"
        options={activityKindsPresent.map((k) => ({ value: k, label: ACTIVITY_KIND_LABELS[k] }))}
        selected={activityKindFilters}
        onChange={handleActivityKindChange}
        triggerClassName={`frost-inset rounded-full font-bold outline-none text-blueberry dark:text-white ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}
      />
      {activityCategoryOptions.length > 0 && (
        <CustomSelect
          value={activityCategoryFilter}
          onChange={(e) => handleActivityCategoryChange(e.target.value)}
          triggerClassName={`frost-inset rounded-full font-bold outline-none text-blueberry dark:text-white ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}
        >
          <option value="all">Tất cả danh mục</option>
          {activityCategoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ${c.name}` : c.name}</option>
          ))}
        </CustomSelect>
      )}
    </div>
  );
}

export function TxDetailRow({ v, tx }) {
  const { accounts, categories, getTxSource, handleDeleteTx, setEditingTx, spendingPoolByPeriod, transactions } = v;
  const cat = categories.find((c) => c.id === tx.category_id);
  const src = getTxSource(tx);
  const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
  const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
  const timeLabel = new Date(tx.created_at || tx.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
  // [SET] Đặt số dư mới: ghi chú hiển thị con số thực tế "Số dư mới" thay vì
  // chữ tĩnh "Đặt số dư mới" chung chung, để người dùng biết ngay giá trị đã đặt.
  const noteText = isDirectSet
    ? (balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : stripPeriodTag((tx.note || '').replace('[SET] ', '')))
    : displayTxNote(tx.note);
  return (
    <div onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
      <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={40} bg={tx.type === 'expense' ? '#E3D6FF' : '#B4F1F1'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-blueberry dark:text-white font-bold text-sm truncate">{tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'))}</p>
          {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full flex-shrink-0">Vượt hạn mức</span>}
        </div>
        {noteText && <p className="text-steel dark:text-light-grey text-xs truncate">{noteText}</p>}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-steel dark:text-light-grey text-[11px] flex items-center gap-1"><Clock size={11} />{timeLabel}</span>
          <span className="text-[11px] font-semibold text-baby-blue">{src.label}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`font-bold text-sm ${tx.type === 'expense' ? 'text-cotton-candy' : tx.type === 'adjustment' ? (Number(tx.amount) < 0 ? 'text-cotton-candy' : 'text-turquoise') : 'text-turquoise'}`}>{tx.type === 'expense' ? '-' : tx.type === 'adjustment' ? (Number(tx.amount) < 0 ? '-' : '+') : '+'}{formatMoney(tx.amount)}</p>
        {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
      </div>
      <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
    </div>
  );
}

// Stacked bar component
// Donut chart dùng chung — thay cho StackedBar cũ (thanh ngang) theo yêu cầu đổi
// sang biểu đồ tròn, có tooltip khi hover từng phần + chú thích màu bên cạnh.
export function DonutChart({ data, total: totalOverride }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const [hoverIdx, setHoverIdx] = useState(null); // index lát đang hover, để lát đó nổi bật + các lát khác mờ đi
  const sumValues = data.reduce((s, d) => s + d.value, 0);
  // Cho phép truyền total riêng (vd: Thu nhập được chi) thay vì tự cộng dồn data —
  // để % hiển thị khớp với phần chữ bên cạnh, và khi tiêu vượt mức thì các lát cắt
  // sẽ chồng lấn ra ngoài 100% một chút thay vì luôn khép tròn đủ 100% gây hiểu lầm.
  const total = totalOverride != null && totalOverride > 0 ? totalOverride : sumValues;
  if (total === 0) return <div className="text-center text-steel dark:text-light-grey py-6">Không có dữ liệu</div>;
  let cumulative = 0;
  const segments = data.filter((d) => d.value > 0).map((d) => {
    const pct = (d.value / total) * 100;
    const seg = { ...d, pct, dashoffset: -cumulative };
    cumulative += pct;
    return seg;
  });
  return (
    <div ref={wrapRef} className="relative flex items-center gap-6 flex-wrap justify-center">
      <ChartTooltip tip={tip} />
      <svg viewBox="0 0 42 42" className="w-36 h-36 flex-shrink-0 -rotate-90">
        <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5" className="stroke-ice-cream dark:stroke-[#2b2b46]" />
        {segments.map((seg, i) => {
          const isHovered = hoverIdx === i;
          const isDimmed = hoverIdx !== null && !isHovered;
          return (
            <circle
              key={i}
              cx="21" cy="21" r="15.9155" fill="none"
              stroke={seg.color} strokeWidth={isHovered ? 6.5 : 5}
              strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
              strokeDashoffset={seg.dashoffset}
              className="cursor-pointer"
              style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.18s ease, stroke-width 0.18s ease' }}
              onMouseMove={(e) => { setHoverIdx(i); showTip(e, { label: seg.label, value: formatMoney(seg.value), pct: Math.round(seg.pct) }); }}
              onMouseLeave={() => { setHoverIdx(null); hideTip(); }}
            />
          );
        })}
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-1 -mx-1 transition-opacity duration-150"
            style={{ opacity: hoverIdx !== null && hoverIdx !== i ? 0.4 : 1 }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-blueberry dark:text-white text-sm font-semibold">{seg.label}</span>
            <span className="text-steel dark:text-light-grey text-xs">{formatMoney(seg.value)} ({Math.round(seg.pct)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
