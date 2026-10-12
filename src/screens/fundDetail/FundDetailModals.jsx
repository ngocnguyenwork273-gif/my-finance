/* ==============================================================================
   Các modal của màn chi tiết Quỹ: sửa quỹ, nạp/rút nhanh, sửa giao dịch nạp/rút (kèm form nạp/rút nhanh).
   ============================================================================== */
import { useEffect, useRef, useState } from 'react';
import { CustomSelect, MoneyInput } from '../../components/inputs';
import DateTimeField from '../../DateTimeField';
import { toast, useEscapeKey } from '../../feedback';
import { EditFundForm } from '../../forms/EditFundForm';
import { Check, Loader2, X } from '../../icons';
import { ACCUMULATION_FUND_CATEGORY_NAME, buildPeriods, computeAccumulationBeforeSpendTarget, currentPeriodKey, nowForInput, parsePeriodTag, stripPeriodTag, tagPeriodNote } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { supabase } from '../../supabaseClient';

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

export function FundDetailModals({ v }) {
  const { categories, category, editingQuickTx, firstAllocation, initialAmount, quickMode, reload, setEditingQuickTx, setQuickMode, setShowEdit, showEdit, spendingPoolByPeriod, transactions } = v;
  return (
    <>
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
