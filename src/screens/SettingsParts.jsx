/* ==============================================================================
   Các phần của màn Cài đặt (Giao diện, Hồ sơ, Danh mục).
   ============================================================================== */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DateTimeField from '../DateTimeField';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { EmojiCircle } from '../components/ui';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { ImageUploader } from '../forms/ImageUploader';
import { Check, KeyRound, Loader2, Moon, Pencil, Plus, Sun, Trash2, TrendingDown, TrendingUp, X } from '../icons';
import { buildPeriods, currentPeriodKey, findInitialAllocation, localDateStr, todayDateStr } from '../lib/finance';
import { formatMoney, sanitizeFileName } from '../lib/format';
import { supabase } from '../supabaseClient';

// Chọn giao diện Sáng/Tối — chuyển từ nút nổi (fixed) trên mobile vào hẳn trong Cài đặt
// theo yêu cầu người dùng (đỡ vướng, đỡ đè lên avatar) — dùng chung style segmented
// control giống khu vực sidebar desktop.
export function AppearanceSection({ theme, toggleTheme }) {
  const isDark = theme === 'dark';
  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-1">Giao diện</p>
        <p className="text-steel dark:text-light-grey text-xs mb-4">Chọn giao diện Sáng hoặc Tối cho toàn bộ ứng dụng.</p>
        <div className="flex items-center gap-1 bg-ice-cream dark:bg-[#2a2a44] rounded-full p-1 self-start w-fit">
          <button
            onClick={() => isDark && toggleTheme()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition ${!isDark ? 'bg-white shadow text-blueberry' : 'text-steel dark:text-light-grey'}`}
          >
            <Sun size={15} /> Sáng
          </button>
          <button
            onClick={() => !isDark && toggleTheme()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition ${isDark ? 'bg-blueberry shadow text-white' : 'text-steel dark:text-light-grey'}`}
          >
            <Moon size={15} /> Tối
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileSection({ user, onUpdated, logActivity }) {
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const full = user?.user_metadata?.full_name || '';
    const first = user?.user_metadata?.first_name || '';
    setFirstName(first);
    setLastName(full.replace(first, '').trim());
    setAvatarUrl(user?.user_metadata?.avatar_url || '');
  }, [user]);

  async function handleAvatarUpload(file) {
    if (!file) return;
    setUploading(true);
    const fileName = `${user.id}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      toast('Không thể tải ảnh lên. Vui lòng thử lại.');
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setUploading(false);
    if (error) {
      console.error('Avatar update failed:', error);
      toast('Không thể cập nhật ảnh. Vui lòng thử lại.');
      return;
    }
    setAvatarUrl(data.publicUrl);
    onUpdated();
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const full_name = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.updateUser({ data: { full_name, first_name: firstName } });
    setSaving(false);
    if (error) { setMessage('Lỗi: ' + error.message); return; }
    setMessage('Đã lưu!');
    onUpdated();
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) { setPasswordMessage('Mật khẩu cần tối thiểu 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('Mật khẩu nhập lại không khớp'); return; }
    setSavingPassword(true);
    setPasswordMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordMessage('Lỗi: ' + error.message); return; }
    setPasswordMessage('Đã đổi mật khẩu!');
    setNewPassword(''); setConfirmPassword('');
    logActivity?.('change_password', 'Đổi mật khẩu đăng nhập', null, false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ảnh đại diện</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-ice-cream dark:bg-night-sky flex items-center justify-center flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-steel dark:text-light-grey">{(firstName || user?.email || 'B')[0].toUpperCase()}</span>}
          </div>
          <ImageUploader
            aspectRatio="1:1"
            circularCrop
            uploading={uploading}
            triggerLabel="Đổi ảnh đại diện"
            onConfirm={handleAvatarUpload}
          />
        </div>
      </div>

      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Thông tin cá nhân</p>
        <p className="text-steel dark:text-light-grey text-sm mb-3">{user?.email}</p>
        <div className="flex gap-3 mb-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tên" className="w-1/2 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Họ" className="w-1/2 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        {message && <p className="text-sm text-turquoise font-semibold mb-3">{message}</p>}
        <button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu thay đổi
        </button>
      </div>

      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3 flex items-center gap-2"><KeyRound size={15} className="text-lavender" /> Đổi mật khẩu</p>
        <div className="flex flex-col gap-3 max-w-sm">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" className="bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        {passwordMessage && <p className="text-sm text-turquoise font-semibold mt-3">{passwordMessage}</p>}
        <button onClick={handleChangePassword} disabled={savingPassword} className="mt-3 bg-ice-cream dark:bg-night-sky text-blueberry dark:text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Đổi mật khẩu
        </button>
      </div>
    </div>
  );
}

// Form rỗng dùng chung cho "Danh mục mới" — gồm cả các trường chỉ dành cho quỹ
// (description / initial_allocation / target_amount / background_url). Các trường quỹ
// chỉ hiện ra khi tích vào ô 'Đây là 1 "quỹ"', và chỉ được ghi xuống DB khi đang là quỹ.
function blankCategoryForm() {
  const now = new Date();
  return {
    name: '', icon: '', monthly_limit: '', limit_period: 'month', is_fund: false,
    interest_rate: '', include_in_spending_pool: true,
    description: '', target_amount: '', background_url: '',
    initial_allocation: '',
    initial_allocation_date: localDateStr(now),
    initial_allocation_time: now.toTimeString().slice(0, 5),
  };
}

export function CategorySection({ categories, reload, softDelete, spendingPoolByPeriod, saveSpendingPoolForPeriod }) {
  const [tab, setTab] = useState('expense');
  // Bộ lọc hiển thị theo isFund — chỉ lọc hiển thị, không đổi dữ liệu
  const [fundFilter, setFundFilter] = useState('all'); // 'all' | 'fund' | 'not_fund'
  const [editing, setEditing] = useState(null);
  useEscapeKey(() => setEditing(null), !!editing);
  const [form, setForm] = useState(blankCategoryForm);
  const [saving, setSaving] = useState(false);
  // Trạng thái phục vụ phần "chi tiết quỹ" hiện thêm khi tích ô quỹ
  const [uploading, setUploading] = useState(false);
  const [firstAlloc, setFirstAlloc] = useState(null); // giao dịch "Nạp quỹ lần đầu" (nếu có)

  // ==== Thu nhập được chi theo kỳ — chọn kỳ rồi nhập số tiền được phép chi ====
  const nowYear = new Date().getFullYear();
  const [poolYear, setPoolYear] = useState(nowYear);
  const [poolPeriodKey, setPoolPeriodKey] = useState(currentPeriodKey());
  const [poolAmountInput, setPoolAmountInput] = useState('');
  const [savingPool, setSavingPool] = useState(false);
  const poolPeriods = buildPeriods(poolYear);
  const currentPoolValue = spendingPoolByPeriod ? spendingPoolByPeriod[poolPeriodKey] : undefined;

  async function handleSavePool() {
    if (poolAmountInput === '' || Number.isNaN(Number(poolAmountInput))) { toast('Nhập số tiền hợp lệ'); return; }
    setSavingPool(true);
    const ok = await saveSpendingPoolForPeriod(poolPeriodKey, poolAmountInput);
    setSavingPool(false);
    if (ok) setPoolAmountInput('');
  }

  function startNew() { setFirstAlloc(null); setForm(blankCategoryForm()); setEditing('new'); }
  function startEdit(cat) {
    setFirstAlloc(null);
    setForm({
      ...blankCategoryForm(),
      name: cat.name, icon: cat.icon || '', monthly_limit: cat.monthly_limit || '',
      limit_period: cat.limit_period || 'month', is_fund: cat.is_fund || false,
      interest_rate: cat.interest_rate || '', include_in_spending_pool: cat.include_in_spending_pool !== false,
      description: cat.description || '', target_amount: cat.target_amount || '', background_url: cat.background_url || '',
    });
    setEditing(cat.id);
    if (cat.is_fund) loadInitialAllocation(cat.id);
  }

  // Đọc khoản "Nạp quỹ lần đầu" của quỹ đang sửa để pre-fill ô "Số tiền nạp quỹ lần đầu"
  // (cùng cách xác định với form Sửa quỹ: ưu tiên cờ is_initial, fallback theo ghi chú).
  async function loadInitialAllocation(catId) {
    const { data } = await supabase
      .from('transactions').select('*')
      .eq('category_id', catId).eq('type', 'allocation')
      .is('deleted_at', null).order('created_at', { ascending: true });
    const initial = data && data.length ? findInitialAllocation(data, catId) : null;
    if (!initial) return;
    setFirstAlloc(initial);
    const raw = initial.created_at || initial.date;
    const d = raw ? new Date(raw) : null;
    const valid = d && !isNaN(d);
    setForm((f) => ({
      ...f,
      initial_allocation: initial.amount || '',
      initial_allocation_date: (initial.date || (valid ? localDateStr(d) : '')).slice(0, 10),
      initial_allocation_time: valid ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '00:00',
    }));
  }

  // Bật ô "quỹ" cho 1 danh mục đang sửa -> nạp luôn khoản nạp lần đầu (nếu đã có)
  function handleToggleFund(checked) {
    setForm((f) => ({ ...f, is_fund: checked }));
    if (checked && editing && editing !== 'new' && !firstAlloc) loadInitialAllocation(editing);
  }

  // Upload ảnh nền quỹ (dùng chung flow crop + storage với form Sửa quỹ)
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

  // Ghi/cập nhật đúng 1 dòng "Nạp quỹ lần đầu" cho quỹ (không insert trùng dòng mới)
  async function syncInitialAllocation(catId) {
    const dateOnly = (form.initial_allocation_date || todayDateStr()).slice(0, 10);
    const dtObj = new Date(`${dateOnly}T${form.initial_allocation_time || '00:00'}:00`);
    const createdAt = isNaN(dtObj) ? new Date().toISOString() : dtObj.toISOString();
    const newInitial = form.initial_allocation ? Number(form.initial_allocation) : 0;
    // Trả về { error } để handleSave biết mà xử lý (trước đây lỗi bị nuốt hoàn toàn).
    if (firstAlloc) {
      if (newInitial > 0) {
        return await supabase.from('transactions')
          .update({ amount: newInitial, date: dateOnly, created_at: createdAt, is_initial: true })
          .eq('id', firstAlloc.id);
      }
    } else if (newInitial > 0) {
      return await supabase.from('transactions').insert({
        category_id: catId, type: 'allocation', amount: newInitial,
        note: 'Nạp quỹ lần đầu', date: dateOnly, created_at: createdAt, is_initial: true,
      });
    }
    return { error: null };
  }

  async function handleSave() {
    if (!form.name) { toast('Nhập tên danh mục'); return; }
    setSaving(true);
    const isFundMode = tab === 'expense' && form.is_fund;
    const payload = {
      name: form.name,
      icon: form.icon || (isFundMode ? '💰' : '❔'),
      type: tab,
      // Quỹ không dùng hạn mức chi theo kỳ -> xoá hạn mức cũ nếu chuyển thành quỹ
      monthly_limit: !isFundMode && form.monthly_limit ? Number(form.monthly_limit) : null,
      limit_period: !isFundMode && form.monthly_limit ? form.limit_period : null,
      is_fund: form.is_fund,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : 0,
      ...(tab === 'income' ? { include_in_spending_pool: form.include_in_spending_pool } : {}),
      // Các trường riêng của quỹ: chỉ ghi khi là quỹ, ngược lại dọn về null
      ...(tab === 'expense' ? {
        description: isFundMode ? (form.description || null) : null,
        target_amount: isFundMode && form.target_amount ? Number(form.target_amount) : null,
        background_url: isFundMode ? (form.background_url || null) : null,
      } : {}),
    };
    let catId = editing;
    if (editing === 'new') {
      const { data: newCat, error } = await supabase.from('categories').insert(payload).select().single();
      if (error) { setSaving(false); toast('Lỗi: ' + error.message); return; }
      catId = newCat?.id;
    } else {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing);
      if (error) { setSaving(false); toast('Lỗi: ' + error.message); return; }
    }
    if (isFundMode && catId) {
      const { error: allocErr } = await syncInitialAllocation(catId);
      if (allocErr) {
        if (editing === 'new') {
          // Danh mục/quỹ vừa tạo mà khoản nạp đầu lỗi -> hoàn tác để không còn quỹ mồ côi số dư 0.
          await supabase.from('categories')
            .update({ deleted_at: new Date().toISOString(), deleted_batch_id: crypto.randomUUID() }).eq('id', catId);
          setSaving(false);
          toast('Không lưu được khoản nạp quỹ lần đầu: ' + allocErr.message + '\nQuỹ chưa được tạo, bạn thử lại nhé.');
          reload();
        } else {
          setSaving(false);
          toast('Đã lưu thông tin quỹ nhưng chưa lưu được số tiền nạp lần đầu: ' + allocErr.message + '\nBấm Lưu lần nữa để thử lại.');
        }
        return; // giữ nguyên form đang mở
      }
    }
    setSaving(false);
    setEditing(null); setFirstAlloc(null); reload();
  }

  async function handleDelete(id) {
    if (!(await confirmDialog('Xóa danh mục này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const cat = categories.find((c) => c.id === id);
    const { error } = await softDelete('categories', id, `Xoá danh mục "${cat?.name || ''}"`, 'delete_category');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }

  // Filter chỉ dựa trực tiếp trên is_fund === true / false, không tạo dữ liệu mới
  const list = categories
    .filter((c) => c.type === tab)
    .filter((c) => (fundFilter === 'all' ? true : fundFilter === 'fund' ? c.is_fund === true : c.is_fund !== true));

  const FUND_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'fund', label: 'Quỹ' },
    { key: 'not_fund', label: 'Không phải quỹ' },
  ];
  const LIMIT_PERIOD_OPTIONS = [
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
    { key: 'year', label: 'Năm' },
  ];
  function limitPeriodLabel(key) { return LIMIT_PERIOD_OPTIONS.find((p) => p.key === key)?.label || 'Tháng'; }
  // Đang ở chế độ "quỹ" -> modal hiện thêm form chi tiết quỹ
  const isFundForm = tab === 'expense' && form.is_fund;

  return (
    <>
      {/* FIX: cùng lỗi active-state mờ + thiếu icon như các tab loại giao dịch khác trong
          app — thêm ring + font-extrabold rõ hơn cho tab đang chọn, và bổ sung icon
          TrendingDown/TrendingUp để đồng bộ với các nơi khác. */}
      <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1 mb-4">
        <button onClick={() => setTab('expense')} className={`flex-1 py-2 rounded-full text-sm font-bold transition flex items-center justify-center gap-1.5 ${tab === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingDown size={15} className="flex-shrink-0" /> Chi tiêu</button>
        <button onClick={() => setTab('income')} className={`flex-1 py-2 rounded-full text-sm font-bold transition flex items-center justify-center gap-1.5 ${tab === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow-md shadow-turquoise/15 ring-1 ring-turquoise/30' : 'text-steel dark:text-light-grey font-semibold'}`}><TrendingUp size={15} className="flex-shrink-0" /> Thu nhập</button>
      </div>

      {tab === 'income' && (
        <div className="bg-ice-cream dark:bg-night-sky rounded-2xl p-4 mb-4">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-1">Thu nhập được chi theo kỳ</p>
          <p className="text-steel dark:text-light-grey text-xs mb-3">Chọn kỳ, rồi nhập số tiền được phép chi trong kỳ đó. Nếu chưa cài đặt, kỳ sẽ mặc định lấy bằng tổng thu nhập tính vào Thu nhập được chi.</p>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <CustomSelect value={poolYear} onChange={(e) => setPoolYear(Number(e.target.value))} className="" triggerClassName="bg-white dark:bg-[#2a2a44] rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {[nowYear - 1, nowYear, nowYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={poolPeriodKey} onChange={(e) => setPoolPeriodKey(e.target.value)} className="" triggerClassName="flex-1 bg-white dark:bg-[#2a2a44] rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {poolPeriods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
          </div>
          <div className="flex items-center gap-2">
            <MoneyInput value={poolAmountInput} onChange={setPoolAmountInput} placeholder="Số tiền được phép chi" className="flex-1 bg-white dark:bg-[#2a2a44] rounded-xl px-4 py-2.5 text-sm outline-none dark:text-white text-blueberry" />
            <button onClick={handleSavePool} disabled={savingPool} className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-60">
              {savingPool ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
          <p className="text-steel dark:text-light-grey text-xs mt-2">
            Hiện tại: <span className="font-bold text-blueberry dark:text-white">{currentPoolValue != null ? formatMoney(currentPoolValue) : 'Chưa cài đặt (mặc định theo thu nhập)'}</span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {FUND_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFundFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${fundFilter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-ice-cream dark:bg-night-sky text-steel dark:text-light-grey'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <button onClick={startNew} className="w-full border-2 border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.2)] rounded-2xl py-3 text-sm text-steel dark:text-light-grey font-bold mb-4 flex items-center justify-center gap-2 hover:border-turquoise dark:hover:border-turquoise transition"><Plus size={16} className="text-turquoise" /> Thêm danh mục mới</button>
      <div className="flex flex-col gap-2">
        {list.length === 0 ? (
          <p className="text-steel dark:text-light-grey text-sm text-center py-4">Không có danh mục nào phù hợp bộ lọc.</p>
        ) : list.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 bg-ice-cream dark:bg-night-sky rounded-2xl p-3">
            <EmojiCircle emoji={cat.icon} size={36} bg="#E3D6FF" />
            <div className="flex-1 min-w-0">
              <p className="text-blueberry dark:text-white font-bold text-sm flex items-center gap-1">
                {cat.name}
                {cat.is_fund ? (
                  <span className="text-[10px] bg-turquoise/10 text-turquoise px-1.5 py-0.5 rounded-full font-bold">Quỹ</span>
                ) : (
                  <span className="text-[10px] bg-steel/10 text-steel dark:bg-light-grey/10 dark:text-light-grey px-1.5 py-0.5 rounded-full font-bold">Chi tiêu</span>
                )}
                {cat.type === 'income' && (cat.include_in_spending_pool === false ? (
                  <span className="text-[10px] bg-cotton-candy/10 text-cotton-candy px-1.5 py-0.5 rounded-full font-bold">Thu nhập đặc biệt</span>
                ) : (
                  <span className="text-[10px] bg-baby-blue/10 text-baby-blue px-1.5 py-0.5 rounded-full font-bold">Vào Thu nhập được chi</span>
                ))}
              </p>
              <p className="text-steel dark:text-light-grey text-xs font-semibold">
                {cat.monthly_limit ? `Hạn mức: ${formatMoney(cat.monthly_limit)}/${limitPeriodLabel(cat.limit_period).toLowerCase()}` : ''}
                {cat.monthly_limit && cat.interest_rate > 0 ? ' • ' : ''}
                {cat.interest_rate > 0 ? `Lãi ${cat.interest_rate}%/năm` : ''}
              </p>
            </div>
            <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-baby-blue-light/60 dark:bg-baby-blue/15 flex items-center justify-center"><Pencil size={14} className="text-baby-blue" /></button>
            <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-cotton-candy-light/60 dark:bg-cotton-candy/15 flex items-center justify-center"><Trash2 size={14} className="text-cotton-candy" /></button>
          </div>
        ))}
      </div>

      {editing && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-[999] p-0 md:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-[#1e1e32] w-full rounded-t-3xl md:rounded-3xl p-5 max-w-sm mx-auto max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-blueberry dark:text-white">{editing === 'new' ? 'Danh mục mới' : 'Sửa danh mục'}</h3><button aria-label="Đóng" onClick={() => setEditing(null)}><X size={18} className="text-steel dark:text-light-grey" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder={isFundForm ? 'Emoji icon (vd: 💊)' : 'Emoji (vd: 🍜)'} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            {/* Hạn mức + lãi suất: chỉ dành cho danh mục chi tiêu thường. Khi tích ô "quỹ",
                phần này được thay bằng form chi tiết quỹ ở dưới (giống form Sửa quỹ). */}
            {!isFundForm && (
              <>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1.5">Hạn mức chi tối đa (không bắt buộc)</p>
                <div className="flex gap-2 mb-1">
                  <CustomSelect value={form.limit_period} onChange={(e) => setForm({ ...form, limit_period: e.target.value })} triggerClassName="bg-ice-cream dark:bg-night-sky rounded-xl px-3 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
                    {LIMIT_PERIOD_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </CustomSelect>
                  <MoneyInput value={form.monthly_limit} onChange={(v) => setForm({ ...form, monthly_limit: v })} placeholder="Số tiền tối đa cho kỳ này" className="flex-1 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
                </div>
                <p className="text-steel dark:text-light-grey text-xs mb-3">Ví dụ: chọn "Tuần" + 500,000đ nghĩa là danh mục này không được chi quá 500,000đ trong 1 tuần.</p>
                {tab === 'expense' && (
                  <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận %/năm (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
                )}
              </>
            )}
            {tab === 'expense' && (
              <label className="flex items-center gap-2 mb-4 text-sm text-blueberry dark:text-white font-semibold"><input type="checkbox" checked={form.is_fund} onChange={(e) => handleToggleFund(e.target.checked)} /> Đây là 1 "quỹ" — hiện thẻ tổng tiền ở Trang chủ</label>
            )}

            {/* ==== Chi tiết quỹ — chỉ hiện khi đã tích ô "quỹ" ==== */}
            {isFundForm && (
              <div className="mb-1">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả quỹ (không bắt buộc)" rows={2} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />

                <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Số tiền ban đầu</p>
                <MoneyInput value={form.initial_allocation} onChange={(v) => setForm({ ...form, initial_allocation: v })} placeholder="Số tiền nạp quỹ lần đầu (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
                {Number(form.initial_allocation) > 0 && (
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
              </div>
            )}
            {tab === 'income' && (
              <label className="flex items-start gap-2 mb-4 text-sm text-blueberry dark:text-white font-semibold">
                <input type="checkbox" className="mt-0.5" checked={form.include_in_spending_pool} onChange={(e) => setForm({ ...form, include_in_spending_pool: e.target.checked })} />
                <span>
                  Tính vào Thu nhập được chi (số tiền được phép chi)
                  <span className="block text-xs font-normal text-steel dark:text-light-grey mt-0.5">Bỏ chọn nếu đây là khoản thu đặc biệt (vd: tiền quý, thưởng) — vẫn tính vào Tổng thu nhập nhưng không tự động làm tăng Thu nhập được chi.</span>
                </span>
              </label>
            )}
            <button onClick={handleSave} disabled={saving || uploading} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
