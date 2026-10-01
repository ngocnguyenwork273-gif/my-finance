/* ==============================================================================
   Màn Mục tiêu (kèm form sửa mục tiêu).
   ============================================================================== */
import { useEffect, useState } from 'react';
import DateTimeField from '../DateTimeField';
import { CustomSelect, MoneyInput } from '../components/inputs';
import { MiniRing, ProgressBar, SummaryCard } from '../components/ui';
import { useAppData, useShell } from '../context';
import { confirmDialog, toast, useEscapeKey } from '../feedback';
import { useResponsiveGridColumns } from '../hooks';
import { ArrowLeft, ArrowUpDown, Calendar, Check, Clock, Eye, Filter, LayoutGrid, List, Loader2, MoreHorizontal, Pencil, PiggyBank, Plus, Search, Sparkles, Target, Trash2, Wallet, X } from '../icons';
import { PRIORITY_TERMS, durationText, fundBalanceWithProfit, nowForInput, priorityRank, priorityStyle, sortGoals } from '../lib/finance';
import { formatMoney, textMatchesSearch } from '../lib/format';
import { supabase } from '../supabaseClient';

const GOAL_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (g) => new Date(g.start_date || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (g) => (g.name || '').toLowerCase() },
  { key: 'target', label: 'Số tiền mục tiêu', get: (g) => Number(g.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ', get: (g) => (g.status === 'Hoàn thành' ? 100 : (g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0)) },
  { key: 'priority', label: 'Mức độ ưu tiên', get: (g) => priorityRank(g.priority_term) },
];

function EditGoalForm({ goal, onClose, onSaved, isNew, softDelete, categories = [], transactions = [] }) {
  useEscapeKey(onClose); // Esc / nút Back Android đóng modal
  const funds = categories.filter((c) => c.is_fund);
  const [form, setForm] = useState({
    name: goal?.name || '',
    priority_term: goal?.priority_term || PRIORITY_TERMS[1].value,
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || '',
    fund_id: goal?.fund_id || '',
    start_date: goal?.start_date || nowForInput(),
    note: goal?.note || '',
    isDone: goal?.status === 'Hoàn thành',
    end_date: goal?.end_date || nowForInput(),
    actual_amount: goal?.actual_amount || '',
  });
  const [saving, setSaving] = useState(false);

  const linkedFund = form.fund_id ? funds.find((f) => f.id === form.fund_id) : null;
  const linkedFundBalance = linkedFund ? fundBalanceWithProfit(linkedFund, transactions) : null;

  async function handleSave() {
    if (!form.name) { toast('Nhập tên mục tiêu'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      priority_term: form.priority_term,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      fund_id: form.fund_id || null,
      current_amount: linkedFund ? linkedFundBalance : (form.current_amount ? Number(form.current_amount) : 0),
      start_date: form.start_date || null,
      note: form.note || null,
      status: form.isDone ? 'Hoàn thành' : 'Đang làm',
      end_date: form.isDone ? form.end_date : null,
      actual_amount: form.isDone && form.actual_amount ? Number(form.actual_amount) : null,
    };
    const { error } = isNew ? await supabase.from('goals').insert(payload) : await supabase.from('goals').update(payload).eq('id', goal.id);
    setSaving(false);
    if (error) { toast('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  async function handleDelete() {
    if (!(await confirmDialog('Xóa mục tiêu này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    setSaving(true);
    const { error } = await softDelete('goals', goal.id, `Xoá mục tiêu "${goal.name}"`, 'delete_goal');
    setSaving(false);
    if (error) { toast('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Mục tiêu mới' : 'Sửa mục tiêu'}</h3>
          <button aria-label="Đóng" onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên mục tiêu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Mức độ ưu tiên</p>
        <CustomSelect value={form.priority_term} onChange={(e) => setForm({ ...form, priority_term: e.target.value })} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
          {PRIORITY_TERMS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
        </CustomSelect>

        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Nguồn tiền mục tiêu (không bắt buộc)</p>
        <CustomSelect
          value={form.fund_id}
          onChange={(e) => setForm({ ...form, fund_id: e.target.value })}
          className="mb-1" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="">— Không liên kết quỹ, nhập tay —</option>
          {funds.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
        </CustomSelect>
        {funds.length === 0 && (
          <p className="text-xs text-steel dark:text-light-grey mb-3">Chưa có quỹ nào trong Quản lý quỹ. Tạo quỹ trước để có thể chọn làm nguồn tiền cho mục tiêu này.</p>
        )}

        {linkedFund ? (
          <div className="frost-inset rounded-xl px-4 py-3 mb-3">
            <p className="text-xs text-steel dark:text-light-grey">Số tiền hiện có (lấy tự động từ quỹ "{linkedFund.name}")</p>
            <p className="text-lg font-bold text-blueberry dark:text-white">{formatMoney(linkedFundBalance)}</p>
          </div>
        ) : (
          <MoneyInput value={form.current_amount} onChange={(v) => setForm({ ...form, current_amount: v })} placeholder="Số tiền hiện có" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        )}

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày bắt đầu</p>
        <DateTimeField value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />

        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (không bắt buộc)" rows={2} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <label className="flex items-center gap-2 mb-3 text-sm text-blueberry dark:text-white font-semibold">
          <input type="checkbox" checked={form.isDone} onChange={(e) => setForm({ ...form, isDone: e.target.checked })} /> Đã hoàn thành
        </label>

        {form.isDone && (
          <>
            <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày hoàn thành</p>
            <DateTimeField value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />
            <MoneyInput value={form.actual_amount} onChange={(v) => setForm({ ...form, actual_amount: v })} placeholder="Số tiền thực tế khi hoàn thành (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          </>
        )}

        <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30 mb-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu mục tiêu
        </button>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} className="w-full bg-cotton-candy-light dark:bg-cotton-candy/20 text-cotton-candy rounded-xl py-3 font-bold flex items-center justify-center gap-2">
            <Trash2 size={16} /> Xóa mục tiêu
          </button>
        )}
      </div>
    </div>
  );
}

export function Goals() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, theme } = useShell();
  const { goals, loadingGoals, reload, softDelete, categories, transactions } = useAppData();
  const [editingGoal, setEditingGoal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalRemaining = goals.reduce((s, g) => s + Math.max(0, Number(g.target_amount || 0) - Number(g.current_amount || 0)), 0);
  const doneCount = goals.filter((g) => g.status === 'Hoàn thành').length;

  const sortedGoals = sortGoals(goals);
  const filteredGoals = sortedGoals.filter((g) => {
    const matchesSearch = textMatchesSearch(g.name, searchTerm);
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'done' ? g.status === 'Hoàn thành' : g.status !== 'Hoàn thành');
    const matchesPriority = filterPriority === 'all' || g.priority_term === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  const hasActiveFilter = filterStatus !== 'all' || filterPriority !== 'all';

  const activeSortField = GOAL_SORT_FIELDS.find((f) => f.key === sortField) || GOAL_SORT_FIELDS[0];
  const displayGoals = [...filteredGoals].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    const av = activeSortField.get(a), bv = activeSortField.get(b);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const gridCols = useResponsiveGridColumns();
  const pageSize = viewMode === 'card' ? gridCols * 2 : 8; // luôn = đúng 2 hàng theo số cột THẬT của màn hình hiện tại (responsive), tránh hụt ô trống rồi nhảy trang dù thu/phóng cửa sổ
  const totalPages = Math.max(1, Math.ceil(displayGoals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedGoals = displayGoals.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [gridCols]); // đổi số cột (resize/xoay màn hình) → về trang 1 để không bị lạc vào trang không còn tồn tại

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <h1 className="text-blueberry dark:text-white text-lg font-bold">Mục tiêu</h1>
          </div>
          <div className="mt-6 px-5 pt-6 pb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Mục tiêu của tôi</h2>
              <button onClick={() => setEditingGoal('new')} className="w-7 h-7 rounded-full bg-turquoise-light/60 dark:bg-turquoise/15 flex items-center justify-center"><Plus size={16} className="text-turquoise" /></button>
            </div>
            {loadingGoals ? <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-turquoise" /></div>
              : goals.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có mục tiêu nào.</p>
              : <div className="flex flex-col gap-5 scrollbar-hide">
                  {sortedGoals.map((goal) => {
                    const isDone = goal.status === 'Hoàn thành';
                    const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                    const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    return (
                      <button key={goal.id} onClick={() => setEditingGoal(goal)} className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-turquoise' : 'bg-gradient-primary'}`}>
                            {isDone ? <Check size={18} className="text-white" /> : <Target size={18} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-blueberry dark:text-white font-bold text-sm">{goal.name}</p>
                            {goal.priority_term && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                          </div>
                          <p className="text-blueberry dark:text-white font-bold text-sm flex-shrink-0">{formatMoney(goal.current_amount || 0)}</p>
                        </div>
                        <ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} />
                        <div className="flex justify-between mt-1 text-xs text-steel dark:text-light-grey font-semibold">
                          <span>{goal.target_amount ? `Còn thiếu ${formatMoney(Math.max(0, remaining))}` : ''}</span>
                          <span>{goal.target_amount ? formatMoney(goal.target_amount) : ''}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>}
          </div>
        </div>
      </div>

      <div className="hidden md:block relative" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
        <div className="frost-blob z-0 w-96 h-96 bg-lavender-light/70 dark:bg-lavender/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-turquoise-light/70 dark:bg-turquoise/22 top-96 -left-10" />
        <h1 className="relative text-blueberry dark:text-white text-2xl font-extrabold mb-6">Mục tiêu</h1>

        <div className="relative grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={Target} iconBg="bg-turquoise" label="Tổng tiền mục tiêu" value={formatMoney(totalTarget)} />
          <SummaryCard icon={PiggyBank} iconBg="bg-baby-blue" label="Tổng số tiền hiện có" value={formatMoney(totalCurrent)} />
          <SummaryCard icon={Wallet} iconBg="bg-cotton-candy" label="Tổng số tiền còn thiếu" value={formatMoney(totalRemaining)} />
          <SummaryCard icon={Sparkles} iconBg="bg-lavender" label="Tổng số lượng mục tiêu" value={goals.length} sub={`${doneCount} đã hoàn thành`} />
        </div>

 <div className="relative frost-card rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterStatus !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  Trạng thái: {filterStatus === 'done' ? 'Hoàn thành' : 'Đang làm'}
                  <button onClick={() => { setFilterStatus('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterPriority !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  Ưu tiên: {filterPriority}
                  <button onClick={() => { setFilterPriority('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {hasActiveFilter && (
                <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setPage(1); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.3)] rounded-full px-3 py-1.5 text-xs font-bold text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="left-0 top-9 z-20 frost-card rounded-2xl shadow-card p-4 w-64">
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Trạng thái</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['active', 'Đang làm'], ['done', 'Hoàn thành']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterStatus(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterStatus === k ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Mức độ ưu tiên</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterPriority('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold ${filterPriority === 'all' ? 'frost-inset text-blueberry dark:text-white' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>Tất cả</button>
                      {PRIORITY_TERMS.map((p) => (
                        <button key={p.value} onClick={() => { setFilterPriority(p.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${filterPriority === p.value ? 'frost-inset' : 'hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} /> <span className="text-blueberry dark:text-white truncate">{p.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v); setShowFilterMenu(false); }} className="flex items-center gap-2 border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] rounded-full px-4 py-2 text-sm text-blueberry dark:text-white font-semibold">
                  <ArrowUpDown size={14} /> Ngày tạo
                </button>
                {showSortMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-0 top-10 z-20 frost-card rounded-2xl shadow-card p-2 w-56">
                    <p className="text-xs font-bold text-steel dark:text-light-grey px-2 py-1.5">Sắp xếp theo</p>
                    {GOAL_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField((cur) => { if (cur === f.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return cur; } setSortDir(f.key === 'created' ? 'desc' : 'asc'); return f.key; }); }}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${sortField === f.key ? 'frost-inset text-blueberry dark:text-white font-bold' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                        {f.label}
                        {sortField === f.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 frost-inset rounded-full p-1">
                <button onClick={() => { setViewMode('card'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'card' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><LayoutGrid size={15} /></button>
                <button onClick={() => { setViewMode('list'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><List size={15} /></button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-4 flex-wrap gap-3">
            <p className="text-steel dark:text-light-grey text-sm font-semibold">{displayGoals.length} mục tiêu</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 frost-inset rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-steel dark:text-light-grey" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm mục tiêu..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
              </div>
              <button onClick={() => setEditingGoal('new')} className="bg-gradient-primary text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-turquoise/30">
                <Plus size={16} /> Thêm mục tiêu
              </button>
            </div>
          </div>

          <div className="border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
            {loadingGoals ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-turquoise" /></div>
              : displayGoals.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-16">Không tìm thấy mục tiêu nào.</p>
              : viewMode === 'card' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                  {pagedGoals.map((goal) => {
                    const isDone = goal.status === 'Hoàn thành';
                    const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    return (
 <div key={goal.id} onClick={() => setEditingGoal(goal)} className="frost-card rounded-2xl overflow-hidden hover:shadow-card transition cursor-pointer">
                        <div className="relative h-36 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pStyle.bg}, ${pStyle.color}33)` }}>
                          {isDone ? <Check size={40} className="opacity-30" style={{ color: pStyle.color }} /> : <Target size={40} className="opacity-30" style={{ color: pStyle.color }} />}
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur text-[11px] font-bold px-2 py-1 rounded-full text-blueberry dark:text-white">
                            {isDone ? <Check size={11} className="text-turquoise" /> : <Clock size={11} className="text-turquoise" />}
                            {isDone ? 'Hoàn thành' : 'Đang làm'}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur flex items-center justify-center text-blueberry dark:text-white">
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenuId === goal.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="top-10 right-2.5 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                <Eye size={14} /> Xem chi tiết
                              </button>
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                <Pencil size={14} /> Chỉnh sửa
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-3">
                          <h3 className="text-blueberry dark:text-white font-bold text-sm mb-2 line-clamp-1">{goal.name}</h3>
                          <div className="flex items-center gap-4 mb-2">
                            <MiniRing pct={pct} color={isDone ? '#0DBACC' : '#74ACEF'} label="Tiến độ" />
                            <MiniRing pct={isDone ? 100 : 0} color={isDone ? '#0DBACC' : '#E3D6FF'} label="Hoàn thành" />
                          </div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            {goal.priority_term && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'bg-turquoise/10 text-turquoise' : 'bg-ice-cream text-steel dark:bg-night-sky dark:text-light-grey'}`}>{isDone ? 'Hoàn thành' : 'Đang làm'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-steel dark:text-light-grey pt-2 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</span>
                            <span>{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1150px]">
                    <thead>
                      <tr className="text-left text-steel dark:text-light-grey border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                        <th className="p-4 font-bold">Tên mục tiêu</th>
                        <th className="p-4 font-bold">Mức độ ưu tiên</th>
                        <th className="p-4 font-bold text-right">Số tiền mục tiêu</th>
                        <th className="p-4 font-bold text-right">Số tiền hiện có</th>
                        <th className="p-4 font-bold text-right">Số tiền còn thiếu</th>
                        <th className="p-4 font-bold">Tiến độ</th>
                        <th className="p-4 font-bold">Ngày bắt đầu</th>
                        <th className="p-4 font-bold">Hoàn thành</th>
                        <th className="p-4 font-bold">Ghi chú</th>
                        <th className="p-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedGoals.map((goal) => {
                        const isDone = goal.status === 'Hoàn thành';
                        const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                        const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                        const pStyle = priorityStyle(goal.priority_term);
                        const duration = isDone ? durationText(goal.start_date, goal.end_date) : null;
                        return (
                          <tr key={goal.id} onClick={() => setEditingGoal(goal)} className="border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)] last:border-0 hover:bg-ice-cream dark:hover:bg-night-sky/30 cursor-pointer">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-turquoise' : 'bg-gradient-primary'}`}>
                                  {isDone ? <Check size={16} className="text-white" /> : <Target size={16} className="text-white" />}
                                </div>
                                <p className={`font-bold ${isDone ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{goal.name}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              {goal.priority_term ? <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span> : <span className="text-light-grey">—</span>}
                            </td>
                            <td className="p-4 text-right text-blueberry dark:text-white">{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</td>
                            <td className="p-4 text-right text-blueberry dark:text-white">{formatMoney(goal.current_amount || 0)}</td>
                            <td className="p-4 text-right text-steel dark:text-light-grey">{goal.target_amount ? formatMoney(Math.max(0, remaining)) : '—'}</td>
                            <td className="p-4 w-32">
                              <ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} />
                              <p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(pct)}%</p>
                            </td>
                            <td className="p-4 text-steel dark:text-light-grey whitespace-nowrap">{goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="p-4 text-steel dark:text-light-grey whitespace-nowrap">
                              {isDone ? (
                                <>
                                  <p>{new Date(goal.end_date).toLocaleDateString('vi-VN')}</p>
                                  {duration && <p className="text-xs text-steel dark:text-light-grey">{duration}</p>}
                                  {goal.actual_amount && <p className="text-xs text-turquoise font-bold">Thực tế: {formatMoney(goal.actual_amount)}</p>}
                                </>
                              ) : <span className="text-light-grey">Chưa xong</span>}
                            </td>
                            <td className="p-4 text-steel dark:text-light-grey text-xs max-w-[160px] truncate">{goal.note || '—'}</td>
                            <td className="p-4 text-right relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }}
                                className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 inline-flex items-center justify-center text-steel dark:text-light-grey"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              {openMenuId === goal.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-4 top-12 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                    <Eye size={14} /> Xem chi tiết
                                  </button>
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                    <Pencil size={14} /> Chỉnh sửa
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {displayGoals.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
              <p className="text-steel dark:text-light-grey text-xs font-semibold">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-full border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] text-sm text-blueberry dark:text-white font-semibold disabled:opacity-40">Previous</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-full bg-gradient-primary text-white text-sm font-bold disabled:opacity-40 shadow-md shadow-turquoise/30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingGoal && <EditGoalForm goal={editingGoal === 'new' ? null : editingGoal} isNew={editingGoal === 'new'} onClose={() => setEditingGoal(null)} onSaved={reload} softDelete={softDelete} categories={categories} transactions={transactions} />}
    </>
  );
}
