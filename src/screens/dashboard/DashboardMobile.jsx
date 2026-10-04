/* ==============================================================================
   Giao diện Tổng quan trên mobile.
   ============================================================================== */
import { AssetBreakdownDetail } from '../../components/ledger';
import { AvatarMenu, EmojiCircle, HoverDetailCard, ProgressBar } from '../../components/ui';
import { Loader2 } from '../../icons';
import { displayTxNote, fundBalanceWithProfit } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { txBalanceAfter, txIconEmoji } from '../../lib/ledger';
import { SpendingDonut, TrendBarChart } from '../DashboardParts';
import { GlobalPeriodWidget } from './DashboardWidgets';

export function DashboardMobile({ v }) {
  const { accounts, avatarUrl, categories, displayName, formatDateLabel, fundCategories, goals, groupedRecentTx, loading, mobileIncomeByCat, mobileIncomeTotal, mobileMaxTrend, mobileSpendingByCat, mobileSpendingTotal, mobileTrendBuckets, mobileWalletCarousel, onOpenFund, openSettings, overviewFundItems, overviewGoldItems, overviewWalletItems, recentTxList, setEditingTx, setScreen, sortedGroupKeys, spendingPoolByPeriod, theme, totalAssets, transactions } = v;
  return (
    <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="min-w-0 flex-1"><p className="text-steel dark:text-light-grey text-sm font-semibold">Chào bạn!</p><h1 className="text-blueberry dark:text-white text-2xl font-extrabold truncate">{displayName || 'Bạn'}</h1></div>
            <div className="flex-shrink-0">
              <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} openSettings={openSettings || (() => setScreen('settings'))} variant="mobile" />
            </div>
          </div>
          <div className="px-5 mt-4">
            <GlobalPeriodWidget v={v} />
          </div>
          <div className="px-5 mt-4">
            <HoverDetailCard detail={<AssetBreakdownDetail wallets={overviewWalletItems} funds={overviewFundItems} gold={overviewGoldItems} total={totalAssets} />}>
              <div className="min-w-0">
                <p className="text-steel dark:text-light-grey text-xs font-semibold">Tổng tài sản</p>
                <p className="text-blueberry dark:text-white text-3xl font-extrabold mt-1 truncate">{formatMoney(totalAssets)}</p>
              </div>
            </HoverDetailCard>
            {/* Đường biểu đồ nhỏ mang tính trang trí, cùng phong cách với khu vực
                "Total balance" trong bản thiết kế tham khảo — không đại diện số liệu thật. */}
            <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none" className="w-full mt-3 opacity-60">
              <polyline points="0,18 20,15 40,20 60,9 80,13 100,5 120,11 140,4 160,10 180,2 200,7" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(48,49,80,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Mobile wallet carousel */}
          {mobileWalletCarousel}

          <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity', scrollPaddingLeft: 20, touchAction: 'pan-x' }}>
            {fundCategories.length === 0 ? <p className="text-steel dark:text-light-grey text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p>
              : fundCategories.map((f) => (
                <button key={f.id} onClick={() => onOpenFund(f.id)} style={{ scrollSnapAlign: 'start' }} className="relative flex-shrink-0 w-[150px] text-left active:scale-95 transition">
                  <svg viewBox="0 0 170 175" className="w-full h-auto drop-shadow-md">
                    <defs>
                      <linearGradient id={`piggyBody-${f.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFE1EC" />
                        <stop offset="100%" stopColor="#F6A9C4" />
                      </linearGradient>
                    </defs>
                    {/* Tai — cánh nhọn đặc trưng của heo (không tròn như tai gấu) */}
                    <path d="M20,54 Q10,22 42,8 Q60,24 52,52 Q36,64 20,54 Z" fill={`url(#piggyBody-${f.id})`} />
                    <path d="M150,54 Q160,22 128,8 Q110,24 118,52 Q134,64 150,54 Z" fill={`url(#piggyBody-${f.id})`} />
                    <path d="M28,48 Q23,29 42,20 Q52,29 48,47 Q38,54 28,48 Z" fill="#FFC2D9" />
                    <path d="M142,48 Q147,29 128,20 Q118,29 122,47 Q132,54 142,48 Z" fill="#FFC2D9" />
                    {/* Chân — bầu dục có rãnh chẻ móng, đặc trưng của heo (gấu không có móng chẻ) */}
                    <ellipse cx="52" cy="164" rx="16" ry="11" fill="#F6A9C4" />
                    <ellipse cx="118" cy="164" rx="16" ry="11" fill="#F6A9C4" />
                    <line x1="52" y1="157" x2="52" y2="171" stroke="#E28AAE" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="118" y1="157" x2="118" y2="171" stroke="#E28AAE" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Thân mập tròn — bo góc siêu lớn cho mềm mại */}
                    <rect x="14" y="46" width="142" height="118" rx="59" fill={`url(#piggyBody-${f.id})`} />
                    {/* Má hồng */}
                    <circle cx="46" cy="99" r="13" fill="#F49CB9" opacity="0.55" />
                    <circle cx="124" cy="99" r="13" fill="#F49CB9" opacity="0.55" />
                    {/* Mắt */}
                    <ellipse cx="62" cy="87" rx="5" ry="6" fill="#6B4258" />
                    <ellipse cx="108" cy="87" rx="5" ry="6" fill="#6B4258" />
                    <circle cx="63.5" cy="84.5" r="1.4" fill="#fff" />
                    <circle cx="109.5" cy="84.5" r="1.4" fill="#fff" />
                    {/* Mõm */}
                    <rect x="68" y="99" width="34" height="24" rx="12" fill="#FFC2D9" />
                    <rect x="76.5" y="107" width="4" height="9" rx="2" fill="#D46A93" />
                    <rect x="89.5" y="107" width="4" height="9" rx="2" fill="#D46A93" />
                    {/* Nụ cười — cho mặt vui */}
                    <path d="M72,127 Q85,136 98,127" stroke="#D46A93" strokeWidth="3" strokeLinecap="round" fill="none" />
                    {/* Vệt sáng mềm cho khối tròn đỡ phẳng */}
                    <ellipse cx="55" cy="65" rx="26" ry="14" fill="#fff" opacity="0.25" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center px-2" style={{ top: '62%', bottom: '9%', left: '15%', right: '15%' }}>
                    <p className="text-[#7A3B57] text-[10px] font-bold leading-tight truncate w-full">{f.icon} {f.name}</p>
                    <p className="text-[#7A3B57] font-extrabold text-[11px] leading-tight truncate w-full">{formatMoney(fundBalanceWithProfit(f, transactions))}</p>
                  </div>
                </button>
              ))}
          </div>
          <div className="mt-6 px-5 pt-6 pb-6">
            {goals && goals.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Mục tiêu</h2>
                  <button onClick={() => setScreen('goals')} className="text-turquoise text-sm font-bold">Xem tất cả</button>
                </div>
                <div className="flex flex-col gap-3">
                  {goals.slice(0, 2).map((g) => {
                    const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                          <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar pct={pct} title={`Hiện có: ${formatMoney(g.current_amount || 0)}`} />
                        {g.target_amount > 0 && (
                          <p className="text-steel dark:text-light-grey text-[11px] mt-1">Mục tiêu: {formatMoney(g.target_amount)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              {/* Card riêng #0: Tổng thu nhập theo danh mục (donut) — đặt trên "Chi tiêu theo
                  danh mục" theo đúng thứ tự Thu trước Chi. */}
              <div className="frost-inset rounded-2xl p-4">
                <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Thu nhập theo danh mục</h2>
                {mobileIncomeByCat.length === 0 ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có thu nhập trong khoảng này.</p>
                ) : (
                  <SpendingDonut data={mobileIncomeByCat} total={mobileIncomeTotal} />
                )}
              </div>

              {/* Card riêng #1: Chi tiêu theo danh mục (donut) — tách khỏi card "Thu và Chi"
                  bên dưới để tránh nhồi 2 biểu đồ khác kiểu vào chung 1 khối nhìn rối mắt.
                  Bao gồm cả giao dịch loại 'allocation' (nạp quỹ) vì với người dùng, nạp
                  vào quỹ cũng là một hình thức "chi" tiền ra khỏi phần được chi tiêu tự do. */}
              <div className="frost-inset rounded-2xl p-4">
                <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Chi tiêu theo danh mục</h2>
                {mobileSpendingByCat.length === 0 ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có chi tiêu trong khoảng này.</p>
                ) : (
                  <SpendingDonut data={mobileSpendingByCat} total={mobileSpendingTotal} />
                )}
              </div>

              {/* Card riêng #2: Thu và Chi (biểu đồ cột so sánh theo từng mốc thời gian) */}
              <div className="frost-inset rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-blueberry dark:text-white font-extrabold text-base">Thu và Chi</h2>
                  <div className="flex items-center gap-3 text-xs font-semibold flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-steel dark:text-light-grey"><span className="w-2.5 h-2.5 rounded-full bg-turquoise" />Thu</span>
                    <span className="flex items-center gap-1.5 text-steel dark:text-light-grey"><span className="w-2.5 h-2.5 rounded-full bg-cotton-candy" />Chi</span>
                  </div>
                </div>
                {mobileTrendBuckets.every((b) => b.inc === 0 && b.exp === 0) ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa có thu/chi trong khoảng này.</p>
                ) : (
                  <TrendBarChart buckets={mobileTrendBuckets} maxVal={mobileMaxTrend} showYAxis />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
              <button onClick={() => setScreen('report')} className="text-turquoise text-sm font-bold">Xem chi tiết</button>
            </div>
            {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-turquoise" /></div>
              : recentTxList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
              : (
                <div className="flex flex-col gap-4 scrollbar-hide">
                  {sortedGroupKeys.map((key) => (
                    <div key={key}>
                      <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatDateLabel(key)}</p>
                      <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                        {groupedRecentTx[key].map((tx) => {
                          const cat = categories.find((c) => c.id === tx.category_id);
                          const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                          const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                          const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                          const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                          const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
                          const noteText = isDirectSet && balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : (displayTxNote(tx.note) || new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
                          return (
                            <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                              <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={40} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                                  {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                </div>
                                <p className="text-steel dark:text-light-grey text-xs">{noteText}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className={`font-bold text-sm ${isPositive ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                                {balanceAfter !== null && <p className="text-steel dark:text-light-grey text-[11px] mt-0.5 whitespace-nowrap">Số dư cuối: {formatMoney(balanceAfter)}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
  );
}
