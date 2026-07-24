import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, Sparkles, Plus, BarChart3, Settings, TrendingUp, PiggyBank, HeartPulse,
  ShoppingBag, Utensils, Fuel, ArrowLeft, Download, Music, Megaphone, Car, Coffee,
  Wallet, Landmark, Smartphone, X, Check, Loader2,
} from 'lucide-react';

/* ---------- Dữ liệu tĩnh còn giữ tạm cho Report/Goals (sẽ nối Supabase sau) ---------- */

const pinnedItems = [
  { id: 1, name: 'Đầu tư', amount: '10.242.000đ', change: '+12%', icon: TrendingUp, color: 'from-emerald-400 to-emerald-600' },
  { id: 2, name: 'Quỹ cưới', amount: '3.520.000đ', icon: PiggyBank, color: 'from-pink-400 to-rose-500' },
  { id: 3, name: 'Khẩn cấp', amount: '3.500.000đ', icon: HeartPulse, color: 'from-red-400 to-red-600' },
];

const categoryColors = [
  { name: 'Mua sắm', amount: 3320000, color: '#7c3aed' },
  { name: 'Sức khỏe', amount: 2300000, color: '#a78bfa' },
  { name: 'Đầu tư', amount: 2000000, color: '#c4b5fd' },
  { name: 'Thuế', amount: 1600000, color: '#ddd6fe' },
  { name: 'Từ thiện', amount: 1400000, color: '#ede9fe' },
];

const reportTransactions = [
  { id: 1, title: 'Spotify Family Plan', subtitle: 'Gói nhạc hàng tháng', amount: 129000, icon: Music },
  { id: 2, title: 'Quảng cáo Instagram', subtitle: 'Chạy ads cửa hàng', amount: 620000, icon: Megaphone },
  { id: 3, title: 'Đổ xăng', subtitle: 'Grab Bike nạp xăng', amount: 80000, icon: Car },
];

const goals = [
  { id: 1, name: 'Đầu tư', current: 10242000, target: 50000000, change: '+12%', icon: TrendingUp, color: 'from-emerald-400 to-emerald-600' },
  { id: 2, name: 'Quỹ khẩn cấp', current: 3520000, target: 5000000, icon: HeartPulse, color: 'from-red-400 to-red-600', tag: null },
  { id: 3, name: 'Quỹ cưới', current: 3520000, target: 12000000, icon: PiggyBank, color: 'from-pink-400 to-rose-500', tag: 'Tiết kiệm chung' },
];

const budgetLimits = [
  { id: 1, name: 'Cà phê hàng tháng', spent: 60000, limit: 100000, icon: Coffee },
  { id: 2, name: 'Xăng xe', spent: 130000, limit: 300000, icon: Fuel },
];

const monthlyLimit = 5000000;
const monthlySpent = 3420000;

// Map icon emoji lưu trong Supabase -> icon component hiển thị
const iconMap = {
  '💵': Wallet, '🏦': Landmark, '📱': Smartphone,
  '🍜': Utensils, '🛍️': ShoppingBag, '⛽': Fuel, '❤️': HeartPulse,
  '💼': Coffee, '🎁': PiggyBank,
};
function getIcon(emoji) {
  return iconMap[emoji] || ShoppingBag;
}

function formatMoney(n) {
  return Math.abs(n).toLocaleString('vi-VN') + 'đ';
}

/* ---------- Gauge ---------- */

function Gauge({ limit, spent }) {
  const ticks = 48;
  const filledTicks = Math.round((spent / limit) * ticks);
  const radius = 85;
  const center = 100;
  const tickLength = 14;
  const items = [];

  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const x1 = center + (radius - tickLength) * Math.cos(rad);
    const y1 = center + (radius - tickLength) * Math.sin(rad);
    const x2 = center + radius * Math.cos(rad);
    const y2 = center + radius * Math.sin(rad);
    const filled = i < filledTicks;
    items.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={filled ? '#7c3aed' : '#ede9fe'} strokeWidth="4" strokeLinecap="round" />
    );
  }
  const labelAngle = (filledTicks / ticks) * 360 - 90;
  const labelRad = (labelAngle * Math.PI) / 180;
  const labelX = center + (radius + 24) * Math.cos(labelRad);
  const labelY = center + (radius + 24) * Math.sin(labelRad);

  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56">
      {items}
      <foreignObject x={labelX - 34} y={labelY - 14} width="68" height="28">
        <div className="bg-gray-900 text-white text-[11px] font-medium rounded-full px-2 py-1 text-center whitespace-nowrap">
          {formatMoney(spent)}
        </div>
      </foreignObject>
      <text x={center} y={center - 6} textAnchor="middle" fill="#9ca3af" fontSize="11">Hạn mức tháng</text>
      <text x={center} y={center + 18} textAnchor="middle" fill="#111827" fontWeight="700" fontSize="20">
        {formatMoney(limit)}
      </text>
    </svg>
  );
}

