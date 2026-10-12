/* ==============================================================================
   Giao diện chi tiết Quỹ trên desktop.
   ============================================================================== */
import { TxDeleteButton } from '../../components/ledger';
import { EmojiCircle, ProgressBar } from '../../components/ui';
import DateField from '../../DateField';
import { ArrowLeft, Pencil, Sparkles, Star, Trash2, TrendingDown, TrendingUp } from '../../icons';
import { displayTxNote } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { keyActivatable } from '../../a11y';

export function FundDetailDesktop({ v }) {
  const { accruedProfit, balance, category, dailyProfit, dailyProfitHistory, displayHistory, filter, firstAllocation, handleDelete, handleDeleteTx, hasHistoryDateFilter, historyDateFrom, historyDateTo, historyItemDate, initialAmount, onBack, rate, setEditingQuickTx, setFilter, setHistoryDateFrom, setHistoryDateTo, setQuickMode, setShowEdit, target, targetPct, totalIn, totalOut } = v;
  return (
    <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button aria-label="Quay lại" onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={category.icon} size={40} active activeColor="#0DBACC" />
              <div>
                <h1 className="text-blueberry dark:text-white text-xl font-bold leading-tight">{category.name}</h1>
                {category.description && <p className="text-steel dark:text-light-grey text-sm">{category.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuickMode('allocation')} className="bg-gradient-primary text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30"><TrendingUp size={15} /> Nạp quỹ</button>
            <button onClick={() => setQuickMode('expense')} className="bg-cotton-candy text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-cotton-candy/30"><TrendingDown size={15} /> Rút quỹ</button>
            <button aria-label="Sửa quỹ" onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-baby-blue-light/60 dark:bg-baby-blue/15 flex items-center justify-center shadow-soft"><Pencil size={15} className="text-baby-blue" /></button>
            <button aria-label="Xóa quỹ" onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Trash2 size={15} className="text-cotton-candy" /></button>
          </div>
        </div>

        {category.background_url && (
          <div className="w-full h-40 rounded-3xl overflow-hidden mb-6">
            <img src={category.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
 <div className="frost-card rounded-3xl p-6 ">
              <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư hiện tại</p>
              <p className="text-blueberry dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
              {accruedProfit > 1 && <p className="text-turquoise text-sm mt-1 font-semibold">Trong đó lãi cộng dồn: {formatMoney(accruedProfit)}</p>}
              {target > 0 && (
                <div className="mt-4">
                  <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                  <p className="text-steel dark:text-light-grey text-xs mt-1">{formatMoney(balance)} / {formatMoney(target)} mục tiêu ({Math.round(targetPct)}%)</p>
                </div>
              )}
              {rate > 0 && <p className="text-turquoise text-sm mt-3 font-semibold">Lãi suất {rate}%/năm — ước tính {formatMoney(dailyProfit)}/ngày, cộng dồn tiếp tục sinh lời</p>}
              <div className="grid grid-cols-2 gap-3 mt-5">
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

 <div className="frost-card rounded-3xl p-6 ">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Lịch sử</h2>
                <div className="flex gap-2 flex-wrap">
                  {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Nạp (Thu)' }, { key: 'expense', label: 'Chi' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs flex-shrink-0 font-bold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-2 frost-inset rounded-full px-3 py-1.5">
                  <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                  <span className="text-steel dark:text-light-grey text-xs">→</span>
                  <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                </div>
                {hasHistoryDateFilter && (
                  <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
                )}
              </div>
              {filter === 'profit' ? (
                rate === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này.</p> : (
                  <div className="frost-inset rounded-2xl p-5 text-center">
                    <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                    <p className="text-blueberry dark:text-white text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                    <p className="text-steel dark:text-light-grey text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                    {dailyProfitHistory.length > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-steel dark:text-light-grey text-sm font-bold mb-2">Lịch sử lợi nhuận theo ngày</p>
                        <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] max-h-80 overflow-y-auto scrollbar-hide">
                          {dailyProfitHistory.map((d) => (
                            <div key={d.date.getTime()} className="flex items-center gap-3 py-2.5">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-turquoise/10">
                                <TrendingUp size={14} className="text-turquoise" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-blueberry dark:text-white font-bold text-sm">{d.date.toLocaleDateString('vi-VN')}</p>
                                <p className="text-steel dark:text-light-grey text-xs">Số dư sau lãi: {formatMoney(d.balance)}</p>
                              </div>
                              <p className="font-bold text-sm flex-shrink-0 text-turquoise">+{formatMoney(d.profit)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : displayHistory.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col scrollbar-hide">
                  {displayHistory.map((item, idx) => {
                    const isInitial = item.type === 'allocation' && firstAllocation && item.id === firstAllocation.id;
                    const isOverLimit = (item.note || '').includes('[Vượt hạn mức]');
                    const showTopBorder = idx > 0 && !isInitial;
                    const itemDateTime = historyItemDate(item);
                    const dateTimeLabel = `${itemDateTime.toLocaleDateString('vi-VN')} ${itemDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                    const noteLine = item.isProfit ? item.note : displayTxNote(item.note);
                    return (
                      <div
                        key={item.id}
                        {...keyActivatable(item.isProfit ? undefined : () => { if (!item.isProfit) (isInitial ? setShowEdit(true) : setEditingQuickTx(item)); })}
                        className={`flex items-center gap-3 py-3 ${item.isProfit ? '' : 'cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl'} ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : showTopBorder ? 'border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isInitial ? 'bg-turquoise' : item.type === 'allocation' ? 'bg-turquoise/10' : item.isProfit ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : item.type === 'allocation' ? <TrendingUp size={16} className="text-turquoise" /> : item.isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-blueberry dark:text-white font-bold text-sm">
                              {item.type === 'allocation' ? 'Nạp quỹ' : item.isProfit ? 'Lợi nhuận' : 'Rút quỹ (chi tiêu)'}
                              {isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                            </p>
                            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs">{dateTimeLabel}</p>
                          {noteLine && <p className="text-steel dark:text-light-grey text-xs">{noteLine}</p>}
                          {item.balanceAfter !== undefined && item.balanceAfter !== null && <p className="text-steel dark:text-light-grey text-xs">Số dư cuối: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise'}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                        {!item.isProfit && (
                          // Xem giải thích ở bản mobile: khoản nạp ban đầu -> mở sửa thông tin quỹ,
                          // các khoản khác -> mở popup Nạp/Rút quỹ ở chế độ sửa.
                          <button aria-label="Sửa giao dịch" onClick={(e) => { e.stopPropagation(); isInitial ? setShowEdit(true) : setEditingQuickTx(item); }} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!item.isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

 <div className="frost-card rounded-3xl p-6 h-fit">
            <h3 className="text-blueberry dark:text-white font-extrabold mb-4">Thông tin quỹ</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Số tiền ban đầu</span><span className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Mục tiêu</span><span className="text-blueberry dark:text-white font-bold">{target > 0 ? formatMoney(target) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Lãi suất</span><span className="text-blueberry dark:text-white font-bold">{rate > 0 ? `${rate}%/năm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã nạp</span><span className="text-turquoise font-bold">{formatMoney(totalIn)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã rút</span><span className="text-cotton-candy font-bold">{formatMoney(totalOut)}</span></div>
            </div>
          </div>
        </div>
      </div>
  );
}
