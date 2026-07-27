import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, Sparkles, Plus, BarChart3, Settings as SettingsIcon, TrendingUp, PiggyBank, HeartPulse,
  ArrowLeft, Download, X, Check, Loader2, Target, Wallet, Trash2, Pencil, LogOut, Mail, Lock,
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

/* ---------- Màn Đăng nhập / Đăng ký ---------- */

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    if (!email || !password) { setMessage('Nhập đủ email và mật khẩu'); return; }
    setLoading(true);
    setMessage('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage('Lỗi: ' + error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage('Lỗi: ' + error.message);
      else setMessage('Tạo tài khoản thành công! Giờ bấm Đăng nhập.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1>
        <p className="text-gray-400 text-sm mb-6">Quản lý tài chính cá nhân của bạn</p>
        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 mb-3">
          <Mail size={16} className="text-gray-400" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-transparent outline-none text-sm flex-1" />
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 mb-4">
          <Lock size={16} className="text-gray-400" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu (tối thiểu 6 ký tự)" className="bg-transparent outline-none text-sm flex-1" />
        </div>
        {message && <p className="text-sm text-center mb-4 text-violet-600">{message}</p>}
        <button onClick={handleSubmit} disabled={loading} className="w-full bg-gray-900 text-white rounded-2xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} className="w-full text-center text-sm text-gray-500 mt-4">
          {mode === 'login' ? 'Chưa có tài khoản? Tạo mới' : 'Đã có tài khoản? Đăng nhập'}
        </button>
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

function BottomNav({ screen, setScreen }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-white rounded-full shadow-xl shadow-black/10 px-6 py-3 flex items-center justify-between z-10">
      <button onClick={() => setScreen('dashboard')}><Home size={20} className={screen === 'dashboard' ? 'text-gray-900' : 'text-gray-300'} /></button>
      <button onClick={() => setScreen('goals')}><Sparkles size={20} className={screen === 'goals' ? 'text-gray-900' : 'text-gray-300'} /></button>
      <button onClick={() => setScreen('add')} className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg"><Plus size={20} className="text-white" /></button>
      <button onClick={() => setScreen('report')}><BarChart3 size={20} className={screen === 'report' ? 'text-gray-900' : 'text-gray-300'} /></button>
      <button onClick={() => setScreen('settings')}><SettingsIcon size={20} className={screen === 'settings' ? 'text-gray-900' : 'text-gray-300'} /></button>
    </div>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ setScreen, transactions, categories, loading }) {
  const fundCategories = categories.filter((c) => c.is_fund);
  function fundTotal(catId) { return transactions.filter((t) => t.category_id === catId).reduce((s, t) => s + Number(t.amount), 0); }
  const expenseCats = categories.filter((c) => c.type === 'expense' && !c.is_fund);
  const spentByCat = expenseCats.map((c) => ({ ...c, amount: transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) })).filter((c) => c.amount > 0);
  const total = spentByCat.reduce((s, c) => s + c.amount, 0) || 1;
  const radius = 60, circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const palette = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-300 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div><p className="text-white/80 text-sm">Chào bạn!</p><h1 className="text-white text-2xl font-semibold">Khang</h1></div>
          <button onClick={() => setScreen('accounts')} className="w-11 h-11 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white border border-white/40"><Wallet size={18} /></button>
        </div>
        <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2">
          {fundCategories.length === 0 ? <p className="text-white/70 text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p>
            : fundCategories.map((f) => (
              <div key={f.id} className="min-w-[150px] bg-white/90 backdrop-blur rounded-3xl p-4 shadow-lg shadow-black/5 flex-shrink-0">
                <EmojiCircle emoji={f.icon} size={36} active activeColor="#7c3aed" />
                <p className="text-gray-500 text-xs mt-3">{f.name}</p>
                <p className="text-gray-900 font-semibold text-base">{formatMoney(fundTotal(f.id))}</p>
              </div>
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
        <BottomNav screen="dashboard" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Report ---------- */

function Report({ setScreen }) {
  const [period, setPeriod] = useState('Monthly');
  const periods = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  const periodLabels = { Weekly: 'Tuần', Monthly: 'Tháng', Quarterly: 'Quý', Yearly: 'Năm' };
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
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
        <BottomNav screen="report" setScreen={setScreen} />
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

function Goals({ setScreen, goals, loadingGoals, reload }) {
  const [showAddGoal, setShowAddGoal] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
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
        <BottomNav screen="goals" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Thêm giao dịch ---------- */

function AddTransaction({ setScreen, accounts, categories, onSaved }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState(nowForInput());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (accounts.length > 0 && !selectedAccount) setSelectedAccount(accounts[0].id); }, [accounts]);

  const categoryList = categories.filter((c) => c.type === type);
  const activeCat = categories.find((c) => c.id === selectedCategory);
  const overLimit = activeCat?.monthly_limit && Number(amount) > Number(activeCat.monthly_limit);

  function handleAmountChange(e) { setAmount(e.target.value.replace(/\D/g, '')); }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { alert('Vui lòng chọn danh mục'); return; }
    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      account_id: selectedAccount, category_id: selectedCategory, type, amount: Number(amount),
      note: note || null, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi khi lưu: ' + error.message); return; }
    onSaved(); setScreen('dashboard');
  }

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-10 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"><X size={18} className="text-gray-700" /></button>
          <h1 className="text-gray-900 text-lg font-semibold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex bg-gray-100 rounded-full p-1">
            <button onClick={() => { setType('expense'); setSelectedCategory(null); }} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${type === 'expense' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Chi tiêu</button>
            <button onClick={() => { setType('income'); setSelectedCategory(null); }} className={`flex-1 py-2 rounded-full text-sm font-medium transition ${type === 'income' ? 'bg-white text-gray-900 shadow' : 'text-gray-400'}`}>Thu nhập</button>
          </div>
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-gray-400 text-sm mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <input type="text" inputMode="numeric" value={amount ? Number(amount).toLocaleString('en-US') : ''} onChange={handleAmountChange} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit ? 'text-red-500' : type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`} />
            <span className="text-4xl font-bold text-gray-300">đ</span>
          </div>
          {overLimit && <p className="text-red-500 text-xs mt-2">⚠️ Vượt hạn mức {formatMoney(activeCat.monthly_limit)} của danh mục này!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Danh mục</p>
          {categoryList.length === 0 ? <p className="text-gray-400 text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
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
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Tài khoản</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {accounts.map((acc) => {
              const active = selectedAccount === acc.id;
              return <button key={acc.id} onClick={() => setSelectedAccount(acc.id)} className={`flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 border transition ${active ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}><span>{acc.icon}</span><span className="text-sm">{acc.name}</span></button>;
            })}
          </div>
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Ngày giờ</p>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-gray-900 font-semibold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm outline-none" />
        </div>
        <div className="px-5 mt-10">
          <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Lưu giao dịch'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tiền trong tài khoản ---------- */

function Accounts({ setScreen, accounts, transactions }) {
  function balanceOf(acc) {
    const delta = transactions.filter((t) => t.account_id === acc.id).reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return Number(acc.initial_balance || 0) + delta;
  }
  const totalBalance = accounts.reduce((s, a) => s + balanceOf(a), 0);
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
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
                <p className="text-gray-900 font-semibold">{formatMoney(balanceOf(acc))}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomNav screen="accounts" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- Cài đặt ---------- */

function CategorySection({ categories, reload }) {
  const [tab, setTab] = useState('expense');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '', monthly_limit: '', is_fund: false });
  const [saving, setSaving] = useState(false);

  function startNew() { setForm({ name: '', icon: '', monthly_limit: '', is_fund: false }); setEditing('new'); }
  function startEdit(cat) { setForm({ name: cat.name, icon: cat.icon || '', monthly_limit: cat.monthly_limit || '', is_fund: cat.is_fund || false }); setEditing(cat.id); }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên danh mục'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '❔', type: tab, monthly_limit: form.monthly_limit ? Number(form.monthly_limit) : null, is_fund: form.is_fund };
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
              {cat.monthly_limit && <p className="text-gray-400 text-xs">Hạn mức: {formatMoney(cat.monthly_limit)}</p>}
            </div>
            <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Pencil size={14} className="text-gray-500" /></button>
            <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white w-full rounded-t-3xl p-5 max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-900">{editing === 'new' ? 'Danh mục mới' : 'Sửa danh mục'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-gray-500" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🍜)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
            <input value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value.replace(/\D/g, '') })} inputMode="numeric" placeholder="Hạn mức tối đa mỗi lần nhập (không bắt buộc)" className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none mb-3" />
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

