# Cấu trúc thư mục `src/`

Quy tắc đặt chỗ: thứ chỉ một màn dùng nằm cạnh màn đó; thứ nhiều màn dùng nằm trong `components/`, `forms/`, `hooks`, `lib/`. Không có import vòng.

Ba màn lớn (Tổng quan, Báo cáo, chi tiết Quỹ) gồm: **hook** `useXxxView` (toàn bộ state + dữ liệu dẫn xuất + hành động), các component trình bày `XxxMobile` / `XxxDesktop` / `XxxModals`, và (nếu có) `XxxWidgets`. File `screens/Xxx.jsx` chỉ còn ghép chúng lại. Các màn còn lại (Quỹ, Mục tiêu, Ví, Chi tiết ví, Cài đặt) dưới 400 dòng nên giữ nguyên một file.

Các file có sẵn của bạn không nằm trong bảng này: `icons.jsx`, `supabaseClient.js`, `DateField.jsx`, `DateTimeField.jsx`, `ReportPdf.jsx`, `main.jsx`, `index.css`, `fonts.css`, và `lib/reportExcel.js` (nếu có).


## Điểm vào, khung, hạ tầng

| File | Dòng | Nội dung |
|---|---:|---|
| `App.jsx` | 47 | Điểm vào: chọn giữa màn đăng nhập và ứng dụng chính, gắn Toast/Confirm toàn cục. |
| `MainApp.jsx` | 372 | Khung ứng dụng sau đăng nhập: tải dữ liệu, điều hướng, cung cấp Context, bố cục. |
| `a11y.js` | 26 | Trợ năng (a11y) cho phần tử không phải <button> nhưng bấm được (vd dòng giao dịch dạng <div>). - clickable(handler): thêm role="button", tabIndex=0 và phím Enter / Space — dùng cho phần tử "lá" (bên trong KHÔNG có nút/liên kết khác, vì role="button" biến mọi thứ bên trong thành chữ thường). - keyActivatable(handler): chỉ thêm tabIndex=0 và phím Enter / Space, KHÔNG đổi role — dùng cho dòng/thẻ có chứa nút khác bên trong (vd nút xóa) hoặc là <tr>. Cả hai: handler rỗng (undefined/false) thì trả {} => phần tử không bấm được, không nhận focus. Phím gõ ở phần tử con (input, nút bên trong...) bị bỏ qua để không kích hoạt nhầm cả dòng. Cách dùng:  <div {...clickable(() => setEditingTx(tx))} className="..."> |
| `context.jsx` | 20 | Context dùng chung: ShellContext (giao diện/điều hướng) và DataContext (dữ liệu & hành động). Cung cấp bởi MainApp; màn hình dùng useShell() / useAppData(). |
| `feedback.jsx` | 120 | Phản hồi người dùng & hạ tầng modal: toast() thay alert(), confirmDialog() thay confirm(), và useEscapeKey() để Esc / nút Back Android đóng modal trên cùng. |
| `hooks.js` | 41 | Các custom hook dùng chung giữa nhiều màn hình. |

## Màn hình `screens/`

