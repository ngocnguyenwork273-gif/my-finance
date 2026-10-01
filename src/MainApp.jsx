/* ==============================================================================
   Khung ứng dụng sau đăng nhập: tải dữ liệu, điều hướng, cung cấp Context, bố cục.
   ============================================================================== */
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import appLogoAsset from './assets/app-logo.svg';
import { DataContext, ShellContext } from './context';
import { closeTopModal, toast } from './feedback';
import { AddTransaction } from './forms/AddTransaction';
import { AlertTriangle } from './icons';
import { BottomNavMobile } from './layout/BottomNavMobile';
import { HeaderDesktop } from './layout/HeaderDesktop';
import { SidebarDesktop } from './layout/SidebarDesktop';
import { fundBalanceWithProfit } from './lib/finance';
import { AccountDetail } from './screens/AccountDetail';
import { Accounts } from './screens/Accounts';
import { Dashboard } from './screens/Dashboard';
import { FundDetail } from './screens/FundDetail';
import { Funds } from './screens/Funds';
import { Goals } from './screens/Goals';
import { Report } from './screens/Report';
import { Settings } from './screens/Settings';
import { supabase } from './supabaseClient';

// FIX: nhớ vị trí màn hình hiện tại + các id liên quan (quỹ/ví đang xem, tab cài đặt)
// vào localStorage để khi load lại trang (F5) không bị nhảy về Trang chủ.
function loadNavState() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('navState') || '{}'); } catch { return {}; }
}

function saveNavState(patch) {
  if (typeof window === 'undefined') return;
  const current = loadNavState();
  localStorage.setItem('navState', JSON.stringify({ ...current, ...patch }));
}

