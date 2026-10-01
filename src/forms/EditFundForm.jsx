/* ==============================================================================
   Form tạo/sửa quỹ.
   ============================================================================== */
import { useState } from 'react';
import DateTimeField from '../DateTimeField';
import { MoneyInput } from '../components/inputs';
import { toast, useEscapeKey } from '../feedback';
import { Check, Loader2, X } from '../icons';
import { localDateStr, todayDateStr } from '../lib/finance';
import { sanitizeFileName } from '../lib/format';
import { supabase } from '../supabaseClient';
import { ImageUploader } from './ImageUploader';

export function EditFundForm({ category, onClose, onSaved, isNew, initialAmount, firstAllocation }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const [form, setForm] = useState({
    name: category?.name || '',
    icon: category?.icon || '',
    description: category?.description || '',
    target_amount: category?.target_amount || '',
    interest_rate: category?.interest_rate || '',
    background_url: category?.background_url || '',
    initial_allocation: isNew ? '' : (initialAmount || ''),
    // FIX: cho phép sửa ngày nhập số tiền nạp quỹ lần đầu (trước đây hard-code = ngày hôm nay,
    // không có cách nào chỉnh lại sau khi đã tạo quỹ).
    // .slice(0,10) để LUÔN chỉ lấy phần ngày, kể cả nếu "date" của bản ghi cũ lỡ đã bị lưu
    // thành chuỗi ngày+giờ đầy đủ (dữ liệu tạo từ 1 bản trước đó) — tránh nối chồng 2 lần
    // "T..." khi ghép lại với giờ bên dưới, gây ra Invalid Date khi lưu.
    initial_allocation_date: (!isNew && firstAllocation) ? (firstAllocation.date || localDateStr(firstAllocation.created_at)).slice(0, 10) : todayDateStr(),
    // Cho phép sửa luôn cả GIỜ nạp quỹ lần đầu, không chỉ ngày — lấy đúng giờ đang hiển thị
    // ở Lịch sử (ưu tiên đọc từ "created_at", giống formatDisplayTime) để form pre-fill
    // khớp với những gì người dùng đang thấy.
    initial_allocation_time: (() => {
      if (isNew || !firstAllocation) return new Date().toTimeString().slice(0, 5);
      const raw = firstAllocation.created_at || firstAllocation.date;
      const d = raw ? new Date(raw) : null;
      if (d && !isNaN(d)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return '00:00';
    })(),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Nhận file ảnh đã crop từ ImageUploader dùng chung (giống flow avatar), rồi upload lên storage
  async function handleCroppedBannerUpload(file) {
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('fund-images').upload(fileName, file);
    if (uploadError) { toast('Lỗi tải ảnh lên: ' + uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from('fund-images').getPublicUrl(fileName);
    setForm((f) => ({ ...f, background_url: data.publicUrl }));
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name) { toast('Nhập tên quỹ'); return; }
    setSaving(true);
    const payload = {
      name: form.name, icon: form.icon || '💰', type: 'expense', is_fund: true,
      description: form.description || null,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : 0,
      background_url: form.background_url || null,
    };
    // "date" trong bảng transactions chỉ lưu NGÀY (không có giờ) — theo đúng pattern đang
    // dùng ở QuickAllocateWithdrawForm, GIỜ được lưu riêng vào "created_at" (cột này mới
    // là cột được ưu tiên đọc giờ khi hiển thị Lịch sử, xem formatDisplayTime). Trước đây
    // chỉ ghi giờ vào "date" nên Lịch sử vẫn hiển thị giờ tạo dòng thực tế (vd 07:00) thay
    // vì giờ người dùng chọn.
    // Luôn ép initial_allocation_date về đúng 10 ký tự "YYYY-MM-DD" trước khi ghép giờ —
    // đề phòng giá trị cũ còn sót lại (vd do có sẵn từ trước) khiến chuỗi ghép bị sai định
    // dạng và new Date(...) trả về Invalid Date -> vỡ khi gọi .toISOString().
    const initialDateOnly = (form.initial_allocation_date || todayDateStr()).slice(0, 10);
    const initialDateTimeRaw = `${initialDateOnly}T${form.initial_allocation_time || '00:00'}:00`;
    const initialDateTimeObj = new Date(initialDateTimeRaw);
    const initialCreatedAt = isNaN(initialDateTimeObj) ? new Date().toISOString() : initialDateTimeObj.toISOString();
    if (isNew) {
      const { data: newCat, error } = await supabase.from('categories').insert(payload).select().single();
      if (error) { setSaving(false); toast('Lỗi: ' + error.message); return; }
      if (form.initial_allocation && Number(form.initial_allocation) > 0) {
        const { error: allocErr } = await supabase.from('transactions').insert({
          category_id: newCat.id, type: 'allocation', amount: Number(form.initial_allocation),
          note: 'Nạp quỹ lần đầu', date: initialDateOnly, created_at: initialCreatedAt,
          is_initial: true, // FIX: đánh dấu rõ đây là khoản nạp ban đầu, không suy luận theo ngày
        });
        if (allocErr) {
          // Không để lại quỹ "mồ côi" số dư 0: hoàn tác việc tạo quỹ (soft-delete đúng dòng vừa tạo).
          const { error: undoErr } = await supabase.from('categories')
            .update({ deleted_at: new Date().toISOString(), deleted_batch_id: crypto.randomUUID() }).eq('id', newCat.id);
          setSaving(false);
          toast('Không lưu được khoản nạp quỹ lần đầu: ' + allocErr.message
            + (undoErr ? '\nQuỹ vừa tạo chưa được dọn tự động, hãy kiểm tra lại danh sách quỹ.' : '\nQuỹ chưa được tạo, bạn thử lại nhé.'));
          onSaved(); // tải lại để danh sách khớp với DB
          return;
        }
      }
    } else {
      const { error } = await supabase.from('categories').update(payload).eq('id', category.id);
      if (error) { setSaving(false); toast('Lỗi: ' + error.message); return; }
      const newInitial = form.initial_allocation ? Number(form.initial_allocation) : 0;
      const firstAllocRaw = firstAllocation ? (firstAllocation.created_at || firstAllocation.date) : null;
      const firstAllocRawDate = firstAllocRaw ? new Date(firstAllocRaw) : null;
      const firstAllocCombined = firstAllocRaw
        ? (firstAllocRaw.length > 10
            ? (firstAllocRawDate && !isNaN(firstAllocRawDate) ? firstAllocRawDate.toISOString().slice(0, 16) : null)
            : `${firstAllocRaw}T00:00`)
        : null;
      const dateChanged = firstAllocation && initialCreatedAt.slice(0, 16) !== firstAllocCombined;
      // FIX: luôn cập nhật (update) vào ĐÚNG 1 dòng "ban đầu" khi sửa số tiền — kể cả
      // khi dòng đó chỉ là kết quả fallback "giao dịch sớm nhất" (dữ liệu cũ, chưa có
      // cờ is_initial). Trước đây trong trường hợp này code lại INSERT thêm 1 dòng mới,
      // khiến quỹ bị cộng dồn sai (VD: dòng cũ 2tr + dòng mới 1tr = 3tr thay vì đúng 1tr).
      // Giờ luôn update thẳng vào dòng cũ và tự gắn cờ is_initial=true cho nó để lần sau
      // không còn bị coi là "fallback" nữa.
      let allocErr = null;
      if (firstAllocation) {
        if (newInitial > 0 && (newInitial !== Number(initialAmount || 0) || dateChanged || firstAllocation.is_initial !== true)) {
          ({ error: allocErr } = await supabase.from('transactions').update({ amount: newInitial, date: initialDateOnly, created_at: initialCreatedAt, is_initial: true }).eq('id', firstAllocation.id));
        }
      } else if (newInitial > 0) {
        ({ error: allocErr } = await supabase.from('transactions').insert({
          category_id: category.id, type: 'allocation', amount: newInitial,
          note: 'Nạp quỹ lần đầu', date: initialDateOnly, created_at: initialCreatedAt,
          is_initial: true,
        }));
      }
      if (allocErr) {
        // Thông tin quỹ đã lưu nhưng khoản nạp đầu thì chưa -> báo rõ, KHÔNG đóng form để người dùng bấm Lưu lại.
        setSaving(false);
        toast('Đã lưu thông tin quỹ nhưng chưa lưu được số tiền nạp lần đầu: ' + allocErr.message + '\nBấm Lưu lần nữa để thử lại.');
        return;
      }
    }
    setSaving(false);
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Tạo quỹ mới' : 'Sửa quỹ'}</h3>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên quỹ" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji icon (vd: 💊)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả quỹ (không bắt buộc)" rows={2} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        {!isNew && <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Số tiền ban đầu</p>}
        <MoneyInput value={form.initial_allocation} onChange={(v) => setForm({ ...form, initial_allocation: v })} placeholder="Số tiền nạp quỹ lần đầu (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        {(isNew || (firstAllocation && Number(form.initial_allocation) > 0)) && (
          <div className="mb-3">
            <label className="text-xs text-steel dark:text-light-grey font-semibold block mb-1">Ngày & giờ nạp quỹ lần đầu</label>
            <DateTimeField
              value={form.initial_allocation_date ? `${form.initial_allocation_date}T${form.initial_allocation_time || '00:00'}` : ''}
              max={todayDateStr()}
              onChange={(v) => {
                const [d = '', t = ''] = v.split('T');
                setForm({ ...form, initial_allocation_date: d, initial_allocation_time: t });
              }}
              className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm dark:text-white text-blueberry"
            />
          </div>
        )}
        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <div className="relative mb-3">
          <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận /năm (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 pr-10 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          {form.interest_rate && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey text-sm font-semibold">%</span>}
        </div>

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ảnh nền quỹ</p>
        {form.background_url && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-ice-cream dark:bg-night-sky">
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <ImageUploader
            aspectRatio="16:9"
            uploading={uploading}
            triggerLabel="Tải ảnh từ thiết bị"
            triggerClassName="flex-1 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm text-steel dark:text-light-grey text-center cursor-pointer hover:bg-light-grey/30 transition flex items-center justify-center gap-2"
            onConfirm={handleCroppedBannerUpload}
          />
        </div>
        <input value={form.background_url} onChange={(e) => setForm({ ...form, background_url: e.target.value })} placeholder="Hoặc dán link ảnh" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <button onClick={handleSave} disabled={saving || uploading} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu quỹ
        </button>
      </div>
    </div>
  );
}
