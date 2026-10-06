/* ==============================================================================
   Màn danh sách Quỹ.
   ============================================================================== */
import { useEffect, useState } from 'react';
import { EmojiCircle, MiniRing, ProgressBar, SummaryCard } from '../components/ui';
import { useAppData, useShell } from '../context';
import { confirmDialog, toast } from '../feedback';
import { EditFundForm } from '../forms/EditFundForm';
import { useResponsiveGridColumns } from '../hooks';
import { ArrowUpDown, Check, Filter, LayoutGrid, List, MoreHorizontal, Pencil, PiggyBank, Plus, Search, Sparkles, Star, Trash2, TrendingDown, TrendingUp, X } from '../icons';
import { FUND_RATE_TIERS, findInitialAllocation, fundBalanceWithProfit, fundRateStyle } from '../lib/finance';
import { formatMoney, textMatchesSearch } from '../lib/format';

const FUND_CARD_GRADIENTS = [
  'linear-gradient(135deg, #B4F1F1, #C1DDFF)',
  'linear-gradient(135deg, #FFCDDB, #E3D6FF)',
  'linear-gradient(135deg, #0DBACC, #74ACEF)',
  'linear-gradient(135deg, #F18AB5, #9F7FE0)',
  'linear-gradient(135deg, #B4F1F1, #74ACEF)',
  'linear-gradient(135deg, #FFCDDB, #F18AB5)',
];

