/* ==============================================================================
   Modal thêm giao dịch (mở toàn cục từ MainApp).
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import DateTimeField from '../DateTimeField';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { EmojiCircle } from '../components/ui';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { Check, Loader2, PiggyBank, TrendingDown, TrendingUp, X } from '../icons';
import { ACCUMULATION_FUND_CATEGORY_NAME, accountBalance, buildPeriods, calculatePeriodFinancials, computeAccumulationBeforeSpendTarget, currentPeriodKey, dailyLimitFor, fundBalanceWithProfit, limitPeriodSuffix, nowForInput, stripOverLimitTag, tagPeriodNote, todaySpentInCategory } from '../lib/finance';
import { formatMoney } from '../lib/format';
import { supabase } from '../supabaseClient';

export function AddTransaction({ onClose, accounts, categories, transactions, onSaved, initialType, spendingPoolByPeriod }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [type, setType] = useState(initialType || 'expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedYear, setSelectedYear] = useState(Number(currentPeriodKey().split('-')[0]));
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodKey());
  const [expenseSource, setExpenseSource] = useState(null);
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState(nowForInput());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  const categoryType = type === 'income' ? 'income' : 'expense';
  const categoryList = categories.filter((c) => c.type === categoryType && (type !== 'allocation' || c.is_fund));
  const activeCat = categories.find((c) => c.id === selectedCategory);
  const isFundCategory = type === 'expense' && !!activeCat?.is_fund;
  // Hạn mức của danh mục (không áp dụng cho quỹ) được quy đổi ra mức trần MỖI NGÀY từ hạn
  // mức theo kỳ (vd: 600,000đ/tháng → ~20,000đ/ngày). Kiểm tra bằng tổng đã chi HÔM NAY của
  // danh mục này cộng thêm khoản đang nhập, chứ không so trực tiếp khoản đang nhập với cả
  // hạn mức kỳ — vì hạn mức kỳ là tổng cho cả kỳ, không phải mức cho phép mỗi lần nhập.
  const dailyLimit = !isFundCategory ? dailyLimitFor(activeCat) : null;
  const todaySpent = dailyLimit != null ? todaySpentInCategory(transactions, activeCat.id) : 0;
  const overLimit = type === 'expense' && dailyLimit != null && amount && (todaySpent + Number(amount)) > dailyLimit;

  const usesPeriod = type === 'income' || (type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income');
  // Compute financials for the selected period using the new logic
  const financials = usesPeriod && selectedPeriod
    ? calculatePeriodFinancials(selectedPeriod, transactions, categories, spendingPoolByPeriod?.[selectedPeriod])
    : null;
  const remainingAfterSpend = financials?.remainingAfterSpend ?? 0;
  const periodOverLimit = ((type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income'))
    && amount
    && Number(amount) > remainingAfterSpend;

  // Quỹ "Tích lũy trước chi": khi chọn quỹ này + nguồn "Thu nhập của 1 Kỳ", công thức tự tính
  // số cần nạp theo Kỳ đang chọn và tự điền vào ô Số tiền — không cần tự gõ tay (xem
  // computeAccumulationBeforeSpendTarget ở đầu file).
  const isAccumulationFundAllocation = type === 'allocation' && activeCat?.name === ACCUMULATION_FUND_CATEGORY_NAME && expenseSource === 'income';
  const suggestedAccumulationAmount = isAccumulationFundAllocation
    ? computeAccumulationBeforeSpendTarget(selectedPeriod, transactions, categories, spendingPoolByPeriod)
    : null;
  const lastSuggestedAccumulationRef = useRef(null);
  useEffect(() => {
    if (suggestedAccumulationAmount == null) return;
    // Chỉ tự điền nếu ô đang trống, hoặc đang giữ đúng số gợi ý lần trước (đổi Kỳ/nguồn) —
    // không ghi đè nếu người dùng đã tự gõ 1 số khác.
    if (amount === '' || amount === lastSuggestedAccumulationRef.current) {
      setAmount(String(suggestedAccumulationAmount));
      lastSuggestedAccumulationRef.current = String(suggestedAccumulationAmount);
    }
  }, [suggestedAccumulationAmount]);

  const fundBalanceNow = isFundCategory ? fundBalanceWithProfit(activeCat, transactions || []) : null;
  const fundOverBalance = isFundCategory && amount && Number(amount) > fundBalanceNow;
  const sourceAccount = ((type === 'expense' && !isFundCategory) || type === 'allocation') && expenseSource && expenseSource !== 'income' ? accounts.find((a) => a.id === expenseSource) : null;
  const sourceOverBalance = sourceAccount && amount && Number(amount) > accountBalance(sourceAccount, transactions || []);

  // FIX: dùng chung MoneyInput để hỗ trợ gõ biểu thức cộng/trừ/nhân/chia (xem MoneyInput ở trên).
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

  function resetForm() {
    setAmount('');
    setSelectedCategory(null);
    setExpenseSource(null);
    setNote('');
    setDateTime(nowForInput());
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { toast('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { toast('Vui lòng chọn danh mục'); return; }

    let accountIdToSave = null;
    let noteToSave = note || null;

    // Check overlimit
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
        // Chi tiêu từ quỹ: trừ thẳng vào quỹ, không cần chọn nguồn tiền.
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
    const { error } = await supabase.from('transactions').insert({
      account_id: accountIdToSave, category_id: selectedCategory, type, amount: Number(amount),
      note: noteToSave, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { toast('Lỗi khi lưu: ' + error.message); return; }
    onSaved();
    resetForm();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e1e32] w-full h-full md:h-auto md:max-h-[88vh] md:max-w-xl md:rounded-3xl md:overflow-y-auto overflow-y-auto relative scrollbar-hide">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e1e32] z-10">
          <button aria-label="Đóng" onClick={onClose} className="w-9 h-9 rounded-full bg-ice-cream dark:bg-night-sky flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
          <h1 className="text-blueberry dark:text-white text-lg font-bold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          {/* FIX: trạng thái active trước đây chỉ khác biệt bằng nền trắng (bg-white) trên nền
              ice-cream — 2 màu này rất gần nhau (đều gần trắng) nên nhìn không rõ tab nào
              đang chọn. Giờ thêm ring màu turquoise + đậm chữ (font-extrabold) + shadow rõ
              hơn để tab active nổi bật hẳn so với 2 tab còn lại. Đồng thời bổ sung icon cho
              cả 3 tab (trước đây chỉ có chữ) — đồng bộ với bộ icon đã dùng ở menu "+" nhanh
              trên mobile (TrendingUp/PiggyBank/TrendingDown), cho nhất quán trong toàn app. */}
          <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1">
            <button onClick={() => handleTypeChange('income')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingUp size={14} className="flex-shrink-0" /> Thu nhập</button>
            <button onClick={() => handleTypeChange('allocation')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'allocation' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><PiggyBank size={14} className="flex-shrink-0" /> Nạp quỹ</button>
            <button onClick={() => handleTypeChange('expense')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm transition flex items-center justify-center gap-1 ${type === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingDown size={14} className="flex-shrink-0" /> Chi tiêu</button>
          </div>
          {type === 'allocation' && <p className="text-steel dark:text-light-grey text-xs mt-2 text-center">Nạp quỹ từ Thu nhập của 1 Kỳ, hoặc chuyển thẳng từ 1 ví/tài khoản.</p>}
          {type === 'income' && <p className="text-steel dark:text-light-grey text-xs mt-2 text-center">Thu nhập được gom theo Kỳ — nhiều khoản thu trong cùng 1 Kỳ sẽ được cộng dồn lại.</p>}
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
          {sourceOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của nguồn tiền này ({formatMoney(accountBalance(sourceAccount, transactions || []))})!</p>}
          {suggestedAccumulationAmount != null && <p className="text-turquoise text-xs mt-2 font-semibold">Đã tự điền theo công thức Tích lũy trước chi của kỳ này: {formatMoney(suggestedAccumulationAmount)}. Bạn vẫn có thể sửa lại số tiền.</p>}
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
          {savedMsg && <p className="text-turquoise text-sm text-center mb-3 bg-turquoise-light dark:bg-turquoise/10 rounded-xl py-2 font-semibold">✓ Đã lưu giao dịch. Bạn có thể thêm giao dịch tiếp theo.</p>}
          <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Lưu giao dịch'}</button>
        </div>
      </div>
    </div>
  );
}