function Settings({ setScreen, categories, accounts, reload }) {
  const [section, setSection] = useState('categories'); // 'categories' | 'accounts'

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-400 via-fuchsia-200 to-orange-100 flex justify-center">
      <div className="w-full max-w-sm min-h-screen pb-28 relative">
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <h1 className="text-white text-lg font-semibold">Cài đặt</h1>
          </div>
          <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><LogOut size={16} className="text-white" /></button>
        </div>

        <div className="px-5 mt-4 flex gap-2">
          <button onClick={() => setSection('categories')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'categories' ? 'bg-white text-gray-900' : 'bg-white/30 text-white'}`}>Danh mục</button>
          <button onClick={() => setSection('accounts')} className={`flex-1 py-2 rounded-full text-sm font-medium ${section === 'accounts' ? 'bg-white text-gray-900' : 'bg-white/30 text-white'}`}>Tài khoản</button>
        </div>

        <div className="mt-4 bg-white rounded-t-[2.5rem] min-h-[76vh] px-5 pt-6 pb-6">
          {section === 'categories' ? <CategorySection categories={categories} reload={reload} /> : <AccountSection accounts={accounts} reload={reload} />}
        </div>
        <BottomNav screen="settings" setScreen={setScreen} />
      </div>
    </div>
  );
}

/* ---------- App gốc: gác cổng bằng đăng nhập ---------- */

function MainApp() {
  const [screen, setScreen] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);

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

  if (screen === 'report') return <Report setScreen={setScreen} />;
  if (screen === 'goals') return <Goals setScreen={setScreen} goals={goals} loadingGoals={loadingGoals} reload={loadAll} />;
  if (screen === 'add') return <AddTransaction setScreen={setScreen} accounts={accounts} categories={categories} onSaved={loadAll} />;
  if (screen === 'accounts') return <Accounts setScreen={setScreen} accounts={accounts} transactions={transactions} />;
  if (screen === 'settings') return <Settings setScreen={setScreen} categories={categories} accounts={accounts} reload={loadAll} />;
  return <Dashboard setScreen={setScreen} transactions={transactions} categories={categories} loading={loading} />;
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = đang kiểm tra, null = chưa đăng nhập, object = đã đăng nhập

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 size={28} className="animate-spin text-violet-400" /></div>;
  }
  if (!session) return <AuthScreen />;
  return <MainApp />;
}
