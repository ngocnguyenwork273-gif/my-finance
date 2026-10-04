/* ==============================================================================
   Màn Dashboard: chỉ ghép hook logic + các component trình bày (xem thư mục screens/dashboard/).
   ============================================================================== */
import { DashboardDesktop } from './dashboard/DashboardDesktop';
import { DashboardMobile } from './dashboard/DashboardMobile';
import { DashboardModals } from './dashboard/DashboardModals';
import { useDashboardView } from './dashboard/useDashboardView';
import { DashboardSkeleton } from './DashboardParts';

export function Dashboard() {
  const v = useDashboardView();
  const { initialLoadDone, loading } = v;
  // Remove outer layout wrapper, just return the content
  // FIX: trước đây Dashboard render NGAY cả khi dữ liệu (transactions/accounts/quỹ...)
  // CHƯA tải xong (mảng rỗng mặc định) — trong khoảnh khắc đó, các biểu đồ tính toán
  // trên dữ liệu rỗng (maxVal về mặc định 1, tổng = 0...) nên hiện ra bị "vỡ"/trông kỳ
  // (cột gần như biến mất, đường xu hướng chạy sát đáy...), rồi mới "giật" về đúng khi
  // dữ liệu thật load xong — đúng như cảm giác "có gì đó che/vỡ lúc mới load trang".
  // Giờ chặn lại: đợi tải xong dữ liệu mới vẽ toàn bộ Trang chủ, tránh hiện trạng thái
  // vỡ/trung gian đó.
  // FIX: trước đây chỉ hiện 1 spinner giữa màn hình trắng lúc tải lần đầu — chuyển trạng thái
  // đột ngột từ trắng sang đầy nội dung, cảm giác giật. Giờ hiện khung "xương" (skeleton) đúng
  // hình dạng Trang chủ thật (mobile + desktop), các khối mờ nhấp nháy nhẹ trong lúc chờ dữ
  // liệu — nhìn mượt và có cảm giác đang tải đúng thứ sắp hiện ra hơn hẳn màn trắng + spinner.
  if (loading && !initialLoadDone) {
    return <DashboardSkeleton />;
  }
  return (
    <>
      <DashboardMobile v={v} />
      <DashboardDesktop v={v} />
      <DashboardModals v={v} />
    </>
  );
}