const FUND_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (c) => new Date(c.created_at || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (c) => (c.name || '').toLowerCase() },
  { key: 'balance', label: 'Số dư', get: (c, tx) => fundBalanceWithProfit(c, tx) },
  { key: 'target', label: 'Số tiền mục tiêu', get: (c) => Number(c.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ mục tiêu', get: (c, tx) => (c.target_amount ? Math.min(100, (fundBalanceWithProfit(c, tx) / c.target_amount) * 100) : 0) },
  { key: 'interest', label: 'Lãi suất', get: (c) => Number(c.interest_rate || 0) },
];

function fundCardBackground(f, index) {
  if (f.background_url) return `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.15)), url(${f.background_url})`;
  return FUND_CARD_GRADIENTS[index % FUND_CARD_GRADIENTS.length];
}

export function Funds() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { theme } = useShell();
  const { categories, transactions, onOpenFund, reload, softDelete } = useAppData();
  const [showCreate, setShowCreate] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterTarget, setFilterTarget] = useState('all');
  const [filterRate, setFilterRate] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  // Xoá quỹ ngay từ danh sách (menu 3 chấm) — soft-delete qua 'categories', y hệt hành
  // động Xoá ở màn Chi tiết quỹ, có xác nhận trước và khôi phục được trong 30 ngày.
  async function handleDeleteFund(f) {
    if (!(await confirmDialog(`Xóa quỹ "${f.name}"? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.`, { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('categories', f.id, `Xoá danh mục "${f.name}"`, 'delete_category');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const funds = categories.filter((c) => c.type === 'expense' && c.is_fund);
  const totalFunds = funds.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalIn = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'allocation').reduce((a, t) => a + Number(t.amount), 0), 0);
  const totalOut = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0), 0);

  function fundStatus(c) {
    const balance = fundBalanceWithProfit(c, transactions);
    const target = Number(c.target_amount || 0);
    if (target > 0 && balance >= target) return 'done';
    if (target > 0) return 'set';
    return 'none';
  }
  const doneCount = funds.filter((c) => fundStatus(c) === 'done').length;

  const filteredFunds = funds.filter((c) => {
    const matchesSearch = textMatchesSearch(c.name, searchTerm);
    const matchesTarget = filterTarget === 'all' || filterTarget === fundStatus(c);
    const rStyle = fundRateStyle(c);
    const matchesRate = filterRate === 'all' || filterRate === rStyle.value;
    return matchesSearch && matchesTarget && matchesRate;
  });

  const activeSortField = FUND_SORT_FIELDS.find((f) => f.key === sortField) || FUND_SORT_FIELDS[0];
  const displayFunds = [...filteredFunds].sort((a, b) => {
    const av = activeSortField.get(a, transactions), bv = activeSortField.get(b, transactions);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const gridCols = useResponsiveGridColumns();
  const pageSize = viewMode === 'card' ? gridCols * 2 : 8; // luôn = đúng 2 hàng theo số cột THẬT của màn hình hiện tại (responsive), tránh hụt ô trống rồi nhảy trang dù thu/phóng cửa sổ
  const totalPages = Math.max(1, Math.ceil(displayFunds.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFunds = displayFunds.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setPage(1); }, [gridCols]); // đổi số cột (resize/xoay màn hình) → về trang 1 để không bị lạc vào trang không còn tồn tại

  const editingFirstAllocation = editingFund ? findInitialAllocation(transactions, editingFund.id) : null;
  const editingInitialAmount = editingFirstAllocation ? Number(editingFirstAllocation.amount) : 0;

  // Remove outer wrapper with padding
  return (
    <>
      {/* Mobile version */}
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] rounded-2xl shadow-soft px-4 py-3">
              <Search size={16} className="text-steel dark:text-light-grey" />
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
            </div>
          </div>

          <div className="px-5 mt-5 flex items-center justify-between">
            <h1 className="text-blueberry dark:text-white text-lg font-extrabold">Danh sách quỹ</h1>
            <div className="flex items-center gap-1 bg-white dark:bg-[#2a2a44] rounded-full shadow-soft px-1 py-1">
              <button onClick={() => setViewMode((v) => (v === 'card' ? 'list' : 'card'))} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-blueberry dark:text-white">
                <List size={13} /> Quản lý
              </button>
              <span className="w-px h-4 bg-light-grey dark:bg-light-grey/20" />
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-turquoise">
                <Plus size={13} /> Tạo quỹ
              </button>
            </div>
          </div>

          <div className="mx-5 mt-2 mb-3 bg-white/70 dark:bg-[#2a2a44]/70 backdrop-blur rounded-xl px-3 py-2 flex items-center justify-between shadow-soft">
            <p className="text-steel dark:text-light-grey text-xs font-semibold">Tổng số dư mọi quỹ</p>
            <p className="text-blueberry dark:text-white font-bold text-sm">{formatMoney(totalFunds)}</p>
          </div>

          <div className="px-5 flex flex-col gap-4 scrollbar-hide">
            {filteredFunds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-10">{funds.length === 0 ? 'Chưa có quỹ nào. Bấm "Tạo quỹ" để tạo quỹ đầu tiên.' : 'Không tìm thấy quỹ nào.'}</p>
            ) : (
              filteredFunds.map((f, i) => {
                const balance = fundBalanceWithProfit(f, transactions);
                const target = Number(f.target_amount || 0);
                const rStyle = fundRateStyle(f);
                return (
                  <button key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="relative w-full h-44 rounded-3xl overflow-hidden text-left shadow-soft"
                    style={{ background: fundCardBackground(f, i), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/25 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      <Star size={11} className="fill-white" /> Chủ quỹ
                    </span>
                    <span className="absolute top-3 left-4 flex items-center gap-1.5 text-white font-extrabold text-base drop-shadow">
                      <span>{f.icon || '💰'}</span> {f.name}
                    </span>
                    <span className="absolute bottom-3 left-4 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-white/90 flex items-center justify-center text-[11px]">{f.icon || '💰'}</span>
                      <span className="text-white font-bold text-lg drop-shadow">
                        {formatMoney(balance)}{target > 0 && <span className="font-semibold text-sm"> / {formatMoney(target)}</span>}
                      </span>
                    </span>
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-[10px] font-bold bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: rStyle.color }} />
                      {f.interest_rate > 0 ? `${f.interest_rate}%/năm` : rStyle.value}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-turquoise-light/70 dark:bg-turquoise/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-96 -left-10" />
        <h1 className="relative text-blueberry dark:text-white text-2xl font-extrabold mb-6">Quản lý quỹ</h1>

        <div className="relative grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={PiggyBank} iconBg="bg-turquoise" label="Tổng số dư mọi quỹ" value={formatMoney(totalFunds)} />
          <SummaryCard icon={TrendingUp} iconBg="bg-baby-blue" label="Tổng đã nạp" value={formatMoney(totalIn)} />
          <SummaryCard icon={TrendingDown} iconBg="bg-cotton-candy" label="Tổng đã rút" value={formatMoney(totalOut)} />
          <SummaryCard icon={Sparkles} iconBg="bg-lavender" label="Tổng số lượng quỹ" value={funds.length} sub={`${doneCount} đã đạt mục tiêu`} />
        </div>

 <div className="relative frost-card rounded-3xl overflow-hidden" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterTarget !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterTarget === 'done' ? 'Đã đạt mục tiêu' : filterTarget === 'set' ? 'Đang tích lũy' : 'Chưa đặt mục tiêu'}
                  <button onClick={() => { setFilterTarget('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterRate !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterRate}
                  <button onClick={() => { setFilterRate('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {(filterTarget !== 'all' || filterRate !== 'all') && (
                <button onClick={() => { setFilterTarget('all'); setFilterRate('all'); setPage(1); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.3)] rounded-full px-3 py-1.5 text-xs font-bold text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="left-0 top-9 z-20 frost-card rounded-2xl shadow-card p-4 w-64">
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Mục tiêu quỹ</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['none', 'Chưa đặt'], ['set', 'Đang tích lũy'], ['done', 'Đã đạt']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterTarget(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterTarget === k ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Lãi suất</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterRate('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold ${filterRate === 'all' ? 'frost-inset text-blueberry dark:text-white' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>Tất cả</button>
                      {FUND_RATE_TIERS.map((t) => (
                        <button key={t.value} onClick={() => { setFilterRate(t.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${filterRate === t.value ? 'frost-inset' : 'hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} /> <span className="text-blueberry dark:text-white truncate">{t.value}</span>
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
                  <ArrowUpDown size={14} /> {activeSortField.label}
                </button>
                {showSortMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-0 top-10 z-20 frost-card rounded-2xl shadow-card p-2 w-56">
                    <p className="text-xs font-bold text-steel dark:text-light-grey px-2 py-1.5">Sắp xếp theo</p>
                    {FUND_SORT_FIELDS.map((f) => (
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
            <p className="text-steel dark:text-light-grey text-sm font-semibold">{displayFunds.length} quỹ</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 frost-inset rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-steel dark:text-light-grey" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
              </div>
              <button onClick={() => setShowCreate(true)} className="bg-gradient-primary text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-turquoise/30">
                <Plus size={16} /> Tạo quỹ mới
              </button>
            </div>
          </div>

          <div className="border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
            {funds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-16">Chưa có quỹ nào. Bấm "Tạo quỹ mới" để bắt đầu.</p>
            ) : displayFunds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-16">Không tìm thấy quỹ nào.</p>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                {pagedFunds.map((f, i) => {
                  const balance = fundBalanceWithProfit(f, transactions);
                  const target = Number(f.target_amount || 0);
                  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                  const isDone = target > 0 && balance >= target;
                  const rStyle = fundRateStyle(f);
                  return (
 <div key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="frost-card rounded-2xl overflow-hidden hover:shadow-card transition cursor-pointer">
                      {/* FIX: quỹ không có ảnh riêng trước đây LUÔN rơi về đúng 1 gradient
                          xanh dương cố định — nhiều quỹ liền kề y hệt màu nhau, đứng cạnh
                          các quỹ có ảnh thật tạo cảm giác lệch hẳn phong cách. Giờ dùng lại
                          fundCardBackground() (vốn đã viết sẵn, bản mobile đang dùng) để mỗi
                          quỹ không-ảnh được 1 gradient khác nhau theo thứ tự, đa dạng hơn
                          thay vì 1 màu lặp lại trên cả lưới. */}
                      <div
                        className="relative h-36 flex items-end p-4"
                        style={{ background: fundCardBackground(f, i), backgroundSize: 'cover', backgroundPosition: 'center' }}
                      >
                        <span className="text-2xl">{f.icon}</span>
                        {/* FIX: trạng thái "Đã đạt mục tiêu"/"Đang tích lũy" trước đây hiện
                            2 LẦN — badge riêng ở góc ảnh (chỉ lúc đã đạt) VÀ 1 badge khác y
                            hệt ý nghĩa trong phần nội dung bên dưới. Giờ gộp về đúng 1 chỗ
                            duy nhất (góc ảnh), hiện cho CẢ 2 trạng thái — bớt lặp thông tin
                            trên 1 card vốn đã khá dày đặc. */}
                        {target > 0 && (
                          <span className={`absolute top-2.5 left-2.5 flex items-center gap-1 backdrop-blur text-[11px] font-bold px-2 py-1 rounded-full ${isDone ? 'bg-white/80 dark:bg-[#2a2a44]/80 text-turquoise' : 'bg-black/25 text-white'}`}>
                            {isDone && <Check size={11} />} {isDone ? 'Đã đạt mục tiêu' : 'Đang tích lũy'}
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur flex items-center justify-center text-blueberry dark:text-white">
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === f.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="top-10 right-2.5 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                            {/* FIX: bỏ "Xem chi tiết" — cả thẻ (div onClick) đã mở chi tiết
                                quỹ khi bấm vào bất kỳ đâu trên thẻ rồi, mục này trong menu 3
                                chấm chỉ trùng lặp chức năng. */}
                            <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                              <Pencil size={14} /> Chỉnh sửa
                            </button>
                            <button onClick={() => { setOpenMenuId(null); handleDeleteFund(f); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cotton-candy hover:bg-cotton-candy-light dark:hover:bg-cotton-candy/10">
                              <Trash2 size={14} /> Xóa
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <h3 className="text-blueberry dark:text-white font-bold text-sm mb-2 line-clamp-1">{f.name}</h3>
                        <div className="flex items-center gap-4 mb-2">
                          <MiniRing pct={pct} color={isDone ? '#0DBACC' : '#74ACEF'} label="Tiến độ mục tiêu" />
                          <div className="leading-tight">
                            <p className="text-blueberry dark:text-white text-sm font-bold">{formatMoney(balance)}</p>
                            {/* FIX: "Số dư hiện tại" + mục tiêu trước đây tách rời (mục tiêu
                                nằm hẳn ở dòng cuối thẻ, cạnh ngày tạo) — giờ gộp ngay dưới số
                                dư, đọc liền mạch "đang có / cần có" như đã làm ở bảng danh
                                sách, thay vì phải nhìn xuống tận cuối thẻ mới thấy mục tiêu. */}
                            <p className="text-steel dark:text-light-grey text-[10px]">Số dư hiện tại{target > 0 && ` / ${formatMoney(target)}`}</p>
                          </div>
                        </div>
                        {/* FIX: trước đây badge lãi suất đi kèm 1 badge trạng thái TRÙNG với
                            badge đã chuyển lên góc ảnh phía trên (xem chú thích ở đó), và
                            dòng cuối thẻ (ngày tạo + mục tiêu) không còn cần thiết — mục tiêu
                            đã gộp lên trên, ngày tạo chỉ cần xem khi vào chi tiết quỹ, không
                            phải thông tin cần thấy ngay khi lướt qua cả lưới. Card giờ gọn
                            lại đúng những gì cần nhất: tên, tiến độ, số dư/mục tiêu, lãi suất.
                        */}
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full inline-block" style={{ color: rStyle.color, background: rStyle.bg }}>
                          {f.interest_rate > 0 ? `${f.interest_rate}%/năm` : rStyle.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="text-left text-steel dark:text-light-grey border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                      <th className="py-2.5 px-4 font-bold">Tên quỹ</th>
                      <th className="py-2.5 px-4 font-bold">Lãi suất</th>
                      {/* FIX: trước đây "Số dư hiện tại" và "Mục tiêu" là 2 cột tách rời, cùng
                          kể 1 câu chuyện (đang có bao nhiêu / cần bao nhiêu) nhưng mắt phải
                          nhảy qua lại giữa 2 cột mới ghép được ý. Gộp lại 1 cột, nhường bề
                          rộng cho cột Tiến độ để bar dài và dễ so sánh giữa các dòng hơn. */}
                      <th className="py-2.5 px-4 font-bold text-right">Số dư / Mục tiêu</th>
                      <th className="py-2.5 px-4 font-bold w-48">Tiến độ</th>
                      <th className="py-2.5 px-4 font-bold">Trạng thái</th>
                      <th className="py-2.5 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFunds.map((f) => {
                      const balance = fundBalanceWithProfit(f, transactions);
                      const target = Number(f.target_amount || 0);
                      const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                      const isDone = target > 0 && balance >= target;
                      const rStyle = fundRateStyle(f);
                      return (
                        <tr key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)] last:border-0 hover:bg-ice-cream dark:hover:bg-night-sky/30 cursor-pointer">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              <EmojiCircle emoji={f.icon} size={36} bg="#E3D6FF" />
                              <p className="font-bold text-blueberry dark:text-white">{f.name}</p>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            {/* FIX: trước đây luôn hiện CẢ nhãn phân loại ("<5%/năm") LẪN số
                                thật trong ngoặc ("(4%)") — thừa, lặp lại cùng 1 ý trong 1 badge
                                nhỏ. Giờ chỉ hiện đúng số thật (rõ ràng, chính xác hơn khoảng
                                phân loại); khi chưa có lãi suất mới hiện nhãn "Không lãi suất". */}
                            <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: rStyle.color, background: rStyle.bg }}>
                              {f.interest_rate > 0 ? `${f.interest_rate}%/năm` : rStyle.value}
                            </span>
                          </td>
                          {/* FIX: gộp "Số dư hiện tại" + "Mục tiêu" thành 1 cột dạng "đang có /
                              cần có" — đọc 1 chỗ là hiểu ngay thay vì ghép 2 cột rời. */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <span className="text-blueberry dark:text-white font-semibold">{formatMoney(balance)}</span>
                            {target > 0 && <span className="text-steel dark:text-light-grey"> / {formatMoney(target)}</span>}
                          </td>
                          <td className="py-2.5 px-4 w-48">
                            {/* FIX: bar và % trước đây xếp 2 DÒNG (bar trên, % dưới) trong cột
                                hẹp 128px — giờ nằm NGANG trong cột rộng hơn (192px), bar dài
                                hơn hẳn nên dễ so sánh tiến độ giữa các dòng bằng mắt hơn. */}
                            {target > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1"><ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} /></div>
                                <span className="text-steel dark:text-light-grey text-xs font-semibold w-9 text-right flex-shrink-0">{Math.round(pct)}%</span>
                              </div>
                            ) : <span className="text-light-grey">—</span>}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDone ? 'bg-turquoise/10 text-turquoise' : 'bg-ice-cream text-steel dark:bg-night-sky dark:text-light-grey'}`}>{target > 0 ? (isDone ? 'Đã đạt' : 'Đang tích lũy') : 'Chưa đặt mục tiêu'}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 inline-flex items-center justify-center text-steel dark:text-light-grey">
                              <MoreHorizontal size={18} />
                            </button>
                            {openMenuId === f.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-4 top-12 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                                {/* FIX: bỏ "Xem chi tiết" — cả dòng (tr onClick) đã mở chi
                                    tiết quỹ khi bấm vào bất kỳ đâu trên dòng rồi, mục này
                                    trong menu 3 chấm chỉ trùng lặp chức năng. */}
                                <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                  <Pencil size={14} /> Chỉnh sửa
                                </button>
                                <button onClick={() => { setOpenMenuId(null); handleDeleteFund(f); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cotton-candy hover:bg-cotton-candy-light dark:hover:bg-cotton-candy/10">
                                  <Trash2 size={14} /> Xóa
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

          {displayFunds.length > 0 && (
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

      {showCreate && <EditFundForm onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
      {editingFund && <EditFundForm category={editingFund} onClose={() => setEditingFund(null)} onSaved={reload} isNew={false} initialAmount={editingInitialAmount} firstAllocation={editingFirstAllocation} />}
    </>
  );
}
