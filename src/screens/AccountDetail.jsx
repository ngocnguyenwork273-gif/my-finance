/* ==============================================================================
   Màn chi tiết một Ví (kèm form điều chỉnh số dư).
   ============================================================================== */
import { useState } from 'react';
import DateTimeField from '../DateTimeField';
import { MoneyInput } from '../components/inputs';
import { TxDeleteButton } from '../components/ledger';
import { EmojiCircle } from '../components/ui';
import { useAppData } from '../context';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { EditAccountModal } from '../forms/EditAccountModal';
import { EditTransaction } from '../forms/EditTransaction';
import { ArrowLeft, Check, Loader2, Pencil, Trash2, TrendingDown, TrendingUp, X } from '../icons';
import { ACCOUNT_TYPES } from '../lib/accountStyles';
import { accountBalance, accountBalanceAtDate, compareTxTime, displayTxNote, nowForInput } from '../lib/finance';
import { formatMoney, txDeleteDescription } from '../lib/format';
import { supabase } from '../supabaseClient';

function QuickAdjustBalanceForm({ account, currentBalance, onClose, onSaved }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  // FIX: cho phép chỉnh sửa cả ngày lẫn giờ:phút nhập (trước đây chỉ chỉnh được ngày,
  // giờ:phút luôn tự động lấy giờ hiện tại lúc lưu). Đồng bộ pattern datetime-local
  // đang dùng ở QuickAllocateWithdrawForm — mặc định = giờ hiện tại, cho sửa tự do.
  const [dateTime, setDateTime] = useState(nowForInput());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount) { toast('Nhập số tiền'); return; }
    if (!dateTime) { toast('Chọn ngày giờ nhập'); return; }
    setSaving(true);
    let signedAmount;
    if (mode === 'increase') signedAmount = Number(amount);
    else if (mode === 'decrease') signedAmount = -Number(amount);
    else signedAmount = Number(amount) - currentBalance;

    if (signedAmount === 0) { setSaving(false); toast('Số dư không đổi, không cần cập nhật.', 'info'); return; }

    const isDirectSet = mode === null;
    const savedNote = note || (mode === 'increase' ? 'Tăng số dư' : mode === 'decrease' ? 'Giảm số dư' : 'Đặt số dư mới');
    const { error } = await supabase.from('transactions').insert({
      account_id: account.id, type: 'adjustment', amount: signedAmount,
      note: isDirectSet ? `[SET] ${savedNote}` : savedNote, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { toast('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">Cập nhật số dư — {account.name}</h3>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        {/* FIX: cùng lỗi active-state mờ + thiếu icon như các tab khác — thêm ring rõ hơn
            và icon TrendingUp/TrendingDown (tăng/giảm số dư) cho nhất quán toàn app. */}
        <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1 mb-2">
          <button onClick={() => { setMode(mode === 'increase' ? null : 'increase'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm transition flex items-center justify-center gap-1.5 ${mode === 'increase' ? 'bg-white dark:bg-[#2a2a44] text-turquoise font-extrabold shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingUp size={15} className="flex-shrink-0" /> Tăng số dư</button>
          <button onClick={() => { setMode(mode === 'decrease' ? null : 'decrease'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm transition flex items-center justify-center gap-1.5 ${mode === 'decrease' ? 'bg-white dark:bg-[#2a2a44] text-cotton-candy font-extrabold shadow-md shadow-cotton-candy/15 ring-1 ring-cotton-candy/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingDown size={15} className="flex-shrink-0" /> Giảm số dư</button>
        </div>
        <p className="text-xs text-steel dark:text-light-grey mb-3">{mode ? 'Nhập số tiền muốn tăng/giảm.' : 'Không chọn gì cả — nhập thẳng số dư mới, hệ thống tự tính chênh lệch.'}</p>
        <MoneyInput value={amount} onChange={setAmount} placeholder={mode ? 'Số tiền' : 'Số dư mới'} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-lg font-bold outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày giờ nhập</p>
        <DateTimeField value={dateTime} onChange={setDateTime} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md ${mode === 'decrease' ? 'bg-cotton-candy shadow-cotton-candy/30' : mode === 'increase' ? 'bg-gradient-primary shadow-turquoise/30' : 'bg-blueberry shadow-blueberry/30'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu cập nhật
        </button>
      </div>
    </div>
  );
}

export function AccountDetail({ account, onBack }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { transactions, categories, accounts, reload, softDelete, spendingPoolByPeriod } = useAppData();
  const [showAdjust, setShowAdjust] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const history = transactions
    .filter((t) => t.account_id === account.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment' || t.type === 'allocation'))
    .sort((a, b) => compareTxTime(b, a));
  const balance = accountBalance(account, transactions);
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label || account.type;

  async function handleDelete() {
    if (!(await confirmDialog('Xóa tài khoản này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('accounts', account.id, `Xoá ví "${account.name}"`, 'delete_account');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  async function handleDeleteTx(tx) {
    if (!(await confirmDialog('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }

  return (
    <>
      <div className="md:hidden min-h-[100dvh] pb-28 relative" style={{ background: 'linear-gradient(180deg,#0DBACC,#9F7FE0)' }}>
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <div className="flex items-center gap-2">
              <EmojiCircle emoji={account.icon} size={28} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
              <div>
                <h1 className="text-white text-lg font-bold leading-tight">{account.name}</h1>
                <p className="text-white/70 text-xs font-semibold">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
          </div>
        </div>

        <div className="px-5 mt-4 text-center">
          <p className="text-white/70 text-sm font-semibold">Số dư hiện tại</p>
          <p className="text-white text-4xl font-bold">{formatMoney(balance)}</p>
          <div className="flex items-center justify-center mt-4">
            <button onClick={() => setShowAdjust(true)} className="bg-white text-blueberry dark:text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-1.5 shadow-card">
              <Pencil size={14} /> Cập nhật số dư
            </button>
          </div>
        </div>

        <div className="mt-6 px-5 pt-6 pb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-3">Lịch sử</h2>
          {history.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
            <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] scrollbar-hide">
              {history.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : displayTxNote(tx.note);
                const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                // [SET] Đặt số dư mới: thay chữ tĩnh "Đặt số dư mới" bằng số dư thực tế đã
                // đặt, và hiện thêm "Số dư cuối" cạnh chênh lệch (+/-) để rõ ràng hơn.
                const balanceAfter = accountBalanceAtDate(account, transactions, new Date(tx.date || tx.created_at), tx);
                const subtitleNote = isDirectSet ? `Số dư mới: ${formatMoney(balanceAfter)}` : displayNote;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'bg-ice-cream dark:bg-night-sky' : isPositive ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                      {isDirectSet ? <Pencil size={15} className="text-baby-blue" /> : isPositive ? <TrendingUp size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                        {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                      </div>
                      <p className="text-steel dark:text-light-grey text-xs">{new Date(tx.created_at || tx.date).toLocaleString('vi-VN')}{subtitleNote ? ` · ${subtitleNote}` : ''}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`font-bold text-sm ${isPositive ? 'text-turquoise' : 'text-cotton-candy'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                      {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
                    </div>
                    {!isDirectSet && (
                      <button onClick={() => setEditingTx(tx)} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                        <Pencil size={14} />
                      </button>
                    )}
                    <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={account.icon} size={40} active activeColor="#0DBACC" />
              <div>
                <h1 className="text-blueberry dark:text-white text-xl font-bold leading-tight">{account.name}</h1>
                <p className="text-steel dark:text-light-grey text-sm">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdjust(true)} className="bg-gradient-primary text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30"><Pencil size={14} /> Cập nhật số dư</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-baby-blue-light/60 dark:bg-baby-blue/15 flex items-center justify-center shadow-soft"><Pencil size={15} className="text-baby-blue" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Trash2 size={15} className="text-cotton-candy" /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
 <div className="frost-card rounded-3xl p-6 mb-6">
              <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư hiện tại</p>
              <p className="text-blueberry dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
            </div>
 <div className="frost-card rounded-3xl p-6 ">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Lịch sử</h2>
              {history.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] scrollbar-hide">
                  {history.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.category_id);
                    const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                    const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : displayTxNote(tx.note);
                    const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                    const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                    const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                    // [SET] Đặt số dư mới: thay chữ tĩnh "Đặt số dư mới" bằng số dư thực tế đã
                    // đặt, và hiện thêm "Số dư cuối" cạnh chênh lệch (+/-) để rõ ràng hơn.
                    const balanceAfter = accountBalanceAtDate(account, transactions, new Date(tx.date || tx.created_at), tx);
                    const subtitleNote = isDirectSet ? `Số dư mới: ${formatMoney(balanceAfter)}` : displayNote;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'frost-inset' : isPositive ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                          {isDirectSet ? <Pencil size={15} className="text-baby-blue" /> : isPositive ? <TrendingUp size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs">{new Date(tx.created_at || tx.date).toLocaleString('vi-VN')}{subtitleNote ? ` · ${subtitleNote}` : ''}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`font-bold text-sm ${isPositive ? 'text-turquoise' : 'text-cotton-candy'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                          {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
                        </div>
                        {!isDirectSet && (
                          <button onClick={() => setEditingTx(tx)} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
 <div className="frost-card rounded-3xl p-6 h-fit">
            <h3 className="text-blueberry dark:text-white font-extrabold mb-4">Thông tin tài khoản</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Loại</span><span className="text-blueberry dark:text-white font-bold">{typeLabel}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Số dư ban đầu</span><span className="text-blueberry dark:text-white font-bold">{formatMoney(account.initial_balance || 0)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showAdjust && <QuickAdjustBalanceForm account={account} currentBalance={balance} onClose={() => setShowAdjust(false)} onSaved={reload} />}
      {showEdit && <EditAccountModal account={account} onClose={() => setShowEdit(false)} onSaved={reload} />}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts || []}
          categories={categories || []}
          transactions={transactions}
          onSaved={() => { reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
