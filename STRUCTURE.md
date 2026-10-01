# Cấu trúc thư mục `src/`

Tách từ `App.jsx` (9.955 dòng) thành 34 module. Quy tắc đặt chỗ: thứ chỉ một màn dùng nằm trong file của màn đó (hoặc file `...Parts` đi kèm); thứ nhiều màn dùng nằm trong `components/`, `forms/`, `hooks`, `lib/`. Không có import vòng.

Các file có sẵn từ trước và KHÔNG đổi: `lib/finance.js`, `lib/format.js` (+ test), `icons.jsx`, `supabaseClient.js`, `DateField.jsx`, `DateTimeField.jsx`, `ReportPdf.jsx`, `main.jsx`, `index.css`.


## Điểm vào & khung

| File | Dòng | Nội dung |
|---|---:|---|
| `App.jsx` | 47 | Điểm vào: chọn giữa màn đăng nhập và ứng dụng chính, gắn Toast/Confirm toàn cục. |
| `MainApp.jsx` | 372 | Khung ứng dụng sau đăng nhập: tải dữ liệu, điều hướng, cung cấp Context, bố cục. |
| `components/ErrorBoundary.jsx` | 49 | Error boundary: bắt lỗi JS khi render, hiện màn hình lỗi thân thiện + nút tải lại thay vì màn hình trắng. |
| `context.jsx` | 20 | Context dùng chung: ShellContext (giao diện/điều hướng) và DataContext (dữ liệu & hành động). Cung cấp bởi MainApp; màn hình dùng useShell() / useAppData(). |
| `feedback.jsx` | 120 | Phản hồi người dùng & hạ tầng modal: toast() thay alert(), confirmDialog() thay confirm(), và useEscapeKey() để Esc / nút Back Android đóng modal trên cùng. |
| `hooks.js` | 55 | Các custom hook dùng chung giữa nhiều màn hình. |

## Màn hình (screens/)

| File | Dòng | Nội dung |
|---|---:|---|
| `screens/Dashboard.jsx` | 1272 | Màn Tổng quan. |
| `screens/DashboardParts.jsx` | 501 | Biểu đồ và hook phụ trợ riêng của màn Tổng quan. |
| `screens/Funds.jsx` | 417 | Màn danh sách Quỹ. |
| `screens/Goals.jsx` | 478 | Màn Mục tiêu (kèm form sửa mục tiêu). |
| `screens/Accounts.jsx` | 150 | Màn danh sách Ví. |
| `screens/Settings.jsx` | 272 | Màn Cài đặt / Hồ sơ. |
| `screens/SettingsParts.jsx` | 522 | Các phần của màn Cài đặt (Giao diện, Hồ sơ, Danh mục). |
| `screens/Report.jsx` | 1276 | Màn Báo cáo. |
| `screens/ReportParts.jsx` | 545 | Biểu đồ/bảng dùng trong màn Báo cáo và bản xem trước báo cáo. |
| `screens/ReportExport.jsx` | 209 | Modal xuất báo cáo (xem trước, in, tải PDF) và cài đặt các mục báo cáo. |
| `screens/FundDetail.jsx` | 619 | Màn chi tiết một Quỹ (kèm form nạp/rút nhanh). |
| `screens/AccountDetail.jsx` | 274 | Màn chi tiết một Ví (kèm form điều chỉnh số dư). |
| `screens/AuthScreen.jsx` | 179 | Màn đăng nhập / đăng ký. |

## Bố cục (layout/)

| File | Dòng | Nội dung |
|---|---:|---|
| `layout/HeaderDesktop.jsx` | 191 | Thanh header trên desktop (tìm kiếm toàn cục, thêm giao dịch, avatar). |
| `layout/SidebarDesktop.jsx` | 98 | Thanh điều hướng bên trái trên desktop. |
| `layout/BottomNavMobile.jsx` | 251 | Thanh điều hướng dưới cùng trên mobile. |

## Form & modal (forms/)

| File | Dòng | Nội dung |
|---|---:|---|
| `forms/EditTransaction.jsx` | 282 | Form sửa giao dịch. |
| `forms/EditFundForm.jsx` | 197 | Form tạo/sửa quỹ. |
| `forms/EditAccountModal.jsx` | 54 | Modal tạo/sửa ví. |
| `forms/ImageUploader.jsx` | 215 | Chọn, cắt và tải ảnh lên (avatar, ảnh quỹ). |
| `forms/AddTransaction.jsx` | 315 | Modal thêm giao dịch (mở toàn cục từ MainApp). |

## Thành phần dùng chung (components/)

| File | Dòng | Nội dung |
|---|---:|---|
| `components/ui.jsx` | 233 | Thành phần giao diện nhỏ dùng chung (emoji tròn, thanh tiến độ, vòng tiến độ, thẻ tóm tắt, tooltip biểu đồ, menu avatar). |
| `components/inputs.jsx` | 125 | Ô nhập dùng chung: MoneyInput (nhập tiền có biểu thức) và CustomSelect. |
| `components/ledger.jsx` | 210 | Dòng/Modal sổ giao dịch và các danh sách chi tiết thu-chi-tài sản (dùng ở Dashboard và Báo cáo). |

## Logic thuần (lib/) — có thể test bằng Vitest

| File | Dòng | Nội dung |
|---|---:|---|
| `lib/image.js` | 103 | Xử lý ảnh phía trình duyệt (thu nhỏ, kiểm tra canvas rỗng, cắt theo tỉ lệ) — dùng cho upload ảnh. |
| `lib/ledger.js` | 111 | Tính số dư/nguồn tiền sau từng giao dịch cho sổ giao dịch (Dashboard, Báo cáo). |
| `lib/accountStyles.js` | 40 | Loại ví và kiểu hiển thị thẻ ví. |
| `lib/reportData.js` | 318 | Dựng dữ liệu báo cáo (thuần): tổng hợp thu chi, tài sản, quỹ... theo khoảng thời gian. |

## Thêm tính năng mới: làm ở đâu?

- Màn hình mới → `screens/TenMan.jsx`, thêm vào `renderScreenContent` trong `MainApp.jsx`; lấy dữ liệu bằng `useAppData()`, giao diện bằng `useShell()`.
- Thành phần dùng ≥ 2 màn → `components/`. Form/modal → `forms/`.
- Công thức tiền, ngày, kỳ → `lib/finance.js` (kèm test trong `finance.test.js`). Định dạng chuỗi/tiền → `lib/format.js`.
- Thông báo cho người dùng → `toast()`; hỏi xác nhận → `await confirmDialog(...)` (cả hai trong `feedback.jsx`).