function ProgressBar({ pct, colorClass = 'bg-violet-600' }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function BottomNav({ screen, setScreen }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-white rounded-full shadow-xl shadow-black/10 px-6 py-3 flex items-center justify-between z-10">
      <button onClick={() => setScreen('dashboard')}>
        <Home size={20} className={screen === 'dashboard' ? 'text-gray-900' : 'text-gray-300'} />
      </button>
      <button onClick={() => setScreen('goals')}>
        <Sparkles size={20} className={screen === 'goals' ? 'text-gray-900' : 'text-gray-300'} />
      </button>
      <button onClick={() => setScreen('add')} className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg">
        <Plus size={20} className="text-white" />
      </button>
      <button onClick={() => setScreen('report')}>
        <BarChart3 size={20} className={screen === 'report' ? 'text-gray-900' : 'text-gray-300'} />
      </button>
      <Settings size={20} className="text-gray-300" />
    </div>
  );
}

/* ---------- Màn Dashboard (dữ liệu THẬT từ Supabase) ---------- */

function Dashboard({ setScreen, transactions, categories, loading }) {
  const total = categoryColors.reduce((s, c) => s + c.amount, 0);
  let cumulative = 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Chào bạn!</p>
            <h1 className="text-white text-2xl font-semibold">Khang</h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white font-semibold border border-white/40">K</div>
        </div>

        <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2">
          {pinnedItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="min-w-[150px] bg-white/90 backdrop-blur rounded-3xl p-4 shadow-lg shadow-black/5 flex-shrink-0">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-gray-500 text-xs">{item.name}</p>
                <p className="text-gray-900 font-semibold text-base">{item.amount}</p>
                {item.change && <span className="text-emerald-600 text-xs font-medium">{item.change} ↗</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[60vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold text-lg">Ngân sách</h2>
            <button onClick={() => setScreen('report')} className="text-violet-600 text-sm font-medium">Xem chi tiết</button>
          </div>

          <div className="flex items-center gap-6">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 flex-shrink-0">
              {categoryColors.map((cat) => {
                const pct = cat.amount / total;
                const dash = pct * circumference;
                const offset = cumulative;
                cumulative += dash;
                return (
                  <circle key={cat.name} cx="75" cy="75" r={radius} fill="none" stroke={cat.color}
                    strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset} strokeLinecap="round" />
                );
              })}
            </svg>
            <div className="flex flex-col gap-2 text-sm min-w-0">
              {categoryColors.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-gray-600">{cat.name}</span>
                  <span className="text-gray-900 font-medium ml-auto">{cat.amount / 1000}k</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="text-gray-900 font-semibold text-lg">Giao dịch</h2>
            <span className="text-gray-400 text-xs">Dữ liệu thật từ Supabase</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-violet-400" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {transactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const Icon = getIcon(cat?.icon);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-50' : 'bg-violet-50'}`}>
                      <Icon size={18} className={tx.type === 'income' ? 'text-emerald-600' : 'text-violet-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm">{cat?.name || 'Khác'}</p>
                      <p className="text-gray-400 text-xs">{tx.note || '—'}</p>
                    </div>
                    <p className={`font-medium text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav screen="dashboard" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Màn Financial Report ---------- */

function Report({ setScreen }) {
  const [period, setPeriod] = useState('Monthly');
  const periods = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  const periodLabels = { Weekly: 'Tuần', Monthly: 'Tháng', Quarterly: 'Quý', Yearly: 'Năm' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-white text-lg font-semibold">Báo cáo tài chính</h1>
          <button className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
            <Download size={16} className="text-white" />
          </button>
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {periods.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 ${
                  period === p ? 'bg-gray-900 text-white font-medium' : 'bg-gray-100 text-gray-500'
                }`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-gray-100 mt-4">
            {reportTransactions.map((tx) => {
              const Icon = tx.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium text-sm">{tx.title}</p>
                    <p className="text-gray-400 text-xs">{tx.subtitle}</p>
                  </div>
                  <p className="text-gray-900 font-medium text-sm flex-shrink-0">-{formatMoney(tx.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <BottomNav screen="report" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Màn Goals & Budget ---------- */

function Goals({ setScreen }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-white text-lg font-semibold">Mục tiêu &amp; Ngân sách</h1>
        </div>

        <div className="mt-6 bg-white rounded-t-[2.5rem] min-h-[80vh] px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-semibold text-lg">Mục tiêu của tôi</h2>
            <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus size={16} className="text-gray-600" />
            </button>
          </div>
          <div className="flex flex-col gap-5">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const pct = (goal.current / goal.target) * 100;
              return (
                <div key={goal.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${goal.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 font-medium text-sm">{goal.name}</p>
                        {goal.tag && <span className="text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">{goal.tag}</span>}
                        {goal.change && <span className="text-emerald-600 text-xs font-medium">{goal.change} ↗</span>}
                      </div>
                      <p className="text-gray-900 font-semibold text-sm">{formatMoney(goal.current)}</p>
                    </div>
                  </div>
                  <ProgressBar pct={pct} />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>{formatMoney(goal.current)}</span>
                    <span>{formatMoney(goal.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="text-gray-900 font-semibold text-lg">Ngân sách</h2>
            <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus size={16} className="text-gray-600" />
            </button>
          </div>
          <div className="flex flex-col gap-5">
            {budgetLimits.map((b) => {
              const Icon = b.icon;
              const pct = (b.spent / b.limit) * 100;
              const remaining = b.limit - b.spent;
              return (
                <div key={b.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm">{b.name}</p>
                      <p className="text-gray-900 font-semibold text-sm">{formatMoney(b.limit)}</p>
                    </div>
                  </div>
                  <ProgressBar pct={pct} colorClass="bg-orange-300" />
                  <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>Còn lại khoảng {formatMoney(remaining)}</span>
                    <span>{formatMoney(b.limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <BottomNav screen="goals" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Màn Thêm giao dịch (ghi THẬT vào Supabase) ---------- */

function AddTransaction({ setScreen, accounts, categories, onSaved }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) setSelectedAccount(accounts[0].id);
  }, [accounts]);

  const categoryList = categories.filter((c) => c.type === type);

  function handleAmountChange(e) {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw);
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) {
      alert('Vui lòng nhập số tiền');
      return;
    }
    if (!selectedCategory) {
      alert('Vui lòng chọn danh mục');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      account_id: selectedAccount,
      category_id: selectedCategory,
      type,
      amount: Number(amount),
      note: note || null,
    });
    setSaving(false);
    if (error) {
      alert('Lỗi khi lưu: ' + error.message);
      return;
    }
    onSaved();
    setScreen('dashboard');
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-10 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={18} className="text-gray-700" />
          </button>
          <h1 className="text-gray-900 text-lg font-semibold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>

        <div className="px-5 mt-6">
          <div className="flex bg-gray-100 rounded-full p-1">
            <button onClick={() => { setType('expense'); setSelectedCategory(null); }}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition ${type === 'expense' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>
              Chi tiêu
            </button>
            <button onClick={() => { setType('income'); setSelectedCategory(null); }}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition ${type === 'income' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>
              Thu nhập
            </button>
          </div>
        </div>

        <div className="px-5 mt-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <input type="text" inputMode="numeric"
              value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
              onChange={handleAmountChange} placeholder="0"
              className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`} />
            <span className="text-4xl font-bold text-gray-300">đ</span>
          </div>
        </div>

        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Danh mục</p>
          {categoryList.length === 0 ? (
            <p className="text-gray-400 text-sm">Chưa có danh mục nào cho loại này.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categoryList.map((cat) => {
                const Icon = getIcon(cat.icon);
                const active = selectedCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition"
                      style={{ background: active ? (cat.color || '#7c3aed') : '#f3f4f6' }}>
                      <Icon size={20} className={active ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <span className={`text-xs ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Tài khoản</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {accounts.map((acc) => {
              const Icon = getIcon(acc.icon);
              const active = selectedAccount === acc.id;
              return (
                <button key={acc.id} onClick={() => setSelectedAccount(acc.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 border transition ${active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                  <Icon size={16} />
                  <span className="text-sm">{acc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm ghi chú (không bắt buộc)" className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
        </div>

        <div className="px-5 mt-10">
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-gray-900 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- App gốc: tải dữ liệu thật từ Supabase ---------- */

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [{ data: accData }, { data: catData }, { data: txData }] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true),
      supabase.from('categories').select('*'),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    ]);
    setAccounts(accData || []);
    setCategories(catData || []);
    setTransactions(txData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (screen === 'report') return <Report setScreen={setScreen} />;
  if (screen === 'goals') return <Goals setScreen={setScreen} />;
  if (screen === 'add')
    return <AddTransaction setScreen={setScreen} accounts={accounts} categories={categories} onSaved={loadAll} />;
  return <Dashboard setScreen={setScreen} transactions={transactions} categories={categories} loading={loading} />;
}
