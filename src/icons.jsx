/* ==============================================================================
   ICONS.JSX — Lớp "cầu nối" đổi bộ icon từ lucide-react sang Solar Icons.
   ==============================================================================
   Vì sao cần file này thay vì sửa trực tiếp từng chỗ <Wallet .../>, <Bell .../>...
   trong App.jsx?
   - App.jsx dùng icon ở RẤT nhiều chỗ (hàng trăm lượt). Nếu đổi tên component
     lucide -> Solar trực tiếp thì phải sửa từng dòng, rất dễ sót/sai.
   - Solar Icons (qua Iconify) dùng currentColor giống lucide, nên các class
     Tailwind kiểu `text-blueberry dark:text-white` vẫn tô màu icon bình thường,
     không cần sửa gì thêm ở nơi sử dụng.
   - Muốn đổi 1 icon cụ thể (vì thấy không đẹp/không đúng) -> chỉ sửa 1 dòng
     tương ứng bên dưới, không đụng vào App.jsx.

   Cách hoạt động:
   - Mỗi icon cũ (Home, Wallet, Bell...) được export lại dưới ĐÚNG tên cũ, để
     trong App.jsx chỉ cần đổi dòng import từ 'lucide-react' sang './icons' là
     toàn bộ icon trong app tự động đổi sang Solar, style "Bold Duotone" (nổi
     khối, 2 tông màu).
   - Nếu 1 icon nào đó không hiện ra đúng (tên icon Solar mình đoán chưa chính
     xác), vào https://icon-sets.iconify.design/solar/ gõ từ khoá liên quan để
     tìm tên icon đúng, rồi sửa chuỗi tương ứng bên dưới (không cần sửa App.jsx).
   ============================================================================== */
import { Icon } from '@iconify/react';

// Đổi 1 chỗ này để đổi "độ nổi khối" MẶC ĐỊNH của icon trong app (áp dụng cho MỌI
// icon KHÔNG có weight riêng ở nơi gọi — xem phần override cho sidebar bên dưới):
//   'linear'       -> outline mảnh, thanh mảnh (mặc định — theo góp ý là đẹp hơn ở
//                      hầu hết chỗ so với bold-duotone)
//   'bold-duotone' -> nổi khối, 2 tông màu
//   'bold'         -> đặc 1 khối, 1 màu (đậm, mạnh)
//   'broken'       -> outline nét đứt, phong cách nhẹ nhàng
const DEFAULT_WEIGHT = 'linear';
// Sidebar menu bên trái (Trang chủ, Quản lý quỹ...) vẫn giữ style nổi khối vì đã
// ưng — set riêng weight này ngay tại nơi gọi <Home weight="bold-duotone" /> (xem
// component Sidebar trong App.jsx), KHÔNG cần sửa gì ở file này.

// factory: tạo 1 component icon Solar, API giống hệt lucide-react
//   <Wallet size={20} className="text-blueberry dark:text-white" />
function solarIcon(baseName, defaultWeight = DEFAULT_WEIGHT) {
  const Comp = ({ size = 20, className = '', weight, style, ...rest }) => (
    <Icon
      icon={`solar:${baseName}-${weight || defaultWeight}`}
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...rest}
    />
  );
  Comp.displayName = `SolarIcon(${baseName})`;
  return Comp;
}

/* ------------------------------------------------------------------------
   Danh sách ánh xạ — theo ĐÚNG danh sách icon App.jsx đang import từ
   lucide-react. Tên bên phải là tên gốc (base) icon bên Solar, PHẦN ĐUÔI
   style (bold-duotone...) được factory solarIcon() tự thêm vào ở trên.

   Vài icon lucide không có nghĩa tương đương 1-1 hoàn toàn bên Solar (vd:
   UserCog, SendHorizontal, PiggyBank...) nên là lựa chọn gần đúng nhất —
   những dòng này có ghi chú "// kiểm tra lại" để bạn xem qua sau khi chạy
   thử, đổi tên nếu thấy chưa ưng.
   ------------------------------------------------------------------------ */
export const Home = solarIcon('home-2');
export const Sparkles = solarIcon('magic-stick-3');
export const Plus = solarIcon('add-circle');
export const BarChart3 = solarIcon('chart-square');
export const SettingsIcon = solarIcon('settings');
export const TrendingUp = solarIcon('graph-new-up');
export const TrendingDown = solarIcon('graph-down-new'); // FIX: 'graph-new-down' không tồn tại trong bộ Solar (khác thứ tự từ so với graph-new-up) nên icon bị mất
export const PiggyBank = solarIcon('wad-of-money'); // kiểm tra lại
export const HeartPulse = solarIcon('heart-pulse'); // kiểm tra lại
export const ArrowLeft = solarIcon('arrow-left');
export const Download = solarIcon('download-minimalistic');
export const X = solarIcon('close-circle');
export const Check = solarIcon('check-circle');
export const Loader2 = solarIcon('refresh'); // vẫn dùng chung với class animate-spin sẵn có
export const Target = solarIcon('target');
export const Wallet = solarIcon('wallet-money');
export const Trash2 = solarIcon('trash-bin-trash');
export const Pencil = solarIcon('pen-2');
export const LogOut = solarIcon('logout-2');
export const Mail = solarIcon('letter');
export const Lock = solarIcon('lock-keyhole-minimalistic');
export const Search = solarIcon('magnifer');
export const Bell = solarIcon('bell');
export const Sun = solarIcon('sun-2');
export const Moon = solarIcon('moon');
export const User = solarIcon('user-circle');
export const Filter = solarIcon('sort-horizontal'); // kiểm tra lại
export const MoreHorizontal = solarIcon('menu-dots');
export const Eye = solarIcon('eye');
export const EyeOff = solarIcon('eye-closed');
export const LayoutGrid = solarIcon('widget-4');
export const List = solarIcon('checklist-minimalistic');
export const ArrowUpDown = solarIcon('transfer-vertical'); // kiểm tra lại
export const Calendar = solarIcon('calendar');
export const Clock = solarIcon('clock-circle');
export const Star = solarIcon('star');
export const ChevronDown = solarIcon('alt-arrow-down');
export const ChevronRight = solarIcon('alt-arrow-right');
export const ChevronLeft = solarIcon('alt-arrow-left');
export const Camera = solarIcon('camera');
export const KeyRound = solarIcon('key-minimalistic-square'); // kiểm tra lại
export const UserCog = solarIcon('user-id'); // kiểm tra lại
export const SlidersHorizontal = solarIcon('tuning-2');
export const AlertTriangle = solarIcon('danger-triangle');
export const Info = solarIcon('info-circle');
export const PieChart = solarIcon('pie-chart-2');
export const LineChart = solarIcon('graph-new');
export const BarChart = solarIcon('chart-2');
export const CircleDollarSign = solarIcon('dollar-minimalistic');
export const FileText = solarIcon('document-text');
export const SendHorizontal = solarIcon('plain'); // kiểm tra lại — icon "gửi/máy bay giấy"
export const BadgeCheck = solarIcon('verified-check');
export const CreditCard = solarIcon('card');
export const Wifi = solarIcon('wi-fi-router'); // kiểm tra lại