| File | Dòng | Nội dung |
|---|---:|---|
| `screens/AccountDetail.jsx` | 283 | Màn chi tiết một Ví (kèm form điều chỉnh số dư). |
| `screens/Accounts.jsx` | 150 | Màn danh sách Ví. |
| `screens/AuthScreen.jsx` | 179 | Màn đăng nhập / đăng ký. |
| `screens/Dashboard.jsx` | 35 | Màn Dashboard: chỉ ghép hook logic + các component trình bày (xem thư mục screens/dashboard/). |
| `screens/DashboardParts.jsx` | 501 | Biểu đồ và hook phụ trợ riêng của màn Tổng quan. |
| `screens/FundDetail.jsx` | 18 | Màn FundDetail: chỉ ghép hook logic + các component trình bày (xem thư mục screens/fundDetail/). |
| `screens/Funds.jsx` | 417 | Màn danh sách Quỹ. |
| `screens/Goals.jsx` | 486 | Màn Mục tiêu (kèm form sửa mục tiêu). |
| `screens/Report.jsx` | 18 | Màn Report: chỉ ghép hook logic + các component trình bày (xem thư mục screens/report/). |
| `screens/ReportExport.jsx` | 290 | Modal xuất báo cáo (xem trước, in, tải PDF) và cài đặt các mục báo cáo. |
| `screens/ReportParts.jsx` | 588 | Biểu đồ/bảng dùng trong màn Báo cáo và bản xem trước báo cáo. |
| `screens/Settings.jsx` | 272 | Màn Cài đặt / Hồ sơ. |
| `screens/SettingsParts.jsx` | 536 | Các phần của màn Cài đặt (Giao diện, Hồ sơ, Danh mục). |

## Màn Tổng quan `screens/dashboard/`

| File | Dòng | Nội dung |
|---|---:|---|
| `screens/dashboard/DashboardDesktop.jsx` | 376 | Giao diện Tổng quan trên desktop. |
| `screens/dashboard/DashboardMobile.jsx` | 268 | Giao diện Tổng quan trên mobile. |
| `screens/dashboard/DashboardModals.jsx` | 49 | Các modal của màn Tổng quan: sổ chi tiết, thêm widget, sửa giao dịch. |
| `screens/dashboard/DashboardWidgets.jsx` | 246 | Các widget nhỏ dùng trong màn Tổng quan (bộ chọn kỳ toàn cục, biểu đồ kết hợp thu - chi). |
| `screens/dashboard/useDashboardView.js` | 384 | Toàn bộ state, dữ liệu dẫn xuất và hành động của màn Tổng quan. Component trình bày (DashboardMobile/DashboardDesktop/DashboardModals) chỉ việc đọc kết quả. |

## Màn Báo cáo `screens/report/`

| File | Dòng | Nội dung |
|---|---:|---|
| `screens/report/ReportDesktop.jsx` | 429 | Giao diện Báo cáo trên desktop. |
| `screens/report/ReportMobile.jsx` | 157 | Giao diện Báo cáo trên mobile. |
| `screens/report/ReportModals.jsx` | 40 | Các modal của màn Báo cáo: sổ chi tiết, xuất báo cáo, sửa giao dịch. |
| `screens/report/ReportWidgets.jsx` | 139 | Các widget nhỏ dùng trong màn Báo cáo (thanh lọc hoạt động, dòng chi tiết giao dịch, biểu đồ donut). |
| `screens/report/useReportView.js` | 586 | Toàn bộ state, dữ liệu dẫn xuất và hành động của màn Báo cáo. Component trình bày (ReportMobile/ReportDesktop/ReportModals) chỉ việc đọc kết quả. |

## Màn chi tiết Quỹ `screens/fundDetail/`

| File | Dòng | Nội dung |
|---|---:|---|
| `screens/fundDetail/FundDetailDesktop.jsx` | 172 | Giao diện chi tiết Quỹ trên desktop. |
| `screens/fundDetail/FundDetailMobile.jsx` | 185 | Giao diện chi tiết Quỹ trên mobile. |
| `screens/fundDetail/FundDetailModals.jsx` | 149 | Các modal của màn chi tiết Quỹ: sửa quỹ, nạp/rút nhanh, sửa giao dịch nạp/rút (kèm form nạp/rút nhanh). |
| `screens/fundDetail/useFundDetailView.js` | 171 | Toàn bộ state, dữ liệu dẫn xuất và hành động của màn chi tiết Quỹ. Component trình bày (FundDetailMobile/FundDetailDesktop/FundDetailModals) chỉ việc đọc kết quả. |

## Bố cục `layout/`

