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

// Số dư quỹ = tổng đã Nạp - tổng đã Chi (rút) cho đúng danh mục đó — KHÔNG tính lãi
function fundBalance(categoryId, transactions) {
  return transactions
    .filter((t) => t.category_id === categoryId)
    .reduce((s, t) => {
      if (t.type === 'allocation') return s + Number(t.amount);
      if (t.type === 'expense') return s - Number(t.amount);
      return s;
    }, 0);
}

// Số dư quỹ CÓ TÍNH LÃI KÉP hàng ngày, trễ 1 ngày:
// nạp ngày 16/7 -> bắt đầu tính lời từ 17/7 -> app cộng lời của ngày 17 vào số dư kể từ ngày 18/7.
// Lời được cộng dồn vào số dư và tiếp tục sinh lời (lãi kép).
function fundBalanceWithProfit(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  if (history.length === 0) return 0;

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  // Gom giao dịch theo từng ngày
  const changesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
  });

  let balance = 0;
  const cursor = new Date(startDate);
  // Chạy từng ngày từ ngày giao dịch đầu tiên đến hết HÔM QUA, cộng lãi kép mỗi ngày đã qua
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    if (balance > 0 && dailyRate > 0) balance *= 1 + dailyRate;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Cộng thêm giao dịch của HÔM NAY (chưa tính lãi hôm nay, vì lãi hôm nay chỉ hiện từ ngày mai)
  balance += changesByDay[today.getTime()] || 0;

  return balance;
}

// Số dư tài khoản = số dư ban đầu + Thu nhập - Chi tiêu (Nạp quỹ không tính, vì tiền chưa thật sự rời khỏi ví)
function accountBalance(acc, transactions) {
  const delta = transactions
    .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment'))
    .reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount);
      if (t.type === 'expense') return s - Number(t.amount);
      return s + Number(t.amount); // adjustment: số dương = tăng, số âm = giảm
    }, 0);
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

// good=true nghĩa là tăng là tốt (thu nhập/tiết kiệm), good=false nghĩa là tăng là xấu (chi tiêu)
function ChangeBadge({ pct, good = true }) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  const isGoodDirection = isUp === good;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGoodDirection ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon size={12} />{Math.abs(Math.round(pct))}% so với tháng trước
    </span>
  );
}

// Input số tiền dùng chung — tự động có dấu phẩy ngăn cách hàng nghìn khi gõ
function MoneyInput({ value, onChange, placeholder, className }) {
  function handleChange(e) { onChange(e.target.value.replace(/\D/g, '')); }
  return (
    <input type="text" inputMode="numeric" value={value ? Number(value).toLocaleString('en-US') : ''}
      onChange={handleChange} placeholder={placeholder} className={className} />
  );
}

function EmojiCircle({ emoji, size = 36, active = false, activeColor = '#7c3aed', bg = '#f3f4f6' }) {
  return <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: active ? activeColor : bg, fontSize: size * 0.5 }}>{emoji || '❔'}</div>;
}

