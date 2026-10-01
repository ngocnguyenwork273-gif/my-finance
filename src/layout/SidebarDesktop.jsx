/* ==============================================================================
   Thanh điều hướng bên trái trên desktop.
   ============================================================================== */
import { useShell } from '../context';
import { BarChart3, Home, Moon, PiggyBank, SettingsIcon, Sparkles, Sun, Wallet } from '../icons';

const NAV_ITEMS = [
  { key: 'dashboard', icon: Home, label: 'Trang chủ' },
  { key: 'funds', icon: PiggyBank, label: 'Quản lý quỹ' },
  { key: 'accounts', icon: Wallet, label: 'Quản lý ví' },
  { key: 'goals', icon: Sparkles, label: 'Mục tiêu' },
  { key: 'report', icon: BarChart3, label: 'Báo cáo' },
  { key: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
];

export function SidebarDesktop({ screen, appLogoUrl, settingsSection }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, sidebarCollapsed, toggleSidebar, theme, toggleTheme, openSettings } = useShell();
  const isDark = theme === 'dark';
  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 sticky top-0 self-start h-[100dvh] ${sidebarCollapsed ? 'w-20' : 'w-64'} py-6 z-20 overflow-y-auto overflow-x-hidden scrollbar-hide transition-[width] duration-200 relative`}
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(29,30,56,0.70) 0%, rgba(17,18,37,0.78) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 100%)',
        backdropFilter: 'blur(26px) saturate(180%)',
        WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        borderRight: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.55)',
        boxShadow: isDark
          ? 'inset -1px 0 0 rgba(255,255,255,0.05), 8px 0 32px -18px rgba(0,0,0,0.55)'
          : 'inset -1px 0 0 rgba(255,255,255,0.5), 8px 0 32px -18px rgba(48,49,80,0.16)',
      }}
    >
      {/* ambient glass glow blobs — decorative only */}
      <div className={`pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl ${isDark ? 'bg-turquoise/25' : 'bg-turquoise-light/60'}`} />
      <div className={`pointer-events-none absolute bottom-24 -right-14 w-56 h-56 rounded-full blur-3xl ${isDark ? 'bg-lavender/25' : 'bg-lavender-light/60'}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent to-transparent ${isDark ? 'via-white/10' : 'via-white/70'}`} />

      <div className={`relative flex items-center mb-8 overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-0' : 'gap-0.5 px-1'}`}>
        <button onClick={toggleSidebar} title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'} className={`w-10 h-10 flex items-center justify-center flex-shrink-0 hover:opacity-90 transition ${appLogoUrl ? '' : 'rounded-xl bg-gradient-primary shadow-md shadow-turquoise/30 overflow-hidden'}`}>
          {appLogoUrl ? <img src={appLogoUrl} alt="PandaFi" className="w-full h-full object-contain" /> : <Wallet size={17} className="text-white" />}
        </button>
        <span className={`font-extrabold text-blueberry dark:text-white text-lg whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'}`}>PandaFi</span>
      </div>

      <div className="relative flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = key === 'settings' ? (screen === key && settingsSection !== 'profile') : screen === key;
          // Mục "Cài đặt" ở sidebar PHẢI luôn mở màn có thanh tab (Danh mục/Hệ thống/Lịch
          // sử/Giao diện) — không dùng setScreen('settings') thẳng, vì nếu lần trước người
          // dùng đang ở "Hồ sơ tài khoản" (mở từ avatar), settingsSection vẫn còn là
          // 'profile' và Settings sẽ mở lại đúng màn Hồ sơ thay vì màn tab. Gọi
          // openSettings('categories') để luôn ép về thẻ "Danh mục" mỗi khi bấm từ đây,
          // tách bạch hẳn với lối vào từ avatar.
          const handleClick = key === 'settings' && openSettings
            ? () => openSettings('categories')
            : () => setScreen(key);
          return (
            <button
              key={key}
              onClick={handleClick}
              title={sidebarCollapsed ? label : undefined}
              className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} ${active ? 'text-turquoise' : 'text-steel dark:text-light-grey hover:bg-white/40 dark:hover:bg-white/[0.06]'}`}
              style={active ? {
                background: isDark ? 'rgba(13,186,204,0.14)' : 'rgba(13,186,204,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: isDark ? '1px solid rgba(13,186,204,0.25)' : '1px solid rgba(13,186,204,0.18)',
                boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
              } : undefined}
            >
              <Icon size={17} weight="bold-duotone" className="flex-shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className={`relative mt-auto flex flex-col gap-3 ${sidebarCollapsed ? 'items-center' : ''}`}>
        {sidebarCollapsed ? (
          <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 dark:bg-white/[0.06] backdrop-blur text-steel dark:text-light-grey border border-white/60 dark:border-white/10">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-white/50 dark:bg-white/[0.06] backdrop-blur rounded-full p-1 self-start border border-white/60 dark:border-white/10">
            <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'light' ? 'bg-white dark:bg-night-sky shadow text-blueberry dark:text-white' : 'text-steel dark:text-light-grey'}`}>
              <Sun size={15} />
            </button>
            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'dark' ? 'bg-blueberry shadow text-white' : 'text-steel dark:text-light-grey'}`}>
              <Moon size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
