/* ==============================================================================
   Thành phần giao diện nhỏ dùng chung (emoji tròn, thanh tiến độ, vòng tiến độ, thẻ tóm tắt, tooltip biểu đồ, menu avatar).
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../feedback';
import { BadgeCheck, ChevronDown, LogOut } from '../icons';
import { supabase } from '../supabaseClient';

export function ProgressBar({ pct, colorClass = 'bg-turquoise', title }) {
  return <div title={title} className={`w-full h-1.5 bg-light-grey/30 dark:bg-light-grey/20 rounded-full overflow-hidden ${title ? 'cursor-help' : ''}`}><div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>;
}

export function EmojiCircle({ emoji, size = 36, active = false, activeColor = '#0DBACC', bg = '#F7F7F8' }) {
  return <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: active ? activeColor : bg, fontSize: size * 0.5 }}>{emoji || '❔'}</div>;
}

export function SummaryCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div className="frost-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">{label}</p>
      <p className="text-blueberry dark:text-white text-xl font-bold">{value}</p>
      {sub && <p className="text-steel dark:text-light-grey text-xs mt-1">{sub}</p>}
    </div>
  );
}

// Tooltip dùng chung cho các chart (cột / đường / donut) — hiện tên, số liệu và %
// khi rê chuột vào từng cột/điểm/lát cắt. Vị trí được tính theo toạ độ chuột tương
// đối so với khung chart bao ngoài (container truyền vào phải có position: relative).
export function ChartTooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-30 px-2.5 py-1.5 rounded-lg bg-blueberry dark:bg-[#1e1e32] text-white text-[11px] shadow-card whitespace-nowrap"
      style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 10px))' }}
    >
      <p className="font-bold">{tip.label}</p>
      <p className="text-white/80">{tip.value}{tip.pct != null ? ` · ${tip.pct}%` : ''}</p>
    </div>
  );
}

export function MiniRing({ pct, color, label }) {
  const r = 15, c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 36 36" className="w-8 h-8 flex-shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E3D6FF" className="dark:stroke-light-grey/20" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="leading-tight">
        <p className="text-blueberry dark:text-white text-xs font-bold">{Math.round(pct)}%</p>
        <p className="text-steel dark:text-light-grey text-[10px]">{label}</p>
      </div>
    </div>
  );
}

// Menu dropdown avatar dùng chung (desktop header + mobile dashboard),
// theo cấu trúc "trigger + card menu (nhóm mục + separator + đăng xuất)"
// giống DropdownMenuAvatar (shadcn) mà người dùng cung cấp — viết lại bằng
// React thuần vì project này không cài shadcn/ui (@/components/ui/...).
export function AvatarMenu({ avatarUrl, displayName, openSettings, variant = 'desktop' }) {
  const [open, setOpen] = useState(false);
  // Esc / nút Back Android đóng menu; nếu menu mở trong modal thì chỉ đóng lớp trên cùng
  useEscapeKey(() => setOpen(false), open);

  // Bấm avatar giờ chỉ hiện đúng 2 việc: xem/sửa "Hồ sơ" (tên, ảnh đại diện, mật khẩu...)
  // và Đăng xuất — các mục Danh mục/Giao diện/Hệ thống/Lịch sử đã chuyển sang icon Cài đặt
  // riêng trên thanh nav dưới (xem BottomNavMobile), tránh trùng lặp 2 đường vào Cài đặt.
  const items = [
    { key: 'profile', label: 'Hồ sơ', icon: BadgeCheck },
  ];

  function go(section) {
    setOpen(false);
    openSettings && openSettings(section);
  }

  async function handleLogout() {
    setOpen(false);
    await supabase.auth.signOut();
  }

  const initial = (displayName || 'B')[0].toUpperCase();
  const isDesktop = variant === 'desktop';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={isDesktop
          ? 'flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 transition'
          : 'w-11 h-11 rounded-full frost-inset flex items-center justify-center text-blueberry dark:text-white overflow-hidden'}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={isDesktop ? 'w-9 h-9 rounded-full object-cover flex-shrink-0' : 'w-full h-full object-cover'} />
        ) : isDesktop ? (
          <div className="w-9 h-9 rounded-full bg-gradient-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initial}</div>
        ) : (
          <span className="font-bold">{initial}</span>
        )}
        {isDesktop && (
          <>
            <span className="text-sm font-bold text-blueberry dark:text-white">{displayName || 'Bạn'}</span>
            <ChevronDown size={14} className="text-steel dark:text-light-grey" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute' }} className={`${isDesktop ? 'top-12' : 'top-14'} right-0 bg-white/78 dark:bg-[#1e1e32]/70 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-card border border-white/60 dark:border-[rgba(255,255,255,0.10)] py-1.5 w-56 z-40 overflow-hidden`}>
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent" />
            {items.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => go(key)}
                className="relative w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blueberry dark:text-white hover:bg-white/40 dark:hover:bg-white/10"
              >
                <Icon size={15} className="text-steel dark:text-light-grey" /> {label}
              </button>
            ))}
            <div className="relative h-px bg-light-grey/20 dark:bg-light-grey/10 my-1.5" />
            <button
              onClick={handleLogout}
              className="relative w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-cotton-candy hover:bg-cotton-candy-light/60 dark:hover:bg-white/10"
            >
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function HoverDetailCard({ className, children, detail, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [hasHover, setHasHover] = useState(true);
  const ref = useRef(null);
  // Hẹn giờ đóng popup (debounce) — xem giải thích ở closeSoon() bên dưới.
  const closeTimer = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setHasHover(window.matchMedia('(hover: hover)').matches);
    }
  }, []);

  // Dọn timer khi unmount để tránh setState trên component đã gỡ bỏ.
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  useEffect(() => {
    if (!open || hasHover) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open, hasHover]);

  // Mở ngay + huỷ mọi lịch đóng đang chờ (phòng trường hợp chuột vừa rời rồi quay lại kịp).
  function openNow() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  }
  // Đóng có độ trễ nhỏ thay vì đóng ngay lập tức. Popup nằm cách thẻ trigger 8px
  // (top-[calc(100%+8px)]) — khi rê chuột từ thẻ xuống popup (để xem/scroll danh sách),
  // con trỏ phải băng qua khoảng trống 8px đó, nơi không phần tử nào trong card đang
  // "hứng" chuột trong khoảnh khắc đó, khiến mouseleave bắn ra và đóng popup ngay lập
  // tức dù người dùng chỉ đang di chuyển tiếp xuống. Trễ ~180ms rồi mới đóng, và huỷ
  // lịch đóng nếu chuột kịp vào lại (thẻ hoặc popup) trong lúc đó, giúp việc rê vào rồi
  // scroll bên trong popup mượt hơn hẳn, không còn bị "nhảy mất" phải rê lại nhiều lần.
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setOpen(false); closeTimer.current = null; }, 180);
  }

  return (
    <div
      ref={ref}
      // .frost-card dùng `isolation: isolate` (để giữ lớp gradient trang trí ::before
      // không lộ ra ngoài) — điều này vô tình "nhốt" popup bên dưới vào riêng 1 stacking
      // context của card. Khi popup đang mở, ta nâng hẳn z-index của CHÍNH card cha lên
      // trên các card anh em (và các khối phía dưới) để popup thoát ra hiển thị đúng.
      className={`relative ${open ? 'z-[5]' : 'z-0'} ${className || ''}`}
      onMouseEnter={() => { if (hasHover) openNow(); }}
      onMouseLeave={() => { if (hasHover) closeSoon(); }}
      onClick={() => { if (!hasHover) setOpen((v) => !v); }}
    >
      {children}
      <div
        onClick={(e) => e.stopPropagation()}
        // Gắn thêm mouseenter/mouseleave ngay trên chính popup: dù popup vốn đã là con
        // của div cha ở trên (nên về lý thuyết không cần thêm), việc khai báo tường minh
        // ở đây giúp huỷ lịch đóng ngay khi chuột chạm vào popup, không phải chờ tới khi
        // rời khỏi khoảng trống 8px mới được tính là "đã vào lại".
        onMouseEnter={() => { if (hasHover) openNow(); }}
        onMouseLeave={() => { if (hasHover) closeSoon(); }}
        style={{ position: 'absolute' }}
        // LƯU Ý: trước đây className có cả "absolute" lẫn "relative" (đi kèm "isolate").
        // Tailwind biên dịch .relative SAU .absolute trong stylesheet, nên khi 1 phần tử có
        // cả 2 class, "position: relative" của .relative thắng (cùng độ đặc hiệu, đứng sau
        // thắng) — popup này bị rớt khỏi position:absolute, nằm lại trong flow bình thường
        // và CHIẾM CHỖ THẬT trong card dù đang ẩn (opacity-0), gây ra khoảng trắng to bên
        // dưới mỗi thẻ tổng kết. Bỏ "relative" (không cần cho isolate hoạt động) + ép cứng
        // bằng inline style để không bao giờ lặp lại lỗi này dù thứ tự CSS có đổi.
        className={`${align === 'right' ? 'right-0' : 'left-0'} top-[calc(100%+8px)] z-40 w-72 max-w-[85vw] bg-white/85 dark:bg-[#1e1e32]/75 backdrop-blur-xl backdrop-saturate-150 border-0 dark:border dark:border-[rgba(189,189,203,0.1)] rounded-2xl shadow-card p-4 max-h-72 overflow-y-auto overflow-x-hidden scrollbar-hide transition-all duration-150 origin-top isolate ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
      >
        {/* Mũi tên nhỏ (caret) nối popup với vị trí đã bấm/rê, để thẻ trông "gắn liền"
            với trigger thay vì như đang trôi lệch qua 1 bên không rõ gốc từ đâu. */}
        <div className={`pointer-events-none absolute -top-1.5 ${align === 'right' ? 'right-6' : 'left-6'} w-3 h-3 rotate-45 bg-white/85 dark:bg-[#1e1e32] border-0 dark:border dark:border-[rgba(189,189,203,0.1)]`} />
        <div className="pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl -z-10" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl -z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent -z-10" />
        {detail}
      </div>
    </div>
  );
}
