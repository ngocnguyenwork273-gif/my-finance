/* ==============================================================================
   Các custom hook dùng chung giữa nhiều màn hình.
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';

// Đóng dropdown/menu khi nhấn ESC. Việc đóng khi click ra ngoài đã được xử lý
// riêng ở từng nơi gọi (thường bằng 1 lớp overlay fixed inset-0), hook này
// chỉ bổ sung phần ESC cho đồng bộ hành vi trên toàn app.
export function useCloseOnEscape(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
}

// Trả về số CỘT lưới thẻ (card grid) đang thực sự hiển thị theo bề rộng màn hình
// hiện tại — mốc breakpoint khớp CHÍNH XÁC với class Tailwind dùng trên các lưới
// thẻ (grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5), để nơi gọi tính
// được pageSize = số cột × số hàng mong muốn, LUÔN chia hết cho số cột thực tế dù
// màn hình to/nhỏ/đổi kích thước ra sao — tránh tình trạng hàng cuối trang bị hụt
// 1-2 ô trống rồi nhảy sang trang kế (chỉ xảy ra khi pageSize cố định không khớp
// số cột thật của breakpoint đang hiển thị).
export function useResponsiveGridColumns() {
  const getCols = () => {
    if (typeof window === 'undefined') return 5;
    const w = window.innerWidth;
    if (w < 640) return 2;   // < sm
    if (w < 1024) return 3;  // sm → lg
    if (w < 1280) return 4;  // lg → xl
    return 5;                 // ≥ xl
  };
  const [cols, setCols] = useState(getCols);
  useEffect(() => {
    function onResize() { setCols(getCols()); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
}

export function useChartTooltip() {
  const [tip, setTip] = useState(null);
  const wrapRef = useRef(null);
  function showTip(e, content) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, ...content });
  }
  function hideTip() { setTip(null); }
  return { tip, wrapRef, showTip, hideTip };
}