export function MainApp({ user, theme, toggleTheme }) {
  const initialNav = loadNavState();
  const [screen, setScreenRaw] = useState(() => initialNav.screen || 'dashboard');
  function setScreen(next) { setScreenRaw(next); saveNavState({ screen: next }); }
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  // spendingPoolByPeriod: { [periodKey]: amount } — "Số tiền được phép chi" người dùng tự cài đặt cho từng kỳ.
  // Nếu 1 kỳ chưa có trong map này thì calculatePeriodFinancials sẽ tự lấy mặc định = incomeForSpendingPool.
  const [spendingPoolByPeriod, setSpendingPoolByPeriod] = useState({});

  async function loadSpendingPoolSettings() {
    const { data, error } = await supabase.from('period_spending_pool').select('period_key, amount');
    if (error) { setSpendingPoolByPeriod({}); return; } // bảng có thể chưa được tạo trong Supabase -> fallback an toàn
    const map = {};
    (data || []).forEach((row) => { map[row.period_key] = row.amount; });
    setSpendingPoolByPeriod(map);
  }

  // Lưu/cập nhật Chi pool cho 1 kỳ cụ thể (upsert theo period_key)
  async function saveSpendingPoolForPeriod(periodKey, amount) {
    const { error } = await supabase
      .from('period_spending_pool')
      .upsert({ period_key: periodKey, amount: Number(amount) }, { onConflict: 'user_id,period_key' });
    if (error) { toast('Lỗi lưu Thu nhập được chi: ' + error.message); return false; }
    setSpendingPoolByPeriod((prev) => ({ ...prev, [periodKey]: Number(amount) }));
    return true;
  }
  const [loading, setLoading] = useState(true);
  // Riêng biến này để phân biệt "đang tải LẦN ĐẦU" (chưa có gì để hiện, nên chặn cả trang
  // chờ) với "đang tải LẠI" (sau khi thêm/sửa/xoá gì đó — loadAll() set loading=true mỗi
  // lần gọi) — lúc tải lại thì dữ liệu cũ vẫn còn đó, không cần che hết màn hình đi.
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [currentUser, setCurrentUser] = useState(user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === '1'));
  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v;
      if (typeof window !== 'undefined') localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  }

  const displayName = currentUser?.user_metadata?.first_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0];
  const avatarUrl = currentUser?.user_metadata?.avatar_url;
  // Logo lấy thẳng từ file trong code (src/assets/app-logo.png), giống nhau cho mọi tài khoản.
  const appLogoUrl = appLogoAsset;
  const [settingsSection, setSettingsSection] = useState(() => initialNav.settingsSection || 'profile');
  function goToSettings(section) {
    const s = section || 'categories';
    setSettingsSection(s); saveNavState({ settingsSection: s });
    setScreen('settings');
  }

  async function refreshUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) { console.error('refreshUser failed:', error); return; }
    setCurrentUser(data.user);
  }

  const [logs, setLogs] = useState([]);
  async function loadLogs() {
    // Chỉ lấy 100 log gần nhất thay vì toàn bộ lịch sử — bảng system_logs sẽ càng ngày càng phình to
    const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs(data || []);
  }

  async function logActivity(action_type, description, payload = null, restorable = false) {
    const { error } = await supabase.from('system_logs').insert({ action_type, description, payload, restorable });
    if (error) console.error('logActivity failed:', error); // log lỗi không được chặn thao tác chính
    loadLogs();
  }

  // Lỗi tải dữ liệu (rớt mạng, hết hạn token...) — hiện banner "Thử lại" thay vì im lặng.
  const [loadError, setLoadError] = useState(null);

  async function loadAll() {
    setLoading(true); setLoadingGoals(true);
    const [accRes, catRes, txRes, goalRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).is('deleted_at', null),
      supabase.from('categories').select('*').is('deleted_at', null),
      // Chỉ lấy các cột thực sự đang dùng trong app thay vì '*' (giảm dung lượng response).
      // Lưu ý: KHÔNG thêm .limit() ở đây — fundBalanceWithProfit() cần TOÀN BỘ lịch sử
      // giao dịch của từng quỹ để tính lãi kép đúng, giới hạn số dòng sẽ làm sai số dư quỹ.
      supabase.from('transactions').select('id, account_id, category_id, type, amount, date, created_at, note, seq').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    ]);
    // QUAN TRỌNG: trước đây chỉ lấy `data` và bỏ qua `error` -> khi rớt mạng/hết hạn token, cả 4
    // mảng thành rỗng và app trông như "mất sạch dữ liệu". Giờ nếu BẤT KỲ query nào lỗi thì GIỮ
    // NGUYÊN dữ liệu cũ đang hiển thị (không ghi đè bằng mảng rỗng) và báo lỗi cho người dùng.
    const firstError = accRes.error || catRes.error || txRes.error || goalRes.error;
    if (firstError) {
      console.error('loadAll failed:', firstError);
      setLoadError(firstError.message || 'Không tải được dữ liệu');
      setLoading(false); setLoadingGoals(false);
      return false;
    }
    setLoadError(null);
    const accData = accRes.data, catData = catRes.data, txData = txRes.data, goalData = goalRes.data;
    // Mục tiêu có liên kết quỹ (fund_id) thì "Số tiền hiện có" luôn lấy trực tiếp từ số dư quỹ đó,
    // không dùng giá trị nhập tay đã lưu trước đó.
    const syncedGoals = (goalData || []).map((g) => {
      if (!g.fund_id) return g;
      const fund = (catData || []).find((c) => c.id === g.fund_id);
      if (!fund) return g;
      return { ...g, current_amount: fundBalanceWithProfit(fund, txData || []) };
    });
    setAccounts(accData || []); setCategories(catData || []); setTransactions(txData || []); setGoals(syncedGoals);
    setLoading(false); setLoadingGoals(false); setInitialLoadDone(true);
    loadLogs();
    loadSpendingPoolSettings();
    return true;
  }

  useEffect(() => { loadAll(); }, []);

  // Trước đây có 1 effect TỰ ĐỘNG tính & nạp "Tích lũy trước chi" mỗi khi transactions/categories/
  // spendingPoolByPeriod đổi. Theo yêu cầu, tính năng này đã CHUYỂN sang chế độ THỦ CÔNG: công
  // thức (computeAccumulationBeforeSpendTarget) giờ chỉ dùng để GỢI Ý số tiền trong 2 form nạp quỹ
  // (AddTransactionModal khi chọn "Tích lũy trước chi", và modal "Nạp quỹ" ở FundDetail) — người
  // dùng tự bấm Nạp quỹ để lưu, không còn giao dịch nào được tự tạo/sửa/xoá ngầm nữa.

  const [resettingData, setResettingData] = useState(false);
  async function resetAllData() {
    setResettingData(true);
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();
    // Thứ tự: dữ liệu phụ thuộc trước (giao dịch, mục tiêu), rồi danh mục, ví.
    const tables = ['transactions', 'goals', 'categories', 'accounts'];
    const done = []; // các bảng đã xoá thành công — để hoàn tác nếu 1 bước giữa chừng thất bại
    try {
      const desc = `Reset toàn bộ dữ liệu (${accounts.length} ví, ${categories.length} danh mục, ${transactions.length} giao dịch, ${goals.length} mục tiêu)`;
      for (const t of tables) {
        const { error } = await supabase.from(t).update({ deleted_at: now, deleted_batch_id: batchId }).is('deleted_at', null);
        if (error) throw new Error(`${t}: ${error.message}`);
        done.push(t);
      }
      await logActivity('reset_data', desc, { batchId, tables }, true);
    } catch (err) {
      console.error('resetAllData failed:', err);
      // Hoàn tác các bảng đã lỡ xoá (theo đúng batchId) để không bị reset dở dang.
      const failedRollback = [];
      for (const t of done) {
        const { error } = await supabase.from(t).update({ deleted_at: null, deleted_batch_id: null }).eq('deleted_batch_id', batchId);
        if (error) failedRollback.push(t);
      }
      toast('Reset dữ liệu thất bại: ' + err.message + (failedRollback.length
        ? `\nKhông hoàn tác được bảng: ${failedRollback.join(', ')}. Vào Lịch sử để khôi phục (batch ${batchId}).`
        : '\nDữ liệu của bạn đã được giữ nguyên.'));
    } finally {
      await loadAll();
      setResettingData(false);
    }
  }

  async function softDelete(table, id, description, actionType) {
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from(table).update({ deleted_at: now, deleted_batch_id: batchId }).eq('id', id);
    if (!error) await logActivity(actionType, description, { batchId, tables: [table] }, true);
    return { error };
  }

  async function restoreLog(log) {
    const { batchId, tables } = log.payload || {};
    if (!batchId || !tables?.length) return;
    const results = await Promise.all(tables.map((t) => supabase.from(t).update({ deleted_at: null, deleted_batch_id: null }).eq('deleted_batch_id', batchId)));
    const failed = results.map((r, i) => (r.error ? `${tables[i]}: ${r.error.message}` : null)).filter(Boolean);
    if (failed.length) {
      // Chưa đánh dấu "đã khôi phục" — để người dùng bấm khôi phục lại được (thao tác idempotent).
      console.error('restoreLog failed:', failed);
      toast('Khôi phục chưa hoàn tất, thử lại sau.\n' + failed.join('\n'));
      await loadAll();
      return;
    }
    const { error: logErr } = await supabase.from('system_logs').update({ restored_at: new Date().toISOString() }).eq('id', log.id);
    if (logErr) console.error('Không đánh dấu được restored_at:', logErr);
    await loadAll();
  }

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('expense');
  const [selectedFundId, setSelectedFundId] = useState(() => initialNav.selectedFundId || null);
  const [fundReturnScreen, setFundReturnScreen] = useState(() => initialNav.fundReturnScreen || 'dashboard');
  function openFund(id, from = 'dashboard') {
    setSelectedFundId(id); setFundReturnScreen(from);
    saveNavState({ selectedFundId: id, fundReturnScreen: from });
    setScreen('fund-detail');
  }
  const [selectedAccountId, setSelectedAccountId] = useState(() => initialNav.selectedAccountId || null);
  const [accountReturnScreen, setAccountReturnScreen] = useState(() => initialNav.accountReturnScreen || 'accounts');
  function openAccount(id, from = 'accounts') {
    setSelectedAccountId(id); setAccountReturnScreen(from);
    saveNavState({ selectedAccountId: id, accountReturnScreen: from });
    setScreen('account-detail');
  }

  function handleAddClick(type = 'expense') {
    setAddType(type);
    if (type === 'transfer') {
      toast('Tính năng chuyển khoản đang được phát triển.', 'info');
      return;
    }
    setShowAdd(true);
  }

  // Nút Back của Android (Capacitor): đóng modal trên cùng -> lùi từ màn chi tiết -> về Tổng quan -> thoát app.
  // Trên web/desktop hàm này không làm gì.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle = null;
    let cancelled = false;
    CapApp.addListener('backButton', () => {
      if (closeTopModal()) return;
      if (screen === 'fund-detail') { setScreen(fundReturnScreen); return; }
      if (screen === 'account-detail') { setScreen(accountReturnScreen); return; }
      if (screen !== 'dashboard') { setScreen('dashboard'); return; }
      CapApp.exitApp();
    }).then((h) => { if (cancelled) h.remove(); else handle = h; });
    return () => { cancelled = true; if (handle) handle.remove(); };
  }, [screen, fundReturnScreen, accountReturnScreen]);

  // Helper to render screen content inside layout
  function renderScreenContent() {
    if (screen === 'fund-detail') {
      const cat = categories.find((c) => c.id === selectedFundId);
      if (!cat) {
        // FIX: lúc mới F5, categories còn rỗng vì loadAll() chưa chạy xong (async) — đừng
        // vội kết luận "không tìm thấy quỹ" và đá về dashboard. Chỉ đá về khi đã load xong
        // dữ liệu (initialLoadDone) mà vẫn không thấy (quỹ bị xoá thật).
        if (initialLoadDone) { setScreen('dashboard'); return null; }
        return null;
      }
      return <FundDetail category={cat} onBack={() => setScreen(fundReturnScreen)} />;
    }
    if (screen === 'account-detail') {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      if (!acc) {
        // FIX: tương tự fund-detail — không đá về accounts khi dữ liệu chưa kịp load xong.
        if (initialLoadDone) { setScreen('accounts'); return null; }
        return null;
      }
      return <AccountDetail account={acc} onBack={() => setScreen(accountReturnScreen)} />;
    }
    if (screen === 'funds') return <Funds />;
    if (screen === 'goals') return <Goals />;
    if (screen === 'accounts') return <Accounts />;
    // key: ép React unmount/mount lại hẳn Settings mỗi khi chuyển qua lại giữa "Hồ sơ tài
    // khoản" (settingsSection === 'profile', mở từ avatar) và "Cài đặt" (các thẻ Danh
    // mục/Hệ thống/Lịch sử/Giao diện, mở từ icon Cài đặt) — kể cả khi đang đứng sẵn ở màn
    // Cài đặt rồi bấm "Hồ sơ" (hoặc ngược lại) thì cũng chắc chắn đổi đúng giao diện, không
    // phụ thuộc timing của effect đồng bộ state bên trong Settings nữa.
    if (screen === 'settings') return <Settings key={settingsSection === 'profile' ? 'settings-profile' : 'settings-tabs'} user={currentUser} onProfileUpdated={refreshUser} initialSection={settingsSection} onResetData={resetAllData} resettingData={resettingData} logs={logs} logActivity={logActivity} restoreLog={restoreLog} />;
    if (screen === 'report') return <Report />;
    // Dashboard default
    return <Dashboard />;
  }

  // Giá trị chia sẻ qua Context cho mọi màn hình bên dưới (xem 02c).
  const shellValue = {
    setScreen, onAddClick: () => setShowAdd(true), openSettings: goToSettings,
    sidebarCollapsed, toggleSidebar, theme, toggleTheme, displayName, avatarUrl,
  };
  const dataValue = {
    accounts, categories, transactions, goals, loading, initialLoadDone, loadingGoals,
    reload: loadAll, softDelete, spendingPoolByPeriod, saveSpendingPoolForPeriod,
    onOpenAccount: openAccount, onOpenFund: openFund,
  };

  // Layout wrapper — true flex-row App Shell (Sidebar is a real flex item,
  // no fixed positioning / margin-left offset hack).
  return (
    <ShellContext.Provider value={shellValue}>
    <DataContext.Provider value={dataValue}>
    <div
      className="flex w-full min-h-[100dvh] dark:bg-[#1a1a2e]"
      style={theme === 'dark' ? undefined : {
        background: 'linear-gradient(135deg, #EEF0F4 0%, #E4ECFB 45%, #ECE6FB 100%)',
      }}
    >
      {/* Sidebar Desktop — flex item, flex-shrink: 0 */}
      <SidebarDesktop
        screen={screen}
        appLogoUrl={appLogoUrl}
        settingsSection={settingsSection}
      />

      {/* AppBody — flex: 1, min-width: 0 so it never gets pushed wider than the viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Desktop Header — width: 100%, no manual offset math */}
        <HeaderDesktop
        />

        {/* MainContent — width: 100%, min-width: 0 */}
        <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden md:p-6">
          {loadError && (
            <div role="alert" className="mx-4 mt-3 md:mx-0 md:mt-0 mb-3 flex items-center gap-3 rounded-2xl border border-[rgba(241,138,181,0.4)] bg-cotton-candy-light dark:bg-cotton-candy/10 px-4 py-3 text-sm text-blueberry dark:text-white">
              <AlertTriangle size={18} className="text-cotton-candy shrink-0" />
              <span className="flex-1 font-semibold">Không tải được dữ liệu ({loadError}). Dữ liệu đang hiển thị có thể chưa mới nhất.</span>
              <button onClick={loadAll} disabled={loading} className="shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                {loading ? 'Đang tải…' : 'Thử lại'}
              </button>
            </div>
          )}
          {renderScreenContent()}
        </main>
      </div>

      {/* Mobile BottomNav */}
      <BottomNavMobile
        screen={screen}
        onAddClick={handleAddClick}
        settingsSection={settingsSection}
      />

      {/* AddTransaction Modal - rendered globally */}
      {showAdd && (
        <AddTransaction
          onClose={() => setShowAdd(false)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={loadAll}
          initialType={addType}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </div>
    </DataContext.Provider>
    </ShellContext.Provider>
  );
}
