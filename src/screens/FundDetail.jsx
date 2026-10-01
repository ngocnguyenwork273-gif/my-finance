/* ==============================================================================
   Màn chi tiết một Quỹ (kèm form nạp/rút nhanh).
   ============================================================================== */
import { Fragment, useEffect, useRef, useState } from 'react';
import DateField from '../DateField';
import DateTimeField from '../DateTimeField';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { TxDeleteButton } from '../components/ledger';
import { EmojiCircle, ProgressBar } from '../components/ui';
import { useAppData } from '../context';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { EditFundForm } from '../forms/EditFundForm';
import { ArrowLeft, Check, ChevronRight, Loader2, Pencil, Sparkles, Star, Trash2, TrendingDown, TrendingUp, Wallet, X } from '../icons';
import { ACCUMULATION_FUND_CATEGORY_NAME, buildPeriods, compareTxTime, computeAccumulationBeforeSpendTarget, currentPeriodKey, displayTxNote, findInitialAllocation, firstProfitCreditDate, fundBalance, fundBalanceAtDate, fundBalanceWithProfit, fundDailyProfitHistory, nowForInput, parsePeriodTag, stripPeriodTag, tagPeriodNote } from '../lib/finance';
import { formatMoney, txDeleteDescription } from '../lib/format';
import { supabase } from '../supabaseClient';

