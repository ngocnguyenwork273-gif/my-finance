/* ==============================================================================
   Biểu đồ và hook phụ trợ riêng của màn Tổng quan.
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { ChartTooltip } from '../components/ui';
import { useChartTooltip } from '../hooks';
import { formatMoney, formatMoneyCompact } from '../lib/format';

// Đo bề rộng thực tế (px) của 1 phần tử DOM qua ResizeObserver — dùng để biểu đồ cột co giãn
// lấp đầy khung chứa thay vì luôn giữ bề rộng cột cố định (xem CategoryBarChart,
// IncomeExpenseComboChart). Trả về 0 ở lần render đầu (trước khi đo được).
export function useMeasuredWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// Logo app đặt sẵn trong code (src/assets/app-logo.png) — dùng chung cho MỌI tài khoản,
// không cần upload qua Settings/Supabase Storage nữa nên nhẹ và luôn đồng bộ.
// Copy file logo thật vào src/assets/app-logo.png (đè lên) là xong, không cần sửa gì thêm.

// Cho phép giữ chuột trái + kéo ngang để cuộn 1 vùng overflow-x-auto — mặc định trình
// duyệt desktop KHÔNG hỗ trợ kiểu kéo này (chỉ cuộn được qua thanh scrollbar hoặc
// trackpad/lăn chuột ngang), nên khi đã ẩn thanh scrollbar (scrollbar-hide) thì cần tự
// bắt sự kiện chuột để mô phỏng "kéo để cuộn" giống cảm giác vuốt trên điện thoại.
// Gắn ref trả về vào ĐÚNG phần tử có class overflow-x-auto.
export function useDragScroll() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    function onDown(e) {
      // Chỉ bắt chuột trái, bỏ qua nếu đang bấm vào 1 nút/link bên trong (để không phá
      // các hành động click khác đặt trong vùng biểu đồ).
      if (e.button !== 0) return;
      isDown = true;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }
    function onMove(e) {
      if (!isDown) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
    }
    function onUp() {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    }
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);
  return ref;
}

// Bảng màu + kích thước donut dùng CHUNG cho mọi chart (SpendingDonut/CategoryBarChart/
// TrendBarChart/SegmentDonut) — đặt ở module scope (KHÔNG khai báo lại bên trong
// Dashboard/Report) để các hàm bên dưới không bị định nghĩa lại mỗi lần component cha
// re-render. Xem ghi chú ở SpendingDonut/CategoryBarChart/TrendBarChart/SegmentDonut.
export const palette = ['#0DBACC', '#74ACEF', '#F18AB5', '#9F7FE0', '#B4F1F1', '#C1DDFF', '#FFCDDB', '#E3D6FF'];

export const radius = 60, circumference = 2 * Math.PI * radius;

// FIX (chart trống/không hiện khi mở app): các component chart dưới đây TRƯỚC ĐÂY được
// khai báo (function SpendingDonut(){...} v.v.) NGAY BÊN TRONG component Dashboard, nên
// mỗi lần Dashboard re-render (đổi bộ lọc thời gian, hover vào bất kỳ đâu trong
// Dashboard, dữ liệu giao dịch tải xong...) React coi đây là 1 "loại component" HOÀN
// TOÀN MỚI (vì function reference đổi mỗi render) → unmount toàn bộ DOM chart cũ rồi
// mount lại DOM mới ngay lập tức. Trên trình duyệt desktop việc này thường không thấy vì
// remount + repaint gần như tức thì, nhưng trên WebView nhúng trong app khác (Zalo Mini
// App, Facebook/TikTok in-app browser...) việc remount liên tục các phần tử có
// backdrop-filter (frost-inset) hay bị "kẹt" không paint lại kịp, để lại 1 khối trống
// trắng đúng ngay vị trí chart đó cho đến khi người dùng cuộn/chạm vào màn hình. Chuyển
// các component này ra module scope (định nghĩa DUY NHẤT 1 lần khi file load, không phụ
// thuộc props/state của Dashboard) giúp React NHẬN RA đây vẫn là cùng 1 component giữa
// các lần re-render và chỉ cập nhật (update) DOM thay vì unmount/mount lại — chart sẽ
// luôn hiện đúng ngay từ lần vẽ đầu tiên, kể cả trên các WebView "khó tính".
export function SpendingDonut({ data, total }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const [hoverId, setHoverId] = useState(null); // id danh mục đang hover, để lát đó nổi bật + các lát khác mờ đi
  // FIX: trước đây liệt kê TẤT CẢ danh mục ở chú thích, có kỳ tới 17 dòng khiến card chiếm gần
  // hết màn hình mobile. Giờ chỉ hiện tối đa 5 danh mục lớn nhất (data đã sort giảm dần theo
  // amount ở nơi gọi) + nút "Xem tất cả X danh mục" để mở rộng khi cần.
  const LEGEND_COLLAPSED_COUNT = 5;
  const [showAllLegend, setShowAllLegend] = useState(false);
  const hasMore = data.length > LEGEND_COLLAPSED_COUNT;
  const visibleData = showAllLegend ? data : data.slice(0, LEGEND_COLLAPSED_COUNT);
  const r = 60, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div ref={wrapRef} className="relative flex items-center gap-6">
      <ChartTooltip tip={tip} />
      <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
        <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
          {data.map((cat, i) => {
            const pct = cat.amount / total;
            const dash = pct * circ;
            const offset = acc;
            acc += dash;
            const isHovered = hoverId === cat.id;
            const isDimmed = hoverId !== null && !isHovered;
            return (
              <circle
                key={cat.id} cx="75" cy="75" r={r} fill="none" stroke={palette[i % palette.length]}
                strokeWidth={isHovered ? 18 : 14}
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="round"
                className="cursor-pointer"
                style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.18s ease, stroke-width 0.18s ease' }}
                onMouseMove={(e) => { setHoverId(cat.id); showTip(e, { label: cat.name, value: formatMoney(cat.amount), pct: Math.round(pct * 100) }); }}
                onMouseLeave={() => { setHoverId(null); hideTip(); }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] text-steel dark:text-light-grey">Tổng</span>
          <span className="text-sm font-bold text-blueberry dark:text-white">{formatMoney(total)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-sm min-w-0">
        {visibleData.map((cat, i) => (
          <div
            key={cat.id}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-1 -mx-1 transition-opacity duration-150"
            style={{ opacity: hoverId !== null && hoverId !== cat.id ? 0.4 : 1 }}
            onMouseEnter={() => setHoverId(cat.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
            <span className="text-blueberry dark:text-white font-semibold">{cat.name}</span><span className="text-blueberry dark:text-white font-bold ml-auto">{formatMoney(cat.amount)}</span>
          </div>
        ))}
        {hasMore && (
          <button
            onClick={() => setShowAllLegend((v) => !v)}
            className="text-turquoise text-xs font-bold text-left mt-1 hover:underline"
          >
            {showAllLegend ? 'Thu gọn' : `Xem tất cả ${data.length} danh mục`}
          </button>
        )}
      </div>
    </div>
  );
}

export function CategoryBarChart({ series, maxVal, buckets }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const dragRef = useDragScroll();
  const [hoverKey, setHoverKey] = useState(null); // `${bucketIndex}:${categoryId}` của đoạn đang hover, để đoạn đó nổi bật + mờ các đoạn còn lại
  const containerWidth = useMeasuredWidth(dragRef);
  if (series.length === 0) return null;
  const chartH = 200; // chiều cao vùng vẽ (px)
  const labelColW = 40; // độ rộng cột nhãn số tiền bên trái (trục tung)
  const bucketTotals = buckets.map((b, bi) => series.reduce((s, c) => s + (c.values[bi] || 0), 0));
  // Trục tung: 4 mốc từ 0 đến maxVal (maxVal đã được tính theo tổng cả cột mỗi kỳ).
  const yTicks = [0, 0.33, 0.66, 1].map((f) => maxVal * f);
  const yPct = (v) => Math.min((v / maxVal) * 100, 100); // % chiều cao tính từ đáy lên
  // FIX: bề rộng mỗi cột trước đây LUÔN CỐ ĐỊNH (56px) nên khi ít kỳ trên 1 thẻ rộng, cột
  // dồn hết về bên trái, để lại khoảng trống lớn bên phải — nhìn như biểu đồ "trống". Giờ
  // cột GIÃN RA đúng bằng bề ngang thực tế của khung chứa (đo qua useMeasuredWidth), luôn
  // lấp đầy 100%. Khi nhiều kỳ khiến cột phải nhỏ hơn bucketMinWidth thì giữ nguyên mức tối
  // thiểu này và tự cuộn ngang (overflow-x-auto) — giữ đúng hành vi cũ cho trường hợp nhiều
  // dữ liệu.
  const bucketMinWidth = 56;
  const bucketWidth = containerWidth > 0
    ? Math.max(bucketMinWidth, containerWidth / buckets.length)
    : bucketMinWidth;
  const plotWidth = Math.max(buckets.length * bucketWidth, 1);
  const xCenter = (bi) => (bi + 0.5) * bucketWidth; // toạ độ px, canh giữa mỗi cột
  const yPx = (v) => chartH - (yPct(v) / 100) * chartH;
  const totalLinePoints = bucketTotals.map((v, bi) => `${xCenter(bi)},${yPx(v)}`).join(' ');

  return (
    // FIX: khoảng đệm trên (trước là pt-4) tính lại vẫn còn thiếu ~5px so với chiều cao
    // thực tế của nhãn (font 10px + line-height mặc định của trình duyệt + khoảng cách 3px
    // + nửa đường kính chấm tròn) nên nhãn của điểm cao nhất vẫn hơi đè lên viền trên/tiêu
    // đề card. Tăng lên pt-6 (24px) để luôn đủ chỗ, kể cả khi Tổng chạm đúng mốc cao nhất.
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
            luôn khớp cột với nhau dù kéo cuộn tới đâu. */}
        <div ref={dragRef} className="flex-1 min-w-0 overflow-x-auto scrollbar-hide cursor-grab">
          <div style={{ width: plotWidth, minWidth: '100%' }}>
            {/* Vùng vẽ: các cột chồng theo từng kỳ/ngày + đường Tổng (trục hoành = thời gian) */}
            <div className="relative" style={{ height: chartH, overflow: 'visible' }}>
              {/* Lưới ngang mảnh theo mốc số tiền */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yTicks.map((_, i) => (
                  <div key={i} className="border-t border-dashed border-steel/20 dark:border-light-grey/15 w-full" />
                ))}
              </div>

              {/* Các cột chồng — mỗi cột là 1 kỳ/ngày, mỗi màu là 1 danh mục, bề rộng cố
                  định (bucketWidth) + đệm ngang (px-2.5) để cột thon gọn và có khoảng
                  cách rõ ràng với cột bên cạnh, thay vì chiếm gần hết bề ngang như trước.
                  Mỗi đoạn được bo góc ở đầu/cuối của cả cột (không bo giữa các đoạn) cho
                  giống dạng "viên thuốc" chồng lên nhau; rê chuột vào 1 đoạn sẽ phóng to
                  nhẹ + sáng lên, các đoạn khác mờ đi để dễ nhìn đoạn đang chọn giữa nhiều
                  thành phần. */}
              <div className="absolute inset-0 flex items-end">
                {buckets.map((b, bi) => {
                  const bucketTotal = bucketTotals[bi];
                  const visible = series.map((c, i) => ({ c, i, v: c.values[bi] })).filter((s) => s.v > 0);
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

              {/* Đường liền nối đỉnh từng cột = Tổng của kỳ/ngày đó. zIndex cao hơn hẳn z-index
                  cao nhất của các đoạn cột (kể cả khi hover = 10) để đường LUÔN nổi lên trên
                  cột, không bị cột che mất. Màu cam-vàng (#FFB020) để không trùng đoạn cột
                  đầu tiên trong palette (#0DBACC). ViewBox giờ tính bằng px (khớp bề rộng
                  cuộn thực tế của vùng vẽ) thay vì % như trước, để đường luôn thẳng hàng
                  với cột dù đang cuộn ngang. */}
              <svg
                width={plotWidth} height={chartH} viewBox={`0 0 ${plotWidth} ${chartH}`} preserveAspectRatio="none"
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ zIndex: 15 }}
              >
                <polyline points={totalLinePoints} fill="none" stroke="#FFB020" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Chấm tròn + nhãn số tiền trên mỗi điểm Tổng, giống ảnh mẫu, rê vào xem số liệu. */}
              {bucketTotals.map((v, bi) => (
                <div
                  key={bi}
                  className="absolute cursor-default"
                  style={{ left: xCenter(bi), top: `${100 - yPct(v)}%`, transform: 'translate(-50%, -50%)', zIndex: 16 }}
                  onMouseMove={(e) => showTip(e, { label: `Tổng (${buckets[bi].label})`, value: formatMoney(v) })}
                  onMouseLeave={hideTip}
                >
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)] text-[10px] font-extrabold text-blueberry dark:text-white whitespace-nowrap">{v > 0 ? formatMoneyCompact(v) : ''}</span>
                  <div className="w-2 h-2 rounded-full border border-white dark:border-night-sky" style={{ background: '#FFB020' }} />
                </div>
              ))}
            </div>

            {/* Trục hoành: nhãn kỳ/ngày theo từng cột — nằm CÙNG vùng cuộn với phần vẽ cột
                ở trên nên luôn khớp vị trí, không bị lệch khi kéo cuộn. */}
            <div className="flex mt-2">
              {buckets.map((b, bi) => (
                <div key={bi} className="flex-shrink-0 text-center text-[10px] text-steel dark:text-light-grey whitespace-nowrap truncate px-0.5" style={{ width: bucketWidth }}>{b.label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — mỗi danh mục 1 dòng duy nhất, số tiền là tổng cả khoảng thời gian đang chọn */}
      <div className={`flex flex-col gap-1.5 mt-4 ${series.length > 6 ? 'max-h-40 overflow-y-auto scrollbar-hide pr-1' : ''}`}>
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

export function TrendBarChart({ buckets, maxVal, keyA = 'inc', keyB = 'exp', keyC = null, labelA = 'Thu nhập', labelB = 'Chi tiêu', labelC = 'Tổng', colorA = 'bg-turquoise', colorB = 'bg-cotton-candy', colorC = 'bg-lavender', showYAxis = false }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const dragRef = useDragScroll();
  const [hoverKey, setHoverKey] = useState(null); // `${bucketIndex}:a`/`:b`/`:c` của cột đang hover
  const yTicks = showYAxis ? [0, 0.25, 0.5, 0.75, 1].map((f) => maxVal * f) : [];
  // Bề rộng tối thiểu cho MỖI cụm (ngày/tháng) — luôn áp dụng (trước đây chỉ áp dụng
  // khi buckets.length > 12) để các cột không bao giờ bị ép quá mỏng/dính vào nhau.
  // Khi tổng bề rộng vượt khung nhìn, overflow-x-auto sẽ tự bật thanh cuộn ngang.
  const bucketMinWidth = keyC ? 34 : 24;
  const chart = (
    <div ref={dragRef} className="flex items-end gap-3 mt-4 h-32 overflow-x-auto scrollbar-hide cursor-grab">
      {buckets.map((b, i) => {
        const aKey = `${i}:a`, bKey = `${i}:b`, cKey = `${i}:c`;
        const aHovered = hoverKey === aKey, bHovered = hoverKey === bKey, cHovered = hoverKey === cKey;
        const aDimmed = hoverKey !== null && !aHovered;
        const bDimmed = hoverKey !== null && !bHovered;
        const cDimmed = hoverKey !== null && !cHovered;
        const aVal = b[keyA] || 0, bVal = b[keyB] || 0, cVal = keyC ? (b[keyC] || 0) : 0;
        return (
          <div
            key={i}
            className={`flex-1 flex flex-col items-center gap-1 h-full justify-end rounded-md px-1 ${i % 2 === 1 ? 'bg-blueberry/[0.035] dark:bg-white/[0.05]' : ''}`}
            style={{ minWidth: bucketMinWidth }}
          >
            <div className="w-full flex items-end gap-1 h-full" style={{ overflow: 'visible' }}>
              <div
                className={`flex-1 ${colorA} rounded-t-[8px] cursor-pointer`}
                style={{
                  height: `${(aVal / maxVal) * 100}%`, minHeight: aVal > 0 ? 4 : 0,
                  opacity: aDimmed ? 0.35 : 1,
                  transform: aHovered ? 'scaleX(1.15) translateY(-2px)' : 'scaleX(1)',
                  transformOrigin: 'bottom',
                  filter: aHovered ? 'brightness(1.1)' : 'none',
                  boxShadow: aHovered ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                  position: 'relative', zIndex: aHovered ? 10 : 1,
                  transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseMove={(e) => { setHoverKey(aKey); showTip(e, { label: `${labelA} (${b.label})`, value: formatMoney(aVal) }); }}
                onMouseLeave={() => { setHoverKey(null); hideTip(); }}
              />
              <div
                className={`flex-1 ${colorB} rounded-t-[8px] cursor-pointer`}
                style={{
                  height: `${(bVal / maxVal) * 100}%`, minHeight: bVal > 0 ? 4 : 0,
                  opacity: bDimmed ? 0.35 : 1,
                  transform: bHovered ? 'scaleX(1.15) translateY(-2px)' : 'scaleX(1)',
                  transformOrigin: 'bottom',
                  filter: bHovered ? 'brightness(1.1)' : 'none',
                  boxShadow: bHovered ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                  position: 'relative', zIndex: bHovered ? 10 : 1,
                  transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseMove={(e) => { setHoverKey(bKey); showTip(e, { label: `${labelB} (${b.label})`, value: formatMoney(bVal) }); }}
                onMouseLeave={() => { setHoverKey(null); hideTip(); }}
              />
              {keyC && (
                <div
                  className={`flex-1 ${colorC} rounded-t-[8px] cursor-pointer`}
                  style={{
                    height: `${(cVal / maxVal) * 100}%`, minHeight: cVal > 0 ? 4 : 0,
                    opacity: cDimmed ? 0.35 : 1,
                    transform: cHovered ? 'scaleX(1.15) translateY(-2px)' : 'scaleX(1)',
                    transformOrigin: 'bottom',
                    filter: cHovered ? 'brightness(1.1)' : 'none',
                    boxShadow: cHovered ? '0 4px 12px rgba(0,0,0,0.18)' : 'none',
                    position: 'relative', zIndex: cHovered ? 10 : 1,
                    transition: 'opacity 0.18s ease, transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease',
                  }}
                  onMouseMove={(e) => { setHoverKey(cKey); showTip(e, { label: `${labelC} (${b.label})`, value: formatMoney(cVal) }); }}
                  onMouseLeave={() => { setHoverKey(null); hideTip(); }}
                />
              )}
            </div>
            <span className="text-[11px] text-steel dark:text-light-grey whitespace-nowrap">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
  return (
    <div ref={wrapRef} className="relative">
      <ChartTooltip tip={tip} />
      {showYAxis ? (
        <div className="flex">
          {/* Trục tung — số tiền, từ cao xuống thấp, cùng cách làm với IncomeExpenseComboChart */}
          <div className="flex flex-col justify-between flex-shrink-0 pr-2 mt-4" style={{ height: 128 }}>
            {[...yTicks].reverse().map((v, i) => (
              <span key={i} className="text-[9px] text-steel dark:text-light-grey whitespace-nowrap leading-none">{formatMoneyCompact(v)}</span>
            ))}
          </div>
          <div className="flex-1 min-w-0">{chart}</div>
        </div>
      ) : chart}
    </div>
  );
}

export function SegmentDonut({ segments, centerLabel, centerValue }) {
  const { tip, wrapRef, showTip, hideTip } = useChartTooltip();
  const [hoverId, setHoverId] = useState(null); // id lát đang hover, để lát đó nổi bật + các lát khác mờ đi
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <ChartTooltip tip={tip} />
      <svg width="120" height="120" viewBox="0 0 150 150" className="-rotate-90">
        {segments.map((seg, i) => {
          const isHovered = hoverId === seg.id;
          const isDimmed = hoverId !== null && !isHovered;
          return (
            <circle
              key={seg.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]}
              strokeWidth={isHovered ? 18 : 14}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset} strokeLinecap="round"
              className="cursor-pointer"
              style={{ opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.18s ease, stroke-width 0.18s ease' }}
              onMouseMove={(e) => { setHoverId(seg.id); showTip(e, { label: seg.name, value: formatMoney(seg.amount), pct: Math.round(seg.pct * 100) }); }}
              onMouseLeave={() => { setHoverId(null); hideTip(); }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] text-steel dark:text-light-grey">{centerLabel}</span>
        <span className="text-xs font-bold text-blueberry dark:text-white">{centerValue}</span>
      </div>
    </div>
  );
}

// Khung "xương" cho Trang chủ lúc tải lần đầu — mô phỏng đúng hình dạng bố cục thật (mobile +
// desktop) bằng các khối màu trung tính nhấp nháy nhẹ (animate-pulse), để cảm giác chuyển từ
// "đang tải" sang "đã có dữ liệu" mượt hơn, thay vì màn trắng rồi bật nội dung đột ngột.
function SkeletonBlock({ className = '' }) {
  return <div className={`bg-blueberry/10 dark:bg-white/10 rounded-2xl animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden px-4 pt-6 pb-24 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="w-10 h-10 rounded-full" />
        </div>
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-10 w-full rounded-2xl" />
        <SkeletonBlock className="h-40 w-full rounded-3xl" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-24 flex-1 rounded-2xl" />
          <SkeletonBlock className="h-24 flex-1 rounded-2xl" />
          <SkeletonBlock className="h-24 flex-1 rounded-2xl" />
        </div>
        <SkeletonBlock className="h-56 w-full rounded-2xl" />
        <SkeletonBlock className="h-56 w-full rounded-2xl" />
      </div>
      {/* Desktop */}
      <div className="hidden md:flex flex-col gap-6 p-6">
        <div className="grid grid-cols-3 gap-6">
          <SkeletonBlock className="h-52 col-span-2" />
          <SkeletonBlock className="h-52" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
        <SkeletonBlock className="h-72" />
        <div className="grid grid-cols-2 gap-6">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    </>
  );
}