const NAV_ITEMS = [
  { key: 'dashboard', icon: Home, label: 'Trang chủ' },
  { key: 'funds', icon: PiggyBank, label: 'Quỹ' },
  { key: 'accounts', icon: Wallet, label: 'Ví' },
  { key: 'goals', icon: Sparkles, label: 'Mục tiêu' },
  { key: 'report', icon: BarChart3, label: 'Báo cáo' },
  { key: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
];

function BottomNav({ screen, setScreen, onAddClick, displayName, theme, toggleTheme }) {
  return (
    <>
      {/* Thanh dưới cùng — chỉ hiện trên điện thoại */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm bg-white rounded-full shadow-xl shadow-black/10 px-4 py-3 flex items-center justify-between z-10 md:hidden">
        <button onClick={() => setScreen('dashboard')}><Home size={19} className={screen === 'dashboard' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={() => setScreen('funds')}><PiggyBank size={19} className={screen === 'funds' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={onAddClick} className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg flex-shrink-0"><Plus size={20} className="text-white" /></button>
        <button onClick={() => setScreen('goals')}><Sparkles size={19} className={screen === 'goals' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={() => setScreen('report')}><BarChart3 size={19} className={screen === 'report' ? 'text-gray-900' : 'text-gray-300'} /></button>
        <button onClick={() => setScreen('settings')}><SettingsIcon size={19} className={screen === 'settings' ? 'text-gray-900' : 'text-gray-300'} /></button>
      </div>

      {/* Nút Sáng/Tối nổi — chỉ hiện trên điện thoại, có mặt ở mọi màn hình */}
      <button onClick={toggleTheme} className="fixed top-6 right-5 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg flex items-center justify-center z-20 md:hidden">
        {theme === 'dark' ? <Sun size={17} className="text-yellow-500" /> : <Moon size={17} className="text-gray-600" />}
      </button>

      {/* Sidebar bên trái — chỉ hiện trên tablet/PC (từ md trở lên) */}
      <div className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 px-5 py-6 z-20 transition-colors">
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Wallet size={17} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">MyFinance</span>
        </div>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setScreen(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${screen === key ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
              <Icon size={17} />{label}
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-full p-1 self-start">
            <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>
              <Sun size={15} />
            </button>
            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'dark' ? 'bg-gray-800 shadow text-white' : 'text-gray-400'}`}>
              <Moon size={15} />
            </button>
          </div>
          <div className="bg-gray-900 dark:bg-emerald-500/10 rounded-2xl p-4">
            <p className="text-white dark:text-emerald-300 text-sm font-semibold mb-1">💡 Mẹo hôm nay</p>
            <p className="text-gray-300 dark:text-emerald-200/70 text-xs">Nạp quỹ ngay khi có thu nhập để kiểm soát chi tiêu tốt hơn.</p>
          </div>
        </div>
      </div>

      {/* Top bar bên trong nội dung — chỉ hiện trên tablet/PC */}
      <div className="hidden md:flex fixed top-0 left-64 right-0 h-20 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 items-center px-8 z-10 transition-colors">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-full px-4 py-2.5 w-72">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Tìm kiếm nhanh" className="bg-transparent outline-none text-sm flex-1" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={onAddClick} className="bg-emerald-500 text-white rounded-full px-4 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Thêm giao dịch
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500"><Bell size={16} /></button>
          <button onClick={() => setScreen('settings')} className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500"><SettingsIcon size={16} /></button>
          <div className="flex items-center gap-2 pl-2">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
              {(displayName || 'B')[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{displayName || 'Bạn'}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ setScreen, transactions, categories, accounts, goals, loading, displayName, onAddClick, theme, toggleTheme, onOpenFund }) {
  const [search, setSearch] = useState('');
  const [breakdownPeriod, setBreakdownPeriod] = useState('month'); // 'week' | 'month' | 'year'
  const fundCategories = categories.filter((c) => c.is_fund);
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const spentByCat = expenseCats.map((c) => ({ ...c, amount: transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) })).filter((c) => c.amount > 0);
  const total = spentByCat.reduce((s, c) => s + c.amount, 0) || 1;
  const radius = 60, circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const palette = ['#16a34a', '#facc15', '#fb923c', '#4ade80', '#fde047', '#fdba74', '#86efac'];

  // Lọc giao dịch theo khoảng thời gian đã chọn (Tuần / Tháng / Năm)
  function inBreakdownPeriod(tx) {
    const d = new Date(tx.date || tx.created_at);
    const now = new Date();
    if (breakdownPeriod === 'week') { const diff = (now - d) / (1000 * 60 * 60 * 24); return diff >= 0 && diff < 7; }
    if (breakdownPeriod === 'year') return d.getFullYear() === now.getFullYear();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  const periodTx = transactions.filter(inBreakdownPeriod);
  const incomeBreakdown = incomeCats
    .map((c) => ({ ...c, amount: periodTx.filter((t) => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const expenseBreakdown = expenseCats
    .map((c) => ({ ...c, amount: periodTx.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const maxIncomeCat = Math.max(...incomeBreakdown.map((c) => c.amount), 1);
  const maxExpenseCat = Math.max(...expenseBreakdown.map((c) => c.amount), 1);

  // Tổng tài sản = tổng số dư mọi quỹ (mọi danh mục chi tiêu) + tổng số dư mọi tài khoản
  const totalFunds = expenseCats.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalAccounts = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalAssets = totalFunds + totalAccounts;

  // ----- Dữ liệu tính thêm cho bố cục desktop -----
  const now = new Date();
  const thisMonthTx = transactions.filter((t) => { const d = new Date(t.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const incomeThisMonth = thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenseThisMonth = thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // So sánh với tháng trước (hiện % tăng/giảm)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthTx = transactions.filter((t) => { const d = new Date(t.created_at); return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear(); });
  const incomePrevMonth = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expensePrevMonth = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  function pctChange(current, prev) { return prev > 0 ? ((current - prev) / prev) * 100 : null; }
  const incomeChange = pctChange(incomeThisMonth, incomePrevMonth);
  const expenseChange = pctChange(expenseThisMonth, expensePrevMonth);
  const savedChange = pctChange(incomeThisMonth - expenseThisMonth, incomePrevMonth - expensePrevMonth);

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
  const dailyIncome = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return thisMonthTx.filter((t) => t.type === 'income' && new Date(t.created_at).getDate() === day).reduce((s, t) => s + Number(t.amount), 0);
  });
  const maxDaily = Math.max(...dailySpend, ...dailyIncome, 1);

  // 7 ngày gần nhất, cho biểu đồ "Số dư theo ngày"
  const last7 = Array.from({ length: 7 }, (_, i) => daysInMonth - 6 + i).filter((d) => d >= 1);
  const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Giới hạn chi tiêu tổng (tổng hạn mức các danh mục đã đặt) so với đã chi tháng này
  const totalMonthlyLimit = categories.filter((c) => c.type === 'expense' && c.monthly_limit).reduce((s, c) => s + Number(c.monthly_limit), 0);
  const limitPct = totalMonthlyLimit > 0 ? (expenseThisMonth / totalMonthlyLimit) * 100 : 0;

  // Tỷ lệ tiết kiệm tháng này (sức khỏe tài chính)
  const savingsRate = incomeThisMonth > 0 ? Math.max(0, Math.min(100, ((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100)) : 0;

  const filteredTx = transactions.filter((t) => {
    if (!search) return true;
    const cat = categories.find((c) => c.id === t.category_id);
    return (cat?.name || '').toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center md:pl-64 md:pt-20 transition-colors">
      {/* Lớp nền gradient — chỉ hiện trên điện thoại, tách riêng để không xung đột với nền desktop */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 md:hidden" />
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
                <p className="text-gray-900 font-semibold text-base">{formatMoney(fundBalanceWithProfit(f, transactions))}</p>
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

          {/* Sức khỏe tài chính + Hạn mức chi tiêu (thu gọn, cạnh nhau) */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center">
              <p className="text-gray-500 text-xs mb-2 self-start">Sức khỏe tài chính</p>
              <svg width="72" height="72" viewBox="0 0 120 120" className="-rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(savingsRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
              </svg>
              <p className="text-lg font-bold text-gray-900 -mt-11">{Math.round(savingsRate)}%</p>
              <p className="text-gray-400 text-[10px] mt-11">Tỷ lệ tiết kiệm</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col justify-center">
              <p className="text-gray-500 text-xs mb-2">Hạn mức tháng</p>
              {totalMonthlyLimit === 0 ? (
                <p className="text-gray-400 text-xs">Chưa đặt hạn mức nào.</p>
              ) : (
                <>
                  <ProgressBar pct={limitPct} colorClass={limitPct > 100 ? 'bg-red-400' : 'bg-violet-500'} />
                  <p className="text-gray-500 text-[11px] mt-2">{formatMoney(expenseThisMonth)} / {formatMoney(totalMonthlyLimit)}</p>
                </>
              )}
            </div>
          </div>

          {/* Mục tiêu (thu gọn) */}
          {goals && goals.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 font-semibold text-lg">Mục tiêu</h2>
                <button onClick={() => setScreen('goals')} className="text-violet-600 text-sm font-medium">Xem tất cả</button>
              </div>
              <div className="flex flex-col gap-3">
                {goals.slice(0, 2).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 text-sm">{g.name}</span>
                        <span className="text-gray-400 text-xs">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thu nhập & Chi tiêu theo danh mục */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 font-semibold text-lg">Thu/chi theo danh mục</h2>
              <div className="flex bg-gray-100 rounded-full p-0.5">
                {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
                  <button key={p.k} onClick={() => setBreakdownPeriod(p.k)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${breakdownPeriod === p.k ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>{p.l}</button>
                ))}
              </div>
            </div>
            <p className="text-gray-500 text-xs font-medium mb-2">Thu nhập</p>
            {incomeBreakdown.length === 0 ? <p className="text-gray-400 text-xs mb-4">Chưa có thu nhập trong khoảng này.</p> : (
              <div className="flex flex-col gap-2 mb-4">
                {incomeBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5"><span className="text-gray-600 truncate">{c.name}</span><span className="text-gray-900 font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.amount / maxIncomeCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-gray-500 text-xs font-medium mb-2">Chi tiêu</p>
            {expenseBreakdown.length === 0 ? <p className="text-gray-400 text-xs">Chưa có chi tiêu trong khoảng này.</p> : (
              <div className="flex flex-col gap-2">
                {expenseBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5"><span className="text-gray-600 truncate">{c.name}</span><span className="text-gray-900 font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${(c.amount / maxExpenseCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

      {/* ============ BẢN DESKTOP/TABLET (bố cục kiểu dashboard, đúng vị trí như ảnh tham khảo) ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8">
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateAreas: `
              "chart chart right"
              "limit tips  right"
              "cost health goal"
              "history history history"
            `,
          }}
        >
          {/* Tổng quan tài sản — góc trên trái, rộng */}
          <div style={{ gridArea: 'chart' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <p className="text-gray-900 dark:text-white font-semibold mb-4">Tổng quan tài sản</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Tiền ví</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(totalAccounts)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Tiền quỹ</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(totalFunds)}</p>
              </div>
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Tổng cộng</p>
                <p className="text-xl font-bold text-emerald-600">{formatMoney(totalAssets)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 dark:text-gray-500 text-xs">Biến động theo ngày (7 ngày gần nhất)</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Thu nhập</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" />Chi tiêu</span>
              </div>
            </div>
            <div className="flex items-end gap-3 mt-4 h-32">
              {last7.map((day, i) => {
                const inc = dailyIncome[day - 1] || 0;
                const exp = dailySpend[day - 1] || 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex items-end gap-1 h-full">
                      <div className="flex-1 bg-emerald-400 dark:bg-emerald-500 rounded-t-lg" style={{ height: `${(inc / maxDaily) * 100}%`, minHeight: inc > 0 ? 4 : 0 }} />
                      <div className="flex-1 bg-orange-300 dark:bg-orange-500 rounded-t-lg" style={{ height: `${(exp / maxDaily) * 100}%`, minHeight: exp > 0 ? 4 : 0 }} />
                    </div>
                    <span className="text-[11px] text-gray-400">{weekDayLabels[new Date(now.getFullYear(), now.getMonth(), day).getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cột phải — Thu/Chi/Số dư + Tài khoản, xếp chồng, kéo dài xuống 2 hàng như "My card" trong ảnh */}
          <div style={{ gridArea: 'right' }} className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors flex flex-col gap-4">
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Thu nhập tháng này</p>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(incomeThisMonth)}</span>
                <div className="mt-0.5"><ChangeBadge pct={incomeChange} good={true} /></div>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Chi tiêu tháng này</p>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(expenseThisMonth)}</span>
                <div className="mt-0.5"><ChangeBadge pct={expenseChange} good={false} /></div>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800" />
              <div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-0.5">Số dư tiết kiệm tháng này</p>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{formatMoney(incomeThisMonth - expenseThisMonth)}</span>
                <div className="mt-0.5"><ChangeBadge pct={savedChange} good={true} /></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-900 dark:text-white font-semibold">Tài khoản của bạn</h3>
                <button onClick={() => setScreen('accounts')} className="text-emerald-600 text-xs font-medium">Xem tất cả</button>
              </div>
              {accounts.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">Chưa có tài khoản nào.</p> : (
                <div className="flex flex-col gap-3">
                  {accounts.slice(0, 3).map((acc) => (
                    <div key={acc.id} className="flex items-center gap-3">
                      <EmojiCircle emoji={acc.icon} size={36} bg="#ecfdf5" />
                      <div className="flex-1 min-w-0"><p className="text-gray-900 dark:text-white text-sm font-medium">{acc.name}</p></div>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatMoney(accountBalance(acc, transactions))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hạn mức chi tiêu tháng */}
          <div style={{ gridArea: 'limit' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-1">Hạn mức chi tiêu tháng</h3>
            <p className="text-gray-400 text-xs mb-3">{formatMoney(expenseThisMonth)} / {totalMonthlyLimit > 0 ? formatMoney(totalMonthlyLimit) : '—'}</p>
            {totalMonthlyLimit === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">Chưa đặt hạn mức nào. Vào Cài đặt &gt; Danh mục để thêm.</p>
            ) : (
              <ProgressBar pct={limitPct} colorClass={limitPct > 100 ? 'bg-red-400' : 'bg-emerald-500'} />
            )}
          </div>

          {/* Gợi ý tiết kiệm */}
          <div style={{ gridArea: 'tips' }} className="bg-gray-900 dark:bg-emerald-950 rounded-3xl p-6 text-white">
            <h3 className="font-semibold mb-2">💡 Gợi ý tiết kiệm</h3>
            <p className="text-gray-300 dark:text-emerald-200/70 text-sm">
              {savingsRate >= 20
                ? `Tuyệt vời! Bạn đã tiết kiệm được ${Math.round(savingsRate)}% thu nhập tháng này.`
                : `Bạn mới tiết kiệm được ${Math.round(savingsRate)}% thu nhập. Thử đặt hạn mức cho các danh mục hay vượt chi.`}
            </p>
          </div>

          {/* Phân tích chi phí */}
          <div style={{ gridArea: 'cost' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Phân tích chi phí</h3>
              <button onClick={() => setScreen('report')} className="text-emerald-600 text-xs font-medium">Chi tiết</button>
            </div>
            {spentByCat.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có chi tiêu nào.</p> : (
              <div className="flex flex-col items-center gap-4">
                <svg width="120" height="120" viewBox="0 0 150 150" className="-rotate-90 flex-shrink-0">
                  {spentByCat.map((cat, i) => {
                    const pct = cat.amount / total; const dash = pct * circumference; const offset = cumulative; cumulative += dash;
                    return <circle key={cat.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                  })}
                </svg>
                <div className="flex flex-col gap-2 text-sm w-full">
                  {spentByCat.slice(0, 4).map((cat, i) => {
                    const pct = Math.round((cat.amount / total) * 100);
                    return (
                      <div key={cat.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-gray-600 dark:text-gray-300 truncate">{cat.name}</span>
                        <span className="text-gray-400 text-xs ml-auto">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sức khỏe tài chính */}
          <div style={{ gridArea: 'health' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors flex flex-col items-center">
            <h3 className="text-gray-900 dark:text-white font-semibold self-start mb-1">Sức khỏe tài chính</h3>
            <p className="text-gray-400 text-xs self-start mb-4">Tỷ lệ tiết kiệm</p>
            <svg width="100" height="100" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" className="dark:stroke-gray-800" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(savingsRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
            </svg>
            <p className="text-xl font-bold text-gray-900 dark:text-white -mt-14">{Math.round(savingsRate)}%</p>
            <p className="text-gray-400 text-xs mt-14">Dựa trên tháng này</p>
          </div>

          {/* Theo dõi mục tiêu */}
          <div style={{ gridArea: 'goal' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Mục tiêu</h3>
              <button onClick={() => setScreen('goals')} className="text-emerald-600 text-xs font-medium">Xem tất cả</button>
            </div>
            {(!goals || goals.length === 0) ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">Chưa có mục tiêu nào.</p> : (
              <div className="flex flex-col gap-4">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{g.name}</span>
                        <span className="text-gray-400 text-xs">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} colorClass="bg-emerald-500" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Giao dịch gần đây — full width, hàng dưới cùng */}
          <div style={{ gridArea: 'history' }} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 dark:text-white font-semibold">Giao dịch gần đây</h3>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-3 py-2 w-64">
                <Search size={14} className="text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="bg-transparent outline-none text-sm flex-1" />
              </div>
            </div>
            {loading ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-emerald-400" /></div>
              : filteredTx.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">Không có giao dịch nào.</p>
              : (
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {filteredTx.slice(0, 8).map((tx) => {
                    const cat = categories.find((c) => c.id === tx.category_id);
                    return (
                      <div key={tx.id} className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 dark:border-gray-800">
                        <EmojiCircle emoji={cat?.icon} size={32} bg={tx.type === 'income' ? '#ecfdf5' : '#fff7ed'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{cat?.name || 'Khác'}</p>
                          <p className="text-gray-400 text-xs">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <p className={`font-medium text-xs flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>

        {/* Thu nhập & Chi tiêu theo danh mục — hàng riêng bên dưới lưới chính */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-semibold">Thu nhập theo danh mục</h3>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
                {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
                  <button key={p.k} onClick={() => setBreakdownPeriod(p.k)} className={`px-3 py-1 rounded-full text-xs font-medium ${breakdownPeriod === p.k ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-400'}`}>{p.l}</button>
                ))}
              </div>
            </div>
            {incomeBreakdown.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có thu nhập trong khoảng này.</p> : (
              <div className="flex flex-col gap-2.5">
                {incomeBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1"><span className="text-gray-600 dark:text-gray-300 truncate">{c.name}</span><span className="text-gray-900 dark:text-white font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.amount / maxIncomeCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 transition-colors">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Chi tiêu theo danh mục</h3>
            {expenseBreakdown.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có chi tiêu trong khoảng này.</p> : (
              <div className="flex flex-col gap-2.5">
                {expenseBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1"><span className="text-gray-600 dark:text-gray-300 truncate">{c.name}</span><span className="text-gray-900 dark:text-white font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${(c.amount / maxExpenseCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav screen="dashboard" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

/* ---------- Report ---------- */

/* ---------- Chi tiết quỹ ---------- */

function EditFundForm({ category, onClose, onSaved, isNew }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    icon: category?.icon || '',
    description: category?.description || '',
    target_amount: category?.target_amount || '',
    interest_rate: category?.interest_rate || '',
    background_url: category?.background_url || '',
    initial_allocation: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('fund-images').upload(fileName, file);
    if (uploadError) { alert('Lỗi tải ảnh lên: ' + uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from('fund-images').getPublicUrl(fileName);
    setForm((f) => ({ ...f, background_url: data.publicUrl }));
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên quỹ'); return; }
    setSaving(true);
    const payload = {
      name: form.name, icon: form.icon || '💰', type: 'expense', is_fund: true,
      description: form.description || null,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : 0,
      background_url: form.background_url || null,
    };
    if (isNew) {
      const { data: newCat, error } = await supabase.from('categories').insert(payload).select().single();
      if (error) { setSaving(false); alert('Lỗi: ' + error.message); return; }
      if (form.initial_allocation && Number(form.initial_allocation) > 0) {
        await supabase.from('transactions').insert({
          category_id: newCat.id, type: 'allocation', amount: Number(form.initial_allocation),
          note: 'Nạp quỹ lần đầu', date: new Date().toISOString().slice(0, 10),
        });
      }
    } else {
      const { error } = await supabase.from('categories').update(payload).eq('id', category.id);
      if (error) { setSaving(false); alert('Lỗi: ' + error.message); return; }
    }
    setSaving(false);
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{isNew ? 'Tạo quỹ mới' : 'Sửa quỹ'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên quỹ" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji icon (vd: 💊)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả quỹ (không bắt buộc)" rows={2} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none" />

        {isNew && (
          <MoneyInput value={form.initial_allocation} onChange={(v) => setForm({ ...form, initial_allocation: v })} placeholder="Số tiền nạp quỹ lần đầu (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        )}
        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />

        <div className="relative mb-3">
          <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận /năm (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 pr-10 text-sm outline-none" />
          {form.interest_rate && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">%</span>}
        </div>

        <p className="text-sm text-gray-600 mb-2">Ảnh nền quỹ</p>
        {form.background_url && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-gray-100">
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <label className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 text-center cursor-pointer hover:bg-gray-200 transition">
            {uploading ? 'Đang tải...' : 'Tải ảnh từ thiết bị'}
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        <input value={form.background_url} onChange={(e) => setForm({ ...form, background_url: e.target.value })} placeholder="Hoặc dán link ảnh" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />

        <button onClick={handleSave} disabled={saving || uploading} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu quỹ
        </button>
      </div>
    </div>
  );
}

function QuickAllocateWithdrawForm({ category, mode, onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Nhập số tiền'); return; }
    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      category_id: category.id, type: mode, amount: Number(amount), note: note || null,
      date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{mode === 'allocation' ? `Nạp vào ${category.name}` : `Rút từ ${category.name}`}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <MoneyInput value={amount} onChange={setAmount} placeholder="Số tiền" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-lg font-semibold outline-none mb-3" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${mode === 'allocation' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {mode === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ'}
        </button>
      </div>
    </div>
  );
}

function FundDetail({ category, transactions, onBack, reload, setScreen, onAddClick, displayName, theme, toggleTheme }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'allocation' | 'expense' | 'profit'
  const [showEdit, setShowEdit] = useState(false);
  const [quickMode, setQuickMode] = useState(null); // 'allocation' | 'expense' | null

  const allHistory = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const history = filter === 'all' ? allHistory : filter === 'profit' ? [] : allHistory.filter((t) => t.type === filter);

  const balance = fundBalanceWithProfit(category, transactions);
  const principalBalance = fundBalance(category.id, transactions);
  const accruedProfit = Math.max(0, balance - principalBalance);
  const totalIn = allHistory.filter((t) => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = allHistory.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const rate = Number(category.interest_rate || 0);
  const dailyProfit = balance > 0 ? balance * (rate / 100) / 365 : 0;
  const target = Number(category.target_amount || 0);
  const targetPct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

  async function handleDelete() {
    if (!confirm('Xóa quỹ này? Các giao dịch cũ vẫn giữ nguyên số tiền.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pl-64 md:pt-20"
      style={category.background_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)), url(${category.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
      <div className="w-full max-w-sm md:max-w-2xl min-h-screen pb-28 md:pb-10 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <div className="flex items-center gap-2">
              <EmojiCircle emoji={category.icon} size={28} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
              <h1 className="text-white text-lg font-semibold">{category.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
          </div>
        </div>

        {category.description && <p className="px-5 mt-3 text-white/80 text-sm text-center">{category.description}</p>}

        <div className="px-5 mt-4 text-center">
          <p className="text-white/70 text-sm">Số dư hiện tại</p>
          <p className="text-white text-4xl font-bold">{formatMoney(balance)}</p>
          {accruedProfit > 1 && <p className="text-white/70 text-xs mt-1">Trong đó lãi cộng dồn: {formatMoney(accruedProfit)}</p>}
          {target > 0 && (
            <div className="max-w-xs mx-auto mt-3">
              <ProgressBar pct={targetPct} colorClass="bg-white" />
              <p className="text-white/80 text-xs mt-1">{formatMoney(balance)} / {formatMoney(target)} mục tiêu ({Math.round(targetPct)}%)</p>
            </div>
          )}
          {rate > 0 && (
            <p className="text-white/80 text-sm mt-2">
              Lãi suất {rate}%/năm — ước tính <span className="font-semibold">{formatMoney(dailyProfit)}</span>/ngày, cộng dồn tiếp tục sinh lời
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setQuickMode('allocation')} className="bg-white text-emerald-600 rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow-lg">
              <TrendingUp size={15} /> Nạp quỹ
            </button>
            <button onClick={() => setQuickMode('expense')} className="bg-white text-red-500 rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow-lg">
              <TrendingDown size={15} /> Rút quỹ
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[65vh] px-5 pt-6 pb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-emerald-600 text-xs font-medium mb-1">Tổng đã nạp</p>
              <p className="text-emerald-700 font-semibold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-red-500 text-xs font-medium mb-1">Tổng đã rút</p>
              <p className="text-red-600 font-semibold">{formatMoney(totalOut)}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Nạp (Thu)' }, { key: 'expense', label: 'Chi' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 ${filter === f.key ? 'bg-gray-900 text-white font-medium' : 'bg-gray-100 text-gray-500'}`}>{f.label}</button>
            ))}
          </div>

          {filter === 'profit' ? (
            rate === 0 ? <p className="text-gray-400 text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này. Bấm ✏️ để đặt.</p> : (
              <div className="bg-gray-50 rounded-2xl p-5 text-center">
                <p className="text-gray-500 text-sm mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                <p className="text-gray-900 text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                <p className="text-gray-400 text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                <p className="text-gray-400 text-xs mt-1">Lãi được cộng dồn vào số dư và tiếp tục sinh lời (lãi kép), tính từ ngày sau khi nạp.</p>
              </div>
            )
          ) : (
            <>
              <h2 className="text-gray-900 font-semibold text-lg mb-3">Lịch sử</h2>
              {history.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
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
            </>
          )}
        </div>
      </div>

      {showEdit && <EditFundForm category={category} onClose={() => setShowEdit(false)} onSaved={reload} isNew={false} />}
      {quickMode && <QuickAllocateWithdrawForm category={category} mode={quickMode} onClose={() => setQuickMode(null)} onSaved={reload} />}
      <BottomNav screen="funds" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

/* ---------- Danh sách Quỹ ---------- */

function Funds({ setScreen, categories, transactions, onOpenFund, reload, onAddClick, displayName, theme, toggleTheme }) {
  const [showCreate, setShowCreate] = useState(false);
  const funds = categories.filter((c) => c.type === 'expense');
  const totalFunds = funds.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 md:bg-gray-100 relative flex justify-center md:pl-64 md:pt-20 transition-colors">
      {/* ============ BẢN ĐIỆN THOẠI ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">Quản lý quỹ</h1>
          <button onClick={() => setShowCreate(true)} className="w-10 h-10 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Plus size={20} className="text-white" /></button>
        </div>
        <div className="px-5 mt-3">
          <p className="text-white/70 text-sm">Tổng số dư mọi quỹ</p>
          <p className="text-white text-3xl font-bold">{formatMoney(totalFunds)}</p>
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[70vh] px-5 pt-6 pb-6">
          {funds.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Chưa có quỹ nào. Bấm + để tạo quỹ đầu tiên.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {funds.map((f) => {
                const balance = fundBalanceWithProfit(f, transactions);
                const target = Number(f.target_amount || 0);
                const pct = target > 0 ? Math.min(100, (balance / target) * 100) : null;
                return (
                  <button key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 text-left hover:bg-gray-100 transition">
                    <EmojiCircle emoji={f.icon} size={40} bg="#ede9fe" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{f.name}</p>
                      {pct !== null ? (
                        <div className="mt-1"><ProgressBar pct={pct} /></div>
                      ) : (
                        <p className="text-gray-400 text-xs truncate">{f.description || ' '}</p>
                      )}
                    </div>
                    <p className="text-gray-900 font-semibold text-sm flex-shrink-0">{formatMoney(balance)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET — dạng thẻ lớn, khác điện thoại ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-gray-900 text-2xl font-semibold">Quản lý quỹ</h1>
            <p className="text-gray-400 text-sm mt-1">Tổng số dư mọi quỹ: <span className="text-gray-900 font-semibold">{formatMoney(totalFunds)}</span></p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Tạo quỹ mới
          </button>
        </div>

        {funds.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">Chưa có quỹ nào. Bấm "Tạo quỹ mới" để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-5 mt-6">
            {funds.map((f) => {
              const balance = fundBalanceWithProfit(f, transactions);
              const target = Number(f.target_amount || 0);
              const pct = target > 0 ? Math.min(100, (balance / target) * 100) : null;
              return (
                <button key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="text-left bg-white rounded-3xl overflow-hidden shadow-sm shadow-black/5 border border-gray-100 hover:shadow-md transition">
                  <div
                    className="h-24 flex items-end p-4"
                    style={f.background_url
                      ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.45)), url(${f.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}
                  >
                    <span className="text-2xl">{f.icon}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-900 font-semibold truncate">{f.name}</p>
                    {f.description && <p className="text-gray-400 text-xs mt-0.5 truncate">{f.description}</p>}
                    <p className="text-gray-900 text-xl font-bold mt-2">{formatMoney(balance)}</p>
                    {pct !== null && (
                      <div className="mt-2">
                        <ProgressBar pct={pct} colorClass="bg-violet-500" />
                        <p className="text-gray-400 text-xs mt-1">{Math.round(pct)}% / mục tiêu {formatMoney(target)}</p>
                      </div>
                    )}
                    {f.interest_rate > 0 && <p className="text-emerald-600 text-xs font-medium mt-2">Lãi {f.interest_rate}%/năm</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <EditFundForm onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
      <BottomNav screen="funds" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

/* ---------- Financial Report ---------- */

function Report({ setScreen, onAddClick, displayName, theme, toggleTheme }) {
  const [period, setPeriod] = useState('Monthly');
  const periods = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  const periodLabels = { Weekly: 'Tuần', Monthly: 'Tháng', Quarterly: 'Quý', Yearly: 'Năm' };
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pl-64 md:pt-20">
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

const PRIORITY_TERMS = [
  { value: '<1 năm - Siêu ngắn hạn', color: '#dc2626', bg: '#fee2e2' },
  { value: '1-3 năm - Hơi ngắn hạn', color: '#2563eb', bg: '#dbeafe' },
  { value: '3-5 năm - Ngắn hạn', color: '#ea580c', bg: '#ffedd5' },
  { value: '5-10 năm - Hơi dài hạn', color: '#7c3aed', bg: '#ede9fe' },
  { value: '>10 năm - Siêu dài hạn', color: '#be185d', bg: '#fce7f3' },
];

function priorityStyle(value) {
  return PRIORITY_TERMS.find((p) => p.value === value) || { color: '#6b7280', bg: '#f3f4f6' };
}

// Tính "X năm Y tháng Z ngày" giữa 2 ngày
function durationText(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr), end = new Date(endStr);
  if (end < start) return null;
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) { months -= 1; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} năm`);
  if (months > 0) parts.push(`${months} tháng`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);
  return parts.join(' ');
}

function EditGoalForm({ goal, onClose, onSaved, isNew }) {
  const [form, setForm] = useState({
    name: goal?.name || '',
    priority_term: goal?.priority_term || PRIORITY_TERMS[1].value,
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || '',
    start_date: goal?.start_date || new Date().toISOString().slice(0, 10),
    note: goal?.note || '',
    isDone: goal?.status === 'Hoàn thành',
    end_date: goal?.end_date || new Date().toISOString().slice(0, 10),
    actual_amount: goal?.actual_amount || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name) { alert('Nhập tên mục tiêu'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      priority_term: form.priority_term,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      current_amount: form.current_amount ? Number(form.current_amount) : 0,
      start_date: form.start_date || null,
      note: form.note || null,
      status: form.isDone ? 'Hoàn thành' : 'Đang làm',
      end_date: form.isDone ? form.end_date : null,
      actual_amount: form.isDone && form.actual_amount ? Number(form.actual_amount) : null,
    };
    const { error } = isNew ? await supabase.from('goals').insert(payload) : await supabase.from('goals').update(payload).eq('id', goal.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  async function handleDelete() {
    if (!confirm('Xóa mục tiêu này?')) return;
    setSaving(true);
    const { error } = await supabase.from('goals').delete().eq('id', goal.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{isNew ? 'Mục tiêu mới' : 'Sửa mục tiêu'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên mục tiêu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />

        <p className="text-sm text-gray-600 mb-2">Mức độ ưu tiên</p>
        <select value={form.priority_term} onChange={(e) => setForm({ ...form, priority_term: e.target.value })} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3">
          {PRIORITY_TERMS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
        </select>

        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <MoneyInput value={form.current_amount} onChange={(v) => setForm({ ...form, current_amount: v })} placeholder="Số tiền hiện có" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />

        <p className="text-sm text-gray-600 mb-2">Ngày bắt đầu</p>
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />

        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (không bắt buộc)" rows={2} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none" />

        <label className="flex items-center gap-2 mb-3 text-sm text-gray-700">
          <input type="checkbox" checked={form.isDone} onChange={(e) => setForm({ ...form, isDone: e.target.checked })} /> Đã hoàn thành
        </label>

        {form.isDone && (
          <>
            <p className="text-sm text-gray-600 mb-2">Ngày hoàn thành</p>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <MoneyInput value={form.actual_amount} onChange={(v) => setForm({ ...form, actual_amount: v })} placeholder="Số tiền thực tế khi hoàn thành (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
          </>
        )}

        <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mb-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu mục tiêu
        </button>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} className="w-full bg-red-50 text-red-500 rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
            <Trash2 size={16} /> Xóa mục tiêu
          </button>
        )}
      </div>
    </div>
  );
}

function Goals({ setScreen, goals, loadingGoals, reload, onAddClick, displayName, theme, toggleTheme }) {
  const [editingGoal, setEditingGoal] = useState(null); // goal object | 'new' | null

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 md:bg-gray-100 flex justify-center md:pl-64 md:pt-20 transition-colors">
      {/* ============ BẢN ĐIỆN THOẠI ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Mục tiêu</h1>
        </div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[80vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-semibold text-lg">Mục tiêu của tôi</h2>
            <button onClick={() => setEditingGoal('new')} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={16} className="text-gray-600" /></button>
          </div>
          {loadingGoals ? <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
            : goals.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">Chưa có mục tiêu nào.</p>
            : <div className="flex flex-col gap-5">
                {goals.map((goal) => {
                  const pct = goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                  const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                  const pStyle = priorityStyle(goal.priority_term);
                  const isDone = goal.status === 'Hoàn thành';
                  return (
                    <button key={goal.id} onClick={() => setEditingGoal(goal)} className="text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-br from-violet-400 to-fuchsia-500'}`}>
                          {isDone ? <Check size={18} className="text-white" /> : <Target size={18} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium text-sm">{goal.name}</p>
                          {goal.priority_term && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                        </div>
                        <p className="text-gray-900 font-semibold text-sm flex-shrink-0">{formatMoney(goal.current_amount || 0)}</p>
                      </div>
                      <ProgressBar pct={pct} colorClass={isDone ? 'bg-emerald-500' : 'bg-violet-600'} />
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>{goal.target_amount ? `Còn thiếu ${formatMoney(Math.max(0, remaining))}` : ''}</span>
                        <span>{goal.target_amount ? formatMoney(goal.target_amount) : ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>}
        </div>
        <BottomNav screen="goals" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* ============ BẢN DESKTOP/TABLET — dạng bảng ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-gray-900 text-2xl font-semibold">Mục tiêu của tôi</h1>
          <button onClick={() => setEditingGoal('new')} className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Mục tiêu mới
          </button>
        </div>

        {loadingGoals ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
          : goals.length === 0 ? <p className="text-gray-400 text-sm text-center py-16">Chưa có mục tiêu nào.</p>
          : (
            <div className="bg-white rounded-3xl shadow-sm shadow-black/5 border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="p-4 font-medium">Mục tiêu</th>
                    <th className="p-4 font-medium">Mức ưu tiên</th>
                    <th className="p-4 font-medium text-right">Mục tiêu</th>
                    <th className="p-4 font-medium text-right">Hiện có</th>
                    <th className="p-4 font-medium text-right">Còn thiếu</th>
                    <th className="p-4 font-medium">Tiến độ</th>
                    <th className="p-4 font-medium">Bắt đầu</th>
                    <th className="p-4 font-medium">Hoàn thành</th>
                    <th className="p-4 font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => {
                    const pct = goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                    const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    const isDone = goal.status === 'Hoàn thành';
                    const duration = isDone ? durationText(goal.start_date, goal.end_date) : null;
                    return (
                      <tr key={goal.id} onClick={() => setEditingGoal(goal)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer">
                        <td className="p-4">
                          <p className={`font-medium ${isDone ? 'text-emerald-600' : 'text-gray-900'}`}>{isDone && '✓ '}{goal.name}</p>
                          {goal.note && <p className="text-gray-400 text-xs mt-0.5 max-w-[220px] truncate">{goal.note}</p>}
                        </td>
                        <td className="p-4">
                          {goal.priority_term && <span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                        </td>
                        <td className="p-4 text-right text-gray-900">{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</td>
                        <td className="p-4 text-right text-gray-900">{formatMoney(goal.current_amount || 0)}</td>
                        <td className="p-4 text-right text-gray-500">{goal.target_amount ? formatMoney(Math.max(0, remaining)) : '—'}</td>
                        <td className="p-4 w-32">
                          <ProgressBar pct={pct} colorClass={isDone ? 'bg-emerald-500' : 'bg-violet-600'} />
                          <p className="text-gray-400 text-xs mt-1">{Math.round(pct)}%</p>
                        </td>
                        <td className="p-4 text-gray-500 whitespace-nowrap">{goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</td>
                        <td className="p-4 text-gray-500 whitespace-nowrap">
                          {isDone ? (
                            <>
                              <p>{new Date(goal.end_date).toLocaleDateString('vi-VN')}</p>
                              {duration && <p className="text-xs text-gray-400">{duration}</p>}
                              {goal.actual_amount && <p className="text-xs text-emerald-600">Thực tế: {formatMoney(goal.actual_amount)}</p>}
                            </>
                          ) : <span className="text-gray-300">Chưa xong</span>}
                        </td>
                        <td className="p-4 text-gray-400 text-xs max-w-[180px] truncate">{goal.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editingGoal && <EditGoalForm goal={editingGoal === 'new' ? null : editingGoal} isNew={editingGoal === 'new'} onClose={() => setEditingGoal(null)} onSaved={reload} />}
      <BottomNav screen="goals" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
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

function QuickAdjustBalanceForm({ account, onClose, onSaved }) {
  const [mode, setMode] = useState('increase'); // 'increase' | 'decrease'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Nhập số tiền'); return; }
    setSaving(true);
    const signedAmount = mode === 'increase' ? Number(amount) : -Number(amount);
    const { error } = await supabase.from('transactions').insert({
      account_id: account.id, type: 'adjustment', amount: signedAmount,
      note: note || 'Cập nhật số dư', date, created_at: new Date(date + 'T' + new Date().toTimeString().slice(0, 8)).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Cập nhật số dư — {account.name}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="flex bg-gray-100 rounded-full p-1 mb-3">
          <button onClick={() => setMode('increase')} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'increase' ? 'bg-white text-emerald-600 shadow' : 'text-gray-400'}`}>Tăng số dư</button>
          <button onClick={() => setMode('decrease')} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'decrease' ? 'bg-white text-red-500 shadow' : 'text-gray-400'}`}>Giảm số dư</button>
        </div>
        <MoneyInput value={amount} onChange={setAmount} placeholder="Số tiền" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-lg font-semibold outline-none mb-3" />
        <p className="text-sm text-gray-600 mb-2">Ngày</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${mode === 'increase' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu cập nhật
        </button>
      </div>
    </div>
  );
}

function EditAccountModal({ account, onClose, onSaved }) {
  const [form, setForm] = useState({ name: account.name, icon: account.icon || '', type: account.type || 'cash', initial_balance: account.initial_balance || '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name) { alert('Nhập tên tài khoản'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '💰', type: form.type, initial_balance: form.initial_balance ? Number(form.initial_balance) : 0 };
    const { error } = await supabase.from('accounts').update(payload).eq('id', account.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Sửa tài khoản</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3">
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
        <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu
        </button>
      </div>
    </div>
  );
}

function AccountDetail({ account, transactions, categories, onBack, reload, setScreen, onAddClick, displayName, theme, toggleTheme }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const history = transactions
    .filter((t) => t.account_id === account.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const balance = accountBalance(account, transactions);
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label || account.type;

  async function handleDelete() {
    if (!confirm('Xóa tài khoản này? Các giao dịch cũ vẫn giữ nguyên số tiền.')) return;
    const { error } = await supabase.from('accounts').delete().eq('id', account.id);
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pl-64 md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl min-h-screen pb-28 md:pb-10 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <div className="flex items-center gap-2">
              <EmojiCircle emoji={account.icon} size={28} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
              <div>
                <h1 className="text-white text-lg font-semibold leading-tight">{account.name}</h1>
                <p className="text-white/70 text-xs">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
          </div>
        </div>

        <div className="px-5 mt-4 text-center">
          <p className="text-white/70 text-sm">Số dư hiện tại</p>
          <p className="text-white text-4xl font-bold">{formatMoney(balance)}</p>
          <div className="flex items-center justify-center mt-4">
            <button onClick={() => setShowAdjust(true)} className="bg-white text-gray-900 rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow-lg">
              <Pencil size={14} /> Cập nhật số dư
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[65vh] px-5 pt-6 pb-6">
          <h2 className="text-gray-900 font-semibold text-lg mb-3">Lịch sử</h2>
          {history.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
            <div className="flex flex-col divide-y divide-gray-100">
              {history.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                const label = tx.type === 'adjustment' ? 'Cập nhật số dư' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {isPositive ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm">{label}</p>
                      <p className="text-gray-400 text-xs">{tx.note || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <p className={`font-medium text-sm flex-shrink-0 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showAdjust && <QuickAdjustBalanceForm account={account} onClose={() => setShowAdjust(false)} onSaved={reload} />}
        {showEdit && <EditAccountModal account={account} onClose={() => setShowEdit(false)} onSaved={reload} />}
        <BottomNav screen="accounts" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </div>
  );
}

function Accounts({ setScreen, accounts, transactions, onOpenAccount, onAddClick, displayName, theme, toggleTheme }) {
  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pl-64 md:pt-20">
      <div className="w-full max-w-sm md:max-w-2xl lg:max-w-3xl min-h-screen pb-28 md:pb-10 md:pt-4 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Quản lý ví</h1>
        </div>
        <div className="px-5 mt-4 text-center"><p className="text-white/80 text-sm">Tổng tất cả tài khoản</p><p className="text-white text-3xl font-bold">{formatMoney(totalBalance)}</p></div>
        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[70vh] px-5 pt-6 pb-6">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            {accounts.map((acc) => (
              <button key={acc.id} onClick={() => onOpenAccount(acc.id, 'accounts')} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 text-left hover:bg-gray-100 transition">
                <EmojiCircle emoji={acc.icon} size={44} bg="#ede9fe" />
                <div className="flex-1 min-w-0"><p className="text-gray-900 font-medium text-sm">{acc.name}</p><p className="text-gray-400 text-xs capitalize">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p></div>
                <p className="text-gray-900 font-semibold">{formatMoney(accountBalance(acc, transactions))}</p>
              </button>
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
            <MoneyInput value={form.monthly_limit} onChange={(v) => setForm({ ...form, monthly_limit: v })} placeholder="Hạn mức tối đa mỗi lần nhập (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
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
  { value: 'debt', label: 'Thu nợ' },
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
            <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-4" />
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
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center md:pl-64 md:pt-20">
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
  const [fundReturnScreen, setFundReturnScreen] = useState('dashboard');
  function openFund(id, from = 'dashboard') { setSelectedFundId(id); setFundReturnScreen(from); setScreen('fund-detail'); }
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountReturnScreen, setAccountReturnScreen] = useState('accounts');
  function openAccount(id, from = 'accounts') { setSelectedAccountId(id); setAccountReturnScreen(from); setScreen('account-detail'); }

  if (screen === 'fund-detail') {
    const cat = categories.find((c) => c.id === selectedFundId);
    if (!cat) { setScreen('dashboard'); return null; }
    return <><FundDetail category={cat} transactions={transactions} onBack={() => setScreen(fundReturnScreen)} reload={loadAll} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  }
  if (screen === 'account-detail') {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (!acc) { setScreen('accounts'); return null; }
    return <><AccountDetail account={acc} transactions={transactions} categories={categories} onBack={() => setScreen(accountReturnScreen)} reload={loadAll} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  }
  if (screen === 'funds') return <Funds setScreen={setScreen} categories={categories} transactions={transactions} onOpenFund={openFund} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />;
  if (screen === 'report') return <><Report setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'goals') return <><Goals setScreen={setScreen} goals={goals} loadingGoals={loadingGoals} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'accounts') return <><Accounts setScreen={setScreen} accounts={accounts} transactions={transactions} onOpenAccount={openAccount} onAddClick={() => setShowAdd(true)} displayName={displayName} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  if (screen === 'settings') return <><Settings setScreen={setScreen} categories={categories} accounts={accounts} reload={loadAll} user={currentUser} onProfileUpdated={refreshUser} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
  return <><Dashboard setScreen={setScreen} transactions={transactions} categories={categories} accounts={accounts} goals={goals} loading={loading} displayName={displayName} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} onOpenFund={(id) => openFund(id, 'dashboard')} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} onSaved={loadAll} />}</>;
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
