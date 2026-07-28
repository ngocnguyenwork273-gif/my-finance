import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, Sparkles, Plus, BarChart3, Settings as SettingsIcon, TrendingUp, TrendingDown, PiggyBank, HeartPulse,
  ArrowLeft, Download, X, Check, Loader2, Target, Wallet, Trash2, Pencil, LogOut, Mail, Lock, Search, Bell, Sun, Moon,
} from 'lucide-react';

const monthlyLimit = 5000000;
const monthlySpent = 3420000;

function formatMoney(n) {
  return Math.abs(n).toLocaleString('en-US') + 'đ';
}
function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Số dư quỹ = tổng đã Nạp - tổng đã Chi (rút) cho đúng danh mục đó
function fundBalance(categoryId, transactions) {
  return transactions
    .filter((t) => t.category_id === categoryId)
    .reduce((s, t) => {
      if (t.type === 'allocation') return s + Number(t.amount);
      if (t.type === 'expense') return s - Number(t.amount);
      return s;
    }, 0);
}

// Số dư tài khoản = số dư ban đầu + Thu nhập - Chi tiêu (Nạp quỹ không tính, vì tiền chưa thật sự rời khỏi ví)
function accountBalance(acc, transactions) {
  const delta = transactions
    .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'expense'))
    .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  return Number(acc.initial_balance || 0) + delta;
}

/* ---------- Màn Đăng nhập / Đăng ký ---------- */

