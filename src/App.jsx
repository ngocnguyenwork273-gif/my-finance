import { useState } from 'react';
import {
  Home, Sparkles, Plus, BarChart3, Settings, TrendingUp, PiggyBank, HeartPulse,
  ShoppingBag, Utensils, Fuel, ArrowLeft, Download, Music, Instagram, Car,
} from 'lucide-react';

/* ---------- Mock data (đúng schema Accounts/Categories/Transactions/Funds) ---------- */

const pinnedItems = [
  { id: 1, name: 'Đầu tư', amount: '10.242.000đ', change: '+12%', icon: TrendingUp, color: 'from-emerald-400 to-emerald-600' },
  { id: 2, name: 'Quỹ cưới', amount: '3.520.000đ', icon: PiggyBank, color: 'from-pink-400 to-rose-500' },
  { id: 3, name: 'Khẩn cấp', amount: '3.500.000đ', icon: HeartPulse, color: 'from-red-400 to-red-600' },
];

const categories = [
  { name: 'Mua sắm', amount: 3320000, color: '#7c3aed' },
  { name: 'Sức khỏe', amount: 2300000, color: '#a78bfa' },
  { name: 'Đầu tư', amount: 2000000, color: '#c4b5fd' },
  { name: 'Thuế', amount: 1600000, color: '#ddd6fe' },
  { name: 'Từ thiện', amount: 1400000, color: '#ede9fe' },
];

const transactions = [
  { id: 1, title: 'Ăn trưa với Mike', subtitle: 'Big Mac, gà rán', amount: 75000, icon: Utensils },
  { id: 2, title: 'Đổ xăng', subtitle: 'Cây xăng gần nhà', amount: 50000, icon: Fuel },
  { id: 3, title: 'Mua sắm online', subtitle: 'Shopee', amount: 320000, icon: ShoppingBag },
];

const reportTransactions = [
  { id: 1, title: 'Spotify Family Plan', subtitle: 'Gói nhạc hàng tháng', amount: 129000, icon: Music },
  { id: 2, title: 'Quảng cáo Instagram', subtitle: 'Chạy ads cửa hàng', amount: 620000, icon: Instagram },
  { id: 3, title: 'Đổ xăng', subtitle: 'Grab Bike nạp xăng', amount: 80000, icon: Car },
  { id: 4, title: 'Ăn trưa với Mike', subtitle: 'Big Mac, gà rán', amount: 75000, icon: Utensils },
];

const monthlyLimit = 5000000;
const monthlySpent = 3420000;

function formatMoney(n) {
  return Math.abs(n).toLocaleString('vi-VN') + 'đ';
}

/* ---------- Gauge (vòng chấm tròn kiểu đồng hồ đo) ---------- */

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

/* ---------- Thanh điều hướng dưới cùng ---------- */

function BottomNav({ screen, setScreen }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-white rounded-full shadow-xl shadow-black/10 px-6 py-3 flex items-center justify-between z-10">
      <button onClick={() => setScreen('dashboard')}>
        <Home size={20} className={screen === 'dashboard' ? 'text-gray-900' : 'text-gray-300'} />
      </button>
      <Sparkles size={20} className="text-gray-300" />
      <button className="w-11 h-11 rounded-full bg-gray-900 flex items-center justify-center -mt-6 shadow-lg">
        <Plus size={20} className="text-white" />
      </button>
      <button onClick={() => setScreen('report')}>
        <BarChart3 size={20} className={screen === 'report' ? 'text-gray-900' : 'text-gray-300'} />
      </button>
      <Settings size={20} className="text-gray-300" />
    </div>
  );
}

/* ---------- Màn Dashboard ---------- */

function Dashboard({ setScreen }) {
  const total = categories.reduce((s, c) => s + c.amount, 0);
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
              {categories.map((cat) => {
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
              {categories.map((cat) => (
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
            <button className="text-violet-600 text-sm font-medium">Xem tất cả</button>
          </div>

          <div className="flex flex-col divide-y divide-gray-100">
            {transactions.map((tx) => {
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

/* ---------- App gốc: chuyển màn hình ---------- */

export default function App() {
  const [screen, setScreen] = useState('dashboard');
  return screen === 'dashboard' ? <Dashboard setScreen={setScreen} /> : <Report setScreen={setScreen} />;
}
