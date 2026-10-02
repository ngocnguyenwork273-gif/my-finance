/* ==============================================================================
   Biểu đồ/bảng dùng trong màn Báo cáo và bản xem trước báo cáo.
   ============================================================================== */
import { Fragment, useState } from 'react';
import { ChartTooltip } from '../components/ui';
import { useChartTooltip } from '../hooks';
import { Check, ChevronDown } from '../icons';
import { formatMoney, formatMoneySigned } from '../lib/format';

// ==============================================================================
// MULTI SELECT FILTER — giống CustomSelect nhưng cho phép tick chọn NHIỀU giá trị cùng lúc
// (vd bộ lọc "Loại giao dịch": chọn cả Chi tiêu + Nạp quỹ). selected là mảng giá trị đang
// chọn (rỗng = "tất cả"/không lọc). onChange(nextArray) nhận mảng mới sau khi tick/bỏ tick.
// ==============================================================================
export function MultiSelectFilter({ label, options, selected, onChange, triggerClassName = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === 0;
  function toggle(v) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }
  const displayLabel = allSelected
    ? label
    : (selected.length === 1
      ? (options.find((o) => o.value === selected[0])?.label || label)
      : `${label.replace(/^Tất cả /, '')} (${selected.length})`);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClassName} flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`flex-shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute' }} className={`z-40 mt-1 ${align === 'right' ? 'right-0' : 'left-0'} min-w-full frost-card rounded-2xl shadow-card overflow-hidden`}>
            <div className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full bg-turquoise/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-lavender/25 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent" />
            <div className="relative max-h-64 overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className={`w-full text-left px-4 py-2.5 text-sm whitespace-nowrap hover:bg-white/40 dark:hover:bg-white/10 transition ${allSelected ? 'text-turquoise font-bold' : 'text-blueberry dark:text-white'}`}
              >
                {label}
              </button>
              {options.map((o) => {
                const checked = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm whitespace-nowrap hover:bg-white/40 dark:hover:bg-white/10 transition"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border transition ${checked ? 'bg-turquoise border-turquoise' : 'border-steel/50 dark:border-light-grey/40'}`}>
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <span className={checked ? 'text-turquoise font-bold' : 'text-blueberry dark:text-white'}>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Popup chi tiết cho thẻ "Còn lại": Thu nhập được chi còn lại của kỳ + số dư cuối kỳ
// của TỪNG quỹ và TỪNG ví (không phải chỉ tổng), bất kể quỹ/ví đó có phát sinh giao
// dịch trong kỳ hay không.
export function RemainingBreakdownDetail({ pool, funds, wallets, total }) {
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
      <p className="text-[11px] font-bold text-steel dark:text-light-grey mb-2 uppercase tracking-wide">Còn lại</p>
      <div className="mb-3">
        <p className="text-[10px] font-bold text-steel dark:text-light-grey uppercase tracking-wide mb-1.5">Thu nhập được chi</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-blueberry dark:text-white text-sm font-semibold truncate">Còn lại trong kỳ</span>
          <span className={`text-sm font-bold flex-shrink-0 ${pool >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(pool)}</span>
        </div>
      </div>
      <Section label="Quỹ" items={funds} />
      <Section label="Ví" items={wallets} />
      <div className="flex items-center justify-between border-t border-light-grey/30 dark:border-[rgba(189,189,203,0.15)] pt-2 mt-1">
        <span className="text-sm font-bold text-blueberry dark:text-white">Tổng còn lại</span>
        <span className="text-sm font-bold text-blueberry dark:text-white">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

// Biểu đồ cột chồng (Thu nhập / Góp quỹ / Chi tiêu) cho card "Xu hướng theo tháng" ở
// trang Báo cáo — rê chuột vào từng lớp màu để xem tên và số liệu cụ thể.
export function MonthlyTrendChart({ trendData }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const [hoverKey, setHoverKey] = useState(null); // `${bucketIndex}:exp|alloc|inc` của lớp đang hover
  const max = Math.max(...trendData.map((t) => t.income), 1);
  return (
    <div ref={wrapRef} className="relative">
      <ChartTooltip tip={tip} />
      <div className="h-48 flex items-end gap-2">
        {trendData.map((d, i) => {
          const heightInc = (d.income / max) * 100;
          const heightAlloc = (d.allocation / max) * 100;
          const heightExp = (d.expenseFromIncome / max) * 100;
          const expKey = `${i}:exp`, allocKey = `${i}:alloc`, incKey = `${i}:inc`;
          const segStyle = (key) => {
            const isHovered = hoverKey === key;
            const isDimmed = hoverKey !== null && !isHovered;
            return {
              opacity: isDimmed ? 0.35 : 1,
              transform: isHovered ? 'scaleX(1.12)' : 'scaleX(1)',
              transformOrigin: 'center',
              filter: isHovered ? 'brightness(1.15)' : 'none',
              position: 'relative',
              zIndex: isHovered ? 10 : 1,
              transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease',
            };
          };
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center justify-end h-full relative" style={{ overflow: 'visible' }}>
                <div className="absolute bottom-0 w-full flex flex-col items-end gap-[1.5px]" style={{ height: `${heightInc}%` }}>
                  <div
                    className="w-full bg-turquoise/30 rounded-t-[5px] cursor-pointer"
                    style={{ height: `${heightExp}%`, ...segStyle(expKey) }}
                    onMouseMove={(e) => { setHoverKey(expKey); showTip(e, { label: `Chi tiêu (${d.label})`, value: formatMoney(d.expenseFromIncome) }); }}
                    onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                  />
                  <div
                    className="w-full bg-turquoise/60 rounded-t-[5px] cursor-pointer"
                    style={{ height: `${heightAlloc}%`, ...segStyle(allocKey) }}
                    onMouseMove={(e) => { setHoverKey(allocKey); showTip(e, { label: `Góp quỹ (${d.label})`, value: formatMoney(d.allocation) }); }}
                    onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                  />
                  <div
                    className="w-full bg-turquoise rounded-t-[5px] cursor-pointer"
                    style={{ height: `${Math.max(0, heightInc - heightAlloc - heightExp)}%`, ...segStyle(incKey) }}
                    onMouseMove={(e) => { setHoverKey(incKey); showTip(e, { label: `Thu nhập (${d.label})`, value: formatMoney(d.income) }); }}
                    onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-steel dark:text-light-grey mt-1">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise rounded" /> Thu nhập</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise/60 rounded" /> Góp quỹ</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise/30 rounded" /> Chi tiêu</span>
      </div>
    </div>
  );
}

/* ==============================================================================
   XUẤT BÁO CÁO PDF — chọn khoảng ngày tự do + chọn mục muốn đưa vào. PDF được dựng
   bằng @react-pdf/renderer (chữ thật, ngắt trang chuẩn) trong src/ReportPdf.jsx,
   import động để không làm nặng bundle chính.
   YÊU CẦU: npm install @react-pdf/renderer  +  đặt font vào public/fonts/.

   Số liệu tài sản đầu/cuối kỳ dùng ĐÚNG cách chốt sổ của trang Báo cáo:
   - Cuối kỳ = số dư chốt cuối ngày cuối kỳ (kỳ chưa kết thúc thì tính đến hôm nay).
   - Đầu kỳ  = số dư chốt cuối ngày liền trước ngày bắt đầu (= cuối kỳ trước).
   ============================================================================== */

const R_ACCENT = {
  overview: '#0DBACC',
  income_by_cat: '#12B76A',
  expense_by_cat: '#E0568F',
  funds: '#8E6CF1',
  wallets: '#3E9BE0',
  fund_history: '#F0A93E',
  transactions: '#7E7F90',
};

const R_FUND_COLORS = ['#0DBACC', '#8E6CF1', '#F0A93E', '#3E9BE0', '#12B76A', '#E0568F'];

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Biểu đồ tròn (donut) cơ cấu tài sản — vẽ bằng SVG thuần, cùng kỹ thuật với bản PDF
// (nhiều <circle> chồng lên nhau, mỗi cung 1 đoạn strokeDasharray) để 2 bản khớp nhau.
function RDonut({ items, size = 92, thickness = 14 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} stroke="rgba(126,127,144,0.18)" strokeWidth={thickness} fill="none" />
      {items.map((it, i) => {
        const len = (it.pctNum / 100) * circumference;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            stroke={it.color}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-acc}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        acc += len;
        return el;
      })}
    </svg>
  );
}

function RAssetDonut({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-center gap-4 mb-3">
      <RDonut items={items} />
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {items.map((it, i) => (
          <div key={i} className="flex items-center text-xs">
            <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: it.color }} />
            <span className="flex-1 text-blueberry dark:text-white truncate">{it.label}</span>
            <span className="font-bold text-blueberry dark:text-white w-12 text-right flex-shrink-0">{it.pctLabel}</span>
            <span className="text-steel dark:text-light-grey ml-2 w-24 text-right flex-shrink-0">{it.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Danh sách thanh % dùng chung cho "góp quỹ theo mục" và "chi tiêu theo nguồn tiền" —
// mỗi dòng: tên + % + số tiền, thanh ngang tô màu theo tỷ lệ (biểu đồ cột ngang đơn giản).
function RBarList({ rows, labelKey = 'name' }) {
  return (
    <div className="flex flex-col gap-2.5 mb-2">
      {rows.map((r, i) => {
        const color = R_FUND_COLORS[i % R_FUND_COLORS.length];
        return (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="font-bold text-blueberry dark:text-white truncate">{r[labelKey]}</span>
              <span className="font-bold flex-shrink-0" style={{ color }}>{r.pct} · {r.amount}</span>
            </div>
            <div className="h-1.5 rounded-full bg-ice-cream dark:bg-night-sky overflow-hidden">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, r.pctNum)}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RTable({ cols, rows, total, accent = '#7E7F90' }) {
  const alignCls = (c) => (c.align === 'right' ? 'text-right' : 'text-left');
  const toneCls = (tone) => (tone === 'in' ? 'text-turquoise' : tone === 'out' ? 'text-cotton-candy' : 'text-blueberry dark:text-white');
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-1">
      <table className="w-full text-xs border-collapse min-w-[480px]">
        <thead>
          <tr style={{ backgroundColor: hexToRgba(accent, 0.1) }}>
            {cols.map((c) => (
              <th key={c.key} className={`font-bold px-2 py-2 whitespace-nowrap ${alignCls(c)} first:rounded-l-lg last:rounded-r-lg`} style={{ color: accent }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="text-steel dark:text-light-grey text-center py-4">Không có dữ liệu.</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} className="border-b border-light-grey/20">
              {cols.map((c) => (
                <td key={c.key} className={`px-2 py-2 ${alignCls(c)} ${c.tone ? `font-bold ${toneCls(r.tone)}` : c.muted ? 'text-steel dark:text-light-grey' : 'text-blueberry dark:text-white'}`}>
                  {r[c.key] || (c.muted ? '—' : '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="font-bold" style={{ backgroundColor: hexToRgba(accent, 0.14) }}>
              {cols.map((c) => (
                <td key={c.key} className={`px-2 py-2 text-blueberry dark:text-white ${alignCls(c)} first:rounded-l-lg last:rounded-r-lg`}>{total[c.key] || ''}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function RStat({ label, value, color, sub, subColor }) {
  return (
    <div
      className={`flex-1 min-w-[130px] rounded-xl px-3 py-2.5 ${color ? '' : 'bg-ice-cream dark:bg-night-sky'}`}
      style={color ? { backgroundColor: hexToRgba(color, 0.08), borderLeft: `3px solid ${color}` } : undefined}
    >
      <p className="text-[11px] text-steel dark:text-light-grey">{label}</p>
      <p className="text-base font-bold mt-0.5" style={color ? { color } : undefined}>{value}</p>
      {sub && <p className="text-[10px] font-bold mt-1" style={{ color: subColor || '#7E7F90' }}>{sub}</p>}
    </div>
  );
}

function RSection({ id, title, accent = '#7E7F90', children }) {
  return (
    // scroll-mt-4: chừa khoảng trống phía trên khi nhảy tới bằng scrollIntoView, tránh dính
    // sát mép trên khung xem trước.
    <div id={id} className="mb-6 pl-3 scroll-mt-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <h4 className="font-bold text-sm mb-2.5" style={{ color: accent }}>{title}</h4>
      {children}
    </div>
  );
}

// Thanh % góp quỹ trong "Thu nhập được chi": mỗi quỹ 1 dòng tên + %, thanh ngang theo tỷ lệ.
function RPoolAllocation({ p }) {
  if (!p || !p.hasPool) return null;
  return (
    <>
      <p className="text-xs font-bold text-blueberry dark:text-white mt-4 mb-1.5">Thu nhập được chi — góp quỹ theo mục</p>
      <div className="flex flex-wrap gap-2 mb-3">
        <RStat label="Thu nhập được chi" value={p.pool} color="#0DBACC" />
        <RStat label={`Đã góp quỹ (${p.totalPct})`} value={p.total} color="#8E6CF1" />
        <RStat label="Còn lại được chi trong kỳ" value={p.remaining} color={p.remainingPositive ? '#0DBACC' : '#E0568F'} />
      </div>
      {p.rows.length > 0 && <RBarList rows={p.rows} labelKey="name" />}
      {p.nonFundExpense && (
        <p className="text-[11px] text-steel dark:text-light-grey mt-1">Đã chi tiêu (ngoài quỹ) từ Thu nhập được chi: {p.nonFundExpense}.</p>
      )}
    </>
  );
}

// Bảng giao dịch gộp theo ngày: 1 header cột chung, mỗi ngày có 1 dòng chia nhóm (ngày +
// thay đổi ròng trong ngày) rồi tới các giao dịch của ngày đó (không lặp lại cột Ngày).
// Đường xu hướng nhỏ (sparkline) cho số dư quỹ theo thời gian trong kỳ — chỉ để nhìn nhanh
// xu hướng tăng/giảm, không trục/nhãn.
function RSparkline({ values, width = 92, height = 26, color }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pad = 2;
  const pts = values.map((v, i) => ({
    x: i * stepX,
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const col = color || (values[values.length - 1] >= values[0] ? '#0DBACC' : '#E0568F');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <path d={d} stroke={col} strokeWidth="1.6" fill="none" />
      <circle cx={last.x} cy={last.y} r="2" fill={col} />
    </svg>
  );
}

function RTransactionsByDay({ days, accent }) {
  const cols = [
    { key: 'kind', label: 'Loại' }, { key: 'cat', label: 'Danh mục' }, { key: 'source', label: 'Ví / Nguồn' },
    { key: 'note', label: 'Ghi chú', muted: true }, { key: 'amount', label: 'Số tiền', align: 'right', tone: true },
  ];
  const alignCls = (c) => (c.align === 'right' ? 'text-right' : 'text-left');
  const toneCls = (tone) => (tone === 'in' ? 'text-turquoise' : tone === 'out' ? 'text-cotton-candy' : 'text-blueberry dark:text-white');
  if (!days || days.length === 0) return <p className="text-steel dark:text-light-grey text-xs py-4">Không có giao dịch trong khoảng này.</p>;
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-1">
      <table className="w-full text-xs border-collapse min-w-[520px]">
        <thead>
          <tr style={{ backgroundColor: hexToRgba(accent, 0.1) }}>
            {cols.map((c) => (
              <th key={c.key} className={`font-bold px-2 py-2 whitespace-nowrap ${alignCls(c)} first:rounded-l-lg last:rounded-r-lg`} style={{ color: accent }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d, di) => (
            <Fragment key={di}>
              <tr>
                <td colSpan={cols.length} className="pt-3 pb-1 px-1">
                  <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ backgroundColor: hexToRgba(accent, 0.14) }}>
                    <span className="font-bold text-blueberry dark:text-white">{d.date}</span>
                    <span className="font-bold" style={{ color: d.hasNet ? (d.netPositive ? '#0DBACC' : '#E0568F') : '#7E7F90' }}>
                      {d.hasNet ? `Ròng ${d.net}` : 'Chuyển nội bộ'}
                    </span>
                  </div>
                </td>
              </tr>
              {d.items.map((r, ri) => (
                <tr key={ri} className="border-b border-light-grey/20">
                  {cols.map((c) => (
                    <td key={c.key} className={`px-2 py-2 ${alignCls(c)} ${c.tone ? `font-bold ${toneCls(r.tone)}` : c.muted ? 'text-steel dark:text-light-grey' : 'text-blueberry dark:text-white'}`}>
                      {r[c.key] || (c.muted ? '—' : '')}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Nhận xét tự động — 1-2 câu nổi bật nhất (chi vượt mức, danh mục áp đảo, biến động tài
// sản/thu/chi so với kỳ trước), hiện ngay dưới tiêu đề để người đọc nắm nhanh trước khi
// vào chi tiết.
function RInsights({ insights }) {
  if (!insights || insights.length === 0) return null;
  const toneColor = (t) => (t === 'warn' ? '#E0568F' : t === 'good' ? '#0DBACC' : '#303150');
  return (
    <div className="mb-5 rounded-2xl bg-ice-cream dark:bg-night-sky px-4 py-3.5 flex flex-col gap-2">
      {insights.map((it, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: toneColor(it.tone) }} />
          <span className="text-blueberry dark:text-white font-semibold">{it.text}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportHtmlPreview({ data }) {
  const sec = data.sections;
  const o = data.overview;
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <p className="font-bold text-lg text-blueberry dark:text-white">Báo cáo tài chính</p>
        <p className="text-xs text-steel dark:text-light-grey mt-0.5">Từ {data.startDate} đến {data.endDate} · Xuất lúc {data.generatedAt}</p>
      </div>

      {sec.overview && <RInsights insights={data.insights} />}

      {sec.overview && (
        <RSection id="report-sec-overview" title="Tổng quan" accent={R_ACCENT.overview}>
          <div className="flex flex-wrap gap-2 mb-2">
            <RStat label="Tổng tài sản đầu kỳ" value={o.assetsStart} />
            <RStat label="Tổng tài sản cuối kỳ" value={o.assetsEnd} />
            <RStat label={o.assetsChangePct ? `Chênh lệch tài sản (${o.assetsChangePct})` : 'Chênh lệch tài sản'} value={o.assetsChange} color={o.assetsPositive ? '#0DBACC' : '#E0568F'} />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <RStat label="Tổng thu nhập trong kỳ" value={o.income} color="#0DBACC"
              sub={o.incomeVsPrev?.label} subColor={o.incomeVsPrev ? (o.incomeVsPrev.good ? '#0DBACC' : '#E0568F') : undefined} />
            <RStat label="Tổng chi tiêu trong kỳ" value={o.expense} color="#E0568F"
              sub={o.expenseVsPrev?.label} subColor={o.expenseVsPrev ? (o.expenseVsPrev.good ? '#0DBACC' : '#E0568F') : undefined} />
            <RStat label="Thu nhập - Chi tiêu" value={o.net} color={o.netPositive ? '#0DBACC' : '#E0568F'} />
          </div>
          <p className="text-xs font-bold text-blueberry dark:text-white mb-1.5">Cơ cấu tài sản</p>
          <RAssetDonut items={o.assetDonut} />
          <RTable
            accent={R_ACCENT.overview}
            cols={[
              { key: 'label', label: 'Nhóm' },
              { key: 'start', label: 'Đầu kỳ', align: 'right' },
              { key: 'end', label: 'Cuối kỳ', align: 'right' },
              { key: 'diff', label: 'Chênh lệch', align: 'right' },
            ]}
            rows={o.composition}
            total={o.compositionTotal}
          />
          {o.expenseBySource.length > 0 && (
            <>
              <p className="text-xs font-bold text-blueberry dark:text-white mt-4 mb-1.5">Chi tiêu theo nguồn tiền</p>
              <RBarList rows={o.expenseBySource} labelKey="label" />
            </>
          )}
          {o.allocation && (
            <p className="text-[11px] text-steel dark:text-light-grey mt-2">Góp vào quỹ trong kỳ: {o.allocation} (chuyển tiền sang quỹ, {o.allocationCountedAsExpense ? 'ĐÃ' : 'không'} tính vào chi tiêu).</p>
          )}

          <RPoolAllocation p={o.poolAllocation} />
        </RSection>
      )}

      {sec.income_by_cat && (
        <RSection id="report-sec-income_by_cat" title="Thu nhập trong kỳ — theo nguồn" accent={R_ACCENT.income_by_cat}>
          <RTable
            accent={R_ACCENT.income_by_cat}
            cols={[{ key: 'name', label: 'Nguồn / Danh mục' }, { key: 'count', label: 'Số GD', align: 'right' }, { key: 'amount', label: 'Số tiền', align: 'right' }, { key: 'pct', label: 'Tỷ trọng', align: 'right' }]}
            rows={data.incomeByCat}
            total={{ name: 'Tổng', count: data.incomeTotal.count, amount: data.incomeTotal.amount, pct: '100%' }}
          />
        </RSection>
      )}

      {sec.expense_by_cat && (
        <RSection id="report-sec-expense_by_cat" title="Chi tiêu trong kỳ — theo nguồn" accent={R_ACCENT.expense_by_cat}>
          <RTable
            accent={R_ACCENT.expense_by_cat}
            cols={[{ key: 'name', label: 'Nguồn / Danh mục' }, { key: 'count', label: 'Số GD', align: 'right' }, { key: 'amount', label: 'Số tiền', align: 'right' }, { key: 'pct', label: 'Tỷ trọng', align: 'right' }]}
            rows={data.expenseByCat}
            total={{ name: 'Tổng', count: data.expenseTotal.count, amount: data.expenseTotal.amount, pct: '100%' }}
          />
        </RSection>
      )}

      {sec.funds && (
        <RSection id="report-sec-funds" title="Quỹ — số dư cuối kỳ" accent={R_ACCENT.funds}>
          <RTable
            accent={R_ACCENT.funds}
            cols={[
              { key: 'name', label: 'Quỹ' }, { key: 'start', label: 'Đầu kỳ', align: 'right' }, { key: 'deposit', label: 'Nạp', align: 'right' },
              { key: 'withdraw', label: 'Rút', align: 'right' }, { key: 'profit', label: 'Lãi', align: 'right' }, { key: 'end', label: 'Cuối kỳ', align: 'right' },
            ]}
            rows={data.funds.rows}
            total={data.funds.total}
          />
          <p className="text-[11px] text-steel dark:text-light-grey mt-2">Lãi = số dư cuối kỳ - số dư đầu kỳ - nạp + rút.</p>
        </RSection>
      )}

      {sec.wallets && (
        <RSection id="report-sec-wallets" title="Ví — tổng quan" accent={R_ACCENT.wallets}>
          {data.walletGroups.map((g, i) => (
            <div key={i} className="mb-4">
              <p className="text-xs font-bold text-blueberry dark:text-white mb-1.5">{g.title}</p>
              <RTable
                accent={R_ACCENT.wallets}
                cols={[
                  { key: 'name', label: 'Ví' }, { key: 'typeLabel', label: 'Loại', muted: true }, { key: 'start', label: 'Đầu kỳ', align: 'right' },
                  { key: 'inflow', label: 'Thu vào', align: 'right' }, { key: 'outflow', label: 'Chi ra', align: 'right' },
                  { key: 'toFund', label: 'Nạp quỹ', align: 'right' }, { key: 'adjust', label: 'Điều chỉnh', align: 'right' }, { key: 'end', label: 'Cuối kỳ', align: 'right' },
                ]}
                rows={g.rows}
                total={g.total}
              />
            </div>
          ))}
        </RSection>
      )}

      {sec.fund_history && (
        <RSection id="report-sec-fund_history" title="Lịch sử quỹ trong kỳ" accent={R_ACCENT.fund_history}>
          {data.fundHistory.map((f, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold text-blueberry dark:text-white">{f.name}</p>
                <RSparkline values={f.sparkline} />
              </div>
              <RTable
                accent={R_ACCENT.fund_history}
                cols={[
                  { key: 'date', label: 'Ngày' }, { key: 'kind', label: 'Loại' }, { key: 'note', label: 'Ghi chú', muted: true },
                  { key: 'amount', label: 'Số tiền', align: 'right', tone: true }, { key: 'balance', label: 'Số dư sau GD', align: 'right' },
                ]}
                rows={f.rows}
              />
            </div>
          ))}
        </RSection>
      )}

      {sec.transactions && (
        <RSection id="report-sec-transactions" title={`Tất cả giao dịch trong kỳ (${data.txCount})`} accent={R_ACCENT.transactions}>
          <RTransactionsByDay days={data.txsByDay} accent={R_ACCENT.transactions} />
        </RSection>
      )}
    </div>
  );
}
