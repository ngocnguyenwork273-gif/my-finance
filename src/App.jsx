import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, Sparkles, Plus, BarChart3, Settings as SettingsIcon, TrendingUp, TrendingDown, PiggyBank, HeartPulse,
  ArrowLeft, Download, X, Check, Loader2, Target, Wallet, Trash2, Pencil, LogOut, Mail, Lock, Search, Bell, Sun, Moon,
  Filter, MoreHorizontal, Eye, LayoutGrid, List, ArrowUpDown, Calendar, Clock, Star,
  ChevronDown, ChevronRight, ChevronLeft, Camera, KeyRound, UserCog, SlidersHorizontal,
} from 'lucide-react';

const monthlyLimit = 5000000;
const monthlySpent = 3420000;

function formatMoney(n) {
  return Math.abs(n).toLocaleString('en-US') + 'đ';
}
// Bảng màu mặc định cho thẻ quỹ khi chưa có ảnh nền riêng — mỗi quỹ 1 màu xoay vòng, giống kiểu MoMo
const FUND_CARD_GRADIENTS = [
  'linear-gradient(135deg, #fbcfe8, #fde68a)',
  'linear-gradient(135deg, #38bdf8, #0369a1)',
  'linear-gradient(135deg, #fb923c, #ea580c)',
  'linear-gradient(135deg, #a78bfa, #db2777)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #f87171, #b91c1c)',
];
function fundCardBackground(f, index) {
  if (f.background_url) return `linear-gradient(rgba(0,0,0,0.18),rgba(0,0,0,0.18)), url(${f.background_url})`;
  return FUND_CARD_GRADIENTS[index % FUND_CARD_GRADIENTS.length];
}
// "2 ngày trước" — dùng cho mục Hoạt động gần đây kiểu MoMo
function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
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

// Trả về các giao dịch nạp/rút kèm "số dư sau giao dịch" tại đúng thời điểm đó
// (đã cộng dồn lãi kép của các ngày trước đó), dùng cùng công thức với fundBalanceWithProfit
function fundTransactionsWithBalance(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const dailyRate = rate / 100 / 365;
  const txs = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));
  if (txs.length === 0) return [];

  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(txs[0].date || txs[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const txsByDay = {};
  txs.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    (txsByDay[key] = txsByDay[key] || []).push(t);
  });

  const result = [];
  let balance = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    (txsByDay[cursor.getTime()] || []).forEach((t) => {
      balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
      result.push({ ...t, balanceAfter: balance });
    });
    if (balance > 0 && dailyRate > 0) balance *= 1 + dailyRate;
    cursor.setDate(cursor.getDate() + 1);
  }
  // Giao dịch hôm nay: cộng vào số dư, chưa tính lãi hôm nay (lãi hôm nay chỉ hiện từ ngày mai)
  (txsByDay[today.getTime()] || []).forEach((t) => {
    balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    result.push({ ...t, balanceAfter: balance });
  });

  return result;
}

// Lịch sử lợi nhuận từng ngày của quỹ (mỗi ngày 1 dòng) — dùng cùng công thức lãi kép với fundBalanceWithProfit
function fundDailyProfitHistory(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  if (history.length === 0 || rate <= 0) return [];

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const changesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
  });

  const days = [];
  let balance = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    let profit = 0;
    if (balance > 0 && dailyRate > 0) {
      profit = balance * dailyRate;
      balance += profit;
    }
    if (profit > 0.5) days.push({ date: new Date(cursor), profit, balance });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.reverse(); // Ngày gần nhất lên đầu
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

/* ---------- Kỳ thu nhập (chu kỳ 21 tháng trước -> 20 tháng này) ---------- */
// Mọi khoản Thu nhập được gán vào 1 "Kỳ". Nạp quỹ / Chi tiêu có thể chọn rút thẳng từ
// bể thu nhập của 1 Kỳ thay vì từ ví. Vì bảng transactions chưa có cột riêng cho Kỳ,
// ta gắn thẻ ẩn `[KY:YYYY-MM] ` vào đầu note để lưu và truy vấn lại.
const PERIOD_TAG_RE = /^\[KY:(\d{4}-\d{2})\]\s?/;
function tagPeriodNote(periodKey, note) { return periodKey ? `[KY:${periodKey}] ${note || ''}`.trim() : (note || null); }
function parsePeriodTag(note) { const m = (note || '').match(PERIOD_TAG_RE); return m ? m[1] : null; }
function stripPeriodTag(note) { return (note || '').replace(PERIOD_TAG_RE, ''); }

