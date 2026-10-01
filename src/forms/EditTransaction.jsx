/* ==============================================================================
   Form sửa giao dịch.
   ============================================================================== */
import { useState } from 'react';
import DateTimeField from '../DateTimeField';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { EmojiCircle } from '../components/ui';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { Check, Loader2, PiggyBank, TrendingDown, TrendingUp, X } from '../icons';
import { accountBalance, buildPeriods, calculatePeriodFinancials, currentPeriodKey, dailyLimitFor, dateToPeriodKey, displayTxNote, fundBalanceWithProfit, limitPeriodSuffix, parsePeriodTag, stripOverLimitTag, tagPeriodNote, todaySpentInCategory } from '../lib/finance';
import { formatMoney } from '../lib/format';
import { supabase } from '../supabaseClient';

export function EditTransaction({ transaction, onClose, accounts, categories, transactions: allTx, onSaved, spendingPoolByPeriod }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [type, setType] = useState(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [selectedCategory, setSelectedCategory] = useState(transaction.category_id);
  const [selectedYear, setSelectedYear] = useState(() => {
    const pk = parsePeriodTag(transaction.note) || dateToPeriodKey(transaction.date || transaction.created_at);
    return Number(pk.split('-')[0]);
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => parsePeriodTag(transaction.note) || dateToPeriodKey(transaction.date || transaction.created_at));
  const [expenseSource, setExpenseSource] = useState(transaction.account_id || 'income');
  const [note, setNote] = useState(displayTxNote(transaction.note || ''));
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date(transaction.created_at || transaction.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  const activeCat = categories.find((c) => c.id === selectedCategory);
  const isFundCategory = type === 'expense' && !!activeCat?.is_fund;
  // Exclude the current transaction from the pool calculation to check if the new amount exceeds remaining
  const otherTxs = (allTx || []).filter(t => t.id !== transaction.id);
  // Cùng quy tắc "hạn mức mỗi ngày" như AddTransaction — trừ chính giao dịch đang sửa ra
  // khỏi tổng đã chi hôm nay để không tự cộng đè lên chính nó.
  const dailyLimit = !isFundCategory ? dailyLimitFor(activeCat) : null;
  const todaySpent = dailyLimit != null ? todaySpentInCategory(otherTxs, activeCat.id) : 0;
  const overLimit = type === 'expense' && dailyLimit != null && amount && (todaySpent + Number(amount)) > dailyLimit;
  const usesPeriod = type === 'income' || (type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income');

  const financials = usesPeriod && selectedPeriod
    ? calculatePeriodFinancials(selectedPeriod, otherTxs, categories, spendingPoolByPeriod?.[selectedPeriod])
    : null;
  const remainingAfterSpend = financials?.remainingAfterSpend ?? 0;
  const periodOverLimit = ((type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income'))
    && amount
    && Number(amount) > remainingAfterSpend;

  const fundBalanceNow = isFundCategory ? fundBalanceWithProfit(activeCat, allTx || []) : null;
  const fundOverBalance = isFundCategory && amount && Number(amount) > fundBalanceNow;
  const sourceAccount = ((type === 'expense' && !isFundCategory) || type === 'allocation') && expenseSource && expenseSource !== 'income' ? accounts.find((a) => a.id === expenseSource) : null;
  const sourceOverBalance = sourceAccount && amount && Number(amount) > accountBalance(sourceAccount, allTx || []);

  // Fix categoryList bug
  const categoryList = categories.filter(c => {
    if (type === 'allocation') return c.is_fund;
    return c.type === (type === 'income' ? 'income' : 'expense');
  });

  // FIX: dùng chung MoneyInput để hỗ trợ gõ biểu thức cộng/trừ/nhân/chia.
  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }
  function handleTypeChange(t) {
    setType(t);
    setSelectedCategory(null);
    setExpenseSource(null);
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }
  function handleCategoryChange(id) {
    setSelectedCategory(id);
    setExpenseSource(null);
  }
  function handleExpenseSourceSelect(source) {
    setExpenseSource(source);
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { toast('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { toast('Vui lòng chọn danh mục'); return; }

    let accountIdToSave = null;
    let noteToSave = note || null;

    if (overLimit) {
      const okOverLimit = await confirmDialog(
        `Cộng khoản này, hôm nay bạn sẽ chi ${formatMoney(todaySpent + Number(amount))} cho "${activeCat.name}" — vượt mức trung bình ${formatMoney(dailyLimit)}/ngày (quy đổi từ hạn mức ${formatMoney(activeCat.monthly_limit)}${limitPeriodSuffix(activeCat.limit_period)}). Bạn vẫn muốn tiếp tục nhập?`,
        { title: 'Vượt hạn mức chi tiêu', confirmText: 'Vẫn cộng', cancelText: 'Xem lại' }
      );
      if (!okOverLimit) return;
      noteToSave = `[Vượt hạn mức] ${stripOverLimitTag(noteToSave)}`.trim();
    }

    if (type === 'income') {
      if (!selectedPeriod) { toast('Vui lòng chọn Kỳ'); return; }
      noteToSave = tagPeriodNote(selectedPeriod, noteToSave);
    } else if (type === 'allocation') {
      if (!expenseSource) { toast('Vui lòng chọn Nguồn tiền cho khoản nạp quỹ này.'); return; }
      if (expenseSource === 'income') {
        if (!selectedPeriod) { toast('Vui lòng chọn Kỳ (nguồn thu nhập để nạp quỹ)'); return; }
        if (periodOverLimit) { toast('Số tiền nạp vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
        noteToSave = tagPeriodNote(selectedPeriod, noteToSave);
      } else {
        if (sourceOverBalance) { toast('Số dư nguồn tiền không đủ.'); return; }
        accountIdToSave = expenseSource;
      }
    } else if (type === 'expense') {
      if (isFundCategory) {
        if (fundOverBalance) { toast('Số dư quỹ không đủ.'); return; }
      } else {
        if (!expenseSource) { toast('Vui lòng chọn Nguồn tiền cho khoản chi tiêu này.'); return; }
        if (expenseSource === 'income') {
          if (!selectedPeriod) { toast('Vui lòng chọn Kỳ'); return; }
          if (periodOverLimit) { toast('Số tiền chi vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
          noteToSave = tagPeriodNote(selectedPeriod, noteToSave);
        } else {
          if (sourceOverBalance) { toast('Số dư nguồn tiền không đủ.'); return; }
          accountIdToSave = expenseSource;
        }
      }
    }

    setSaving(true);
    const { error } = await supabase.from('transactions').update({
      account_id: accountIdToSave, category_id: selectedCategory, type, amount: Number(amount),
      note: noteToSave, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    }).eq('id', transaction.id);
    setSaving(false);
    if (error) { toast('Lỗi khi lưu: ' + error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e1e32] w-full h-full md:h-auto md:max-h-[88vh] md:max-w-xl md:rounded-3xl md:overflow-y-auto overflow-y-auto relative scrollbar-hide">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e1e32] z-10">
          <button aria-label="Đóng" onClick={onClose} className="w-9 h-9 rounded-full bg-ice-cream dark:bg-night-sky flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
          <h1 className="text-blueberry dark:text-white text-lg font-bold">Sửa giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          {/* FIX: cùng vấn đề active-state mờ nhạt + thiếu icon như modal "Thêm giao dịch" —
              thêm ring + font-extrabold + shadow rõ hơn cho tab đang chọn, và bổ sung icon
              cho cả 3 tab để đồng bộ với menu "+" nhanh trên mobile. */}
          <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1">
            <button onClick={() => handleTypeChange('income')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingUp size={14} className="flex-shrink-0" /> Thu nhập</button>
            <button onClick={() => handleTypeChange('allocation')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'allocation' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><PiggyBank size={14} className="flex-shrink-0" /> Nạp quỹ</button>
            <button onClick={() => handleTypeChange('expense')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingDown size={14} className="flex-shrink-0" /> Chi tiêu</button>
          </div>
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit || periodOverLimit ? 'text-cotton-candy' : type === 'income' || type === 'allocation' ? 'text-turquoise' : 'text-blueberry dark:text-white'}`} />
            <span className="text-4xl font-bold text-light-grey">đ</span>
          </div>
          {overLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Hôm nay đã chi {formatMoney(todaySpent)}, cộng khoản này sẽ vượt mức trung bình {formatMoney(dailyLimit)}/ngày của danh mục này!</p>}
          {periodOverLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt Thu nhập được chi còn lại ({formatMoney(remainingAfterSpend)}) của kỳ này!</p>}
          {fundOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của quỹ ({formatMoney(fundBalanceNow)})!</p>}
          {sourceOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của nguồn tiền này ({formatMoney(accountBalance(sourceAccount, allTx || []))})!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">{type === 'income' ? 'Danh mục thu nhập' : 'Quỹ / Danh mục'} <span className="text-cotton-candy">*</span></p>
          {categoryList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = type === 'expense' && cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
                return (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={cat.icon} size={48} active={active} activeColor={willExceed ? '#F18AB5' : '#0DBACC'} />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {type === 'expense' && isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-steel dark:text-light-grey text-xs bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3">Khoản này được trừ trực tiếp từ quỹ "{activeCat.name}" — không cần chọn nguồn tiền.</p>
          </div>
        )}

        {type === 'allocation' && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chọn "Thu nhập" nếu nạp quỹ từ Thu nhập được chi của Kỳ (sẽ trừ vào Thu nhập được chi). Chọn 1 ví/tài khoản khác nếu chuyển thẳng tiền có sẵn vào quỹ (KHÔNG trừ vào Thu nhập được chi).</p>
          </div>
        )}

        {type === 'expense' && !isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chỉ được chọn 1 nguồn tiền cho khoản chi này.</p>
          </div>
        )}

        {usesPeriod && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Năm <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Kỳ <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
            {financials && (
              <div className="mt-2 text-xs space-y-1 text-steel dark:text-light-grey">
                <p><span className="font-semibold">Thu nhập tính vào Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.incomeForSpendingPool)}</span></p>
                <p><span className="font-semibold">Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.spendingPool)}</span></p>
                <p><span className="font-semibold">Đã sử dụng (nạp quỹ + chi từ Thu nhập được chi):</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.totalSpentFromSpendingPool)}</span></p>
                <p><span className="font-semibold">Còn lại trong Thu nhập được chi:</span> <span className={`font-bold ${financials.remainingAfterSpend >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoney(financials.remainingAfterSpend)}</span></p>
                {financials.specialIncome > 0 && (
                  <p><span className="font-semibold">Thu nhập đặc biệt:</span> <span className="text-lavender font-bold">{formatMoney(financials.specialIncome)}</span></p>
                )}
                {financials.accumulationBeforeSpend > 0 && (
                  <p><span className="font-semibold">Tích lũy trước chi:</span> <span className="text-lavender font-bold">{formatMoney(financials.accumulationBeforeSpend)}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ngày giờ</p>
          <DateTimeField value={dateTime} onChange={setDateTime} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-10 pb-10">
          <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
        </div>
      </div>
    </div>
  );
}
