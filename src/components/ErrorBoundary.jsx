/* ==============================================================================
   Error boundary: bắt lỗi JS khi render, hiện màn hình lỗi thân thiện + nút tải lại thay vì màn hình trắng.
   ============================================================================== */
import { Component } from 'react';

// Trước đây app KHÔNG có error boundary nào — bất kỳ lỗi JS chưa lường tới ở bất cứ đâu
// (ví dụ rõ nhất: xử lý ảnh upload từ điện thoại — ảnh quá lớn, định dạng lạ, hết bộ nhớ
// khi vẽ canvas...) đều khiến React gỡ sạch toàn bộ giao diện, hiện đúng "màn hình trắng"
// không có cách nào thoát ra ngoài việc tắt hẳn app/tải lại trang theo cách thủ công.
// ErrorBoundary này chặn lại: hiện màn hình lỗi thân thiện + nút tải lại, đồng thời log lỗi
// ra console để biết chính xác nguyên nhân (mở DevTools / chrome://inspect để xem).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Lỗi chưa xử lý làm app bị sập:', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-ice-cream dark:bg-[#1a1a2e] p-6">
          <div className="max-w-sm w-full text-center">
            <p className="text-5xl mb-4">🐼💥</p>
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-2">Có lỗi xảy ra</h2>
            <p className="text-steel dark:text-light-grey text-sm mb-5">
              Ứng dụng gặp sự cố ngoài dự kiến (có thể do ảnh vừa chọn quá lớn hoặc không đọc được).
              Thử tải lại trang — dữ liệu của bạn vẫn an toàn trên máy chủ.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-primary text-white rounded-full px-6 py-2.5 text-sm font-bold shadow-md shadow-turquoise/30"
            >
              Tải lại trang
            </button>
            {this.state.error && (
              <p className="text-steel/60 dark:text-light-grey/50 text-[11px] mt-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