function AuthScreen() {
  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setMessage('Nhập đủ email và mật khẩu'); setIsError(true); return; }
    if (mode === 'signup' && !firstName) { setMessage('Nhập tên của bạn'); setIsError(true); return; }
    setLoading(true);
    setMessage('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(error.message); setIsError(true); }
    } else {
      const full_name = `${firstName} ${lastName}`.trim();
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, first_name: firstName } } });
      if (error) { setMessage(error.message); setIsError(true); }
      else { setMessage('Tạo tài khoản thành công! Giờ bấm Đăng nhập.'); setIsError(false); setMode('login'); }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 bg-gradient-to-b from-gray-950 via-gray-950 to-violet-600">
      {/* Vệt sáng mờ phía dưới, đặc trưng phong cách kính tối */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-violet-500/50 blur-[100px]" />
      <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-[1.75rem] bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 p-6">
        {/* Tab chuyển đổi */}
        <div className="flex bg-white/5 border border-white/10 rounded-full p-1 mb-6">
          <button
            onClick={() => { setMode('signup'); setMessage(''); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'signup' ? 'bg-white text-gray-900' : 'text-white/60'}`}>
            Đăng ký
          </button>
          <button
            onClick={() => { setMode('login'); setMessage(''); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'login' ? 'bg-white text-gray-900' : 'text-white/60'}`}>
            Đăng nhập
          </button>
        </div>

        <h1 className="text-xl font-semibold text-white mb-5">
          {mode === 'signup' ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
        </h1>

        <div className="flex flex-col gap-3">
          {mode === 'signup' && (
            <div className="flex gap-3">
              <input
                value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tên" className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
              />
              <input
                value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="Họ" className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
              />
            </div>
          )}
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập email của bạn" autoCapitalize="none"
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
          />
        </div>

        {message && (
          <p className={`text-sm text-center mt-4 rounded-xl py-2 px-3 border ${isError ? 'text-red-100 bg-red-500/10 border-red-400/20' : 'text-emerald-100 bg-emerald-500/10 border-emerald-400/20'}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-5 shadow-lg shadow-violet-900/30"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập'}
        </button>

        <p className="text-center text-xs text-white/40 mt-5">
          Dữ liệu tài chính của bạn được mã hóa và chỉ bạn có thể xem.
        </p>
      </div>
    </div>
  );
}

/* ---------- Gauge ---------- */

function Gauge({ limit, spent }) {
  const ticks = 48;
  const filledTicks = Math.round((spent / limit) * ticks);
  const radius = 85, center = 100, tickLength = 14;
  const items = [];
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const x1 = center + (radius - tickLength) * Math.cos(rad);
    const y1 = center + (radius - tickLength) * Math.sin(rad);
    const x2 = center + radius * Math.cos(rad);
    const y2 = center + radius * Math.sin(rad);
    items.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < filledTicks ? '#7c3aed' : '#ede9fe'} strokeWidth="4" strokeLinecap="round" />);
  }
  const labelAngle = (filledTicks / ticks) * 360 - 90;
  const labelRad = (labelAngle * Math.PI) / 180;
  const labelX = center + (radius + 24) * Math.cos(labelRad);
  const labelY = center + (radius + 24) * Math.sin(labelRad);
  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56">
      {items}
      <foreignObject x={labelX - 34} y={labelY - 14} width="68" height="28"><div className="bg-gray-900 text-white text-[11px] font-medium rounded-full px-2 py-1 text-center whitespace-nowrap">{formatMoney(spent)}</div></foreignObject>
      <text x={center} y={center - 6} textAnchor="middle" fill="#9ca3af" fontSize="11">Hạn mức tháng</text>
      <text x={center} y={center + 18} textAnchor="middle" fill="#111827" fontWeight="700" fontSize="20">{formatMoney(limit)}</text>
    </svg>
  );
}

function ProgressBar({ pct, colorClass = 'bg-violet-600' }) {
  return <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>;
}

function EmojiCircle({ emoji, size = 36, active = false, activeColor = '#7c3aed', bg = '#f3f4f6' }) {
  return <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: active ? activeColor : bg, fontSize: size * 0.5 }}>{emoji || '❔'}</div>;
}

const NAV_ITEMS = [
  { key: 'dashboard', icon: Home, label: 'Trang chủ' },
  { key: 'goals', icon: Sparkles, label: 'Mục tiêu' },
  { key: 'report', icon: BarChart3, label: 'Báo cáo' },
  { key: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
];

function BottomNav({ screen, setScreen, onAddClick, displayName, theme, toggleTheme }) {
  return (
    <>
      {/* Thanh dưới cùng — chỉ hiện trên điện thoại */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-white rounded-full shadow-xl shadow-black/10 px-6 py-3 flex items-center justify-between z-10 md:hidden">
        <button onClick={() => setScreen('dashboard')}><Home size={20} className={screen === 'dashboard' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={() => setScreen('goals')}><Sparkles size={20} className={screen === 'goals' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={onAddClick} className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg"><Plus size={20} className="text-white" /></button>
        <button onClick={() => setScreen('report')}><BarChart3 size={20} className={screen === 'report' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={() => setScreen('settings')}><SettingsIcon size={20} className={screen === 'settings' ? 'text-gray-900' : 'text-gray-300'} /></button>
      </div>

      {/* Thanh nav ngang trên cùng — chỉ hiện trên tablet/PC (từ md trở lên) */}
      <div className="hidden md:flex fixed top-0 inset-x-0 h-20 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 items-center px-8 z-20 transition-colors">
        <div className="flex items-center gap-2 mr-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
            <Wallet size={17} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">MyFinance</span>
        </div>

        {/* Nút chuyển Sáng/Tối */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-full p-1 mr-4">
          <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>
            <Sun size={15} />
          </button>
          <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'dark' ? 'bg-gray-800 shadow text-white' : 'text-gray-400'}`}>
            <Moon size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-full p-1">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setScreen(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${screen === key ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={onAddClick} className="bg-gray-900 dark:bg-violet-600 text-white rounded-full px-4 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Thêm giao dịch
          </button>
          <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-300 font-semibold text-sm">
            {(displayName || 'B')[0].toUpperCase()}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ setScreen, transactions, categories, accounts, loading, displayName, onAddClick, theme, toggleTheme, onOpenFund }) {
  const [search, setSearch] = useState('');
  const fundCategories = categories.filter((c) => c.is_fund);
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const spentByCat = expenseCats.map((c) => ({ ...c, amount: transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) })).filter((c) => c.amount > 0);
  const total = spentByCat.reduce((s, c) => s + c.amount, 0) || 1;
  const radius = 60, circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const palette = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

  // Tổng tài sản = tổng số dư mọi quỹ (mọi danh mục chi tiêu) + tổng số dư mọi tài khoản
  const totalFunds = expenseCats.reduce((s, c) => s + fundBalance(c.id, transactions), 0);
  const totalAccounts = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalAssets = totalFunds + totalAccounts;

  // ----- Dữ liệu tính thêm cho bố cục desktop -----
  const now = new Date();
  const thisMonthTx = transactions.filter((t) => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const incomeThisMonth = thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenseThisMonth = thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const monthLabels = [];
  const monthTotals = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const sum = transactions.filter((t) => { const td = new Date(t.created_at); return t.type === 'expense' && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }).reduce((s, t) => s + Number(t.amount), 0);
    monthLabels.push(`Th${d.getMonth() + 1}`);
    monthTotals.push(sum);
  }
  const maxMonthTotal = Math.max(...monthTotals, 1);
  const monthShades = ['#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed'];

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailySpend = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return thisMonthTx.filter((t) => t.type === 'expense' && new Date(t.created_at).getDate() === day).reduce((s, t) => s + Number(t.amount), 0);
  });
  const maxDaily = Math.max(...dailySpend, 1);

  const filteredTx = transactions.filter((t) => {
    if (!search) return true;
    const cat = categories.find((c) => c.id === t.category_id);
    return (cat?.name || '').toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 md:bg-gray-50 dark:md:bg-gray-950 flex justify-center md:pt-20 transition-colors">
      {/* ============ BẢN ĐIỆN THOẠI (giữ nguyên) ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div><p className="text-white/80 text-sm">Chào bạn!</p><h1 className="text-white text-2xl font-semibold">{displayName || 'Bạn'}</h1></div>
          <button onClick={() => setScreen('accounts')} className="w-11 h-11 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white border border-white/40"><Wallet size={18} /></button>
        </div>
        <div className="px-5 mt-4">
          <p className="text-white/70 text-xs">Tổng tài sản</p>
          <p className="text-white text-3xl font-bold">{formatMoney(totalAssets)}</p>
        </div>
        <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2">
          {fundCategories.length === 0 ? <p className="text-white/70 text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p>
            : fundCategories.map((f) => (
              <button key={f.id} onClick={() => onOpenFund(f.id)} className="min-w-[150px] text-left bg-white/90 backdrop-blur rounded-3xl p-4 shadow-lg shadow-black/5 flex-shrink-0">
                <EmojiCircle emoji={f.icon} size={36} active activeColor="#7c3aed" />
                <p className="text-gray-500 text-xs mt-3">{f.name}</p>
                <p className="text-gray-900 font-semibold text-base">{formatMoney(fundBalance(f.id, transactions))}</p>
              </button>
            ))}
        </div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[60vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold text-lg">Ngân sách tháng này</h2>
            <button onClick={() => setScreen('report')} className="text-violet-600 text-sm font-medium">Xem chi tiết</button>
          </div>
          {spentByCat.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Chưa có chi tiêu nào tháng này.</p> : (
            <div className="flex items-center gap-6">
              <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 flex-shrink-0">
                {spentByCat.map((cat, i) => {
                  const pct = cat.amount / total; const dash = pct * circumference; const offset = cumulative; cumulative += dash;
                  return <circle key={cat.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                })}
              </svg>
              <div className="flex flex-col gap-2 text-sm min-w-0">
                {spentByCat.map((cat, i) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                    <span className="text-gray-600">{cat.name}</span><span className="text-gray-900 font-medium ml-auto">{formatMoney(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mt-8 mb-3"><h2 className="text-gray-900 font-semibold text-lg">Giao dịch</h2></div>
          {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
            : transactions.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
            : <div className="flex flex-col divide-y divide-gray-100">
                {transactions.slice(0, 20).map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3">
                      <EmojiCircle emoji={cat?.icon} size={40} bg={tx.type === 'income' ? '#ecfdf5' : '#f5f3ff'} />
                      <div className="flex-1 min-w-0"><p className="text-gray-900 font-medium text-sm">{cat?.name || 'Khác'}</p><p className="text-gray-400 text-xs">{tx.note || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p></div>
                      <p className={`font-medium text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</p>
                    </div>
                  );
                })}
              </div>}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET (bố cục kiểu dashboard) ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Cột trái + giữa (2/3) */}
          <div className="col-span-2 flex flex-col gap-6">
            {/* Thẻ số liệu lớn */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <div className="flex items-center gap-10 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatMoney(totalAssets)}</span>
                    <span className="text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full">Tài sản</span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tổng tài sản</p>
                </div>
                <div className="w-px h-12 bg-gray-100 dark:bg-gray-800" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatMoney(incomeThisMonth)}</span>
                    <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full">Thu</span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Thu nhập tháng này</p>
                </div>
                <div className="w-px h-12 bg-gray-100 dark:bg-gray-800" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatMoney(expenseThisMonth)}</span>
                    <span className="text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 px-2 py-1 rounded-full">Chi</span>
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Chi tiêu tháng này</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                {monthLabels.map((label, i) => (
                  <div key={i} className="flex-1">
                    <div className="h-2 rounded-full" style={{ background: monthShades[Math.min(Math.floor((monthTotals[i] / maxMonthTotal) * (monthShades.length - 1)), monthShades.length - 1)] }} />
                    <p className="text-[11px] text-gray-400 mt-1 text-center">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Xu hướng chi tiêu theo ngày */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Xu hướng chi tiêu theo ngày</h3>
              {dailySpend.every((v) => v === 0) ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">Chưa có dữ liệu tháng này.</p> : (
                <svg viewBox="0 0 620 160" className="w-full h-40">
                  <polyline
                    fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                    points={dailySpend.map((v, i) => `${(i / (daysInMonth - 1)) * 600 + 10},${150 - (v / maxDaily) * 130}`).join(' ')}
                  />
                  {dailySpend.map((v, i) => v === maxDaily && v > 0 ? (
                    <g key={i}>
                      <circle cx={(i / (daysInMonth - 1)) * 600 + 10} cy={150 - (v / maxDaily) * 130} r="4" fill="#7c3aed" />
                    </g>
                  ) : null)}
                </svg>
              )}
            </div>

            {/* Bảng giao dịch gần đây */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Giao dịch gần đây</h3>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-2 w-56">
                  <Search size={15} className="text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="bg-transparent outline-none text-sm flex-1" />
                </div>
              </div>
              {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
                : filteredTx.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Không có giao dịch nào.</p>
                : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="pb-3 font-medium">Danh mục</th>
                        <th className="pb-3 font-medium">Tài khoản</th>
                        <th className="pb-3 font-medium">Ngày</th>
                        <th className="pb-3 font-medium text-right">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTx.slice(0, 10).map((tx) => {
                        const cat = categories.find((c) => c.id === tx.category_id);
                        const acc = accounts.find((a) => a.id === tx.account_id);
                        return (
                          <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <EmojiCircle emoji={cat?.icon} size={32} bg={tx.type === 'income' ? '#ecfdf5' : '#f5f3ff'} />
                                <span className="text-gray-900 dark:text-white font-medium">{cat?.name || 'Khác'}</span>
                              </div>
                            </td>
                            <td className="py-3 text-gray-500 dark:text-gray-400">{acc?.name || '—'}</td>
                            <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</td>
                            <td className={`py-3 text-right font-medium ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
          </div>

          {/* Cột phải (1/3) */}
          <div className="flex flex-col gap-6">
            {/* Bản đồ nhiệt chi tiêu theo ngày */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Nhiệt độ chi tiêu tháng này</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {dailySpend.map((v, i) => {
                  const intensity = v / maxDaily;
                  const cellClass = v === 0 ? 'bg-gray-100 dark:bg-gray-800'
                    : intensity > 0.7 ? 'bg-violet-600 dark:bg-violet-400'
                    : intensity > 0.4 ? 'bg-violet-400 dark:bg-violet-500/70'
                    : 'bg-violet-200 dark:bg-violet-500/30';
                  return <div key={i} className={`aspect-square rounded ${cellClass}`} title={`Ngày ${i + 1}: ${formatMoney(v)}`} />;
                })}
              </div>
            </div>

            {/* Ngân sách theo danh mục */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 dark:text-white font-semibold">Ngân sách theo danh mục</h3>
                <button onClick={() => setScreen('report')} className="text-violet-600 text-xs font-medium">Chi tiết</button>
              </div>
              {spentByCat.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có chi tiêu nào.</p> : (
                <div className="flex flex-col items-center">
                  <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 flex-shrink-0 mb-4">
                    {spentByCat.map((cat, i) => {
                      const pct = cat.amount / total; const dash = pct * circumference; const offset = cumulative; cumulative += dash;
                      return <circle key={cat.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                    })}
                  </svg>
                  <div className="flex flex-col gap-2 text-sm w-full">
                    {spentByCat.map((cat, i) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-gray-600 dark:text-gray-300">{cat.name}</span><span className="text-gray-900 dark:text-white font-medium ml-auto">{formatMoney(cat.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quỹ / thẻ ghim */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 dark:border dark:border-gray-800 transition-colors">
              <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Quỹ của bạn</h3>
              {fundCategories.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p> : (
                <div className="flex flex-col gap-3">
                  {fundCategories.map((f) => (
                    <button key={f.id} onClick={() => onOpenFund(f.id)} className="flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-1.5 -m-1.5 transition">
                      <EmojiCircle emoji={f.icon} size={36} active activeColor="#7c3aed" />
                      <div className="flex-1 min-w-0"><p className="text-gray-900 dark:text-white text-sm font-medium">{f.name}</p></div>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatMoney(fundBalance(f.id, transactions))}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav screen="dashboard" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

/* ---------- Report ---------- */

/* ---------- Chi tiết quỹ ---------- */

function FundDetail({ category, transactions, onBack }) {
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const balance = fundBalance(category.id, transactions);
  const totalIn = history.filter((t) => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = history.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const rate = Number(category.interest_rate || 0);
  const estimatedProfit = balance > 0 ? balance * (rate / 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl min-h-screen pb-28 md:pb-10 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <div className="flex items-center gap-2">
            <EmojiCircle emoji={category.icon} size={28} active activeColor="#ffffff33" bg="rgba(255,255,255,0.3)" />
            <h1 className="text-white text-lg font-semibold">{category.name}</h1>
          </div>
        </div>

        <div className="px-5 mt-4 text-center">
          <p className="text-white/70 text-sm">Số dư hiện tại</p>
          <p className="text-white text-4xl font-bold">{formatMoney(balance)}</p>
          {rate > 0 && (
            <p className="text-white/80 text-sm mt-2">
              Lãi suất {rate}%/năm — ước tính lợi nhuận <span className="font-semibold">{formatMoney(estimatedProfit)}</span>/năm
            </p>
          )}
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[65vh] px-5 pt-6 pb-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-emerald-600 text-xs font-medium mb-1">Tổng đã nạp</p>
              <p className="text-emerald-700 font-semibold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-red-500 text-xs font-medium mb-1">Tổng đã rút</p>
              <p className="text-red-600 font-semibold">{formatMoney(totalOut)}</p>
            </div>
          </div>

          <h2 className="text-gray-900 font-semibold text-lg mb-3">Lịch sử</h2>
          {history.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào trong quỹ này.</p> : (
            <div className="flex flex-col divide-y divide-gray-100">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'allocation' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {tx.type === 'allocation' ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium text-sm">{tx.type === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ (chi tiêu)'}</p>
                    <p className="text-gray-400 text-xs">{tx.note || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p>
                  </div>
                  <p className={`font-medium text-sm flex-shrink-0 ${tx.type === 'allocation' ? 'text-emerald-600' : 'text-red-500'}`}>{tx.type === 'allocation' ? '+' : '-'}{formatMoney(tx.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Financial Report ---------- */

function Report({ setScreen, onAddClick, displayName, theme, toggleTheme }) {
  const [period, setPeriod] = useState('Monthly');
  const periods = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  const periodLabels = { Weekly: 'Tuần', Monthly: 'Tháng', Quarterly: 'Quý', Yearly: 'Năm' };
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl lg:max-w-3xl min-h-screen pb-28 md:pb-10 md:pt-4 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Báo cáo tài chính</h1>
          <button className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Download size={16} className="text-white" /></button>
        </div>
        <div className="flex flex-col items-center mt-6">
          <Gauge limit={monthlyLimit} spent={monthlySpent} />
          <div className="flex bg-white/30 backdrop-blur rounded-full p-1 mt-2">
            <button className="px-4 py-1.5 rounded-full text-sm text-white/80">Tổng tài sản</button>
            <button className="px-4 py-1.5 rounded-full text-sm bg-white text-gray-900 font-medium shadow">Chi tiêu</button>
          </div>
        </div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[45vh] px-5 pt-6 pb-6">
          <h2 className="text-gray-900 font-semibold text-lg mb-3">Tài chính</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">{periods.map((p) => <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 ${period === p ? 'bg-gray-900 text-white font-medium' : 'bg-gray-100 text-gray-500'}`}>{periodLabels[p]}</button>)}</div>
          <p className="text-gray-400 text-sm text-center py-8">Phần này sẽ nối dữ liệu thật ở bước tiếp theo.</p>
        </div>
        <BottomNav screen="report" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

/* ---------- Goals ---------- */

function AddGoalForm({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    if (!name || !target) { alert('Nhập đủ tên và số tiền mục tiêu'); return; }
    setSaving(true);
    const { error } = await supabase.from('goals').insert({ name, target_amount: Number(target), current_amount: 0, status: 'Chưa bắt đầu' });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">Mục tiêu mới</h3><button onClick={onClose}><X size={18} className="text-gray-500" /></button></div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên mục tiêu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <input value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Số tiền mục tiêu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
        <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu mục tiêu</button>
      </div>
    </div>
  );
}

function Goals({ setScreen, goals, loadingGoals, reload, onAddClick, displayName, theme, toggleTheme }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl lg:max-w-3xl min-h-screen pb-28 md:pb-10 md:pt-4 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Mục tiêu</h1>
        </div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[80vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-semibold text-lg">Mục tiêu của tôi</h2>
            <button onClick={() => setShowAddGoal(true)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={16} className="text-gray-600" /></button>
          </div>
          {loadingGoals ? <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
            : goals.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Chưa có mục tiêu nào.</p>
            : <div className="flex flex-col gap-5">
                {goals.map((goal) => {
                  const pct = goal.target_amount ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center flex-shrink-0"><Target size={18} className="text-white" /></div>
                        <div className="flex-1 min-w-0"><p className="text-gray-900 font-medium text-sm">{goal.name}</p><p className="text-gray-900 font-semibold text-sm">{formatMoney(goal.current_amount || 0)}</p></div>
                      </div>
                      <ProgressBar pct={pct} />
                      <div className="flex justify-between mt-1 text-xs text-gray-400"><span>{formatMoney(goal.current_amount || 0)}</span><span>{formatMoney(goal.target_amount)}</span></div>
                    </div>
                  );
                })}
              </div>}
        </div>
        {showAddGoal && <AddGoalForm onClose={() => setShowAddGoal(false)} onSaved={reload} />}
        <BottomNav screen="goals" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

/* ---------- Thêm giao dịch ---------- */

function AddTransaction({ onClose, accounts, categories, onSaved }) {
  const [type, setType] = useState('expense'); // 'income' | 'allocation' | 'expense'
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState(nowForInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (accounts.length > 0 && !selectedAccount) setSelectedAccount(accounts[0].id); }, [accounts]);

  // Nạp quỹ dùng chung danh mục "chi tiêu" (vì mọi danh mục chi tiêu đều là 1 quỹ)
  const categoryType = type === 'income' ? 'income' : 'expense';
  const categoryList = categories.filter((c) => c.type === categoryType);
  const activeCat = categories.find((c) => c.id === selectedCategory);
  const overLimit = type === 'expense' && activeCat?.monthly_limit && Number(amount) > Number(activeCat.monthly_limit);
  const needsAccount = type !== 'allocation';

  function handleAmountChange(e) { setAmount(e.target.value.replace(/\D/g, '')); }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { alert('Vui lòng chọn danh mục'); return; }
    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      account_id: needsAccount ? selectedAccount : null, category_id: selectedCategory, type, amount: Number(amount),
      note: note || null, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi khi lưu: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full h-full md:h-auto md:max-h-[88vh] md:max-w-lg md:rounded-3xl md:overflow-y-auto overflow-y-auto relative">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white z-10">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><X size={18} className="text-gray-700" /></button>
          <h1 className="text-gray-900 text-lg font-semibold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex bg-gray-100 rounded-full p-1">
            <button onClick={() => { setType('income'); setSelectedCategory(null); }} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'income' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Thu nhập</button>
            <button onClick={() => { setType('allocation'); setSelectedCategory(null); }} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'allocation' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Nạp quỹ</button>
            <button onClick={() => { setType('expense'); setSelectedCategory(null); }} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'expense' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Chi tiêu</button>
          </div>
          {type === 'allocation' && <p className="text-gray-400 text-xs mt-2 text-center">Chuyển 1 phần thu nhập vào quỹ để dành, chưa tính là tiền rời khỏi tài khoản.</p>}
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('en-US') : ''} onChange={handleAmountChange} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit ? 'text-red-500' : type === 'income' || type === 'allocation' ? 'text-emerald-600' : 'text-gray-900'}`} />
            <span className="text-4xl font-bold text-gray-300">đ</span>
          </div>
          {overLimit && <p className="text-red-500 text-xs mt-2">⚠️ Vượt hạn mức {formatMoney(activeCat.monthly_limit)} của danh mục này!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">{type === 'income' ? 'Danh mục thu nhập' : 'Quỹ / Danh mục'}</p>
          {categoryList.length === 0 ? <p className="text-gray-400 text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = type === 'expense' && cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
                return (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={cat.icon} size={48} active={active} activeColor={willExceed ? '#ef4444' : '#7c3aed'} />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {needsAccount && (
          <div className="px-5 mt-8">
            <p className="text-gray-900 font-semibold text-sm mb-3">Tài khoản</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {accounts.map((acc) => {
                const active = selectedAccount === acc.id;
                return <button key={acc.id} onClick={() => setSelectedAccount(acc.id)} className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 border transition ${active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}><span>{acc.icon}</span><span className="text-sm">{acc.name}</span></button>;
              })}
            </div>
          </div>
        )}
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Ngày giờ</p>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
        </div>
        <div className="px-5 mt-10 pb-10">
          <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Lưu giao dịch'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tiền trong tài khoản ---------- */

function Accounts({ setScreen, accounts, transactions, onAddClick, displayName, theme, toggleTheme }) {
  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl lg:max-w-3xl min-h-screen pb-28 md:pb-10 md:pt-4 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Tiền trong tài khoản</h1>
        </div>
        <div className="px-5 mt-4 text-center"><p className="text-white/80 text-sm">Tổng tất cả tài khoản</p><p className="text-white text-3xl font-bold">{formatMoney(totalBalance)}</p></div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[70vh] px-5 pt-6 pb-6">
          <div className="flex flex-col gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                <EmojiCircle emoji={acc.icon} size={44} bg="#ede9fe" />
                <div className="flex-1 min-w-0"><p className="text-gray-900 font-medium text-sm">{acc.name}</p><p className="text-gray-400 text-xs capitalize">{acc.type}</p></div>
                <p className="text-gray-900 font-semibold">{formatMoney(accountBalance(acc, transactions))}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomNav screen="accounts" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

/* ---------- Cài đặt ---------- */

function CategorySection({ categories, reload }) {
  const [tab, setTab] = useState('expense');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '', monthly_limit: '', is_fund: false, interest_rate: '' });
  const [saving, setSaving] = useState(false);

  function startNew() { setForm({ name: '', icon: '', monthly_limit: '', is_fund: false, interest_rate: '' }); setEditing('new'); }
  function startEdit(cat) { setForm({ name: cat.name, icon: cat.icon || '', monthly_limit: cat.monthly_limit || '', is_fund: cat.is_fund || false, interest_rate: cat.interest_rate || '' }); setEditing(cat.id); }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên danh mục'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '❔', type: tab, monthly_limit: form.monthly_limit ? Number(form.monthly_limit) : null, is_fund: form.is_fund, interest_rate: form.interest_rate ? Number(form.interest_rate) : 0 };
    const { error } = editing === 'new' ? await supabase.from('categories').insert(payload) : await supabase.from('categories').update(payload).eq('id', editing);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    setEditing(null); reload();
  }

  async function handleDelete(id) {
    if (!confirm('Xóa danh mục này? Các giao dịch cũ vẫn giữ nguyên số tiền.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }

  const list = categories.filter((c) => c.type === tab);

  return (
    <>
      <div className="flex bg-gray-100 rounded-full p-1 mb-4">
        <button onClick={() => setTab('expense')} className={`flex-1 py-2 rounded-full text-sm font-medium ${tab === 'expense' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Chi tiêu</button>
        <button onClick={() => setTab('income')} className={`flex-1 py-2 rounded-full text-sm font-medium ${tab === 'income' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Thu nhập</button>
      </div>
      <button onClick={startNew} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm text-gray-500 font-medium mb-4 flex items-center justify-center gap-2"><Plus size={16} /> Thêm danh mục mới</button>
      <div className="flex flex-col gap-2">
        {list.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <EmojiCircle emoji={cat.icon} size={36} bg="#ede9fe" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium text-sm">{cat.name} {cat.is_fund && <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full ml-1">Quỹ</span>}</p>
              <p className="text-gray-400 text-xs">
                {cat.monthly_limit ? `Hạn mức: ${formatMoney(cat.monthly_limit)}` : ''}
                {cat.monthly_limit && cat.interest_rate > 0 ? ' • ' : ''}
                {cat.interest_rate > 0 ? `Lãi ${cat.interest_rate}%/năm` : ''}
              </p>
            </div>
            <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Pencil size={14} className="text-gray-500" /></button>
            <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white w-full rounded-t-3xl p-5 max-w-sm mx-auto max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">{editing === 'new' ? 'Danh mục mới' : 'Sửa danh mục'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-gray-500" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🍜)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <input value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Hạn mức tối đa mỗi lần nhập (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            {tab === 'expense' && (
              <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận %/năm (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            )}
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-600"><input type="checkbox" checked={form.is_fund} onChange={(e) => setForm({ ...form, is_fund: e.target.checked })} /> Đây là 1 "quỹ" — hiện thẻ tổng tiền ở Trang chủ</label>
            <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu</button>
          </div>
        </div>
      )}
    </>
  );
}

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'gold', label: 'Vàng' },
  { value: 'other', label: 'Khác' },
];

function AccountSection({ accounts, reload }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '', type: 'cash', initial_balance: '' });
  const [saving, setSaving] = useState(false);

  function startNew() { setForm({ name: '', icon: '', type: 'cash', initial_balance: '' }); setEditing('new'); }
  function startEdit(acc) { setForm({ name: acc.name, icon: acc.icon || '', type: acc.type || 'cash', initial_balance: acc.initial_balance || '' }); setEditing(acc.id); }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên tài khoản'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '💰', type: form.type, initial_balance: form.initial_balance ? Number(form.initial_balance) : 0, is_active: true };
    const { error } = editing === 'new' ? await supabase.from('accounts').insert(payload) : await supabase.from('accounts').update(payload).eq('id', editing);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    setEditing(null); reload();
  }

  async function handleDelete(id) {
    if (!confirm('Xóa tài khoản này? Các giao dịch cũ vẫn giữ nguyên số tiền.')) return;
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }

  return (
    <>
      <button onClick={startNew} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm text-gray-500 font-medium mb-4 flex items-center justify-center gap-2"><Plus size={16} /> Thêm tài khoản mới</button>
      <div className="flex flex-col gap-2">
        {accounts.map((acc) => (
          <div key={acc.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <EmojiCircle emoji={acc.icon} size={36} bg="#ede9fe" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium text-sm">{acc.name}</p>
              <p className="text-gray-400 text-xs">Số dư ban đầu: {formatMoney(acc.initial_balance || 0)}</p>
            </div>
            <button onClick={() => startEdit(acc)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Pencil size={14} className="text-gray-500" /></button>
            <button onClick={() => handleDelete(acc.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white w-full rounded-t-3xl p-5 max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">{editing === 'new' ? 'Tài khoản mới' : 'Sửa tài khoản'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-gray-500" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản (vd: Vietinbank)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3">
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Số dư ban đầu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
            <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu</button>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileSection({ user, onUpdated }) {
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const full = user?.user_metadata?.full_name || '';
    const first = user?.user_metadata?.first_name || '';
    setFirstName(first);
    setLastName(full.replace(first, '').trim());
  }, [user]);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const full_name = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.updateUser({ data: { full_name, first_name: firstName } });
    setSaving(false);
    if (error) { setMessage('Lỗi: ' + error.message); return; }
    setMessage('Đã lưu!');
    onUpdated();
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">{user?.email}</p>
      <div className="flex gap-3 mb-3">
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tên" className="w-1/2 bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none" />
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Họ" className="w-1/2 bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none" />
      </div>
      {message && <p className="text-sm text-violet-600 mb-3">{message}</p>}
      <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu thay đổi
      </button>
    </div>
  );
}

function Settings({ setScreen, categories, accounts, reload, user, onProfileUpdated, onAddClick, theme, toggleTheme }) {
  const displayName = user?.user_metadata?.first_name || user?.user_metadata?.full_name;
  const [section, setSection] = useState('profile'); // 'profile' | 'categories' | 'accounts'

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl lg:max-w-3xl min-h-screen pb-28 md:pb-10 md:pt-4 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <h1 className="text-white text-lg font-semibold">Cài đặt</h1>
          </div>
          <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><LogOut size={16} className="text-white" /></button>
        </div>

        <div className="px-5 mt-4 flex gap-2">
          <button onClick={() => setSection('profile')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'profile' ? 'bg-white text-gray-900' : 'bg-white/30 text-white'}`}>Hồ sơ</button>
          <button onClick={() => setSection('categories')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'categories' ? 'bg-white text-gray-900' : 'bg-white/30 text-white'}`}>Danh mục</button>
          <button onClick={() => setSection('accounts')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'accounts' ? 'bg-white text-gray-900' : 'bg-white/30 text-white'}`}>Tài khoản</button>
        </div>

        <div className="mt-4 bg-white rounded-t-[2.5rem] min-h-[76vh] px-5 pt-6 pb-6">
          {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} />}
          {section === 'categories' && <CategorySection categories={categories} reload={reload} />}
          {section === 'accounts' && <AccountSection accounts={accounts} reload={reload} />}
        </div>
        <BottomNav screen="settings" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

/* ---------- App gốc: gác cổng bằng đăng nhập ---------- */

function MainApp({ user, theme, toggleTheme }) {
  const [screen, setScreen] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [currentUser, setCurrentUser] = useState(user);

  const displayName = currentUser?.user_metadata?.first_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0];

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUser(data.user);
  }

  async function loadAll() {
    setLoading(true); setLoadingGoals(true);
    const [{ data: accData }, { data: catData }, { data: txData }, { data: goalData }] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true),
      supabase.from('categories').select('*'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
    ]);
    setAccounts(accData || []); setCategories(catData || []); setTransactions(txData || []); setGoals(goalData || []);
    setLoading(false); setLoadingGoals(false);
  }

  useEffect(() => { loadAll(); }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState(null);
  function openFund(id) { setSelectedFundId(id); setScreen('fund-detail'); }

  if (screen === 'fund-detail') {
    const cat = categories.find((c) => c.id === selectedFundId);
    if (!cat) { setScreen('dashboard'); return null; }
    return <FundDetail category={cat} transactions={transactions} onBack={() => setScreen('dashboard')} />;
  }
  if (screen === 'report') return <><Report setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'goals') return <><Goals setScreen={setScreen} goals={goals} loadingGoals={loadingGoals} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'accounts') return <><Accounts setScreen={setScreen} accounts={accounts} transactions={transactions} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'settings') return <><Settings setScreen={setScreen} categories={categories} accounts={accounts} reload={loadAll} user={currentUser} onProfileUpdated={refreshUser} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  return <><Dashboard setScreen={setScreen} transactions={transactions} categories={categories} accounts={accounts} loading={loading} displayName={displayName} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} onOpenFund={openFund} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('theme')) || 'light');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() { setTheme((t) => (t === 'dark' ? 'light' : 'dark')); }

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-violet-400" /></div>;
  }
  if (!session) return <AuthScreen />;
  return <MainApp user={session.user} theme={theme} toggleTheme={toggleTheme} />;
}
