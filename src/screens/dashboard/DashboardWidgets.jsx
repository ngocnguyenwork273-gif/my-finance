/* ==============================================================================
   Các widget nhỏ dùng trong màn Tổng quan (bộ chọn kỳ toàn cục, biểu đồ kết hợp thu - chi).
   ============================================================================== */
import { useState } from 'react';
import { CustomSelect } from '../../components/inputs';
import { ChartTooltip } from '../../components/ui';
import DateField from '../../DateField';
import { useChartTooltip } from '../../hooks';
import { buildPeriods, todayDateStr, YEAR_OPTIONS } from '../../lib/finance';
import { formatMoney, formatMoneyCompact } from '../../lib/format';
import { palette, useDragScroll, useMeasuredWidth } from '../DashboardParts';

export function GlobalPeriodWidget({ v, className = '', wrapClassName = '', inactiveClass = 'text-steel dark:text-light-grey' }) {
  const { applyGlobalPeriod, globalPeriod, globalPeriodKey, globalWeekEnd, globalWeekStart, globalYear, setGlobalPeriodKey, setGlobalWeekEnd, setGlobalWeekStart, setGlobalYear } = v;
  return (
    <div className={`flex items-center gap-1.5 flex-wrap justify-end ${className}`}>
      <div className={`flex backdrop-blur-md rounded-full p-0.5 flex-shrink-0 ${wrapClassName || 'bg-white/50 dark:bg-white/10'}`}>
        {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
          <button
            key={p.k}
            onClick={() => applyGlobalPeriod(p.k)}
            title="Áp dụng cho tất cả chart trong Dashboard"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${globalPeriod === p.k ? 'bg-turquoise text-white shadow' : inactiveClass}`}
          >
            {p.l}
          </button>
        ))}
      </div>
      {globalPeriod === 'week' && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <DateField value={globalWeekStart} max={globalWeekEnd} showIcon={false} clearable={false}
            onChange={(v) => setGlobalWeekStart(v)}
            className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
          <span className="text-steel dark:text-light-grey text-xs">-</span>
          <DateField value={globalWeekEnd} align="right" max={todayDateStr()} showIcon={false} clearable={false}
            onChange={(v) => setGlobalWeekEnd(v)}
            className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
        </div>
      )}
      {globalPeriod === 'year' && (
        <CustomSelect value={globalYear} onChange={(e) => setGlobalYear(Number(e.target.value))}
          triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] flex-shrink-0">
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </CustomSelect>
      )}
      {globalPeriod === 'month' && (
        <>
          <CustomSelect value={globalYear} onChange={(e) => {
            const y = Number(e.target.value);
            setGlobalYear(y);
            setGlobalPeriodKey(`${y}-${globalPeriodKey.split('-')[1]}`);
          }}
            triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] flex-shrink-0">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </CustomSelect>
          <CustomSelect value={globalPeriodKey} onChange={(e) => setGlobalPeriodKey(e.target.value)}
            triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] max-w-[190px] flex-shrink-0 whitespace-nowrap">
            {buildPeriods(globalYear).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </CustomSelect>
        </>
      )}
    </div>
  );
}

// { title, txs } | null

// Biểu đồ kết hợp CỘT CHỒNG DỌC + đường cho card "Phân tích chi phí" — đúng theo ảnh
// mẫu: mỗi kỳ (theo bộ lọc Tuần/Tháng/Năm) là 1 CỘT dọc (trục hoành = thời gian theo bộ
// lọc), các loại chi tiêu XẾP CHỒNG lên nhau theo chiều dọc trong cột đó (mỗi loại 1
// màu, trục tung = số tiền, mốc tối đa lấy theo THU NHẬP cao nhất — xem costMaxVal, tức
// "tối đa là tổng thu nhập" đúng yêu cầu). Đường liền "Tổng chi" nối đỉnh từng cột (=
// tổng chi của kỳ đó), có nhãn số tiền hiện ngay phía trên mỗi điểm giống ảnh mẫu; đường
// nét đứt "Thu nhập" đi kèm để so sánh chi/thu. Rê chuột vào từng đoạn màu (hoặc từng
// điểm trên đường Tổng chi) để xem tên, số liệu và % (tỷ trọng của loại đó trong tổng
// chi của kỳ) ngay trong cột đó.
export function IncomeExpenseComboChart({ buckets, series, incomeTotals, maxVal }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const dragRef = useDragScroll();
  const [hoverKey, setHoverKey] = useState(null); // `${bucketIndex}:${categoryId}` của đoạn đang hover
  const containerWidth = useMeasuredWidth(dragRef);
  if (buckets.length === 0) return null;
  const chartH = 220; // chiều cao vùng vẽ (px)
  const labelColW = 40; // độ rộng cột nhãn số tiền bên trái (trục tung)
  const bucketTotals = buckets.map((b, bi) => series.reduce((s, c) => s + (c.values[bi] || 0), 0));
  // Trục tung: 5 mốc từ 0 đến maxVal (maxVal = tổng thu nhập cao nhất, xem costMaxVal).
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxVal * f);
  const yPct = (v) => Math.min((v / maxVal) * 100, 100); // % chiều cao tính từ đáy lên
  // FIX: cùng vấn đề "trống bên phải" như CategoryBarChart — cột giờ giãn ra đúng bằng bề
  // ngang thực tế của khung chứa (đo qua useMeasuredWidth), luôn lấp đầy 100%; nhiều kỳ
  // vẫn giữ mức tối thiểu + tự cuộn ngang như cũ.
  const bucketMinWidth = 56;
  const bucketWidth = containerWidth > 0
    ? Math.max(bucketMinWidth, containerWidth / buckets.length)
    : bucketMinWidth;
  const plotWidth = Math.max(buckets.length * bucketWidth, 1);
  const xCenter = (bi) => (bi + 0.5) * bucketWidth; // toạ độ px, canh giữa mỗi cột
  const yPx = (v) => chartH - (yPct(v) / 100) * chartH;
  const totalLinePoints = bucketTotals.map((v, bi) => `${xCenter(bi)},${yPx(v)}`).join(' ');
  const incomeLinePoints = incomeTotals.map((v, bi) => `${xCenter(bi)},${yPx(v)}`).join(' ');
  return (
    // FIX: cùng lỗi "số bị che" như CategoryBarChart — nhãn số tiền của điểm Tổng chi
    // cao nhất bị đặt sát mép trên vùng vẽ (top: 0%) rồi đẩy lên thêm qua
    // "bottom: calc(100% + 3px)", nên đè lên viền trên/tiêu đề card khi Tổng chạm mốc cao
    // nhất. Thêm pt-6 (24px) để luôn đủ chỗ hiển thị trọn vẹn.
    <div ref={wrapRef} className="relative min-w-0 pt-6">
      <ChartTooltip tip={tip} />
      <div className="flex min-w-0">
        {/* Cột nhãn số tiền bên trái (trục tung) — cố định, không cuộn theo */}
        <div className="flex flex-col justify-between flex-shrink-0 pr-2" style={{ height: chartH, width: labelColW }}>
          {[...yTicks].reverse().map((v, i) => (
            <span key={i} className="text-[9px] text-steel dark:text-light-grey whitespace-nowrap leading-none">{formatMoneyCompact(v)}</span>
          ))}
        </div>

        {/* Vùng cuộn ngang — chứa CẢ phần vẽ cột lẫn nhãn trục hoành bên dưới, để 2 phần
            luôn khớp cột với nhau dù kéo cuộn tới đâu. Không hiện thanh cuộn (scrollbar-hide)
            — vẫn kéo được bình thường bằng chuột/trackpad, chỉ là không có thanh mảnh hiện ra. */}
        <div ref={dragRef} className="flex-1 min-w-0 overflow-x-auto scrollbar-hide cursor-grab">
          <div style={{ width: plotWidth, minWidth: '100%' }}>
            {/* Vùng vẽ: các cột chồng theo từng kỳ + 2 đường xu hướng (trục hoành = thời gian) */}
            <div className="relative" style={{ height: chartH, overflow: 'visible' }}>
              {/* Lưới ngang mảnh theo mốc số tiền */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((_, i) => (
                  <div key={i} className="border-t border-dashed border-steel/20 dark:border-light-grey/15 w-full" />
                ))}
              </div>

              {/* Các cột chồng — mỗi cột là 1 kỳ thời gian, mỗi màu là 1 loại chi tiêu, bề
                  rộng cố định (bucketWidth) + đệm ngang cho thon gọn. Bo góc đầu/cuối cột
                  (không bo giữa các đoạn) + rê chuột vào 1 đoạn sẽ phóng to nhẹ, sáng lên,
                  các đoạn khác mờ đi để dễ phân biệt giữa nhiều thành phần. */}
              <div className="absolute inset-0 flex items-end">
                {buckets.map((b, bi) => {
                  const bucketTotal = bucketTotals[bi];
                  const visibleAll = series.map((c, i) => ({ c, i, v: c.values[bi] })).filter((s) => s.v > 0);
                  // FIX: cùng vấn đề "sọc dày ở đỉnh cột" như CategoryBarChart — nhiều danh
                  // mục nhỏ đều bị ép minHeight 3px cộng dồn. Gộp phần đuôi (sau
                  // CATEGORY_SEG_LIMIT danh mục lớn nhất, series đã sort giảm dần) thành 1
                  // đoạn "Khác" duy nhất.
                  const CATEGORY_SEG_LIMIT = 6;
                  let visible = visibleAll;
                  if (visibleAll.length > CATEGORY_SEG_LIMIT) {
                    const kept = visibleAll.slice(0, CATEGORY_SEG_LIMIT - 1);
                    const otherV = visibleAll.slice(CATEGORY_SEG_LIMIT - 1).reduce((s, x) => s + x.v, 0);
                    visible = [...kept, { c: { id: `__other_${bi}`, name: `Khác (${visibleAll.length - (CATEGORY_SEG_LIMIT - 1)} danh mục)` }, i: -1, v: otherV, isOther: true }];
                  }
                  return (
                    <div key={bi} className="h-full flex flex-col-reverse items-stretch px-2.5 box-border flex-shrink-0 gap-[2px]" style={{ width: bucketWidth }}>
                      {visible.map((s, vi) => {
                        const { c, i, v } = s;
                        const h = yPct(v);
                        const pct = bucketTotal > 0 ? Math.round((v / bucketTotal) * 100) : 0;
                        const key = `${bi}:${c.id}`;
                        const isHovered = hoverKey === key;
                        const isDimmed = hoverKey !== null && !isHovered;
                        const isBottom = vi === 0;
                        const isTop = vi === visible.length - 1;
                        return (
                          <div
                            key={c.id}
                            className="w-full cursor-pointer"
                            style={{
                              height: `${h}%`,
                              minHeight: v > 0 ? 3 : 0,
                              background: s.isOther ? '#BDBDCB' : palette[i % palette.length],
                              borderTopLeftRadius: isTop ? 6 : 0,
                              borderTopRightRadius: isTop ? 6 : 0,
                              borderBottomLeftRadius: isBottom ? 6 : 0,
                              borderBottomRightRadius: isBottom ? 6 : 0,
                              opacity: isDimmed ? 0.35 : 1,
                              transform: isHovered ? 'scaleX(1.15)' : 'scaleX(1)',
                              transformOrigin: 'center',
                              filter: isHovered ? 'brightness(1.12) saturate(1.15)' : 'none',
                              boxShadow: isHovered ? '0 4px 14px rgba(0,0,0,0.2)' : 'none',
                              position: 'relative',
                              zIndex: isHovered ? 10 : 1,
                              transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
                            }}
                            onMouseMove={(e) => { setHoverKey(key); showTip(e, { label: `${c.name} (${b.label})`, value: formatMoney(v), pct }); }}
                            onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* 2 đường xu hướng: liền = Tổng chi, nét đứt = Thu nhập. ViewBox tính bằng px
                  (khớp bề rộng cuộn thực tế) thay vì % như trước, để đường luôn thẳng hàng
                  với cột dù đang cuộn ngang, và zIndex cao hơn mọi đoạn cột (kể cả hover). */}
              <svg
                width={plotWidth} height={chartH} viewBox={`0 0 ${plotWidth} ${chartH}`} preserveAspectRatio="none"
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ zIndex: 15 }}
              >
                <polyline points={incomeLinePoints} fill="none" stroke="currentColor" className="text-steel/50 dark:text-light-grey/50" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={totalLinePoints} fill="none" stroke="#0DBACC" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Chấm tròn + nhãn số tiền trên mỗi điểm "Tổng chi", rê vào xem số liệu. zIndex
                  cao hơn cả đường xu hướng để nhãn KHÔNG BAO GIỜ bị đường/cột đè lên — đây là
                  nguyên nhân khiến số tiền phía trên đỉnh cột trước đây thỉnh thoảng bị che. */}
              {bucketTotals.map((v, bi) => (
                <div
                  key={bi}
                  className="absolute cursor-default"
                  style={{ left: xCenter(bi), top: `${100 - yPct(v)}%`, transform: 'translate(-50%, -50%)', zIndex: 16 }}
                  onMouseMove={(e) => showTip(e, { label: `Tổng chi (${buckets[bi].label})`, value: formatMoney(v) })}
                  onMouseLeave={hideTip}
                >
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)] text-[10px] font-extrabold text-blueberry dark:text-white whitespace-nowrap">{v > 0 ? formatMoneyCompact(v) : ''}</span>
                  <div className="w-2 h-2 rounded-full bg-turquoise border border-white dark:border-night-sky" />
                </div>
              ))}
            </div>

            {/* Trục hoành: nhãn thời gian theo từng cột — nằm CÙNG vùng cuộn với phần vẽ cột
                ở trên nên luôn khớp vị trí, không bị lệch khi kéo cuộn. */}
            <div className="flex mt-2">
              {buckets.map((b, bi) => (
                <div key={bi} className="flex-shrink-0 text-center text-[10px] text-steel dark:text-light-grey whitespace-nowrap truncate px-0.5" style={{ width: bucketWidth }}>{b.label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-3 h-0.5 rounded-full bg-turquoise inline-block" />Tổng chi</span>
        <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-3 h-0.5 rounded-full border-t border-dashed border-steel dark:border-light-grey inline-block" />Thu nhập</span>
      </div>
      <div className="flex flex-col gap-1.5 mt-3">
        {series.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
            <span className="text-blueberry dark:text-white text-xs truncate flex-1 min-w-0 font-semibold">{c.name}</span>
            <span className="text-blueberry dark:text-white text-xs font-bold flex-shrink-0">{formatMoney(c.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