// Danh sách 12 Kỳ (Tháng 1 -> Tháng 12) của 1 năm, mỗi kỳ chạy từ 21 tháng trước đến 20 tháng đó
function buildPeriods(year) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let startM = m - 1, startY = year;
    if (startM === 0) { startM = 12; startY = year - 1; }
    return {
      key: `${year}-${String(m).padStart(2, '0')}`,
      label: `Tháng ${m} (21/${startM} - 20/${m})`,
    };
  });
}
// Kỳ chứa ngày hôm nay (dùng làm giá trị mặc định)
function currentPeriodKey(today = new Date()) {
  let m = today.getMonth() + 1, y = today.getFullYear();
  if (today.getDate() > 20) { m += 1; if (m > 12) { m = 1; y += 1; } }
  return `${y}-${String(m).padStart(2, '0')}`;
}
// Tổng thu nhập đã gom, đã dùng (nạp quỹ/chi tiêu rút từ kỳ) và còn lại của 1 Kỳ
function periodPool(transactions, periodKey) {
  const total = transactions.filter((t) => t.type === 'income' && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  const used = transactions.filter((t) => (t.type === 'allocation' || t.type === 'expense') && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  return { total, used, remaining: total - used };
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
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'signup' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-white/60'}`}>
            Đăng ký
          </button>
          <button
            onClick={() => { setMode('login'); setMessage(''); }}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'login' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-white/60'}`}>
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
  return <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>;
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
  { key: 'funds', icon: PiggyBank, label: 'Quản lý quỹ' },
  { key: 'accounts', icon: Wallet, label: 'Quản lý ví' },
  { key: 'goals', icon: Sparkles, label: 'Mục tiêu' },
  { key: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
];

function BottomNav({ screen, setScreen, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);

  async function handleLogout() {
    setShowDesktopMenu(false);
    await supabase.auth.signOut();
  }

  return (
    <>
      {/* Thanh dưới cùng — chỉ hiện trên điện thoại. Chia đều 2 bên nút Thêm ở giữa. */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-sm bg-white dark:bg-gray-900 rounded-full shadow-xl shadow-black/10 px-6 py-3 flex items-center justify-between z-10 md:hidden">
        <div className="flex items-center gap-7">
          <button onClick={() => setScreen('dashboard')}><Home size={19} className={screen === 'dashboard' ? 'text-gray-900 dark:text-white' : 'text-gray-300'} /></button>
          <button onClick={() => setScreen('funds')}><PiggyBank size={19} className={screen === 'funds' ? 'text-gray-900 dark:text-white' : 'text-gray-300'} /></button>
        </div>
        <button onClick={onAddClick} className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg flex-shrink-0"><Plus size={20} className="text-white" /></button>
        <div className="flex items-center gap-7">
          <button onClick={() => setScreen('accounts')}><Wallet size={19} className={screen === 'accounts' ? 'text-gray-900 dark:text-white' : 'text-gray-300'} /></button>
          <button onClick={() => setScreen('goals')}><Sparkles size={19} className={screen === 'goals' ? 'text-gray-900 dark:text-white' : 'text-gray-300'} /></button>
        </div>
      </div>

      {/* Nút Sáng/Tối nổi — chỉ hiện trên điện thoại, có mặt ở mọi màn hình */}
      <button onClick={toggleTheme} className="fixed top-6 right-5 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg flex items-center justify-center z-20 md:hidden">
        {theme === 'dark' ? <Sun size={17} className="text-yellow-500" /> : <Moon size={17} className="text-gray-600 dark:text-gray-300" />}
      </button>

      {/* Sidebar bên trái — chỉ hiện trên tablet/PC (từ md trở lên) */}
      <div className={`hidden md:flex flex-col fixed left-0 top-0 h-screen ${sidebarCollapsed ? 'w-20 px-2' : 'w-64 px-5'} bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800 py-6 z-20 transition-all duration-200`}>
        <div className={`flex items-center mb-8 ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-1'}`}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Wallet size={17} className="text-white" />
          </div>
          {!sidebarCollapsed && <span className="font-semibold text-gray-900 dark:text-white">MyFinance</span>}
        </div>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setScreen(key)} title={sidebarCollapsed ? label : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} ${screen === key ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
              <Icon size={17} />{!sidebarCollapsed && label}
            </button>
          ))}
        </div>

        <div className={`mt-auto flex flex-col gap-3 ${sidebarCollapsed ? 'items-center' : ''}`}>
          <button onClick={toggleSidebar} title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className={`flex items-center rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition ${sidebarCollapsed ? 'justify-center px-0 py-2.5 w-10' : 'gap-3 px-3 py-2.5'}`}>
            {sidebarCollapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} />Thu gọn</>}
          </button>
          {sidebarCollapsed ? (
            <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 rounded-full p-1 self-start">
              <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                <Sun size={15} />
              </button>
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'dark' ? 'bg-gray-800 shadow text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                <Moon size={15} />
              </button>
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="bg-gray-900 dark:bg-emerald-500/10 rounded-2xl p-4">
              <p className="text-white dark:text-emerald-300 text-sm font-semibold mb-1">💡 Mẹo hôm nay</p>
              <p className="text-gray-300 dark:text-emerald-200/70 text-xs">Nạp quỹ ngay khi có thu nhập để kiểm soát chi tiêu tốt hơn.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top bar bên trong nội dung — chỉ hiện trên tablet/PC */}
      <div className={`hidden md:flex fixed top-0 ${sidebarCollapsed ? 'left-20' : 'left-64'} right-0 h-20 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 items-center px-8 z-10 transition-all duration-200`}>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-full px-4 py-2.5 w-72">
          <Search size={16} className="text-gray-400 dark:text-gray-500" />
          <input placeholder="Tìm kiếm nhanh" className="bg-transparent outline-none text-sm flex-1" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={onAddClick} className="bg-emerald-500 text-white rounded-full px-4 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Thêm giao dịch
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-500 dark:text-gray-400"><Bell size={16} /></button>
          <div className="relative">
            <button onClick={() => setShowDesktopMenu((v) => !v)} className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-semibold text-sm flex-shrink-0">
                  {(displayName || 'B')[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">{displayName || 'Bạn'}</span>
              <ChevronDown size={14} className="text-gray-400 dark:text-gray-500" />
            </button>
            {showDesktopMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDesktopMenu(false)} />
                <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/10 border border-gray-100 dark:border-gray-700 py-1.5 w-56 z-40">
                  <button onClick={() => { setShowDesktopMenu(false); openSettings ? openSettings('profile') : setScreen('settings'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <UserCog size={15} /> Cài đặt tài khoản
                  </button>
                  <button onClick={() => { setShowDesktopMenu(false); openSettings ? openSettings('categories') : setScreen('settings'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <SlidersHorizontal size={15} /> Cài đặt hệ thống
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700">
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ setScreen, transactions, categories, accounts, goals, loading, displayName, avatarUrl, onAddClick, theme, toggleTheme, onOpenFund, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [search, setSearch] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
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
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* Lớp nền gradient — chỉ hiện trên điện thoại, tách riêng để không xung đột với nền desktop */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 md:hidden" />
      {/* ============ BẢN ĐIỆN THOẠI (giữ nguyên) ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div><p className="text-white/80 text-sm">Chào bạn!</p><h1 className="text-white text-2xl font-semibold">{displayName || 'Bạn'}</h1></div>
          <div className="relative">
            <button onClick={() => setShowAccountMenu((v) => !v)} className="w-11 h-11 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white border border-white/40 overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-semibold">{(displayName || 'B')[0].toUpperCase()}</span>}
            </button>
            {showAccountMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowAccountMenu(false)} />
                <div className="absolute top-14 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-black/10 border border-gray-100 dark:border-gray-700 py-1.5 w-52 z-40">
                  <button onClick={() => { setShowAccountMenu(false); openSettings ? openSettings('profile') : setScreen('settings'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <UserCog size={15} /> Cài đặt tài khoản
                  </button>
                  <button onClick={() => { setShowAccountMenu(false); openSettings ? openSettings('categories') : setScreen('settings'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <SlidersHorizontal size={15} /> Cài đặt hệ thống
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1.5" />
                  <button onClick={async () => { setShowAccountMenu(false); await supabase.auth.signOut(); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-gray-700">
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
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
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-3">{f.name}</p>
                <p className="text-gray-900 dark:text-white font-semibold text-base">{formatMoney(fundBalanceWithProfit(f, transactions))}</p>
              </button>
            ))}
        </div>
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-t-[2.5rem] min-h-[60vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Ngân sách tháng này</h2>
          </div>
          {spentByCat.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có chi tiêu nào tháng này.</p> : (
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
                    <span className="text-gray-600 dark:text-gray-300">{cat.name}</span><span className="text-gray-900 dark:text-white font-medium ml-auto">{formatMoney(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sức khỏe tài chính + Hạn mức chi tiêu (thu gọn, cạnh nhau) */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-2 self-start">Sức khỏe tài chính</p>
              <svg width="72" height="72" viewBox="0 0 120 120" className="-rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(savingsRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
              </svg>
              <p className="text-lg font-bold text-gray-900 dark:text-white -mt-11">{Math.round(savingsRate)}%</p>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-11">Tỷ lệ tiết kiệm</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 flex flex-col justify-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">Hạn mức tháng</p>
              {totalMonthlyLimit === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-xs">Chưa đặt hạn mức nào.</p>
              ) : (
                <>
                  <ProgressBar pct={limitPct} colorClass={limitPct > 100 ? 'bg-red-400' : 'bg-violet-500'} />
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-2">{formatMoney(expenseThisMonth)} / {formatMoney(totalMonthlyLimit)}</p>
                </>
              )}
            </div>
          </div>

          {/* Mục tiêu (thu gọn) */}
          {goals && goals.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Mục tiêu</h2>
                <button onClick={() => setScreen('goals')} className="text-violet-600 text-sm font-medium">Xem tất cả</button>
              </div>
              <div className="flex flex-col gap-3">
                {goals.slice(0, 2).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{g.name}</span>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">{Math.round(pct)}%</span>
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
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Thu/chi theo danh mục</h2>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-0.5">
                {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
                  <button key={p.k} onClick={() => setBreakdownPeriod(p.k)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${breakdownPeriod === p.k ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{p.l}</button>
                ))}
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">Thu nhập</p>
            {incomeBreakdown.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-xs mb-4">Chưa có thu nhập trong khoảng này.</p> : (
              <div className="flex flex-col gap-2 mb-4">
                {incomeBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5"><span className="text-gray-600 dark:text-gray-300 truncate">{c.name}</span><span className="text-gray-900 dark:text-white font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(c.amount / maxIncomeCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-2">Chi tiêu</p>
            {expenseBreakdown.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-xs">Chưa có chi tiêu trong khoảng này.</p> : (
              <div className="flex flex-col gap-2">
                {expenseBreakdown.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-0.5"><span className="text-gray-600 dark:text-gray-300 truncate">{c.name}</span><span className="text-gray-900 dark:text-white font-medium flex-shrink-0 ml-2">{formatMoney(c.amount)}</span></div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${(c.amount / maxExpenseCat) * 100}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 mb-3"><h2 className="text-gray-900 dark:text-white font-semibold text-lg">Giao dịch</h2></div>
          {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
            : transactions.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
            : <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                {transactions.slice(0, 20).map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3">
                      <EmojiCircle emoji={cat?.icon} size={40} bg={tx.type === 'income' ? '#ecfdf5' : '#f5f3ff'} />
                      <div className="flex-1 min-w-0"><p className="text-gray-900 dark:text-white font-medium text-sm">{cat?.name || 'Khác'}</p><p className="text-gray-400 dark:text-gray-500 text-xs">{stripPeriodTag(tx.note) || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p></div>
                      <p className={`font-medium text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</p>
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
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Thu nhập</span>
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-orange-400" />Chi tiêu</span>
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
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{weekDayLabels[new Date(now.getFullYear(), now.getMonth(), day).getDay()]}</span>
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
            <p className="text-gray-400 dark:text-gray-500 text-xs mb-3">{formatMoney(expenseThisMonth)} / {totalMonthlyLimit > 0 ? formatMoney(totalMonthlyLimit) : '—'}</p>
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
                        <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">{pct}%</span>
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
            <p className="text-gray-400 dark:text-gray-500 text-xs self-start mb-4">Tỷ lệ tiết kiệm</p>
            <svg width="100" height="100" viewBox="0 0 120 120" className="-rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" className="dark:stroke-gray-800" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(savingsRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
            </svg>
            <p className="text-xl font-bold text-gray-900 dark:text-white -mt-14">{Math.round(savingsRate)}%</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-14">Dựa trên tháng này</p>
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
                        <span className="text-gray-400 dark:text-gray-500 text-xs">{Math.round(pct)}%</span>
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
                <Search size={14} className="text-gray-400 dark:text-gray-500" />
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
                          <p className="text-gray-400 dark:text-gray-500 text-xs">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</p>
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
                  <button key={p.k} onClick={() => setBreakdownPeriod(p.k)} className={`px-3 py-1 rounded-full text-xs font-medium ${breakdownPeriod === p.k ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>{p.l}</button>
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

      <BottomNav screen="dashboard" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
    </div>
  );
}

/* ---------- Report ---------- */

/* ---------- Chi tiết quỹ ---------- */

function EditFundForm({ category, onClose, onSaved, isNew, initialAmount, firstAllocation }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    icon: category?.icon || '',
    description: category?.description || '',
    target_amount: category?.target_amount || '',
    interest_rate: category?.interest_rate || '',
    background_url: category?.background_url || '',
    initial_allocation: isNew ? '' : (initialAmount || ''),
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
      // Cập nhật số tiền ban đầu — sửa khoản nạp đầu tiên nếu có, hoặc tạo mới nếu quỹ chưa có khoản nạp nào
      const newInitial = form.initial_allocation ? Number(form.initial_allocation) : 0;
      if (newInitial !== Number(initialAmount || 0)) {
        if (firstAllocation) {
          if (newInitial > 0) {
            await supabase.from('transactions').update({ amount: newInitial }).eq('id', firstAllocation.id);
          }
        } else if (newInitial > 0) {
          await supabase.from('transactions').insert({
            category_id: category.id, type: 'allocation', amount: newInitial,
            note: 'Nạp quỹ lần đầu', date: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }
    setSaving(false);
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{isNew ? 'Tạo quỹ mới' : 'Sửa quỹ'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 dark:text-gray-400" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên quỹ" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji icon (vd: 💊)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả quỹ (không bắt buộc)" rows={2} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-gray-500" />

        {!isNew && <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Số tiền ban đầu</p>}
        <MoneyInput value={form.initial_allocation} onChange={(v) => setForm({ ...form, initial_allocation: v })} placeholder="Số tiền nạp quỹ lần đầu (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />

        <div className="relative mb-3">
          <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận /năm (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 pr-10 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
          {form.interest_rate && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">%</span>}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ảnh nền quỹ</p>
        {form.background_url && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-gray-100 dark:bg-gray-800">
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <label className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center cursor-pointer hover:bg-gray-200 transition">
            {uploading ? 'Đang tải...' : 'Tải ảnh từ thiết bị'}
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        <input value={form.background_url} onChange={(e) => setForm({ ...form, background_url: e.target.value })} placeholder="Hoặc dán link ảnh" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-gray-500" />

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
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{mode === 'allocation' ? `Nạp vào ${category.name}` : `Rút từ ${category.name}`}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 dark:text-gray-400" /></button>
        </div>
        <MoneyInput value={amount} onChange={setAmount} placeholder="Số tiền" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-lg font-semibold outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-gray-500" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${mode === 'allocation' ? 'bg-emerald-600' : 'bg-red-500'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {mode === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ'}
        </button>
      </div>
    </div>
  );
}

function FundDetail({ category, transactions, onBack, reload, setScreen, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'allocation' | 'expense' | 'profit'
  const [showEdit, setShowEdit] = useState(false);
  const [quickMode, setQuickMode] = useState(null); // 'allocation' | 'expense' | null

  const allHistory = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const dailyProfitHistory = fundDailyProfitHistory(category, transactions);
  // Giao dịch nạp/rút kèm số dư cuối tại thời điểm biến động (mới nhất trước)
  const txsWithBalance = [...fundTransactionsWithBalance(category, transactions)]
    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  // "Tất cả" gộp chung Nạp + Rút + Lợi nhuận từng ngày, sắp theo thời gian gần nhất
  const combinedAll = [
    ...txsWithBalance,
    ...dailyProfitHistory.map((d) => ({ id: `profit-${d.date.getTime()}`, type: 'profit', amount: d.profit, date: d.date.toISOString(), created_at: d.date.toISOString(), balanceAfter: d.balance })),
  ].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  const history = filter === 'all' ? combinedAll : filter === 'profit' ? [] : txsWithBalance.filter((t) => t.type === filter);

  const balance = fundBalanceWithProfit(category, transactions);
  const principalBalance = fundBalance(category.id, transactions);
  const accruedProfit = Math.max(0, balance - principalBalance);
  const totalIn = allHistory.filter((t) => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = allHistory.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const rate = Number(category.interest_rate || 0);
  const dailyProfit = balance > 0 ? balance * (rate / 100) / 365 : 0;
  const target = Number(category.target_amount || 0);
  const targetPct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
  // Số tiền ban đầu = khoản nạp quỹ đầu tiên (theo ngày giao dịch)
  const firstAllocation = allHistory
    .filter((t) => t.type === 'allocation')
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))[0];
  const initialAmount = firstAllocation ? Number(firstAllocation.amount) : 0;

  async function handleDelete() {
    if (!confirm('Xóa quỹ này? Các giao dịch cũ vẫn giữ nguyên số tiền.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  return (
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* ============ BẢN ĐIỆN THOẠI — bố cục kiểu thẻ nổi (MoMo) ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative bg-gray-100 dark:bg-gray-950">
        <div className="h-56 relative"
          style={{
            ...(category.background_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)), url(${category.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(180deg,#a78bfa,#f0abfc,#fed7aa)' }),
          }}>
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
              <div className="flex items-center gap-2">
                <EmojiCircle emoji={category.icon} size={26} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
                <h1 className="text-white text-base font-semibold">{category.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
              <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
            </div>
          </div>
          {category.description && <p className="px-5 mt-3 text-white/85 text-sm text-center">{category.description}</p>}
        </div>

        {/* Thẻ trắng nổi đè lên ảnh nền, kiểu MoMo */}
        <div className="px-4 -mt-14 relative z-10">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-black/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-gray-400 dark:text-gray-500 text-sm">Số dư quỹ</p>
                <p className="text-gray-900 dark:text-white text-[26px] font-bold leading-tight mt-0.5 truncate">
                  {formatMoney(balance)}
                  {target > 0 && <span className="text-gray-300 dark:text-gray-600 text-base font-normal"> /{formatMoney(target)}</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full ring-4 ring-amber-200 dark:ring-amber-500/20 bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                {category.icon || '🐷'}
              </div>
            </div>

            {rate > 0 && (
              <button onClick={() => setFilter('profit')} className="mt-3 w-full flex items-center gap-1.5 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-medium rounded-full pl-3 pr-2 py-2">
                <Sparkles size={13} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">Tổng lợi nhuận: {formatMoney(accruedProfit)} | Hôm nay: +{formatMoney(dailyProfit)}</span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
            )}

            {target > 0 && (
              <div className="mt-3">
                <ProgressBar pct={targetPct} colorClass="bg-pink-500" />
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{Math.round(targetPct)}% mục tiêu</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setQuickMode('allocation')} className="flex-1 flex items-center justify-center gap-1.5 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-2xl py-3 text-sm font-semibold">
                <TrendingUp size={16} /> Góp quỹ
              </button>
              <button onClick={() => setQuickMode('expense')} className="flex-1 flex items-center justify-center gap-1.5 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-2xl py-3 text-sm font-semibold">
                <Wallet size={16} /> Rút quỹ
              </button>
            </div>
          </div>
        </div>

        {/* Hoạt động gần đây */}
        <div className="px-5 mt-6">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-3">Hoạt động gần đây</h2>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Góp quỹ' }, { key: 'expense', label: 'Rút quỹ' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 ${filter === f.key ? 'bg-gray-900 dark:bg-pink-600 text-white font-medium' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm shadow-black/5'}`}>{f.label}</button>
            ))}
          </div>

          {filter === 'profit' ? (
            rate === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này. Bấm ✏️ để đặt.</p> : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 text-center shadow-sm shadow-black/5">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                <p className="text-gray-900 dark:text-white text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Lãi được cộng dồn vào số dư và tiếp tục sinh lời (lãi kép), tính từ ngày sau khi nạp.</p>
                {dailyProfitHistory.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Lịch sử lợi nhuận theo ngày</p>
                    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                      {dailyProfitHistory.map((d) => (
                        <div key={d.date.getTime()} className="flex items-center gap-3 py-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-50 dark:bg-amber-500/10">
                            <Sparkles size={14} className="text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-gray-900 dark:text-white font-medium text-sm">{d.date.toLocaleDateString('vi-VN')}</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs">Số dư sau lãi: {formatMoney(d.balance)}</p>
                          </div>
                          <p className="font-medium text-sm flex-shrink-0 text-emerald-600">+{formatMoney(d.profit)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : history.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
            <div className="flex flex-col gap-2.5">
              {history.map((tx) => {
                const isProfit = tx.type === 'profit';
                const isAlloc = tx.type === 'allocation';
                const label = isAlloc ? 'Góp quỹ' : isProfit ? 'Lợi nhuận' : 'Rút quỹ';
                const iconBg = isAlloc ? 'bg-emerald-50 dark:bg-emerald-500/10' : isProfit ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-red-50 dark:bg-red-500/10';
                const amountColor = tx.type === 'expense' ? 'text-red-500' : 'text-emerald-600';
                return (
                  <div key={tx.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm shadow-black/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        {isAlloc ? <TrendingUp size={16} className="text-emerald-600" /> : isProfit ? <Sparkles size={16} className="text-amber-500" /> : <TrendingDown size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{relativeTime(tx.date || tx.created_at)}</p>
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{label}</p>
                      </div>
                      <p className={`font-semibold text-sm flex-shrink-0 ${amountColor}`}>{tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}</p>
                    </div>
                    {stripPeriodTag(tx.note) && <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 pl-[52px] truncate">{stripPeriodTag(tx.note)}</p>}
                    {tx.balanceAfter !== undefined && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 pl-[52px]">Số dư: {formatMoney(tx.balanceAfter)}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Thông tin bổ sung */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mt-5 shadow-sm shadow-black/5">
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mb-1">Số tiền ban đầu</p>
            <p className="text-gray-900 dark:text-white font-semibold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-emerald-50 rounded-2xl p-4">
              <p className="text-emerald-600 text-xs font-medium mb-1">Tổng đã nạp</p>
              <p className="text-emerald-700 font-semibold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-red-500 text-xs font-medium mb-1">Tổng đã rút</p>
              <p className="text-red-600 font-semibold">{formatMoney(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET ============ */}
      <div className="hidden md:block w-full max-w-4xl px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={category.icon} size={40} active activeColor="#10b981" />
              <div>
                <h1 className="text-gray-900 dark:text-white text-xl font-semibold leading-tight">{category.name}</h1>
                {category.description && <p className="text-gray-400 dark:text-gray-500 text-sm">{category.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuickMode('allocation')} className="bg-emerald-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5"><TrendingUp size={15} /> Nạp quỹ</button>
            <button onClick={() => setQuickMode('expense')} className="bg-red-500 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5"><TrendingDown size={15} /> Rút quỹ</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><Pencil size={15} className="text-gray-500 dark:text-gray-400" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><Trash2 size={15} className="text-red-400" /></button>
          </div>
        </div>

        {category.background_url && (
          <div className="w-full h-40 rounded-3xl overflow-hidden mb-6">
            <img src={category.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Số dư hiện tại</p>
              <p className="text-gray-900 dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
              {accruedProfit > 1 && <p className="text-emerald-600 text-sm mt-1">Trong đó lãi cộng dồn: {formatMoney(accruedProfit)}</p>}
              {target > 0 && (
                <div className="mt-4">
                  <ProgressBar pct={targetPct} colorClass="bg-emerald-500" />
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{formatMoney(balance)} / {formatMoney(target)} mục tiêu ({Math.round(targetPct)}%)</p>
                </div>
              )}
              {rate > 0 && <p className="text-emerald-600 text-sm mt-3">Lãi suất {rate}%/năm — ước tính {formatMoney(dailyProfit)}/ngày, cộng dồn tiếp tục sinh lời</p>}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-emerald-50 rounded-2xl p-4">
                  <p className="text-emerald-600 text-xs font-medium mb-1">Tổng đã nạp</p>
                  <p className="text-emerald-700 font-semibold">{formatMoney(totalIn)}</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4">
                  <p className="text-red-500 text-xs font-medium mb-1">Tổng đã rút</p>
                  <p className="text-red-600 font-semibold">{formatMoney(totalOut)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Lịch sử</h2>
                <div className="flex gap-2">
                  {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Nạp (Thu)' }, { key: 'expense', label: 'Chi' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs flex-shrink-0 ${filter === f.key ? 'bg-gray-900 text-white font-medium' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              {filter === 'profit' ? (
                rate === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này.</p> : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                    <p className="text-gray-900 dark:text-white text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                    {dailyProfitHistory.length > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Lịch sử lợi nhuận theo ngày</p>
                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
                          {dailyProfitHistory.map((d) => (
                            <div key={d.date.getTime()} className="flex items-center gap-3 py-2.5">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 dark:bg-emerald-500/10">
                                <TrendingUp size={14} className="text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-gray-900 dark:text-white font-medium text-sm">{d.date.toLocaleDateString('vi-VN')}</p>
                                <p className="text-gray-400 dark:text-gray-500 text-xs">Số dư sau lãi: {formatMoney(d.balance)}</p>
                              </div>
                              <p className="font-medium text-sm flex-shrink-0 text-emerald-600">+{formatMoney(d.profit)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : history.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                  {history.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 py-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'allocation' ? 'bg-emerald-50' : tx.type === 'profit' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-red-50'}`}>
                        {tx.type === 'allocation' ? <TrendingUp size={16} className="text-emerald-600" /> : tx.type === 'profit' ? <Sparkles size={16} className="text-amber-500" /> : <TrendingDown size={16} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{tx.type === 'allocation' ? 'Nạp quỹ' : tx.type === 'profit' ? 'Lợi nhuận' : 'Rút quỹ (chi tiêu)'}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs">{stripPeriodTag(tx.note) || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p>
                        {tx.balanceAfter !== undefined && <p className="text-gray-400 dark:text-gray-500 text-xs">Số dư: {formatMoney(tx.balanceAfter)}</p>}
                      </div>
                      <p className={`font-medium text-sm flex-shrink-0 ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>{tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 h-fit">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Thông tin quỹ</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Số tiền ban đầu</span><span className="text-gray-900 dark:text-white font-medium">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Mục tiêu</span><span className="text-gray-900 dark:text-white font-medium">{target > 0 ? formatMoney(target) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Lãi suất</span><span className="text-gray-900 dark:text-white font-medium">{rate > 0 ? `${rate}%/năm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Tổng đã nạp</span><span className="text-emerald-600 font-medium">{formatMoney(totalIn)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Tổng đã rút</span><span className="text-red-500 font-medium">{formatMoney(totalOut)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && <EditFundForm category={category} onClose={() => setShowEdit(false)} onSaved={reload} isNew={false} initialAmount={initialAmount} firstAllocation={firstAllocation} />}
      {quickMode && <QuickAllocateWithdrawForm category={category} mode={quickMode} onClose={() => setQuickMode(null)} onSaved={reload} />}
      <BottomNav screen="funds" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
    </div>
  );
}

/* ---------- Danh sách Quỹ ---------- */

// Phân nhóm lãi suất quỹ (tương tự PRIORITY_TERMS của Goals) — dùng để tô màu badge & lọc
const FUND_RATE_TIERS = [
  { value: 'Không lãi suất', color: '#6b7280', bg: '#f3f4f6' },
  { value: '<5%/năm', color: '#2563eb', bg: '#dbeafe' },
  { value: '5-10%/năm', color: '#7c3aed', bg: '#ede9fe' },
  { value: '>10%/năm', color: '#be185d', bg: '#fce7f3' },
];

function fundRateStyle(cat) {
  const rate = Number(cat.interest_rate || 0);
  if (rate <= 0) return FUND_RATE_TIERS[0];
  if (rate < 5) return FUND_RATE_TIERS[1];
  if (rate < 10) return FUND_RATE_TIERS[2];
  return FUND_RATE_TIERS[3];
}

// Các trường có thể sắp xếp trong dropdown "Ngày tạo" trên trang Quản lý quỹ
const FUND_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (c) => new Date(c.created_at || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (c) => (c.name || '').toLowerCase() },
  { key: 'balance', label: 'Số dư', get: (c, tx) => fundBalanceWithProfit(c, tx) },
  { key: 'target', label: 'Số tiền mục tiêu', get: (c) => Number(c.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ mục tiêu', get: (c, tx) => (c.target_amount ? Math.min(100, (fundBalanceWithProfit(c, tx) / c.target_amount) * 100) : 0) },
  { key: 'interest', label: 'Lãi suất', get: (c) => Number(c.interest_rate || 0) },
];

function Funds({ setScreen, categories, transactions, onOpenFund, reload, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingFund, setEditingFund] = useState(null); // sửa nhanh từ menu "..."
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterTarget, setFilterTarget] = useState('all'); // 'all' | 'none' | 'set' | 'done'
  const [filterRate, setFilterRate] = useState('all');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const funds = categories.filter((c) => c.type === 'expense');
  const totalFunds = funds.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalIn = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'allocation').reduce((a, t) => a + Number(t.amount), 0), 0);
  const totalOut = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0), 0);

  function fundStatus(c) {
    const balance = fundBalanceWithProfit(c, transactions);
    const target = Number(c.target_amount || 0);
    if (target > 0 && balance >= target) return 'done';
    if (target > 0) return 'set';
    return 'none';
  }
  const doneCount = funds.filter((c) => fundStatus(c) === 'done').length;

  const filteredFunds = funds.filter((c) => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTarget = filterTarget === 'all' || filterTarget === fundStatus(c);
    const rStyle = fundRateStyle(c);
    const matchesRate = filterRate === 'all' || filterRate === rStyle.value;
    return matchesSearch && matchesTarget && matchesRate;
  });

  const activeSortField = FUND_SORT_FIELDS.find((f) => f.key === sortField) || FUND_SORT_FIELDS[0];
  const displayFunds = [...filteredFunds].sort((a, b) => {
    const av = activeSortField.get(a, transactions), bv = activeSortField.get(b, transactions);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const pageSize = viewMode === 'card' ? 9 : 8;
  const totalPages = Math.max(1, Math.ceil(displayFunds.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFunds = displayFunds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const editingFirstAllocation = editingFund
    ? transactions.filter((t) => t.category_id === editingFund.id && t.type === 'allocation').sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at))[0]
    : null;
  const editingInitialAmount = editingFirstAllocation ? Number(editingFirstAllocation.amount) : 0;

  return (
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* ============ BẢN ĐIỆN THOẠI — kiểu thẻ quỹ đầy màu sắc (MoMo) ============ */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-100 via-fuchsia-50 to-white md:hidden" />
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8">
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-sm shadow-black/5 px-4 py-3">
            <Search size={16} className="text-gray-400" />
            <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 text-gray-700" />
          </div>
        </div>

        <div className="px-5 mt-5 flex items-center justify-between">
          <h1 className="text-gray-900 text-lg font-bold">Danh sách quỹ</h1>
          <div className="flex items-center gap-1 bg-white rounded-full shadow-sm shadow-black/5 px-1 py-1">
            <button onClick={() => setViewMode((v) => (v === 'card' ? 'list' : 'card'))} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-gray-600">
              <List size={13} /> Quản lý
            </button>
            <span className="w-px h-4 bg-gray-200" />
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-pink-600">
              <Plus size={13} /> Tạo quỹ
            </button>
          </div>
        </div>

        <div className="px-5 mt-3 mb-4 bg-white/70 backdrop-blur rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-gray-500 text-xs">Tổng số dư mọi quỹ</p>
          <p className="text-gray-900 font-bold">{formatMoney(totalFunds)}</p>
        </div>

        <div className="px-5 flex flex-col gap-4">
          {filteredFunds.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">{funds.length === 0 ? 'Chưa có quỹ nào. Bấm "Tạo quỹ" để tạo quỹ đầu tiên.' : 'Không tìm thấy quỹ nào.'}</p>
          ) : (
            filteredFunds.map((f, i) => {
              const balance = fundBalanceWithProfit(f, transactions);
              const target = Number(f.target_amount || 0);
              return (
                <button key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="relative w-full h-44 rounded-3xl overflow-hidden text-left shadow-sm shadow-black/10"
                  style={{ background: fundCardBackground(f, i), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/25 backdrop-blur text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                    <Star size={11} className="fill-white" /> Chủ quỹ
                  </span>
                  <span className="absolute top-3 left-4 flex items-center gap-1.5 text-white font-semibold text-base drop-shadow">
                    <span>{f.icon || '💰'}</span> {f.name}
                  </span>
                  <span className="absolute bottom-3 left-4 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-white/90 flex items-center justify-center text-[11px]">{f.icon || '💰'}</span>
                    <span className="text-white font-bold text-lg drop-shadow">
                      {formatMoney(balance)}{target > 0 && <span className="font-medium text-sm"> / {formatMoney(target)}</span>}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET — kiểu CRM giống trang Mục tiêu ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
        <h1 className="text-gray-900 dark:text-white text-2xl font-semibold mb-6">Quản lý quỹ</h1>

        {/* 4 thẻ tổng quan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={PiggyBank} iconBg="bg-violet-500" label="Tổng số dư mọi quỹ" value={formatMoney(totalFunds)} />
          <SummaryCard icon={TrendingUp} iconBg="bg-emerald-500" label="Tổng đã nạp" value={formatMoney(totalIn)} />
          <SummaryCard icon={TrendingDown} iconBg="bg-rose-500" label="Tổng đã rút" value={formatMoney(totalOut)} />
          <SummaryCard icon={Sparkles} iconBg="bg-blue-500" label="Tổng số lượng quỹ" value={funds.length} sub={`${doneCount} đã đạt mục tiêu`} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Hàng 1: bộ lọc + sắp xếp + chuyển kiểu xem */}
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterTarget !== 'all' && (
                <span className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterTarget === 'done' ? 'Đã đạt mục tiêu' : filterTarget === 'set' ? 'Đang tích lũy' : 'Chưa đặt mục tiêu'}
                  <button onClick={() => { setFilterTarget('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterRate !== 'all' && (
                <span className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterRate}
                  <button onClick={() => { setFilterRate('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {(filterTarget !== 'all' || filterRate !== 'all') && (
                <button onClick={() => { setFilterTarget('all'); setFilterRate('all'); setPage(1); }} className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-9 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg p-4 w-64">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Mục tiêu quỹ</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['none', 'Chưa đặt'], ['set', 'Đang tích lũy'], ['done', 'Đã đạt']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterTarget(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterTarget === k ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Lãi suất</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterRate('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium ${filterRate === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Tất cả</button>
                      {FUND_RATE_TIERS.map((t) => (
                        <button key={t.value} onClick={() => { setFilterRate(t.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${filterRate === t.value ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} /> <span className="text-gray-700 dark:text-gray-300 truncate">{t.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v); setShowFilterMenu(false); }} className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                  <ArrowUpDown size={14} /> {activeSortField.label}
                </button>
                {showSortMenu && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg p-2 w-56">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1.5">Sắp xếp theo</p>
                    {FUND_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField((cur) => { if (cur === f.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return cur; } setSortDir(f.key === 'created' ? 'desc' : 'asc'); return f.key; }); }}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${sortField === f.key ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {f.label}
                        {sortField === f.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                <button onClick={() => { setViewMode('card'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'card' ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'text-gray-400 dark:text-gray-500'}`}><LayoutGrid size={15} /></button>
                <button onClick={() => { setViewMode('list'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'text-gray-400 dark:text-gray-500'}`}><List size={15} /></button>
              </div>
            </div>
          </div>

          {/* Hàng 2: số lượng + tìm kiếm + nút thêm */}
          <div className="flex items-center justify-between px-5 pb-4 flex-wrap gap-3">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{displayFunds.length} quỹ</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-gray-400 dark:text-gray-500" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 dark:text-white" />
              </div>
              <button onClick={() => setShowCreate(true)} className="bg-violet-600 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                <Plus size={16} /> Tạo quỹ mới
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800">
            {funds.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">Chưa có quỹ nào. Bấm "Tạo quỹ mới" để bắt đầu.</p>
            ) : displayFunds.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">Không tìm thấy quỹ nào.</p>
            ) : viewMode === 'card' ? (
              /* ============ DẠNG Ô VUÔNG (thẻ) ============ */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                {pagedFunds.map((f) => {
                  const balance = fundBalanceWithProfit(f, transactions);
                  const target = Number(f.target_amount || 0);
                  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                  const isDone = target > 0 && balance >= target;
                  const rStyle = fundRateStyle(f);
                  return (
                    <div key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm shadow-black/5 hover:shadow-md transition cursor-pointer">
                      <div
                        className="relative h-24 flex items-end p-4"
                        style={f.background_url
                          ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.45)), url(${f.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}
                      >
                        <span className="text-2xl">{f.icon}</span>
                        {isDone && (
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur text-[11px] font-semibold px-2 py-1 rounded-full text-emerald-600">
                            <Check size={11} /> Đã đạt mục tiêu
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-center text-gray-600 dark:text-gray-300">
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === f.id && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-2.5 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 w-40 text-left">
                            <button onClick={() => { onOpenFund(f.id, 'funds'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <Eye size={14} /> Xem chi tiết
                            </button>
                            <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <Pencil size={14} /> Chỉnh sửa
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{f.name}</h3>
                        <div className="flex items-center gap-4 mb-3">
                          <MiniRing pct={pct} color={isDone ? '#10b981' : '#7c3aed'} label="Tiến độ mục tiêu" />
                          <div className="leading-tight">
                            <p className="text-gray-900 dark:text-white text-sm font-semibold">{formatMoney(balance)}</p>
                            <p className="text-gray-400 dark:text-gray-500 text-[10px]">Số dư hiện tại</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ color: rStyle.color, background: rStyle.bg }}>{rStyle.value}</span>
                          <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{target > 0 ? (isDone ? 'Đã đạt' : 'Đang tích lũy') : 'Chưa đặt mục tiêu'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-50 dark:border-gray-800">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                          <span>{target > 0 ? formatMoney(target) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ============ DẠNG LƯỚI (bảng) ============ */
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                      <th className="p-4 font-medium">Tên quỹ</th>
                      <th className="p-4 font-medium">Lãi suất</th>
                      <th className="p-4 font-medium text-right">Số dư hiện tại</th>
                      <th className="p-4 font-medium text-right">Mục tiêu</th>
                      <th className="p-4 font-medium">Tiến độ</th>
                      <th className="p-4 font-medium">Trạng thái</th>
                      <th className="p-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFunds.map((f) => {
                      const balance = fundBalanceWithProfit(f, transactions);
                      const target = Number(f.target_amount || 0);
                      const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                      const isDone = target > 0 && balance >= target;
                      const rStyle = fundRateStyle(f);
                      return (
                        <tr key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <EmojiCircle emoji={f.icon} size={36} bg="#ede9fe" />
                              <p className="font-medium text-gray-900 dark:text-white">{f.name}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap" style={{ color: rStyle.color, background: rStyle.bg }}>{rStyle.value}</span>
                          </td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatMoney(balance)}</td>
                          <td className="p-4 text-right text-gray-500 dark:text-gray-400">{target > 0 ? formatMoney(target) : '—'}</td>
                          <td className="p-4 w-32">
                            {target > 0 ? (<><ProgressBar pct={pct} colorClass={isDone ? 'bg-emerald-500' : 'bg-violet-600'} /><p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{Math.round(pct)}%</p></>) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{target > 0 ? (isDone ? 'Đã đạt' : 'Đang tích lũy') : 'Chưa đặt mục tiêu'}</span>
                          </td>
                          <td className="p-4 text-right relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center text-gray-400 dark:text-gray-500">
                              <MoreHorizontal size={18} />
                            </button>
                            {openMenuId === f.id && (
                              <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-12 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 w-40 text-left">
                                <button onClick={() => { onOpenFund(f.id, 'funds'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <Eye size={14} /> Xem chi tiết
                                </button>
                                <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <Pencil size={14} /> Chỉnh sửa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Phân trang */}
          {displayFunds.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-gray-400 dark:text-gray-500 text-xs">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-40">Previous</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <EditFundForm onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
      {editingFund && <EditFundForm category={editingFund} onClose={() => setEditingFund(null)} onSaved={reload} isNew={false} initialAmount={editingInitialAmount} firstAllocation={editingFirstAllocation} />}
      <BottomNav screen="funds" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
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

// Các trường có thể sắp xếp trong dropdown "Ngày tạo" trên trang Mục tiêu
const GOAL_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (g) => new Date(g.start_date || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (g) => (g.name || '').toLowerCase() },
  { key: 'target', label: 'Số tiền mục tiêu', get: (g) => Number(g.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ', get: (g) => (g.status === 'Hoàn thành' ? 100 : (g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0)) },
  { key: 'priority', label: 'Mức độ ưu tiên', get: (g) => priorityRank(g.priority_term) },
];

// Thứ hạng của mức độ ưu tiên theo thời hạn (ngắn -> dài), dùng để sắp xếp
function priorityRank(value) {
  const idx = PRIORITY_TERMS.findIndex((p) => p.value === value);
  return idx === -1 ? PRIORITY_TERMS.length : idx;
}

// Sắp xếp mục tiêu: mục tiêu đang làm trước (thời hạn ngắn -> dài), mục tiêu đã hoàn thành xuống cuối
function sortGoals(list) {
  return [...list].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    return priorityRank(a.priority_term) - priorityRank(b.priority_term);
  });
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
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{isNew ? 'Mục tiêu mới' : 'Sửa mục tiêu'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 dark:text-gray-400" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên mục tiêu" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Mức độ ưu tiên</p>
        <select value={form.priority_term} onChange={(e) => setForm({ ...form, priority_term: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500">
          {PRIORITY_TERMS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
        </select>

        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <MoneyInput value={form.current_amount} onChange={(v) => setForm({ ...form, current_amount: v })} placeholder="Số tiền hiện có" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ngày bắt đầu</p>
        <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />

        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (không bắt buộc)" rows={2} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-gray-500" />

        <label className="flex items-center gap-2 mb-3 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={form.isDone} onChange={(e) => setForm({ ...form, isDone: e.target.checked })} /> Đã hoàn thành
        </label>

        {form.isDone && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ngày hoàn thành</p>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            <MoneyInput value={form.actual_amount} onChange={(v) => setForm({ ...form, actual_amount: v })} placeholder="Số tiền thực tế khi hoàn thành (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
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

function SummaryCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-gray-900 dark:text-white text-xl font-semibold">{value}</p>
      {sub && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// Vòng tròn tiến độ nhỏ (kiểu "Accuracy / Completion Rate") dùng cho thẻ mục tiêu dạng lưới ô vuông
function MiniRing({ pct, color, label }) {
  const r = 15, c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 36 36" className="w-8 h-8 flex-shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#e5e7eb" className="dark:stroke-gray-700" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="leading-tight">
        <p className="text-gray-900 dark:text-white text-xs font-semibold">{Math.round(pct)}%</p>
        <p className="text-gray-400 dark:text-gray-500 text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function Goals({ setScreen, goals, loadingGoals, reload, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [editingGoal, setEditingGoal] = useState(null); // goal object | 'new' | null
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'done'
  const [filterPriority, setFilterPriority] = useState('all'); // 'all' | giá trị priority_term
  const [viewMode, setViewMode] = useState('card'); // 'card' (dạng ô vuông, ảnh mẫu) | 'list' (bảng cũ)
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalRemaining = goals.reduce((s, g) => s + Math.max(0, Number(g.target_amount || 0) - Number(g.current_amount || 0)), 0);
  const doneCount = goals.filter((g) => g.status === 'Hoàn thành').length;

  const sortedGoals = sortGoals(goals);
  const filteredGoals = sortedGoals.filter((g) => {
    const matchesSearch = (g.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'done' ? g.status === 'Hoàn thành' : g.status !== 'Hoàn thành');
    const matchesPriority = filterPriority === 'all' || g.priority_term === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  const hasActiveFilter = filterStatus !== 'all' || filterPriority !== 'all';

  // Sắp xếp theo trường do người dùng chọn (mặc định vẫn ưu tiên: đang làm trước, hoàn thành xuống cuối)
  const activeSortField = GOAL_SORT_FIELDS.find((f) => f.key === sortField) || GOAL_SORT_FIELDS[0];
  const displayGoals = [...filteredGoals].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    const av = activeSortField.get(a), bv = activeSortField.get(b);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const pageSize = viewMode === 'card' ? 9 : 8;
  const totalPages = Math.max(1, Math.ceil(displayGoals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedGoals = displayGoals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      <div className="absolute inset-0 bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 md:hidden" />
      {/* ============ BẢN ĐIỆN THOẠI ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Mục tiêu</h1>
        </div>
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-t-[2.5rem] min-h-[80vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Mục tiêu của tôi</h2>
            <button onClick={() => setEditingGoal('new')} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Plus size={16} className="text-gray-600 dark:text-gray-300" /></button>
          </div>
          {loadingGoals ? <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
            : goals.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">Chưa có mục tiêu nào.</p>
            : <div className="flex flex-col gap-5">
                {sortedGoals.map((goal) => {
                  const isDone = goal.status === 'Hoàn thành';
                  const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                  const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                  const pStyle = priorityStyle(goal.priority_term);
                  return (
                    <button key={goal.id} onClick={() => setEditingGoal(goal)} className="text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-br from-violet-400 to-fuchsia-500'}`}>
                          {isDone ? <Check size={18} className="text-white" /> : <Target size={18} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium text-sm">{goal.name}</p>
                          {goal.priority_term && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                        </div>
                        <p className="text-gray-900 dark:text-white font-semibold text-sm flex-shrink-0">{formatMoney(goal.current_amount || 0)}</p>
                      </div>
                      <ProgressBar pct={pct} colorClass={isDone ? 'bg-emerald-500' : 'bg-violet-600'} />
                      <div className="flex justify-between mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <span>{goal.target_amount ? `Còn thiếu ${formatMoney(Math.max(0, remaining))}` : ''}</span>
                        <span>{goal.target_amount ? formatMoney(goal.target_amount) : ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>}
        </div>
        <BottomNav screen="goals" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
      </div>

      {/* ============ BẢN DESKTOP/TABLET — dạng bảng kiểu CRM ============ */}
      <div className="hidden md:block w-full max-w-[1400px] px-8 py-8" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
        <h1 className="text-gray-900 dark:text-white text-2xl font-semibold mb-6">Mục tiêu</h1>

        {/* 4 thẻ tổng quan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={Target} iconBg="bg-blue-500" label="Tổng tiền mục tiêu" value={formatMoney(totalTarget)} />
          <SummaryCard icon={PiggyBank} iconBg="bg-orange-500" label="Tổng số tiền hiện có" value={formatMoney(totalCurrent)} />
          <SummaryCard icon={Wallet} iconBg="bg-rose-500" label="Tổng số tiền còn thiếu" value={formatMoney(totalRemaining)} />
          <SummaryCard icon={Sparkles} iconBg="bg-violet-500" label="Tổng số lượng mục tiêu" value={goals.length} sub={`${doneCount} đã hoàn thành`} />
        </div>

        {/* Danh sách mục tiêu */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Hàng 1: bộ lọc đang áp dụng + sắp xếp + chuyển đổi kiểu xem */}
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterStatus !== 'all' && (
                <span className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full">
                  Trạng thái: {filterStatus === 'done' ? 'Hoàn thành' : 'Đang làm'}
                  <button onClick={() => { setFilterStatus('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterPriority !== 'all' && (
                <span className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full">
                  Ưu tiên: {filterPriority}
                  <button onClick={() => { setFilterPriority('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-violet-100 dark:hover:bg-violet-500/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {hasActiveFilter && (
                <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setPage(1); }} className="text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-9 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg p-4 w-64">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Trạng thái</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['active', 'Đang làm'], ['done', 'Hoàn thành']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterStatus(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium ${filterStatus === k ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">Mức độ ưu tiên</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterPriority('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium ${filterPriority === 'all' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Tất cả</button>
                      {PRIORITY_TERMS.map((p) => (
                        <button key={p.value} onClick={() => { setFilterPriority(p.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 ${filterPriority === p.value ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} /> <span className="text-gray-700 dark:text-gray-300 truncate">{p.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v); setShowFilterMenu(false); }} className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                  <ArrowUpDown size={14} /> Ngày tạo
                </button>
                {showSortMenu && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-lg p-2 w-56">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-2 py-1.5">Sắp xếp theo</p>
                    {GOAL_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField((cur) => { if (cur === f.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return cur; } setSortDir(f.key === 'created' ? 'desc' : 'asc'); return f.key; }); }}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${sortField === f.key ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        {f.label}
                        {sortField === f.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                <button onClick={() => { setViewMode('card'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'card' ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'text-gray-400 dark:text-gray-500'}`}><LayoutGrid size={15} /></button>
                <button onClick={() => { setViewMode('list'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'bg-gray-900 dark:bg-emerald-500 text-white' : 'text-gray-400 dark:text-gray-500'}`}><List size={15} /></button>
              </div>
            </div>
          </div>

          {/* Hàng 2: số lượng + tìm kiếm + nút thêm */}
          <div className="flex items-center justify-between px-5 pb-4 flex-wrap gap-3">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{displayGoals.length} mục tiêu</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-gray-400 dark:text-gray-500" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm mục tiêu..." className="bg-transparent outline-none text-sm flex-1 dark:text-white" />
              </div>
              <button onClick={() => setEditingGoal('new')} className="bg-violet-600 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                <Plus size={16} /> Thêm mục tiêu
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800">
            {loadingGoals ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-violet-400" /></div>
              : displayGoals.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">Không tìm thấy mục tiêu nào.</p>
              : viewMode === 'card' ? (
                /* ============ DẠNG Ô VUÔNG (thẻ) — theo giao diện mẫu ============ */
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                  {pagedGoals.map((goal) => {
                    const isDone = goal.status === 'Hoàn thành';
                    const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    return (
                      <div key={goal.id} onClick={() => setEditingGoal(goal)} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm shadow-black/5 hover:shadow-md transition cursor-pointer">
                        <div className="relative h-28 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pStyle.bg}, ${pStyle.color}33)` }}>
                          {isDone ? <Check size={40} className="opacity-30" style={{ color: pStyle.color }} /> : <Target size={40} className="opacity-30" style={{ color: pStyle.color }} />}
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur text-[11px] font-semibold px-2 py-1 rounded-full text-gray-700 dark:text-gray-200">
                            {isDone ? <Check size={11} className="text-emerald-600" /> : <Clock size={11} className="text-violet-600" />}
                            {isDone ? 'Hoàn thành' : 'Đang làm'}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur flex items-center justify-center text-gray-600 dark:text-gray-300">
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenuId === goal.id && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute top-10 right-2.5 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 w-40 text-left">
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Eye size={14} /> Xem chi tiết
                              </button>
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                <Pencil size={14} /> Chỉnh sửa
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{goal.name}</h3>
                          <div className="flex items-center gap-4 mb-3">
                            <MiniRing pct={pct} color={isDone ? '#10b981' : '#7c3aed'} label="Tiến độ" />
                            <MiniRing pct={isDone ? 100 : 0} color={isDone ? '#10b981' : '#d1d5db'} label="Hoàn thành" />
                          </div>
                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            {goal.priority_term && <span className="text-[10px] font-medium px-2 py-1 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{isDone ? 'Hoàn thành' : 'Đang làm'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-50 dark:border-gray-800">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</span>
                            <span>{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ============ DẠNG LƯỚI (bảng) — giữ nguyên như cũ ============ */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1150px]">
                    <thead>
                      <tr className="text-left text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                        <th className="p-4 font-medium">Tên mục tiêu</th>
                        <th className="p-4 font-medium">Mức độ ưu tiên</th>
                        <th className="p-4 font-medium text-right">Số tiền mục tiêu</th>
                        <th className="p-4 font-medium text-right">Số tiền hiện có</th>
                        <th className="p-4 font-medium text-right">Số tiền còn thiếu</th>
                        <th className="p-4 font-medium">Tiến độ</th>
                        <th className="p-4 font-medium">Ngày bắt đầu</th>
                        <th className="p-4 font-medium">Hoàn thành</th>
                        <th className="p-4 font-medium">Ghi chú</th>
                        <th className="p-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedGoals.map((goal) => {
                        const isDone = goal.status === 'Hoàn thành';
                        const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                        const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                        const pStyle = priorityStyle(goal.priority_term);
                        const duration = isDone ? durationText(goal.start_date, goal.end_date) : null;
                        return (
                          <tr key={goal.id} onClick={() => setEditingGoal(goal)} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-br from-violet-400 to-fuchsia-500'}`}>
                                  {isDone ? <Check size={16} className="text-white" /> : <Target size={16} className="text-white" />}
                                </div>
                                <p className={`font-medium ${isDone ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>{goal.name}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              {goal.priority_term ? <span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="p-4 text-right text-gray-900 dark:text-white">{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</td>
                            <td className="p-4 text-right text-gray-900 dark:text-white">{formatMoney(goal.current_amount || 0)}</td>
                            <td className="p-4 text-right text-gray-500 dark:text-gray-400">{goal.target_amount ? formatMoney(Math.max(0, remaining)) : '—'}</td>
                            <td className="p-4 w-32">
                              <ProgressBar pct={pct} colorClass={isDone ? 'bg-emerald-500' : 'bg-violet-600'} />
                              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{Math.round(pct)}%</p>
                            </td>
                            <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {isDone ? (
                                <>
                                  <p>{new Date(goal.end_date).toLocaleDateString('vi-VN')}</p>
                                  {duration && <p className="text-xs text-gray-400 dark:text-gray-500">{duration}</p>}
                                  {goal.actual_amount && <p className="text-xs text-emerald-600">Thực tế: {formatMoney(goal.actual_amount)}</p>}
                                </>
                              ) : <span className="text-gray-300">Chưa xong</span>}
                            </td>
                            <td className="p-4 text-gray-400 dark:text-gray-500 text-xs max-w-[160px] truncate">{goal.note || '—'}</td>
                            <td className="p-4 text-right relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center text-gray-400 dark:text-gray-500"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              {openMenuId === goal.id && (
                                <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-12 z-20 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-1 w-40 text-left">
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <Eye size={14} /> Xem chi tiết
                                  </button>
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <Pencil size={14} /> Chỉnh sửa
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {/* Phân trang */}
          {displayGoals.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-gray-400 dark:text-gray-500 text-xs">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-40">Previous</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingGoal && <EditGoalForm goal={editingGoal === 'new' ? null : editingGoal} isNew={editingGoal === 'new'} onClose={() => setEditingGoal(null)} onSaved={reload} />}
      <BottomNav screen="goals" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
    </div>
  );
}

/* ---------- Thêm giao dịch ---------- */

function AddTransaction({ onClose, accounts, categories, transactions, onSaved }) {
  const [type, setType] = useState('expense'); // 'income' | 'allocation' | 'expense'
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedYear, setSelectedYear] = useState(Number(currentPeriodKey().split('-')[0]));
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodKey());
  const [expenseSource, setExpenseSource] = useState(null); // 'income' | <account id> — Nguồn tiền, dùng cho mọi giao dịch Chi tiêu (kể cả rút quỹ)
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState(nowForInput());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i); // 2 năm trước -> 2 năm sau
  const periods = buildPeriods(selectedYear);

  // Nạp quỹ dùng chung danh mục "chi tiêu" (vì mọi danh mục chi tiêu đều là 1 quỹ)
  const categoryType = type === 'income' ? 'income' : 'expense';
  const categoryList = categories.filter((c) => c.type === categoryType);
  const activeCat = categories.find((c) => c.id === selectedCategory);
  const isFundCategory = type === 'expense' && !!activeCat?.is_fund;
  const overLimit = type === 'expense' && activeCat?.monthly_limit && Number(amount) > Number(activeCat.monthly_limit);

  // Bể thu nhập của Kỳ đang chọn — dùng để cảnh báo khi Nạp quỹ / Chi tiêu vượt quá số tiền còn lại của kỳ
  const usesPeriod = type === 'income' || type === 'allocation' || (type === 'expense' && expenseSource === 'income');
  const pool = usesPeriod ? periodPool(transactions || [], selectedPeriod) : null;
  const periodOverLimit = (type === 'allocation' || (type === 'expense' && expenseSource === 'income')) && pool && Number(amount) > pool.remaining;

  function handleAmountChange(e) { setAmount(e.target.value.replace(/\D/g, '')); }

  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }

  function handleTypeChange(t) {
    setType(t); setSelectedCategory(null); setExpenseSource(null);
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }
  function handleCategoryChange(id) { setSelectedCategory(id); setExpenseSource(null); }

  // Sau khi lưu thành công, đưa form về trạng thái trống ban đầu để nhập giao dịch tiếp theo — KHÔNG tự đóng
  function resetForm() {
    setAmount(''); setSelectedCategory(null); setExpenseSource(null); setNote('');
    setDateTime(nowForInput());
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { alert('Vui lòng chọn danh mục'); return; }

    let accountIdToSave = null;
    let noteToSave = note || null;

    if (type === 'income') {
      if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
      noteToSave = tagPeriodNote(selectedPeriod, note);
    } else if (type === 'allocation') {
      if (!selectedPeriod) { alert('Vui lòng chọn Kỳ (nguồn thu nhập để nạp quỹ)'); return; }
      noteToSave = tagPeriodNote(selectedPeriod, note);
    } else if (type === 'expense') {
      if (!expenseSource) { alert('Vui lòng chọn Nguồn tiền: Thu nhập hoặc 1 ví'); return; }
      if (expenseSource === 'income') {
        if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
        noteToSave = tagPeriodNote(selectedPeriod, note);
      } else {
        accountIdToSave = expenseSource;
      }
    }

    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      account_id: accountIdToSave, category_id: selectedCategory, type, amount: Number(amount),
      note: noteToSave, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi khi lưu: ' + error.message); return; }
    onSaved();
    resetForm();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-gray-900 w-full h-full md:h-auto md:max-h-[88vh] md:max-w-lg md:rounded-3xl md:overflow-y-auto overflow-y-auto relative">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><X size={18} className="text-gray-700 dark:text-gray-300" /></button>
          <h1 className="text-gray-900 dark:text-white text-lg font-semibold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button onClick={() => handleTypeChange('income')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'income' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-gray-500'}`}>Thu nhập</button>
            <button onClick={() => handleTypeChange('allocation')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'allocation' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-gray-500'}`}>Nạp quỹ</button>
            <button onClick={() => handleTypeChange('expense')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition ${type === 'expense' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-gray-500'}`}>Chi tiêu</button>
          </div>
          {type === 'allocation' && <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-center">Rút từ thu nhập của 1 Kỳ để chuyển vào quỹ, chưa tính là tiền rời khỏi ví.</p>}
          {type === 'income' && <p className="text-gray-400 dark:text-gray-500 text-xs mt-2 text-center">Thu nhập được gom theo Kỳ — nhiều khoản thu trong cùng 1 Kỳ sẽ được cộng dồn lại.</p>}
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('en-US') : ''} onChange={handleAmountChange} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit || periodOverLimit ? 'text-red-500' : type === 'income' || type === 'allocation' ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`} />
            <span className="text-4xl font-bold text-gray-300">đ</span>
          </div>
          {overLimit && <p className="text-red-500 text-xs mt-2">⚠️ Vượt hạn mức {formatMoney(activeCat.monthly_limit)} của danh mục này!</p>}
          {periodOverLimit && <p className="text-red-500 text-xs mt-2">⚠️ Vượt số tiền còn lại của Kỳ này ({formatMoney(pool.remaining)})!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">{type === 'income' ? 'Danh mục thu nhập' : 'Quỹ / Danh mục'} <span className="text-red-500">*</span></p>
          {categoryList.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = type === 'expense' && cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
                return (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={cat.icon} size={48} active={active} activeColor={willExceed ? '#ef4444' : '#7c3aed'} />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nguồn tiền — hiện ngay dưới Quỹ/Danh mục ở mục Chi tiêu; gồm "Thu nhập" + các ví trong Quản lý ví, chỉ được chọn 1.
            Khi rút quỹ (isFundCategory), lựa chọn này cho biết tiền rút ra đi vào ví nào — nhờ đó chi tiết từng ví sẽ hiển thị đúng lịch sử rút tiền. */}
        {type === 'expense' && selectedCategory && (
          <div className="px-5 mt-8">
            <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Nguồn tiền <span className="text-red-500">*</span></p>
            {isFundCategory && <p className="text-gray-400 dark:text-gray-500 text-xs mb-3">Rút từ quỹ "{activeCat.name}" — chọn thêm nơi nhận tiền để lưu vào lịch sử ví.</p>}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => setExpenseSource('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#7c3aed" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => setExpenseSource(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#7c3aed" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Chỉ được chọn 1 nguồn tiền cho khoản chi này.</p>
          </div>
        )}

        {/* Năm + Kỳ — bắt buộc chọn khi Thu nhập, hoặc khi Nạp quỹ / Chi tiêu rút từ thu nhập của kỳ */}
        {(type === 'income' || type === 'allocation' || (type === 'expense' && expenseSource === 'income')) && (
          <div className="px-5 mt-8">
            <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Năm <span className="text-red-500">*</span></p>
            <select value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Kỳ <span className="text-red-500">*</span></p>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            {pool && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                Thu nhập kỳ này: <span className="text-gray-700 dark:text-gray-300 font-medium">{formatMoney(pool.total)}</span> — Còn lại: <span className={`font-medium ${pool.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{formatMoney(pool.remaining)}</span>
              </p>
            )}
          </div>
        )}

        <div className="px-5 mt-8">
          <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Ngày giờ</p>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
        </div>
        <div className="px-5 mt-10 pb-10">
          {savedMsg && <p className="text-emerald-600 text-sm text-center mb-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl py-2">✓ Đã lưu giao dịch. Bạn có thể thêm giao dịch tiếp theo.</p>}
          <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Lưu giao dịch'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tiền trong tài khoản ---------- */

function QuickAdjustBalanceForm({ account, currentBalance, onClose, onSaved }) {
  const [mode, setMode] = useState(null); // 'increase' | 'decrease' | null (không chọn = đặt số dư mới)
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount) { alert('Nhập số tiền'); return; }
    setSaving(true);
    let signedAmount;
    if (mode === 'increase') signedAmount = Number(amount);
    else if (mode === 'decrease') signedAmount = -Number(amount);
    else signedAmount = Number(amount) - currentBalance; // đặt số dư mới -> tự tính chênh lệch

    if (signedAmount === 0) { setSaving(false); alert('Số dư không đổi, không cần cập nhật.'); return; }

    // Khi không chọn Tăng/Giảm (đặt thẳng số dư mới), đánh dấu để phần Lịch sử không hiển thị dấu +/-
    const isDirectSet = mode === null;
    const savedNote = note || (mode === 'increase' ? 'Tăng số dư' : mode === 'decrease' ? 'Giảm số dư' : 'Đặt số dư mới');
    const { error } = await supabase.from('transactions').insert({
      account_id: account.id, type: 'adjustment', amount: signedAmount,
      note: isDirectSet ? `[SET] ${savedNote}` : savedNote, date, created_at: new Date(date + 'T' + new Date().toTimeString().slice(0, 8)).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Cập nhật số dư — {account.name}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 dark:text-gray-400" /></button>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 mb-2">
          <button onClick={() => { setMode(mode === 'increase' ? null : 'increase'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'increase' ? 'bg-white text-emerald-600 shadow' : 'text-gray-400 dark:text-gray-500'}`}>Tăng số dư</button>
          <button onClick={() => { setMode(mode === 'decrease' ? null : 'decrease'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${mode === 'decrease' ? 'bg-white text-red-500 shadow' : 'text-gray-400 dark:text-gray-500'}`}>Giảm số dư</button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{mode ? 'Nhập số tiền muốn tăng/giảm.' : 'Không chọn gì cả — nhập thẳng số dư mới, hệ thống tự tính chênh lệch.'}</p>
        <MoneyInput value={amount} onChange={setAmount} placeholder={mode ? 'Số tiền' : 'Số dư mới'} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-lg font-semibold outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ngày</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-gray-500" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 ${mode === 'decrease' ? 'bg-red-500' : mode === 'increase' ? 'bg-emerald-600' : 'bg-gray-900'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu cập nhật
        </button>
      </div>
    </div>
  );
}

function EditAccountModal({ account, onClose, onSaved, isNew }) {
  const [form, setForm] = useState({ name: account?.name || '', icon: account?.icon || '', type: account?.type || 'cash', initial_balance: account?.initial_balance || '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name) { alert('Nhập tên tài khoản'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '💰', type: form.type, initial_balance: form.initial_balance ? Number(form.initial_balance) : 0, is_active: true };
    const { error } = isNew ? await supabase.from('accounts').insert(payload) : await supabase.from('accounts').update(payload).eq('id', account.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{isNew ? 'Thêm ví mới' : 'Sửa tài khoản'}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-500 dark:text-gray-400" /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500">
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-gray-500" />
        <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu
        </button>
      </div>
    </div>
  );
}

function AccountDetail({ account, transactions, categories, onBack, reload, setScreen, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
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
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* ============ BẢN ĐIỆN THOẠI (giữ nguyên) ============ */}
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative" style={{ background: 'linear-gradient(180deg,#a78bfa,#f0abfc,#fed7aa)' }}>
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
            <button onClick={() => setShowAdjust(true)} className="bg-white text-gray-900 dark:text-white rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 shadow-lg">
              <Pencil size={14} /> Cập nhật số dư
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 rounded-t-[2.5rem] min-h-[65vh] px-5 pt-6 pb-6">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-3">Lịch sử</h2>
          {history.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
              {history.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                // Điều chỉnh kiểu "đặt thẳng số dư mới" (không chọn Tăng/Giảm) -> không hiển thị dấu +/-
                const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : tx.note;
                const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && !isDirectSet && Number(tx.amount) > 0);
                const label = tx.type === 'adjustment' ? 'Cập nhật số dư' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'bg-gray-100 dark:bg-gray-800' : isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {isDirectSet ? <Pencil size={15} className="text-gray-500 dark:text-gray-400" /> : isPositive ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm">{label}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs">{displayNote || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                    <p className={`font-medium text-sm flex-shrink-0 ${isDirectSet ? 'text-gray-900 dark:text-white' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>{isDirectSet ? '' : isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET ============ */}
      <div className="hidden md:block w-full max-w-4xl px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={account.icon} size={40} active activeColor="#10b981" />
              <div>
                <h1 className="text-gray-900 dark:text-white text-xl font-semibold leading-tight">{account.name}</h1>
                <p className="text-gray-400 dark:text-gray-500 text-sm">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdjust(true)} className="bg-emerald-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5"><Pencil size={14} /> Cập nhật số dư</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><Pencil size={15} className="text-gray-500 dark:text-gray-400" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm"><Trash2 size={15} className="text-red-400" /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 mb-6">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Số dư hiện tại</p>
              <p className="text-gray-900 dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800">
              <h2 className="text-gray-900 dark:text-white font-semibold text-lg mb-4">Lịch sử</h2>
              {history.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                  {history.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.category_id);
                    // Điều chỉnh kiểu "đặt thẳng số dư mới" (không chọn Tăng/Giảm) -> không hiển thị dấu +/-
                    const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                    const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : tx.note;
                    const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && !isDirectSet && Number(tx.amount) > 0);
                    const label = tx.type === 'adjustment' ? 'Cập nhật số dư' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'bg-gray-100 dark:bg-gray-800' : isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          {isDirectSet ? <Pencil size={15} className="text-gray-500 dark:text-gray-400" /> : isPositive ? <TrendingUp size={16} className="text-emerald-600" /> : <TrendingDown size={16} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium text-sm">{label}</p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs">{displayNote || new Date(tx.date || tx.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                        <p className={`font-medium text-sm flex-shrink-0 ${isDirectSet ? 'text-gray-900 dark:text-white' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>{isDirectSet ? '' : isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 h-fit">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4">Thông tin tài khoản</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Loại</span><span className="text-gray-900 dark:text-white font-medium">{typeLabel}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 dark:text-gray-500">Số dư ban đầu</span><span className="text-gray-900 dark:text-white font-medium">{formatMoney(account.initial_balance || 0)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showAdjust && <QuickAdjustBalanceForm account={account} currentBalance={balance} onClose={() => setShowAdjust(false)} onSaved={reload} />}
      {showEdit && <EditAccountModal account={account} onClose={() => setShowEdit(false)} onSaved={reload} />}
      <BottomNav screen="accounts" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
    </div>
  );
}

function Accounts({ setScreen, accounts, transactions, onOpenAccount, reload, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [showCreate, setShowCreate] = useState(false);
  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  return (
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* ============ BẢN ĐIỆN THOẠI ============ */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 md:hidden" />
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <h1 className="text-white text-lg font-semibold">Quản lý ví</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Plus size={18} className="text-white" /></button>
        </div>
        <div className="px-5 mt-4 text-center"><p className="text-white/80 text-sm">Tổng tất cả tài khoản</p><p className="text-white text-3xl font-bold">{formatMoney(totalBalance)}</p></div>
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-t-[2.5rem] min-h-[70vh] px-5 pt-6 pb-6">
          {accounts.length === 0 ? <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">Chưa có ví nào. Bấm + để thêm ví đầu tiên.</p> : (
            <div className="flex flex-col gap-3">
              {accounts.map((acc) => (
                <button key={acc.id} onClick={() => onOpenAccount(acc.id, 'accounts')} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <EmojiCircle emoji={acc.icon} size={44} bg="#ede9fe" />
                  <div className="flex-1 min-w-0"><p className="text-gray-900 dark:text-white font-medium text-sm">{acc.name}</p><p className="text-gray-400 dark:text-gray-500 text-xs capitalize">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p></div>
                  <p className="text-gray-900 dark:text-white font-semibold">{formatMoney(accountBalance(acc, transactions))}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET ============ */}
      <div className="hidden md:block w-full max-w-[1200px] px-8 py-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-gray-900 dark:text-white text-2xl font-semibold">Quản lý ví</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tổng tất cả tài khoản: <span className="text-gray-900 dark:text-white font-semibold">{formatMoney(totalBalance)}</span></p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Thêm ví mới
          </button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-16">Chưa có ví nào. Bấm "Thêm ví mới" để bắt đầu.</p>
        ) : (
          <div className="grid grid-cols-3 gap-5 mt-6">
            {accounts.map((acc) => (
              <button key={acc.id} onClick={() => onOpenAccount(acc.id, 'accounts')} className="text-left bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <EmojiCircle emoji={acc.icon} size={44} active activeColor="#10b981" />
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-semibold truncate">{acc.name}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p>
                  </div>
                </div>
                <p className="text-gray-900 dark:text-white text-xl font-bold">{formatMoney(accountBalance(acc, transactions))}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && <EditAccountModal onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
      <BottomNav screen="accounts" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
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
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 mb-4">
        <button onClick={() => setTab('expense')} className={`flex-1 py-2 rounded-full text-sm font-medium ${tab === 'expense' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-gray-500'}`}>Chi tiêu</button>
        <button onClick={() => setTab('income')} className={`flex-1 py-2 rounded-full text-sm font-medium ${tab === 'income' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-gray-500'}`}>Thu nhập</button>
      </div>
      <button onClick={startNew} className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-3 text-sm text-gray-500 dark:text-gray-400 font-medium mb-4 flex items-center justify-center gap-2"><Plus size={16} /> Thêm danh mục mới</button>
      <div className="flex flex-col gap-2">
        {list.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
            <EmojiCircle emoji={cat.icon} size={36} bg="#ede9fe" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white font-medium text-sm">{cat.name} {cat.is_fund && <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full ml-1">Quỹ</span>}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                {cat.monthly_limit ? `Hạn mức: ${formatMoney(cat.monthly_limit)}` : ''}
                {cat.monthly_limit && cat.interest_rate > 0 ? ' • ' : ''}
                {cat.interest_rate > 0 ? `Lãi ${cat.interest_rate}%/năm` : ''}
              </p>
            </div>
            <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center"><Pencil size={14} className="text-gray-500 dark:text-gray-400" /></button>
            <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-800 w-full rounded-t-3xl p-5 max-w-sm mx-auto max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900 dark:text-white">{editing === 'new' ? 'Danh mục mới' : 'Sửa danh mục'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-gray-500 dark:text-gray-400" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🍜)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            <MoneyInput value={form.monthly_limit} onChange={(v) => setForm({ ...form, monthly_limit: v })} placeholder="Hạn mức tối đa mỗi lần nhập (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            {tab === 'expense' && (
              <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận %/năm (không bắt buộc)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            )}
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.is_fund} onChange={(e) => setForm({ ...form, is_fund: e.target.checked })} /> Đây là 1 "quỹ" — hiện thẻ tổng tiền ở Trang chủ</label>
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
      <button onClick={startNew} className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-3 text-sm text-gray-500 dark:text-gray-400 font-medium mb-4 flex items-center justify-center gap-2"><Plus size={16} /> Thêm tài khoản mới</button>
      <div className="flex flex-col gap-2">
        {accounts.map((acc) => (
          <div key={acc.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-2xl p-3">
            <EmojiCircle emoji={acc.icon} size={36} bg="#ede9fe" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 dark:text-white font-medium text-sm">{acc.name}</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">Số dư ban đầu: {formatMoney(acc.initial_balance || 0)}</p>
            </div>
            <button onClick={() => startEdit(acc)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center"><Pencil size={14} className="text-gray-500 dark:text-gray-400" /></button>
            <button onClick={() => handleDelete(acc.id)} className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-gray-800 w-full rounded-t-3xl p-5 max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900 dark:text-white">{editing === 'new' ? 'Tài khoản mới' : 'Sửa tài khoản'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-gray-500 dark:text-gray-400" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản (vd: Vietinbank)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-gray-500">
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-gray-500" />
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
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const full = user?.user_metadata?.full_name || '';
    const first = user?.user_metadata?.first_name || '';
    setFirstName(first);
    setLastName(full.replace(first, '').trim());
    setAvatarUrl(user?.user_metadata?.avatar_url || '');
  }, [user]);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${user.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) { alert('Lỗi tải ảnh lên: ' + uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setUploading(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    setAvatarUrl(data.publicUrl);
    onUpdated();
  }

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

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) { setPasswordMessage('Mật khẩu cần tối thiểu 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('Mật khẩu nhập lại không khớp'); return; }
    setSavingPassword(true);
    setPasswordMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordMessage('Lỗi: ' + error.message); return; }
    setPasswordMessage('Đã đổi mật khẩu!');
    setNewPassword(''); setConfirmPassword('');
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Ảnh đại diện */}
      <div>
        <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Ảnh đại diện</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-semibold text-gray-400 dark:text-gray-500">{(firstName || user?.email || 'B')[0].toUpperCase()}</span>}
          </div>
          <label className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-2">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {uploading ? 'Đang tải...' : 'Đổi ảnh đại diện'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Thông tin cá nhân */}
      <div>
        <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3">Thông tin cá nhân</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">{user?.email}</p>
        <div className="flex gap-3 mb-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tên" className="w-1/2 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Họ" className="w-1/2 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
        </div>
        {message && <p className="text-sm text-violet-600 mb-3">{message}</p>}
        <button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white rounded-xl px-6 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu thay đổi
        </button>
      </div>

      {/* Đổi mật khẩu */}
      <div>
        <p className="text-gray-900 dark:text-white font-semibold text-sm mb-3 flex items-center gap-2"><KeyRound size={15} /> Đổi mật khẩu</p>
        <div className="flex flex-col gap-3 max-w-sm">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-gray-500" />
        </div>
        {passwordMessage && <p className="text-sm text-violet-600 mt-3">{passwordMessage}</p>}
        <button onClick={handleChangePassword} disabled={savingPassword} className="mt-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-6 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Đổi mật khẩu
        </button>
      </div>
    </div>
  );
}

function Settings({ setScreen, categories, accounts, reload, user, onProfileUpdated, onAddClick, theme, toggleTheme, initialSection, openSettings, sidebarCollapsed, toggleSidebar }) {
  const displayName = user?.user_metadata?.first_name || user?.user_metadata?.full_name;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const [section, setSection] = useState(initialSection || 'profile'); // 'profile' | 'categories' | 'accounts'

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className={`min-h-screen relative bg-gray-100 dark:bg-gray-950 flex justify-center ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} md:pt-20 transition-colors`}>
      {/* ============ BẢN ĐIỆN THOẠI ============ */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 md:hidden" />
      <div className="w-full max-w-sm md:hidden min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
          <h1 className="text-white text-lg font-semibold">Cài đặt</h1>
        </div>

        <div className="px-5 mt-4 flex gap-2">
          <button onClick={() => setSection('profile')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'profile' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-white/30 text-white'}`}>Hồ sơ</button>
          <button onClick={() => setSection('categories')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'categories' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'bg-white/30 text-white'}`}>Danh mục</button>
        </div>

        <div className="mt-4 bg-white dark:bg-gray-900 rounded-t-[2.5rem] min-h-[76vh] px-5 pt-6 pb-6">
          {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} />}
          {section === 'categories' && <CategorySection categories={categories} reload={reload} />}
        </div>
      </div>

      {/* ============ BẢN DESKTOP/TABLET ============ */}
      <div className="hidden md:block w-full max-w-3xl px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-gray-900 dark:text-white text-2xl font-semibold">Cài đặt</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white text-red-500 rounded-full px-4 py-2 text-sm font-medium shadow-sm border border-gray-100 dark:border-gray-800"><LogOut size={15} /> Đăng xuất</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setSection('profile')} className={`px-5 py-2 rounded-full text-sm font-medium ${section === 'profile' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}>Hồ sơ</button>
          <button onClick={() => setSection('categories')} className={`px-5 py-2 rounded-full text-sm font-medium ${section === 'categories' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800'}`}>Danh mục</button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm shadow-black/5 border border-gray-100 dark:border-gray-800 p-6">
          {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} />}
          {section === 'categories' && <CategorySection categories={categories} reload={reload} />}
        </div>
      </div>

      <BottomNav screen="settings" setScreen={setScreen} onAddClick={onAddClick} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={openSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
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
  const [settingsSection, setSettingsSection] = useState('profile');
  function goToSettings(section) { setSettingsSection(section || 'profile'); setScreen('settings'); }

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
    return <><FundDetail category={cat} transactions={transactions} onBack={() => setScreen(fundReturnScreen)} reload={loadAll} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  }
  if (screen === 'account-detail') {
    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (!acc) { setScreen('accounts'); return null; }
    return <><AccountDetail account={acc} transactions={transactions} categories={categories} onBack={() => setScreen(accountReturnScreen)} reload={loadAll} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  }
  if (screen === 'funds') return <><Funds setScreen={setScreen} categories={categories} transactions={transactions} onOpenFund={openFund} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  if (screen === 'goals') return <><Goals setScreen={setScreen} goals={goals} loadingGoals={loadingGoals} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  if (screen === 'accounts') return <><Accounts setScreen={setScreen} accounts={accounts} transactions={transactions} onOpenAccount={openAccount} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  if (screen === 'settings') return <><Settings setScreen={setScreen} categories={categories} accounts={accounts} reload={loadAll} user={currentUser} onProfileUpdated={refreshUser} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} initialSection={settingsSection} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
  return <><Dashboard setScreen={setScreen} transactions={transactions} categories={categories} accounts={accounts} goals={goals} loading={loading} displayName={displayName} avatarUrl={avatarUrl} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} onOpenFund={(id) => openFund(id, 'dashboard')} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />{showAdd && <AddTransaction onClose={() => setShowAdd(false)} accounts={accounts} categories={categories} transactions={transactions} onSaved={loadAll} />}</>;
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
