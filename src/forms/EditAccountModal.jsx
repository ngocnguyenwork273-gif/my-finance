/* ==============================================================================
   Modal tạo/sửa ví.
   ============================================================================== */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { toast, useEscapeKey } from '../feedback';
import { Check, Loader2, X } from '../icons';
import { ACCOUNT_TYPES } from '../lib/accountStyles';
import { supabase } from '../supabaseClient';

export function EditAccountModal({ account, onClose, onSaved, isNew }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [form, setForm] = useState({ name: account?.name || '', icon: account?.icon || '', type: account?.type || 'cash', initial_balance: account?.initial_balance || '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name) { toast('Nhập tên tài khoản'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '💰', type: form.type, initial_balance: form.initial_balance ? Number(form.initial_balance) : 0, is_active: true };
    const { error } = isNew ? await supabase.from('accounts').insert(payload) : await supabase.from('accounts').update(payload).eq('id', account.id);
    setSaving(false);
    if (error) { toast('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  // FIX: modal này thường được mở từ bên trong 1 .frost-card (vd card "Ví" ở Dashboard),
  // mà .frost-card có backdrop-filter -> theo spec CSS, backdrop-filter/filter tạo ra
  // containing block mới cho các phần tử con dùng position: fixed. Kết quả là div
  // "fixed inset-0" bên dưới bị neo theo khung của .frost-card thay vì theo viewport,
  // nên form "Thêm ví mới" bị lệch ra góc/không nằm giữa màn hình như mong đợi.
  // Dùng createPortal để render thẳng ra document.body, thoát khỏi mọi ancestor có
  // filter/backdrop-filter/transform, giống cách các modal khác trong file (vd EditCategoryModal) đã làm.
  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-[999]" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Thêm ví mới' : 'Sửa tài khoản'}</h3>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <CustomSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </CustomSelect>
        <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu
        </button>
      </div>
    </div>,
    document.body
  );
}