| File | Dòng | Nội dung |
|---|---:|---|
| `layout/BottomNavMobile.jsx` | 251 | Thanh điều hướng dưới cùng trên mobile. |
| `layout/HeaderDesktop.jsx` | 191 | Thanh header trên desktop (tìm kiếm toàn cục, thêm giao dịch, avatar). |
| `layout/SidebarDesktop.jsx` | 98 | Thanh điều hướng bên trái trên desktop. |

## Form & modal `forms/`

| File | Dòng | Nội dung |
|---|---:|---|
| `forms/AddTransaction.jsx` | 314 | Modal thêm giao dịch (mở toàn cục từ MainApp). |
| `forms/EditAccountModal.jsx` | 62 | Modal tạo/sửa ví. |
| `forms/EditFundForm.jsx` | 205 | Form tạo/sửa quỹ. |
| `forms/EditTransaction.jsx` | 282 | Form sửa giao dịch. |
| `forms/ImageUploader.jsx` | 215 | Chọn, cắt và tải ảnh lên (avatar, ảnh quỹ). |
| `forms/formErrors.jsx` | 22 | Hiện lỗi form ngay dưới ô sai (thay cho toast ở đầu màn hình — trên điện thoại bàn phím che mất và toast tự tắt). - FieldError: dòng đỏ dưới ô, role="alert" nên trình đọc màn hình đọc ngay khi xuất hiện. - focusField: cuộn tới ô sai đầu tiên và đưa con trỏ vào (container cần có id="field-<tên>"). Quy ước dùng: lỗi chỉ hiện SAU lần bấm Lưu đầu tiên (state `submitted`) và được TÍNH LẠI mỗi lần render, nên tự biến mất ngay khi người dùng sửa đúng — không cần mã dọn lỗi riêng. |

## Thành phần dùng chung `components/`

| File | Dòng | Nội dung |
|---|---:|---|
| `components/ErrorBoundary.jsx` | 49 | Error boundary: bắt lỗi JS khi render, hiện màn hình lỗi thân thiện + nút tải lại thay vì màn hình trắng. |
| `components/inputs.jsx` | 126 | Ô nhập dùng chung: MoneyInput (nhập tiền có biểu thức) và CustomSelect. |
| `components/ledger.jsx` | 219 | Dòng/Modal sổ giao dịch và các danh sách chi tiết thu-chi-tài sản (dùng ở Dashboard và Báo cáo). |
| `components/ui.jsx` | 234 | Thành phần giao diện nhỏ dùng chung (emoji tròn, thanh tiến độ, vòng tiến độ, thẻ tóm tắt, tooltip biểu đồ, menu avatar). |

## Logic thuần `lib/` (test bằng Vitest)