function QuickAllocateWithdrawForm({ category, mode, transaction, onClose, onSaved, transactions, categories, spendingPoolByPeriod }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const isEditing = !!transaction;
  const [amount, setAmount] = useState(isEditing ? String(transaction.amount) : '');
  const [note, setNote] = useState(isEditing ? stripPeriodTag(transaction.note || '') : '');
  const [saving, setSaving] = useState(false);
  const initialPeriod = isEditing ? (parsePeriodTag(transaction.note) || currentPeriodKey()) : currentPeriodKey();
  const [selectedYear, setSelectedYear] = useState(Number(initialPeriod.split('-')[0]));
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  // Quỹ "Tích lũy trước chi": KHÔNG cần tự nhập số tiền khi Nạp quỹ — công thức tự tính theo
  // Kỳ thu nhập đang chọn (xem computeAccumulationBeforeSpendTarget ở đầu file) và tự điền vào ô
  // Số tiền. Chỉ áp dụng khi tạo mới (không áp dụng lúc sửa 1 giao dịch cũ, để không ghi đè số
  // gốc đã lưu) và khi đang ở chế độ Nạp quỹ (không áp dụng cho Rút quỹ).
  const isAccumulationFund = category.name === ACCUMULATION_FUND_CATEGORY_NAME;
  const suggestedAmount = (!isEditing && mode === 'allocation' && isAccumulationFund)
    ? computeAccumulationBeforeSpendTarget(selectedPeriod, transactions, categories, spendingPoolByPeriod)
    : null;
  const lastSuggestedRef = useRef(null);
  useEffect(() => {
    if (suggestedAmount == null) return;
    // Chỉ tự điền nếu ô đang trống, hoặc đang giữ đúng số gợi ý lần trước (đổi Kỳ) — không ghi
    // đè nếu người dùng đã tự gõ 1 số khác.
    if (amount === '' || amount === lastSuggestedRef.current) {
      setAmount(String(suggestedAmount));
      lastSuggestedRef.current = String(suggestedAmount);
    }
  }, [suggestedAmount]);
  // FIX: cho phép chỉnh sửa cả ngày lẫn giờ:phút nhập (trước đây chỉ chỉnh được ngày,
  // giờ:phút luôn tự động lấy giờ hiện tại lúc lưu). Đồng bộ pattern datetime-local
  // đang dùng ở AddTransaction / EditTransaction — mặc định = giờ hiện tại, cho sửa tự do.
  const [dateTime, setDateTime] = useState(() => {
    if (!isEditing) return nowForInput();
    const d = new Date(transaction.created_at || transaction.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { toast('Nhập số tiền'); return; }
    if (!dateTime) { toast('Chọn ngày giờ nhập'); return; }
    setSaving(true);
    let noteToSave = note || null;
    if (mode === 'allocation' && selectedPeriod) {
      noteToSave = tagPeriodNote(selectedPeriod, note);
    }
    const { error } = isEditing
      ? await supabase.from('transactions').update({
          amount: Number(amount), note: noteToSave,
          date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
        }).eq('id', transaction.id)
      : await supabase.from('transactions').insert({
          category_id: category.id, type: mode, amount: Number(amount), note: noteToSave,
          date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
        });
    setSaving(false);
    if (error) { toast('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">
            {isEditing
              ? (mode === 'allocation' ? `Sửa khoản nạp — ${category.name}` : `Sửa khoản rút — ${category.name}`)
              : (mode === 'allocation' ? `Nạp vào ${category.name}` : `Rút từ ${category.name}`)}
          </h3>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        <MoneyInput value={amount} onChange={setAmount} placeholder="Số tiền" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-lg font-bold outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <DateTimeField value={dateTime} onChange={setDateTime} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        {mode === 'allocation' && (
          <div className="mb-3">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-2">Nguồn nạp (Kỳ thu nhập)</p>
            <CustomSelect value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="mb-2" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Số tiền sẽ được trừ từ thu nhập của kỳ này.</p>
            {suggestedAmount != null && <p className="text-turquoise text-xs mt-1 font-semibold">Đã tự điền theo công thức Tích lũy trước chi của kỳ này: {formatMoney(suggestedAmount)}. Bạn vẫn có thể sửa lại số tiền.</p>}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md ${mode === 'allocation' ? 'bg-gradient-primary shadow-turquoise/30' : 'bg-cotton-candy shadow-cotton-candy/30'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {isEditing ? 'Lưu thay đổi' : (mode === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ')}
        </button>
      </div>
    </div>
  );
}

export function FundDetail({ category, onBack }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { transactions, categories, reload, softDelete, spendingPoolByPeriod } = useAppData();
  const [filter, setFilter] = useState('all');
  const [showEdit, setShowEdit] = useState(false);
  const [quickMode, setQuickMode] = useState(null);
  // FIX: sửa 1 dòng nạp/rút quỹ (không phải "ban đầu") ngay từ Lịch sử -> mở đúng popup
  // Nạp/Rút quỹ (QuickAllocateWithdrawForm) ở chế độ sửa, KHÔNG mở form Sửa giao dịch chung
  // chung như trước (dễ gây nhầm lẫn vì form đó có nhiều lựa chọn không liên quan tới quỹ).
  const [editingQuickTx, setEditingQuickTx] = useState(null);
  // FIX: bộ lọc khoảng thời gian cho Lịch sử quỹ (áp dụng cho cả bản mobile lẫn desktop)
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const hasHistoryDateFilter = historyDateFrom || historyDateTo;

  async function handleDeleteTx(tx) {
    if (!(await confirmDialog('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }

  // Lấy tất cả giao dịch nạp/rút, sắp xếp theo thời gian tăng dần
  const allHistory = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));

  // FIX: xác định "khoản nạp ban đầu" qua cờ is_initial, không suy luận theo ngày sớm nhất
  const firstAllocation = findInitialAllocation(transactions, category.id);
  const initialAmount = firstAllocation ? Number(firstAllocation.amount) : 0;

  // Lịch sử lợi nhuận hàng ngày (mỗi ngày 1 dòng, đã làm tròn xuống)
  const dailyProfitHistory = fundDailyProfitHistory(category, transactions);

  // Ngày nhận lợi nhuận kỳ đầu tiên, tính theo ngày nạp tiền đầu tiên của quỹ (quy tắc Túi Thần Tài)
  const firstDepositDate = firstAllocation ? new Date(firstAllocation.date || firstAllocation.created_at) : null;
  const firstCreditDate = firstDepositDate ? firstProfitCreditDate(firstDepositDate) : null;

  // Kết hợp tất cả: giao dịch nạp/rút + lợi nhuận, sắp xếp theo thời gian tăng dần.
  // Riêng cho danh sách gộp "Tất cả": vẫn bỏ qua ngày lãi = 0đ để đỡ rác màn hình
  // (tab "Lợi nhuận" riêng ở dailyProfitHistory thì hiện đủ mọi ngày, không ẩn).
  const combinedHistory = [
    // FIX: tính sẵn "số dư sau giao dịch" (balanceAfter) cho từng dòng nạp/rút, dùng chung
    // hàm fundBalanceAtDate() đã có sẵn trong app (đúng logic cộng dồn lãi suất, đang được
    // dùng ở sổ giao dịch/ledger) — trước đây chỉ dòng "Lợi nhuận" mới có balanceAfter nên
    // các dòng Nạp/Rút quỹ không hiện dòng "Số dư: ..." như thiết kế.
    ...allHistory.map(tx => ({ ...tx, type: tx.type, isProfit: false, balanceAfter: fundBalanceAtDate(category, transactions, historyItemDate(tx), tx) })),
    ...dailyProfitHistory.filter(d => d.profit > 0).map(d => {
      // Những ngày lợi nhuận trước "kỳ đầu tiên" đều dồn hiển thị vào đúng firstCreditDate;
      // từ firstCreditDate trở đi, lợi nhuận ngày D hiển thị vào ngày D+1 như bình thường
      const dDay = new Date(d.date); dDay.setHours(0, 0, 0, 0);
      let displayDate;
      if (firstCreditDate && dDay < firstCreditDate) {
        displayDate = new Date(firstCreditDate);
      } else {
        displayDate = new Date(d.date);
        displayDate.setDate(displayDate.getDate() + 1);
      }
      displayDate.setHours(0, 27, 30, 0);
      return {
        id: `profit-${d.date.getTime()}`,
        type: 'profit',
        isProfit: true,
        amount: d.profit,
        date: d.date.toISOString(),
        created_at: displayDate.toISOString(),
        balanceAfter: d.balance,
        note: `Lợi nhuận ngày ${d.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
        displayDate: displayDate,
      };
    })
    // Chỉ hiển thị dòng lợi nhuận khi thời điểm thực tế đã tới đúng ngày credit (displayDate),
    // tránh việc dòng lợi nhuận bị "lộ" sớm 1-nhiều ngày trước khi thực sự được ghi nhận
    .filter(d => d.displayDate <= new Date())
  ].sort((a, b) => {
    // Sắp theo đúng NGÀY nghiệp vụ (từ "date", không phải created_at — created_at có thể
    // khác ngày nghiệp vụ nếu nhập bù/chỉnh sửa sau), nhưng vẫn ưu tiên GIỜ từ created_at
    // để các dòng cùng ngày sắp đúng theo giờ người dùng đã chọn (xem historyItemDate).
    // FIX: nếu historyItemDate() ra bằng nhau tuyệt đối (2 giao dịch trùng cả ngày lẫn
    // giờ:phút:giây trong created_at), phá tie cuối cùng bằng "seq" (bigserial ở DB, không
    // bao giờ trùng) để thứ tự luôn nhất quán, không phụ thuộc thứ tự ngẫu nhiên DB trả về.
    const diff = historyItemDate(a) - historyItemDate(b);
    if (diff !== 0) return diff;
    return (a.seq || 0) - (b.seq || 0);
  });

  // Lọc theo filter
  const filteredHistory = filter === 'all' ? combinedHistory :
    filter === 'profit' ? combinedHistory.filter(item => item.isProfit) :
    combinedHistory.filter(item => item.type === filter && !item.isProfit);

  // Ngày/giờ "thực" của 1 dòng lịch sử. Lợi nhuận luôn dùng "created_at" (đã được set = ngày
  // credit). Giao dịch thường: NGÀY lấy từ "date" (ngày nghiệp vụ), còn GIỜ lấy từ
  // "created_at" — vì "date" chỉ lưu ngày thuần "YYYY-MM-DD" (không có giờ), nếu dùng thẳng
  // để tính giờ thì new Date("YYYY-MM-DD") bị hiểu là 00:00 UTC, hiển thị ra giờ Việt Nam
  // (UTC+7) sẽ luôn lệch thành 07:00 bất kể giờ thật đã lưu là mấy giờ.
  function historyItemDate(item) {
    if (item.isProfit) return new Date(item.created_at);
    if (item.date && item.created_at) {
      const dayPart = String(item.date).slice(0, 10);
      const timeD = new Date(item.created_at);
      if (!isNaN(timeD)) {
        const hh = String(timeD.getHours()).padStart(2, '0');
        const mm = String(timeD.getMinutes()).padStart(2, '0');
        const ss = String(timeD.getSeconds()).padStart(2, '0');
        const combined = new Date(`${dayPart}T${hh}:${mm}:${ss}`);
        if (!isNaN(combined)) return combined;
      }
    }
    return new Date(item.date || item.created_at);
  }

  // Lọc theo khoảng ngày do người dùng chọn (nếu có)
  const dateFilteredHistory = !hasHistoryDateFilter ? filteredHistory : filteredHistory.filter((item) => {
    const d = historyItemDate(item);
    if (historyDateFrom && d < new Date(historyDateFrom + 'T00:00:00')) return false;
    if (historyDateTo && d > new Date(historyDateTo + 'T23:59:59')) return false;
    return true;
  });

  // Đảo ngược để hiển thị mới nhất lên đầu
  const displayHistory = [...dateFilteredHistory].reverse();

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
    if (!(await confirmDialog('Xóa quỹ này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('categories', category.id, `Xoá danh mục "${category.name}"`, 'delete_category');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  // Format thời gian cho hiển thị
  const formatDisplayTime = (item) => {
    if (item.isProfit) {
      // Lợi nhuận hiển thị với giờ 00:27:30 của ngày hôm sau
      const d = new Date(item.displayDate || item.created_at);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return new Date(item.created_at || item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Remove outer wrapper with padding
  return (
    <>
      <div className="md:hidden min-h-[100dvh] pb-28 relative bg-ice-cream dark:bg-[#1a1a2e]">
        <div className="h-56 relative"
          style={{
            ...(category.background_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)), url(${category.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(180deg,#0DBACC,#9F7FE0)' }),
          }}>
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
              <div className="flex items-center gap-2">
                <EmojiCircle emoji={category.icon} size={26} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
                <h1 className="text-white text-base font-bold">{category.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
              <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
            </div>
          </div>
          {category.description && <p className="px-5 mt-3 text-white/85 text-sm text-center">{category.description}</p>}
        </div>

        <div className="px-5 -mt-14 relative z-10">
          <div className="bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư quỹ</p>
                <p className="text-blueberry dark:text-white text-[26px] font-bold leading-tight mt-0.5 truncate">
                  {formatMoney(balance)}
                  {target > 0 && <span className="text-steel dark:text-light-grey text-base font-normal"> /{formatMoney(target)}</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full ring-4 ring-turquoise/30 bg-turquoise-light dark:bg-turquoise/10 flex items-center justify-center text-2xl flex-shrink-0">
                {category.icon || '🐷'}
              </div>
            </div>

            {rate > 0 && (
              <button onClick={() => setFilter('profit')} className="mt-3 w-full flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold rounded-full pl-3 pr-2 py-2">
                <Sparkles size={13} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">Tổng lợi nhuận: {formatMoney(accruedProfit)} | Hôm nay: +{formatMoney(dailyProfit)}</span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
            )}

            {target > 0 && (
              <div className="mt-3">
                <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                <p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(targetPct)}% mục tiêu</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setQuickMode('allocation')} className="flex-1 flex items-center justify-center gap-1.5 bg-turquoise/10 text-turquoise rounded-2xl py-3 text-sm font-bold">
                <TrendingUp size={16} /> Góp quỹ
              </button>
              <button onClick={() => setQuickMode('expense')} className="flex-1 flex items-center justify-center gap-1.5 bg-cotton-candy/10 text-cotton-candy rounded-2xl py-3 text-sm font-bold">
                <Wallet size={16} /> Rút quỹ
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-3">Hoạt động gần đây</h2>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Góp quỹ' }, { key: 'expense', label: 'Rút quỹ' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 font-semibold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey shadow-soft'}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] rounded-full px-3 py-1.5 shadow-soft">
              <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
              <span className="text-steel dark:text-light-grey text-xs">→</span>
              <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
            </div>
            {hasHistoryDateFilter && (
              <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
            )}
          </div>

          {displayHistory.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có hoạt động nào.</p>
          ) : (
            <div className="flex flex-col scrollbar-hide">
              {(() => {
                let lastDateKey = null;
                return displayHistory.map((item) => {
                  const isProfit = item.isProfit;
                  const isAlloc = item.type === 'allocation';
                  const isInitial = isAlloc && firstAllocation && item.id === firstAllocation.id;
                  const label = isAlloc ? 'Góp quỹ' : isProfit ? 'Nhận lợi nhuận tự động' : 'Rút quỹ';
                  const iconBg = item.type === 'expense' ? 'bg-cotton-candy/10' : 'bg-turquoise/10';
                  const amountColor = item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise';
                  const timeDisplay = formatDisplayTime(item);
                  const isOverLimit = (item.note || '').includes('[Vượt hạn mức]');
                  // Nhóm theo ngày thực hiện thực tế: giao dịch dùng "date" (thời điểm thật khi bấm nạp/rút),
                  // lợi nhuận dùng "created_at" (= ngày được credit theo quy tắc)
                  const itemDate = new Date(isProfit ? item.created_at : (item.date || item.created_at));
                  const dateKey = itemDate.toDateString();
                  const showHeader = dateKey !== lastDateKey;
                  lastDateKey = dateKey;
                  const noteText = isProfit ? item.note : displayTxNote(item.note);

                  return (
                    <Fragment key={item.id}>
                      {showHeader && (
                        <div className="-mx-5 px-5 py-2 mt-3 first:mt-0 bg-steel/5 dark:bg-white/5">
                          <p className="text-blueberry dark:text-white font-extrabold text-sm">
                            {itemDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div
                        onClick={() => { if (!isProfit) (isInitial ? setShowEdit(true) : setEditingQuickTx(item)); }}
                        className={`flex items-start gap-3 py-3 ${isProfit ? '' : 'cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl'} ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : 'border-b border-[rgba(189,189,203,0.15)] last:border-b-0'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isInitial ? 'bg-turquoise' : iconBg}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : isAlloc ? <TrendingUp size={16} className="text-turquoise" /> : isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-blueberry dark:text-white font-bold text-sm truncate">
                                {label}{isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                              </p>
                              {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                            </div>
                            <p className={`font-bold text-sm flex-shrink-0 ${amountColor}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs mt-0.5">{itemDate.toLocaleDateString('vi-VN')} · {timeDisplay}</p>
                          {noteText && <p className="text-steel dark:text-light-grey text-xs mt-0.5 truncate">{noteText}</p>}
                          {item.balanceAfter !== undefined && item.balanceAfter !== null && <p className="text-steel dark:text-light-grey text-xs mt-0.5">Số dư cuối: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        {!isProfit && (
                          // Khoản "Nạp quỹ lần đầu" (isInitial) bấm bút chì (hoặc bấm cả dòng) -> mở
                          // popup chỉnh sửa THÔNG TIN QUỸ (vì số tiền ban đầu được sửa chung trong
                          // form đó); các khoản nạp/rút khác -> mở đúng popup Nạp quỹ/Rút quỹ (tuỳ
                          // item.type) ở chế độ sửa, KHÔNG mở form Sửa giao dịch chung chung.
                          <button onClick={(e) => { e.stopPropagation(); isInitial ? setShowEdit(true) : setEditingQuickTx(item); }} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    </Fragment>
                  );
                });
              })()}
            </div>
          )}

          <div className="bg-white dark:bg-[#1e1e32] rounded-2xl p-4 mt-5 shadow-soft">
            <p className="text-steel dark:text-light-grey text-xs font-bold mb-1">Số tiền ban đầu</p>
            <p className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-turquoise/10 rounded-2xl p-4">
              <p className="text-turquoise text-xs font-bold mb-1">Tổng đã nạp</p>
              <p className="text-turquoise font-bold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-cotton-candy/10 rounded-2xl p-4">
              <p className="text-cotton-candy text-xs font-bold mb-1">Tổng đã rút</p>
              <p className="text-cotton-candy font-bold">{formatMoney(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={category.icon} size={40} active activeColor="#0DBACC" />
              <div>
                <h1 className="text-blueberry dark:text-white text-xl font-bold leading-tight">{category.name}</h1>
                {category.description && <p className="text-steel dark:text-light-grey text-sm">{category.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuickMode('allocation')} className="bg-gradient-primary text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30"><TrendingUp size={15} /> Nạp quỹ</button>
            <button onClick={() => setQuickMode('expense')} className="bg-cotton-candy text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-cotton-candy/30"><TrendingDown size={15} /> Rút quỹ</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-baby-blue-light/60 dark:bg-baby-blue/15 flex items-center justify-center shadow-soft"><Pencil size={15} className="text-baby-blue" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Trash2 size={15} className="text-cotton-candy" /></button>
          </div>
        </div>

        {category.background_url && (
          <div className="w-full h-40 rounded-3xl overflow-hidden mb-6">
            <img src={category.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
 <div className="frost-card rounded-3xl p-6 ">
              <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư hiện tại</p>
              <p className="text-blueberry dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
              {accruedProfit > 1 && <p className="text-turquoise text-sm mt-1 font-semibold">Trong đó lãi cộng dồn: {formatMoney(accruedProfit)}</p>}
              {target > 0 && (
                <div className="mt-4">
                  <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                  <p className="text-steel dark:text-light-grey text-xs mt-1">{formatMoney(balance)} / {formatMoney(target)} mục tiêu ({Math.round(targetPct)}%)</p>
                </div>
              )}
              {rate > 0 && <p className="text-turquoise text-sm mt-3 font-semibold">Lãi suất {rate}%/năm — ước tính {formatMoney(dailyProfit)}/ngày, cộng dồn tiếp tục sinh lời</p>}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-turquoise/10 rounded-2xl p-4">
                  <p className="text-turquoise text-xs font-bold mb-1">Tổng đã nạp</p>
                  <p className="text-turquoise font-bold">{formatMoney(totalIn)}</p>
                </div>
                <div className="bg-cotton-candy/10 rounded-2xl p-4">
                  <p className="text-cotton-candy text-xs font-bold mb-1">Tổng đã rút</p>
                  <p className="text-cotton-candy font-bold">{formatMoney(totalOut)}</p>
                </div>
              </div>
            </div>

 <div className="frost-card rounded-3xl p-6 ">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Lịch sử</h2>
                <div className="flex gap-2 flex-wrap">
                  {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Nạp (Thu)' }, { key: 'expense', label: 'Chi' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs flex-shrink-0 font-bold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-2 frost-inset rounded-full px-3 py-1.5">
                  <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                  <span className="text-steel dark:text-light-grey text-xs">→</span>
                  <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                </div>
                {hasHistoryDateFilter && (
                  <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
                )}
              </div>
              {filter === 'profit' ? (
                rate === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này.</p> : (
                  <div className="frost-inset rounded-2xl p-5 text-center">
                    <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                    <p className="text-blueberry dark:text-white text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                    <p className="text-steel dark:text-light-grey text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                    {dailyProfitHistory.length > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-steel dark:text-light-grey text-sm font-bold mb-2">Lịch sử lợi nhuận theo ngày</p>
                        <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] max-h-80 overflow-y-auto scrollbar-hide">
                          {dailyProfitHistory.map((d) => (
                            <div key={d.date.getTime()} className="flex items-center gap-3 py-2.5">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-turquoise/10">
                                <TrendingUp size={14} className="text-turquoise" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-blueberry dark:text-white font-bold text-sm">{d.date.toLocaleDateString('vi-VN')}</p>
                                <p className="text-steel dark:text-light-grey text-xs">Số dư sau lãi: {formatMoney(d.balance)}</p>
                              </div>
                              <p className="font-bold text-sm flex-shrink-0 text-turquoise">+{formatMoney(d.profit)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : displayHistory.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col scrollbar-hide">
                  {displayHistory.map((item, idx) => {
                    const isInitial = item.type === 'allocation' && firstAllocation && item.id === firstAllocation.id;
                    const isOverLimit = (item.note || '').includes('[Vượt hạn mức]');
                    const showTopBorder = idx > 0 && !isInitial;
                    const itemDateTime = historyItemDate(item);
                    const dateTimeLabel = `${itemDateTime.toLocaleDateString('vi-VN')} ${itemDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                    const noteLine = item.isProfit ? item.note : displayTxNote(item.note);
                    return (
                      <div
                        key={item.id}
                        onClick={() => { if (!item.isProfit) (isInitial ? setShowEdit(true) : setEditingQuickTx(item)); }}
                        className={`flex items-center gap-3 py-3 ${item.isProfit ? '' : 'cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl'} ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : showTopBorder ? 'border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isInitial ? 'bg-turquoise' : item.type === 'allocation' ? 'bg-turquoise/10' : item.isProfit ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : item.type === 'allocation' ? <TrendingUp size={16} className="text-turquoise" /> : item.isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-blueberry dark:text-white font-bold text-sm">
                              {item.type === 'allocation' ? 'Nạp quỹ' : item.isProfit ? 'Lợi nhuận' : 'Rút quỹ (chi tiêu)'}
                              {isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                            </p>
                            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs">{dateTimeLabel}</p>
                          {noteLine && <p className="text-steel dark:text-light-grey text-xs">{noteLine}</p>}
                          {item.balanceAfter !== undefined && item.balanceAfter !== null && <p className="text-steel dark:text-light-grey text-xs">Số dư cuối: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise'}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                        {!item.isProfit && (
                          // Xem giải thích ở bản mobile: khoản nạp ban đầu -> mở sửa thông tin quỹ,
                          // các khoản khác -> mở popup Nạp/Rút quỹ ở chế độ sửa.
                          <button onClick={(e) => { e.stopPropagation(); isInitial ? setShowEdit(true) : setEditingQuickTx(item); }} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!item.isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

 <div className="frost-card rounded-3xl p-6 h-fit">
            <h3 className="text-blueberry dark:text-white font-extrabold mb-4">Thông tin quỹ</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Số tiền ban đầu</span><span className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Mục tiêu</span><span className="text-blueberry dark:text-white font-bold">{target > 0 ? formatMoney(target) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Lãi suất</span><span className="text-blueberry dark:text-white font-bold">{rate > 0 ? `${rate}%/năm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã nạp</span><span className="text-turquoise font-bold">{formatMoney(totalIn)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã rút</span><span className="text-cotton-candy font-bold">{formatMoney(totalOut)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && <EditFundForm category={category} onClose={() => setShowEdit(false)} onSaved={reload} isNew={false} initialAmount={initialAmount} firstAllocation={firstAllocation} />}
      {quickMode && <QuickAllocateWithdrawForm category={category} mode={quickMode} onClose={() => setQuickMode(null)} onSaved={reload} transactions={transactions} categories={categories} spendingPoolByPeriod={spendingPoolByPeriod} />}
      {editingQuickTx && (
        <QuickAllocateWithdrawForm
          category={category}
          mode={editingQuickTx.type}
          transaction={editingQuickTx}
          onClose={() => setEditingQuickTx(null)}
          onSaved={reload}
          transactions={transactions}
          categories={categories}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
