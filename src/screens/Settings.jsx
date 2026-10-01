/* ==============================================================================
   Màn Cài đặt / Hồ sơ.
   ============================================================================== */
import { useEffect, useState } from 'react';
import { useAppData, useShell } from '../context';
import { useEscapeKey } from '../feedback';
import { ArrowLeft, Check, Clock, Eye, EyeOff, KeyRound, LayoutGrid, Loader2, Lock, LogOut, Target, Trash2, Wallet } from '../icons';
import { supabase } from '../supabaseClient';
import { AppearanceSection, CategorySection, ProfileSection } from './SettingsParts';

export function Settings({ user, onProfileUpdated, initialSection, onResetData, resettingData, logs, logActivity, restoreLog }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, theme, toggleTheme } = useShell();
  const { categories, reload, softDelete, spendingPoolByPeriod, saveSpendingPoolForPeriod } = useAppData();
  // Mặc định mở thẻ "Danh mục" (thẻ đầu tiên còn lại trên thanh tab) — thẻ "Hồ sơ" không
  // còn hiện trên thanh tab nữa (chỉ mở được qua menu bấm avatar), nên bỏ mặc định 'profile'.
  const [section, setSection] = useState(initialSection || 'categories');
  // FIX: màn "Hồ sơ tài khoản" (mở từ avatar) và màn "Cài đặt" (mở từ icon Cài đặt ở nav
  // bar) đều dùng chung 1 component Settings + chung screen === 'settings', nên khi đang
  // đứng ở màn này rồi bấm icon/avatar còn lại, component KHÔNG unmount/mount lại — mà
  // useState(initialSection...) chỉ đọc initialSection ở lần render ĐẦU TIÊN, nên "section"
  // nội bộ bị kẹt nguyên giá trị cũ dù prop initialSection đã đổi (đây là lý do bấm icon
  // Cài đặt trong lúc đang ở Hồ sơ không chuyển được sang giao diện tab). Đồng bộ lại bằng
  // effect này mỗi khi initialSection (điều hướng từ bên ngoài) thực sự đổi giá trị.
  useEffect(() => {
    setSection(initialSection || 'categories');
  }, [initialSection]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetError, setResetError] = useState('');
  const [verifyingPwd, setVerifyingPwd] = useState(false);
  useEscapeKey(() => { if (!verifyingPwd) setShowResetModal(false); }, showResetModal);

  function openResetModal() {
    setResetPassword(''); setResetError(''); setShowResetModal(true);
  }

  async function confirmResetWithPassword() {
    if (!resetPassword) { setResetError('Nhập mật khẩu để xác nhận'); return; }
    setVerifyingPwd(true); setResetError('');
    const { error } = await supabase.auth.signInWithPassword({ email: user?.email, password: resetPassword });
    if (error) {
      setResetError('Sai mật khẩu, vui lòng thử lại');
      setVerifyingPwd(false);
      return;
    }
    setVerifyingPwd(false);
    setShowResetModal(false);
    setResetPassword('');
    await onResetData();
  }

  const ResetDataPanel = (
    <div>
      <h3 className="text-blueberry dark:text-white font-bold text-base mb-1.5">Vùng nguy hiểm</h3>
      <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
        Xoá toàn bộ ví, giao dịch, danh mục và mục tiêu bạn đã nhập để bắt đầu lại từ đầu. Tài khoản đăng nhập của bạn vẫn được giữ nguyên. Dữ liệu sẽ được lưu <span className="font-bold">30 ngày</span> trong mục Lịch sử để bạn khôi phục nếu cần, sau đó sẽ bị xoá vĩnh viễn.
      </p>
      <button
        onClick={openResetModal} disabled={resettingData}
        className="flex items-center gap-2 bg-cotton-candy text-white rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-60"
      >
        {resettingData ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        Reset toàn bộ dữ liệu
      </button>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !verifyingPwd && setShowResetModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] p-6">
            <div className="w-11 h-11 rounded-full bg-cotton-candy-light dark:bg-cotton-candy/10 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-cotton-candy" />
            </div>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-1.5">Xoá toàn bộ dữ liệu?</h3>
            <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
              Toàn bộ ví, giao dịch, danh mục và mục tiêu sẽ bị ẩn khỏi ứng dụng. Bạn có 30 ngày để khôi phục lại trong mục Lịch sử, sau đó dữ liệu sẽ bị xoá vĩnh viễn. Nhập mật khẩu đăng nhập để xác nhận.
            </p>
            <div className="relative mb-1">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey pointer-events-none" />
              <input
                type={showResetPwd ? 'text' : 'password'}
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmResetWithPassword()}
                placeholder="Mật khẩu đăng nhập"
                autoFocus
                className="w-full bg-ice-cream dark:bg-[#2a2a44] border border-[rgba(189,189,203,0.3)] dark:border-[rgba(189,189,203,0.1)] rounded-full pl-11 pr-11 py-3 text-sm text-blueberry dark:text-white placeholder:text-steel dark:placeholder:text-light-grey outline-none focus:border-[rgba(241,138,181,0.5)] transition font-semibold"
              />
              <button type="button" onClick={() => setShowResetPwd((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey">
                {showResetPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {resetError && <p className="text-xs text-cotton-candy font-semibold mb-2">{resetError}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowResetModal(false)} disabled={verifyingPwd} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44] disabled:opacity-60">
                Huỷ
              </button>
              <button onClick={confirmResetWithPassword} disabled={verifyingPwd} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white bg-cotton-candy disabled:opacity-60">
                {verifyingPwd ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ACTION_META = {
    reset_data: { icon: Trash2, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    change_password: { icon: KeyRound, color: 'text-lavender bg-lavender/10' },
    delete_goal: { icon: Target, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_category: { icon: LayoutGrid, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_account: { icon: Wallet, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_transaction: { icon: Trash2, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
  };

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  useEscapeKey(() => { if (!restoring) setRestoreTarget(null); }, !!restoreTarget);

  async function handleConfirmRestore() {
    setRestoring(true);
    await restoreLog(restoreTarget);
    setRestoring(false);
    setRestoreTarget(null);
  }

  const SystemHistoryPanel = (
    <div>
      <h3 className="text-blueberry dark:text-white font-bold text-base mb-1.5">Lịch sử hệ thống</h3>
      <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
        Toàn bộ thay đổi liên quan đến hệ thống (đổi mật khẩu, xoá dữ liệu...) được ghi lại tại đây. Một số thao tác có thể khôi phục lại.
      </p>

      {(!logs || logs.length === 0) && (
        <p className="text-sm text-steel dark:text-light-grey italic">Chưa có lịch sử nào.</p>
      )}

      <div className="flex flex-col gap-2.5 scrollbar-hide">
        {logs?.map((log) => {
          const meta = ACTION_META[log.action_type] || { icon: Clock, color: 'text-steel bg-ice-cream dark:bg-[#2a2a44]' };
          const Icon = meta.icon;
          const daysLeft = 30 - Math.floor((Date.now() - new Date(log.created_at).getTime()) / 86400000);
          const canRestore = log.restorable && !log.restored_at && daysLeft > 0;
          return (
            <div key={log.id} className="flex items-center gap-3 bg-ice-cream dark:bg-[#2a2a44] rounded-2xl p-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blueberry dark:text-white truncate">{log.description}</p>
                <p className="text-xs text-steel dark:text-light-grey">
                  {new Date(log.created_at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {log.restored_at && <span className="text-turquoise font-bold"> · Đã khôi phục</span>}
                  {!log.restored_at && log.restorable && (
                    <span className={daysLeft > 0 ? '' : 'text-cotton-candy font-bold'}>
                      {' · '}{daysLeft > 0 ? `Còn ${daysLeft} ngày để khôi phục` : 'Đã hết hạn khôi phục'}
                    </span>
                  )}
                </p>
              </div>
              {canRestore && (
                <button onClick={() => setRestoreTarget(log)} className="shrink-0 text-xs font-bold text-turquoise-light bg-turquoise/10 rounded-full px-3.5 py-2 hover:bg-turquoise/20 transition">
                  Khôi phục
                </button>
              )}
            </div>
          );
        })}
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !restoring && setRestoreTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] p-6">
            <div className="w-11 h-11 rounded-full bg-turquoise/10 flex items-center justify-center mb-4">
              <Clock size={20} className="text-turquoise" />
            </div>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-1.5">Khôi phục thao tác này?</h3>
            <p className="text-sm text-steel dark:text-light-grey mb-5 leading-relaxed">
              "{restoreTarget.description}" sẽ được khôi phục về đúng như trước khi thao tác diễn ra.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRestoreTarget(null)} disabled={restoring} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44] disabled:opacity-60">
                Huỷ
              </button>
              <button onClick={handleConfirmRestore} disabled={restoring} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary disabled:opacity-60">
                {restoring ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            {/* Vào từ avatar (mục "Hồ sơ") -> tiêu đề "Hồ sơ tài khoản", KHÔNG hiện thanh tab
                Danh mục/Hệ thống/Lịch sử/Giao diện. Vào từ icon Cài đặt ở nav bar -> tiêu đề
                "Cài đặt", hiện đủ thanh tab như bình thường. */}
            <h1 className="text-blueberry dark:text-white text-lg font-bold">{section === 'profile' ? 'Hồ sơ tài khoản' : 'Cài đặt'}</h1>
          </div>

          {section !== 'profile' && (
            /* FIX: hàng tab này nằm trong trang cuộn dọc (min-h-[100dvh]) nên trên các WebView
                nhúng (Zalo Mini App...) cử chỉ vuốt ngang hay bị khung cuộn dọc "nuốt mất",
                khiến tab bị che/cắt mà không vuốt ngang được — thêm touchAction: 'pan-x' +
                WebkitOverflowScrolling: 'touch' (đã dùng ở carousel mục tiêu bên Dashboard)
                để trình duyệt biết vuốt ngang thuộc về hàng này, không phải trang. Đồng thời
                bỏ thẻ "Hồ sơ" khỏi thanh tab (giờ chỉ mở qua menu bấm avatar) và đổi tên
                "Dữ liệu" -> "Hệ thống" theo đúng thứ tự yêu cầu: Danh mục, Hệ thống, Lịch sử,
                Giao diện. */
            <div
              className="px-5 mt-4 flex gap-2 overflow-x-auto scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              <button onClick={() => setSection('categories')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold ${section === 'categories' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-blueberry dark:text-white'}`}>Danh mục</button>
              <button onClick={() => setSection('data')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold ${section === 'data' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-blueberry dark:text-white'}`}>Hệ thống</button>
              <button onClick={() => setSection('history')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold ${section === 'history' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-blueberry dark:text-white'}`}>Lịch sử</button>
              <button onClick={() => setSection('appearance')} className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold ${section === 'appearance' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-blueberry dark:text-white'}`}>Giao diện</button>
            </div>
          )}

          <div className="mt-4 px-5 pt-6 pb-6 scrollbar-hide">
            {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} logActivity={logActivity} />}
            {section === 'categories' && <CategorySection categories={categories} reload={reload} softDelete={softDelete} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />}
            {section === 'appearance' && <AppearanceSection theme={theme} toggleTheme={toggleTheme} />}
            {section === 'data' && ResetDataPanel}
            {section === 'history' && SystemHistoryPanel}
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">{section === 'profile' ? 'Hồ sơ tài khoản' : 'Cài đặt'}</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] text-cotton-candy rounded-full px-4 py-2 text-sm font-bold shadow-soft border-0 dark:border dark:border-[rgba(189,189,203,0.1)]"><LogOut size={15} /> Đăng xuất</button>
        </div>

        {section !== 'profile' && (
          <div className="flex gap-2 mb-6">
            <button onClick={() => setSection('categories')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'categories' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Danh mục</button>
            <button onClick={() => setSection('data')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'data' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Hệ thống</button>
            <button onClick={() => setSection('history')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'history' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Lịch sử</button>
            <button onClick={() => setSection('appearance')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'appearance' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Giao diện</button>
          </div>
        )}

 <div className="frost-card rounded-3xl p-6">
          {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} logActivity={logActivity} />}
          {section === 'categories' && <CategorySection categories={categories} reload={reload} softDelete={softDelete} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />}
          {section === 'appearance' && <AppearanceSection theme={theme} toggleTheme={toggleTheme} />}
          {section === 'data' && ResetDataPanel}
          {section === 'history' && SystemHistoryPanel}
        </div>
      </div>
    </>
  );
}