| File | Dòng | Nội dung |
|---|---:|---|
| `lib/__fixtures__/report-scenario.js` | 75 | Bộ dữ liệu mẫu DÙNG CHUNG cho test ledger.test.js và reportData.test.js. Chỉ dùng trong test (không import từ code của app nên không vào bản build).  Kỳ báo cáo: 21/08/2026 → 20/09/2026 (kỳ tài chính "2026-09"). "Hôm nay" khi test = 30/09/2026. Quỹ không lãi (interest_rate = 0) để nhẩm số cho dễ.  Sơ đồ giao dịch (account null = lấy từ "Thu nhập được chi"): TRƯỚC kỳ  t0  08/08  nạp quỹ ban đầu   Quỹ khẩn cấp        +3.000.000   (is_initial) t1  15/08  thu nhập Lương    vào ví Techcombank  10.000.000 TRONG kỳ  t2  25/08  thu nhập Lương    (không ví)          12.000.000   -> tính vào Thu nhập được chi t3  26/08  thu nhập Thưởng   vào ví Techcombank   2.000.000   -> thu nhập đặc biệt t4  27/08  chi Ăn uống       (không ví)             150.000   -> trừ Thu nhập được chi t5  28/08  chi Ăn uống       từ ví Tiền mặt          80.000 t6  01/09  nạp quỹ Khẩn cấp  (không ví)             500.000   -> trừ Thu nhập được chi t7  02/09  nạp quỹ Du lịch   từ ví Techcombank      300.000 t8  05/09  rút từ Quỹ khẩn cấp (chi tiêu của quỹ)   200.000 t9  10/09  điều chỉnh ví Vàng                      +100.000 t10 12/09  điều chỉnh ví Tiền mặt                   -20.000 SAU kỳ    t11 25/09  chi Ăn uống       (không ví)             999.999   -> ngoài kỳ |
| `lib/accountStyles.js` | 23 | Loại ví và kiểu hiển thị thẻ ví. |
| `lib/finance.js` | 927 | lib/finance.js — LOGIC TÀI CHÍNH THUẦN (không React, không Supabase, không DOM) Tách ra từ App.jsx để test được bằng Vitest (xem finance.test.js). Gồm: số dư quỹ/ví (kể cả lãi), kỳ chi tiêu (period), tổng hợp thu-chi cho báo cáo. QUY ƯỚC: hàm ở đây chỉ nhận dữ liệu vào và trả kết quả, không gọi mạng, không đụng state. |
| `lib/format.js` | 144 | lib/format.js — ĐỊNH DẠNG & XỬ LÝ CHUỖI THUẦN (không React, không Supabase) Gồm: định dạng tiền (formatMoney*), ô nhập tiền (evalMoneyExpression, formatWithThousands...), tìm kiếm không dấu, chuẩn hoá tên file. Tách ra từ App.jsx để test được bằng Vitest (xem format.test.js). |
| `lib/image.js` | 103 | Xử lý ảnh phía trình duyệt (thu nhỏ, kiểm tra canvas rỗng, cắt theo tỉ lệ) — dùng cho upload ảnh. |
| `lib/ledger.js` | 111 | Tính số dư/nguồn tiền sau từng giao dịch cho sổ giao dịch (Dashboard, Báo cáo). |
| `lib/reportData.js` | 353 | Dựng dữ liệu báo cáo (thuần): tổng hợp thu chi, tài sản, quỹ... theo khoảng thời gian. |
| `lib/validation.js` | 54 | Kiểm tra dữ liệu form (thuần, không React): trả về DANH SÁCH lỗi theo từng ô để giao diện hiện ngay dưới ô sai. Mỗi lỗi: { field, message, inline } - field  : 'amount' | 'category' | 'source' | 'period' (khớp id="field-<tên>" trong form) - inline : true  -> hiện thông báo dưới ô (lỗi thiếu dữ liệu) false -> chỉ CHẶN lưu + đưa con trỏ về ô; form đã có sẵn dòng cảnh báo đỏ riêng cho các trường hợp "vượt số dư / vượt Thu nhập được chi" nên không hiện trùng thêm một dòng nữa. Dùng chung cho AddTransaction và EditTransaction. |

## Thêm tính năng: làm ở đâu?

- Màn hình mới → `screens/TenMan.jsx`, thêm vào `renderScreenContent` trong `MainApp.jsx`; lấy dữ liệu bằng `useAppData()`, giao diện bằng `useShell()`.
- Sửa số liệu/logic của Tổng quan, Báo cáo, chi tiết Quỹ → file `useXxxView` tương ứng; sửa giao diện → file `...Mobile` / `...Desktop`.
- Công thức tiền, ngày, kỳ → `lib/finance.js` (kèm test). Dựng số liệu báo cáo → `lib/reportData.js`. Định dạng chuỗi/tiền → `lib/format.js`.
- Thông báo → `toast()`; hỏi xác nhận → `await confirmDialog(...)` (cả hai trong `feedback.jsx`).
- Phần tử không phải `<button>` nhưng bấm được → `{...clickable(handler)}` (hoặc `keyActivatable` nếu bên trong có nút khác) từ `a11y.js`; nút chỉ có biểu tượng phải có `aria-label`.

