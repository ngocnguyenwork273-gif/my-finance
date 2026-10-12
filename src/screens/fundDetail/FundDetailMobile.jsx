/* ==============================================================================
   Giao diện chi tiết Quỹ trên mobile.
   ============================================================================== */
import { Fragment } from 'react';
import { TxDeleteButton } from '../../components/ledger';
import { EmojiCircle, ProgressBar } from '../../components/ui';
import DateField from '../../DateField';
import { ArrowLeft, ChevronRight, Pencil, Sparkles, Star, Trash2, TrendingDown, TrendingUp, Wallet } from '../../icons';
import { displayTxNote } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { keyActivatable } from '../../a11y';

export function FundDetailMobile({ v }) {
  const { accruedProfit, balance, category, dailyProfit, displayHistory, filter, firstAllocation, formatDisplayTime, handleDelete, handleDeleteTx, hasHistoryDateFilter, historyDateFrom, historyDateTo, initialAmount, onBack, rate, setEditingQuickTx, setFilter, setHistoryDateFrom, setHistoryDateTo, setQuickMode, setShowEdit, target, targetPct, totalIn, totalOut } = v;
  return (
    <div className="md:hidden min-h-[100dvh] pb-28 relative bg-ice-cream dark:bg-[#1a1a2e]">
        <div className="h-56 relative"
          style={{
            ...(category.background_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)), url(${category.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(180deg,#0DBACC,#9F7FE0)' }),
          }}>
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button aria-label="Quay lại" onClick={onBack} className="w-10 h-10 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
              <div className="flex items-center gap-2">
                <EmojiCircle emoji={category.icon} size={26} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
                <h1 className="text-white text-base font-bold">{category.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Sửa quỹ" onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
              <button aria-label="Xóa quỹ" onClick={handleDelete} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
            </div>
          </div>
          {category.description && <p className="px-5 mt-3 text-white/85 text-sm text-center">{category.description}</p>}
        </div>

        <div className="px-5 -mt-14 relative z-10">
          <div className="bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư quỹ</p>
                <p className="text-blueberry dark:text-white text-[26px] font-bold leading-tight mt-0.5 truncate">
                  {formatMoney(balance)}
                  {target > 0 && <span className="text-steel dark:text-light-grey text-base font-normal"> /{formatMoney(target)}</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full ring-4 ring-turquoise/30 bg-turquoise-light dark:bg-turquoise/10 flex items-center justify-center text-2xl flex-shrink-0">
                {category.icon || '🐷'}
              </div>
            </div>

            {rate > 0 && (
              <button onClick={() => setFilter('profit')} className="mt-3 w-full flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold rounded-full pl-3 pr-2 py-2">
                <Sparkles size={13} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">Tổng lợi nhuận: {formatMoney(accruedProfit)} | Hôm nay: +{formatMoney(dailyProfit)}</span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
            )}

            {target > 0 && (
              <div className="mt-3">
                <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                <p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(targetPct)}% mục tiêu</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setQuickMode('allocation')} className="flex-1 flex items-center justify-center gap-1.5 bg-turquoise/10 text-turquoise rounded-2xl py-3 text-sm font-bold">
                <TrendingUp size={16} /> Góp quỹ
              </button>
              <button onClick={() => setQuickMode('expense')} className="flex-1 flex items-center justify-center gap-1.5 bg-cotton-candy/10 text-cotton-candy rounded-2xl py-3 text-sm font-bold">
                <Wallet size={16} /> Rút quỹ
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-3">Hoạt động gần đây</h2>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Góp quỹ' }, { key: 'expense', label: 'Rút quỹ' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 font-semibold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey shadow-soft'}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] rounded-full px-3 py-1.5 shadow-soft">
              <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
              <span className="text-steel dark:text-light-grey text-xs">→</span>
              <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
            </div>
            {hasHistoryDateFilter && (
              <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
            )}
          </div>

          {displayHistory.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có hoạt động nào.</p>
          ) : (
            <div className="flex flex-col scrollbar-hide">
              {(() => {
                let lastDateKey = null;
                return displayHistory.map((item) => {
                  const isProfit = item.isProfit;
                  const isAlloc = item.type === 'allocation';
                  const isInitial = isAlloc && firstAllocation && item.id === firstAllocation.id;
                  const label = isAlloc ? 'Góp quỹ' : isProfit ? 'Nhận lợi nhuận tự động' : 'Rút quỹ';
                  const iconBg = item.type === 'expense' ? 'bg-cotton-candy/10' : 'bg-turquoise/10';
                  const amountColor = item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise';
                  const timeDisplay = formatDisplayTime(item);
                  const isOverLimit = (item.note || '').includes('[Vượt hạn mức]');
                  // Nhóm theo ngày thực hiện thực tế: giao dịch dùng "date" (thời điểm thật khi bấm nạp/rút),
                  // lợi nhuận dùng "created_at" (= ngày được credit theo quy tắc)
                  const itemDate = new Date(isProfit ? item.created_at : (item.date || item.created_at));
                  const dateKey = itemDate.toDateString();
                  const showHeader = dateKey !== lastDateKey;
                  lastDateKey = dateKey;
                  const noteText = isProfit ? item.note : displayTxNote(item.note);

                  return (
                    <Fragment key={item.id}>
                      {showHeader && (
                        <div className="-mx-5 px-5 py-2 mt-3 first:mt-0 bg-steel/5 dark:bg-white/5">
                          <p className="text-blueberry dark:text-white font-extrabold text-sm">
                            {itemDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div
                        {...keyActivatable(isProfit ? undefined : () => { if (!isProfit) (isInitial ? setShowEdit(true) : setEditingQuickTx(item)); })}
                        className={`flex items-start gap-3 py-3 ${isProfit ? '' : 'cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl'} ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : 'border-b border-[rgba(189,189,203,0.15)] last:border-b-0'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isInitial ? 'bg-turquoise' : iconBg}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : isAlloc ? <TrendingUp size={16} className="text-turquoise" /> : isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-blueberry dark:text-white font-bold text-sm truncate">
                                {label}{isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                              </p>
                              {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                            </div>
                            <p className={`font-bold text-sm flex-shrink-0 ${amountColor}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs mt-0.5">{itemDate.toLocaleDateString('vi-VN')} · {timeDisplay}</p>
                          {noteText && <p className="text-steel dark:text-light-grey text-xs mt-0.5 truncate">{noteText}</p>}
                          {item.balanceAfter !== undefined && item.balanceAfter !== null && <p className="text-steel dark:text-light-grey text-xs mt-0.5">Số dư cuối: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        {!isProfit && (
                          // Khoản "Nạp quỹ lần đầu" (isInitial) bấm bút chì (hoặc bấm cả dòng) -> mở
                          // popup chỉnh sửa THÔNG TIN QUỸ (vì số tiền ban đầu được sửa chung trong
                          // form đó); các khoản nạp/rút khác -> mở đúng popup Nạp quỹ/Rút quỹ (tuỳ
                          // item.type) ở chế độ sửa, KHÔNG mở form Sửa giao dịch chung chung.
                          <button aria-label="Sửa giao dịch" onClick={(e) => { e.stopPropagation(); isInitial ? setShowEdit(true) : setEditingQuickTx(item); }} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    </Fragment>
                  );
                });
              })()}
            </div>
          )}

          <div className="bg-white dark:bg-[#1e1e32] rounded-2xl p-4 mt-5 shadow-soft">
            <p className="text-steel dark:text-light-grey text-xs font-bold mb-1">Số tiền ban đầu</p>
            <p className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-turquoise/10 rounded-2xl p-4">
              <p className="text-turquoise text-xs font-bold mb-1">Tổng đã nạp</p>
              <p className="text-turquoise font-bold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-cotton-candy/10 rounded-2xl p-4">
              <p className="text-cotton-candy text-xs font-bold mb-1">Tổng đã rút</p>
              <p className="text-cotton-candy font-bold">{formatMoney(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>
  );
}
