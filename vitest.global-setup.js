// Ép múi giờ Việt Nam cho MỌI test: logic tài chính dùng giờ địa phương (getDay, setHours...),
// nên kết quả phụ thuộc múi giờ máy chạy test. Đặt cố định để test giống nhau ở mọi máy / CI.
export default function setup() {
  process.env.TZ = 'Asia/Ho_Chi_Minh';
}
