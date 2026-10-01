/* ==============================================================================
   Thanh header trên desktop (tìm kiếm toàn cục, thêm giao dịch, avatar).
   ============================================================================== */
import { useState } from 'react';
import { AvatarMenu, EmojiCircle } from '../components/ui';
import { useAppData, useShell } from '../context';
import { Bell, Plus, Search, X } from '../icons';
import { accountBalance, displayTxNote, fundBalanceWithProfit, stripPeriodTag } from '../lib/finance';
import { formatMoney, textMatchesSearch } from '../lib/format';

// Gom kết quả tìm kiếm từ TẤT CẢ dữ liệu trong app (ví, quỹ, danh mục, mục tiêu,
// giao dịch) theo từ khóa — dùng chung logic khớp với textMatchesSearch (bỏ dấu +
// khớp viết tắt) đã có sẵn trong app.
function useGlobalSearchResults(query, { accounts, categories, transactions, goals }) {
  const q = query.trim();
  if (!q) return [];
  const groups = [];

  const walletHits = (accounts || [])
    .filter((a) => textMatchesSearch(a.name, q))
    .slice(0, 5)
    .map((a) => ({
      id: `wallet-${a.id}`,
      icon: a.icon,
      title: a.name,
      sub: formatMoney(accountBalance(a, transactions || [])),
      type: 'wallet',
      payload: a,
    }));
  if (walletHits.length) groups.push({ key: 'wallet', label: 'Ví', items: walletHits });

  const fundHits = (categories || [])
    .filter((c) => c.is_fund && textMatchesSearch(c.name, q))
    .slice(0, 5)
    .map((c) => ({
      id: `fund-${c.id}`,
      icon: c.icon,
      title: c.name,
      sub: formatMoney(fundBalanceWithProfit(c, transactions || [])),
      type: 'fund',
      payload: c,
    }));
  if (fundHits.length) groups.push({ key: 'fund', label: 'Quỹ', items: fundHits });

  const categoryHits = (categories || [])
    .filter((c) => !c.is_fund && textMatchesSearch(c.name, q))
    .slice(0, 5)
    .map((c) => ({
      id: `cat-${c.id}`,
      icon: c.icon,
      title: c.name,
      sub: c.type === 'income' ? 'Danh mục thu' : 'Danh mục chi',
      type: 'category',
      payload: c,
    }));
  if (categoryHits.length) groups.push({ key: 'category', label: 'Danh mục', items: categoryHits });

  const goalHits = (goals || [])
    .filter((g) => textMatchesSearch(g.name, q))
    .slice(0, 5)
    .map((g) => ({
      id: `goal-${g.id}`,
      icon: '🎯',
      title: g.name,
      sub: `${formatMoney(g.current_amount || 0)} / ${formatMoney(g.target_amount || 0)}`,
      type: 'goal',
      payload: g,
    }));
  if (goalHits.length) groups.push({ key: 'goal', label: 'Mục tiêu', items: goalHits });

  const txHits = (transactions || [])
    .filter((t) => {
      const cat = (categories || []).find((c) => c.id === t.category_id);
      return textMatchesSearch(stripPeriodTag(t.note), q) || textMatchesSearch(cat?.name, q);
    })
    .slice(0, 5)
    .map((t) => {
      const cat = (categories || []).find((c) => c.id === t.category_id);
      return {
        id: `tx-${t.id}`,
        icon: cat?.icon || '❔',
        title: displayTxNote(t.note) || cat?.name || 'Giao dịch',
        sub: `${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)} · ${new Date(t.date).toLocaleDateString('vi-VN')}`,
        type: 'transaction',
        payload: t,
      };
    });
  if (txHits.length) groups.push({ key: 'transaction', label: 'Giao dịch', items: txHits });

  return groups;
}

export function HeaderDesktop() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { onAddClick, displayName, avatarUrl, theme, openSettings, setScreen } = useShell();
  const { accounts, categories, transactions, goals, onOpenAccount, onOpenFund } = useAppData();
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const isDark = theme === 'dark';
  const searchGroups = useGlobalSearchResults(search, { accounts, categories, transactions, goals });
  const showDropdown = searchFocused && search.trim() !== '';

  function closeSearch() { setSearchFocused(false); setSearch(''); }

  function goToResult(item) {
    if (item.type === 'wallet') onOpenAccount?.(item.payload.id, 'dashboard');
    else if (item.type === 'fund') onOpenFund?.(item.payload.id);
    else if (item.type === 'category') openSettings?.('categories');
    else if (item.type === 'goal') setScreen?.('goals');
    else if (item.type === 'transaction') setScreen?.('report');
    closeSearch();
  }

  return (
    <header
      className="hidden md:flex sticky top-0 z-10 px-6 md:px-8 py-4 items-center justify-between relative"
      style={{
        background: isDark ? 'rgba(20,20,45,0.55)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.5)',
        boxShadow: isDark ? '0 10px 30px -18px rgba(0,0,0,0.45)' : '0 10px 30px -18px rgba(48,49,80,0.18)',
      }}
    >
      {/* Lớp riêng chỉ để cắt viền các blob trang trí — KHÔNG bọc luôn nội dung
          tương tác (menu avatar), tránh bị overflow-hidden cắt mất khi mở dropdown. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
        <div className="absolute -top-10 right-24 w-56 h-32 rounded-full bg-turquoise-light/45 dark:bg-turquoise/20 blur-2xl" />
      </div>
      <div className="relative z-10 w-72">
        <div className="flex items-center gap-2 bg-white/50 dark:bg-white/[0.06] backdrop-blur rounded-full px-4 py-2.5 w-full border border-white/60 dark:border-white/10">
          <Search size={16} className="text-steel dark:text-light-grey flex-shrink-0" />
          <input
            placeholder="Tìm kiếm nhanh"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="bg-transparent outline-none text-sm flex-1 min-w-0 text-blueberry dark:text-white placeholder:text-steel dark:placeholder:text-light-grey"
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-shrink-0 text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white transition">
              <X size={14} />
            </button>
          )}
        </div>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeSearch} />
            <div className="absolute top-12 left-0 w-[26rem] max-w-[90vw] bg-white/85 dark:bg-[#1e1e32]/80 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] py-2 z-40 max-h-[26rem] overflow-y-auto overflow-x-hidden scrollbar-hide isolate">
              <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl -z-10" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl -z-10" />
              {searchGroups.length === 0 ? (
                <p className="text-steel dark:text-light-grey text-sm text-center py-6 px-4">Không tìm thấy kết quả nào cho "{search}"</p>
              ) : (
                searchGroups.map((group) => (
                  <div key={group.key} className="mb-1 last:mb-0">
                    <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-steel dark:text-light-grey">{group.label}</p>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => goToResult(item)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-blueberry dark:text-white hover:bg-white/40 dark:hover:bg-white/10 text-left"
                      >
                        <EmojiCircle emoji={item.icon} size={30} bg="#F7F7F8" />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-semibold">{item.title}</span>
                          <span className="block truncate text-steel dark:text-light-grey text-xs">{item.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 relative z-10">
        <button onClick={onAddClick} className="bg-gradient-primary text-white rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md shadow-turquoise/30">
          <Plus size={16} /> Thêm giao dịch
        </button>
        <button className="w-9 h-9 rounded-full bg-white/50 dark:bg-white/[0.06] backdrop-blur border border-white/60 dark:border-white/10 flex items-center justify-center text-steel dark:text-light-grey">
          <Bell size={16} />
        </button>
        <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} openSettings={openSettings} variant="desktop" />
      </div>
    </header>
  );
}
