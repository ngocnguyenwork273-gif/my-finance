/* ==============================================================================
   Thanh điều hướng dưới cùng trên mobile.
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useShell } from '../context';
import { BarChart3, Home, LayoutGrid, PiggyBank, Plus, SettingsIcon, Target, TrendingDown, TrendingUp, Wallet } from '../icons';

export function BottomNavMobile({ screen, onAddClick, settingsSection }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, theme, openSettings } = useShell();
  const isDark = theme === 'dark';
  // "Quản lý" (funds / accounts / goals) floating glass sub-menu
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMounted, setManageMounted] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const navWrapRef = useRef(null);

  const isManageActive = screen === 'funds' || screen === 'accounts' || screen === 'goals';

  // Mount for enter animation, keep mounted briefly for exit animation (transform/opacity only — no layout shift)
  useEffect(() => {
    let t;
    if (manageOpen) {
      setManageMounted(true);
    } else if (manageMounted) {
      t = setTimeout(() => setManageMounted(false), 220);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageOpen]);

  // Click/tap outside the whole nav complex closes the menu
  useEffect(() => {
    if (!manageOpen) return;
    function handleOutside(e) {
      if (navWrapRef.current && !navWrapRef.current.contains(e.target)) {
        setManageOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [manageOpen]);

  function go(nextScreen) {
    setManageOpen(false);
    setQuickMenuOpen(false);
    setScreen(nextScreen);
  }

  function handleAdd() {
    setManageOpen(false);
    setQuickMenuOpen((v) => !v);
  }

  // Bấm nút "Quản lý" phải tự đóng menu Quick Action (nếu đang mở), tránh 2 menu đè lên nhau
  function handleManageToggle() {
    setQuickMenuOpen(false);
    setManageOpen((v) => !v);
  }

  const manageItems = [
    { key: 'funds', label: 'Quản lý quỹ', sub: 'Theo dõi các quỹ', icon: PiggyBank },
    { key: 'accounts', label: 'Quản lý ví', sub: 'Theo dõi tài khoản / ví', icon: Wallet },
    { key: 'goals', label: 'Quản lý mục tiêu', sub: 'Theo dõi tiến độ mục tiêu', icon: Target },
  ];

  const NavIcon = ({ icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex items-center justify-center w-11 h-11 active:scale-90 transition-transform duration-150"
    >
      {active && (
        <span
          className="absolute top-0.5 w-1 h-1 rounded-full"
          style={{ background: '#0DBACC', boxShadow: '0 0 8px 1px rgba(13,186,204,0.8)' }}
        />
      )}
      <Icon
        size={20}
        weight="bold-duotone"
        style={{ color: active ? '#0DBACC' : isDark ? 'rgba(255,255,255,0.72)' : 'rgba(48,49,80,0.55)' }}
      />
    </button>
  );

  return (
    <>
      {/* Floating Curved Liquid Glass Bottom Navigation */}
      <div
        ref={navWrapRef}
        className="fixed left-1/2 z-20 md:hidden"
        style={{
          transform: 'translateX(-50%)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          width: 'calc(100% - 28px)',
          maxWidth: '430px',
        }}
      >
        <div className="relative">

          {/* Floating "Quản lý" glass popup menu */}
          {manageMounted && (
            <div
              className="absolute left-1 bottom-[70px] w-[240px] max-w-[80%] rounded-[22px] overflow-hidden transition-all ease-out"
              style={{
                transitionDuration: '220ms',
                transformOrigin: 'bottom left',
                opacity: manageOpen ? 1 : 0,
                transform: manageOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
                pointerEvents: manageOpen ? 'auto' : 'none',
                background: isDark ? 'rgba(25,27,48,0.72)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(48,49,80,0.08)',
                boxShadow: isDark
                  ? '0 20px 50px rgba(0,0,0,0.35), 0 0 30px -8px rgba(13,186,204,0.20), inset 0 1px 0 rgba(255,255,255,0.16)'
                  : '0 20px 50px rgba(48,49,80,0.18), 0 0 30px -8px rgba(13,186,204,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              {/* subtle color reflections, purely decorative */}
              <div className="pointer-events-none absolute -top-10 -left-6 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-6 w-24 h-24 rounded-full bg-lavender/25 blur-2xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative px-3.5 pt-3.5 pb-2.5">
                <p className="text-[11px] font-extrabold tracking-wide mb-2 px-1" style={{ color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(48,49,80,0.85)' }}>
                  Quản lý tài chính
                </p>
                <div className="flex flex-col gap-0.5">
                  {manageItems.map(({ key, label, sub, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => go(key)}
                      className={`flex items-center gap-2.5 px-1.5 py-2 rounded-2xl text-left active:scale-[0.98] transition ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(13,186,204,0.25), rgba(159,127,224,0.25))', border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(48,49,80,0.10)' }}
                      >
                        <Icon size={16} style={{ color: screen === key ? '#0DBACC' : '#B88CFF' }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold leading-tight" style={{ color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(48,49,80,0.90)' }}>{label}</span>
                        <span className="block text-[11px] leading-tight truncate" style={{ color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(48,49,80,0.55)' }}>{sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick action menu (from + button) */}
          {quickMenuOpen && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-[70px] w-[220px] rounded-[22px] overflow-hidden transition-all ease-out"
              style={{
                background: isDark ? 'rgba(25,27,48,0.80)' : 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(48,49,80,0.08)',
                boxShadow: isDark
                  ? '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.16)'
                  : '0 20px 50px rgba(48,49,80,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
                padding: '10px 0',
              }}
            >
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('income'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <TrendingUp size={18} className="text-turquoise" /> Thu nhập
              </button>
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('allocation'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <PiggyBank size={18} className="text-baby-blue" /> Nạp quỹ
              </button>
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('expense'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <TrendingDown size={18} className="text-cotton-candy" /> Chi tiêu
              </button>
            </div>
          )}

          {/* Raised center "+" button — absolutely positioned, never causes layout shift */}
          <button
            onClick={handleAdd}
            aria-label="Thêm giao dịch"
            className="absolute left-1/2 z-10 flex items-center justify-center rounded-full active:scale-95 transition-transform duration-150"
            style={{
              top: '-18px',
              transform: 'translateX(-50%)',
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #0DBACC 0%, #3BC9E8 55%, #B88CFF 100%)',
              boxShadow: '0 8px 18px -4px rgba(13,186,204,0.55), 0 0 0 5px rgba(13,186,204,0.10), 0 3px 8px rgba(0,0,0,0.30)',
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)', mixBlendMode: 'overlay' }}
            />
            <Plus size={20} strokeWidth={2.5} className="text-white relative z-10" />
          </button>

          {/* Curved liquid-glass bar */}
          <div
            className="relative rounded-[24px] h-[58px] flex items-center justify-between px-3 overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(29,30,56,0.72) 0%, rgba(17,18,37,0.78) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.68) 100%)',
              backdropFilter: 'blur(26px) saturate(180%)',
              WebkitBackdropFilter: 'blur(26px) saturate(180%)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.5)',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -14px 24px -18px rgba(159,127,224,0.18), 0 18px 40px -12px rgba(0,0,0,0.55), 0 0 36px -14px rgba(13,186,204,0.22)'
                : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 14px 32px -12px rgba(48,49,80,0.22), 0 6px 18px -8px rgba(48,49,80,0.12)',
            }}
          >
            {/* top highlight line + soft inner glow blobs — decorative only */}
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDark ? 'via-white/45' : 'via-white/80'}`} />
            <div className={`pointer-events-none absolute -top-6 left-8 w-24 h-16 rounded-full blur-2xl ${isDark ? 'bg-white/10' : 'bg-turquoise/15'}`} />
            <div className="pointer-events-none absolute -bottom-6 right-10 w-20 h-16 rounded-full bg-lavender/15 blur-2xl" />

            <div className="relative z-10 flex items-center justify-between w-full">
              <NavIcon icon={Home} label="Trang chủ" active={screen === 'dashboard'} onClick={() => go('dashboard')} />
              <NavIcon icon={LayoutGrid} label="Quản lý" active={isManageActive || manageOpen} onClick={handleManageToggle} />

              {/* spacer reserving space under the raised + button */}
              <span className="w-11 flex-shrink-0" aria-hidden="true" />

              <NavIcon icon={BarChart3} label="Báo cáo" active={screen === 'report'} onClick={() => go('report')} />
              {/* Icon person cũ ("Sắp có", chưa làm gì) đổi thành icon Cài đặt — mở thẳng màn
                  Settings với các thẻ Danh mục/Hệ thống/Lịch sử/Giao diện. Chỉ sáng (active)
                  khi đang ở đúng màn tab này — KHÔNG sáng khi đang ở "Hồ sơ tài khoản" (mở
                  từ avatar), để 2 lối vào Cài đặt cảm giác tách biệt hẳn như yêu cầu. */}
              <NavIcon
                icon={SettingsIcon}
                label="Cài đặt"
                active={screen === 'settings' && settingsSection !== 'profile'}
                onClick={() => { setManageOpen(false); setQuickMenuOpen(false); openSettings && openSettings('categories'); }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
