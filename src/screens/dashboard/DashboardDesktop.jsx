/* ==============================================================================
   Giao diện Tổng quan trên desktop.
   ============================================================================== */
import { AssetBreakdownDetail, BreakdownDetailList } from '../../components/ledger';
import { EmojiCircle, HoverDetailCard, ProgressBar } from '../../components/ui';
import { EditAccountModal } from '../../forms/EditAccountModal';
import { ChevronDown, ChevronRight, Loader2, Plus, Target, Wallet, Wifi } from '../../icons';
import { ACCOUNT_TYPES, accountCardGradient } from '../../lib/accountStyles';
import { accountBalance, filteredTxsForCard, isInitialAllocationTx, labelForCardFilter, periodPool, transactionPeriodKey } from '../../lib/finance';
import { formatMoney } from '../../lib/format';
import { txBalanceAfter, txIconEmoji } from '../../lib/ledger';
import { CategoryBarChart, palette, SegmentDonut, TrendBarChart } from '../DashboardParts';
import { GlobalPeriodWidget, IncomeExpenseComboChart } from './DashboardWidgets';

export function DashboardDesktop({ v }) {
  const { accounts, assetOverviewHovered, categories, costBuckets, costExpenseSeries, costIncomeTotals, costMaxVal, expenseCardBuckets, expenseCardMax, expenseCardSeries, expenseYearSegments, formatDateLabel, globalFilter, goals, goToWalletIndex, groupedRecentTx, handleWalletTouchEnd, handleWalletTouchStart, incomeCardBuckets, incomeCardMax, incomeCardSeries, incomeYearSegments, loading, maxTrend, onOpenAccount, overviewFundItems, overviewGoldItems, overviewWalletItems, recentTxList, reload, setAssetOverviewHovered, setEditingTx, setLedgerModal, setScreen, setShowAddWallet, setShowAddWidget, setShowAllExpenseYearLegend, setShowAllIncomeYearLegend, setShowWalletPopover, showAddWallet, showAllExpenseYearLegend, showAllIncomeYearLegend, showWalletPopover, sortedGroupKeys, spendingPoolByPeriod, totalAccounts, totalAssets, totalExpenseYear, totalFunds, totalIncomeYear, transactions, trendBucketsTrimmed, trendTitle, walletActiveIndex, walletStackRef, walletStackStyle } = v;
  return (
    <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-0" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-64 -left-10" />
        <div className="relative flex items-center justify-between mb-6">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <GlobalPeriodWidget v={v} />
            <button onClick={() => setShowAddWidget(true)} className="bg-gradient-primary text-white rounded-full pl-3 pr-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30">
              <Plus size={15} /> Thêm widget
            </button>
          </div>
        </div>
        <div
          className="relative grid gap-6"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr',
            gridTemplateAreas: `
              "chart chart right"
              "incexp incexp right"
              "cost cost goal"
            `,
          }}
        >
          <div
            style={{ gridArea: 'chart' }}
            onMouseEnter={() => setAssetOverviewHovered(true)}
            onMouseLeave={() => setAssetOverviewHovered(false)}
            className={`frost-card rounded-3xl p-6 relative ${assetOverviewHovered ? 'z-[5]' : 'z-0'}`}
          >
            <p className="text-blueberry dark:text-white font-extrabold mb-4">Tổng quan tài sản</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <HoverDetailCard detail={<BreakdownDetailList title="Tiền ví" items={[...overviewWalletItems, ...overviewGoldItems]} total={totalAccounts} colorClass="text-blueberry dark:text-white" />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tiền ví</p>
                <p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAccounts)}</p>
              </HoverDetailCard>
              <HoverDetailCard detail={<BreakdownDetailList title="Tiền quỹ" items={overviewFundItems} total={totalFunds} colorClass="text-blueberry dark:text-white" />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tiền quỹ</p>
                <p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalFunds)}</p>
              </HoverDetailCard>
              <HoverDetailCard align="right" detail={<AssetBreakdownDetail wallets={overviewWalletItems} funds={overviewFundItems} gold={overviewGoldItems} total={totalAssets} />}>
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">Tổng cộng</p>
                <p className="text-xl font-bold text-turquoise">{formatMoney(totalAssets)}</p>
              </HoverDetailCard>
            </div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-steel dark:text-light-grey text-xs font-semibold">{trendTitle}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-turquoise" />Tiền ví</span>
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-cotton-candy" />Tiền quỹ</span>
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-lavender" />Tổng</span>
              </div>
            </div>
            <TrendBarChart buckets={trendBucketsTrimmed} maxVal={maxTrend} keyA="wallet" keyB="fund" keyC="total" labelA="Tiền ví" labelB="Tiền quỹ" labelC="Tổng" showYAxis />
          </div>

          <div style={{ gridArea: 'right' }} className="flex flex-col gap-6">
            <div className="frost-card rounded-3xl p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Ví</h3>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowAddWallet(true)} className="bg-gradient-primary text-white rounded-full pl-2.5 pr-3 py-1.5 text-xs font-bold flex items-center gap-1 shadow-md shadow-turquoise/30">
                    <Plus size={13} /> Thêm ví
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowWalletPopover((v) => !v)} className="frost-inset w-7 h-7 rounded-full flex items-center justify-center text-steel dark:text-light-grey">
                      <ChevronDown size={14} className={`transition-transform ${showWalletPopover ? 'rotate-180' : ''}`} />
                    </button>
                    {showWalletPopover && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowWalletPopover(false)} />
                        <div style={{ position: 'absolute' }} className="top-9 right-0 bg-white/85 dark:bg-[#1e1e32]/75 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] py-1.5 w-56 z-40 max-h-72 overflow-y-auto overflow-x-hidden scrollbar-hide isolate">
                          <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl -z-10" />
                          <div className="pointer-events-none absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl -z-10" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent -z-10" />
                          {accounts.length === 0 ? (
                            <p className="text-steel dark:text-light-grey text-xs text-center py-4 px-4">Chưa có ví nào.</p>
                          ) : accounts.map((acc, idx) => (
                            <button key={acc.id} onClick={() => { setShowWalletPopover(false); goToWalletIndex(idx); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blueberry dark:text-white hover:bg-white/40 dark:hover:bg-white/10 text-left">
                              <EmojiCircle emoji={acc.icon} size={26} bg="#F7F7F8" />
                              <span className="flex-1 min-w-0 truncate font-semibold">{acc.name}</span>
                              <span className="text-steel dark:text-light-grey text-xs flex-shrink-0">{formatMoney(accountBalance(acc, transactions))}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {accounts.length === 0 ? (
                <button onClick={() => setShowAddWallet(true)} className="w-full border-2 border-dashed border-[rgba(189,189,203,0.4)] dark:border-[rgba(189,189,203,0.2)] rounded-3xl py-8 flex flex-col items-center gap-1.5 text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise transition">
                  <Wallet size={22} />
                  <span className="text-xs font-bold">Chưa có ví nào — bấm để thêm ví đầu tiên</span>
                </button>
              ) : (
                <div
                  ref={walletStackRef}
                  className="relative isolate w-full overflow-hidden"
                  style={{ height: 172 }}
                  onTouchStart={handleWalletTouchStart}
                  onTouchEnd={handleWalletTouchEnd}
                >
                  {accounts.map((acc, idx) => {
                    const depth = idx - walletActiveIndex;
                    if (depth < -1 || depth > 3) return null;
                    const style = walletStackStyle(depth);
                    // Dãy số trang trí kiểu thẻ ngân hàng, lấy từ id ví — chỉ để hiển thị,
                    // không phải số tài khoản/thẻ thật (đồng bộ kiểu thẻ với bản mobile).
                    const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
                    return (
                      <button
                        key={acc.id}
                        id={`wallet-card-${acc.id}`}
                        onClick={() => { if (depth === 0) onOpenAccount(acc.id, 'dashboard'); else goToWalletIndex(idx); }}
                        className="absolute inset-0 rounded-2xl p-5 text-left shadow-card hover:shadow-lg overflow-hidden"
                        style={{
                          ...style,
                          background: accountCardGradient(acc.type),
                          transition: 'transform 320ms cubic-bezier(.22,.9,.32,1), opacity 320ms ease, box-shadow 200ms ease',
                        }}
                      >
                        <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15" />
                        <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-black/10" />

                        <div className="relative flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-6 rounded-md bg-white/35 border border-white/40" />
                            <EmojiCircle emoji={acc.icon} size={30} bg="rgba(255,255,255,0.16)" />
                          </div>
                          <Wifi size={18} className="text-white/85 rotate-90" />
                        </div>

                        <p className="relative text-white/90 font-bold text-base tracking-[0.2em] mt-4">•••• {maskedDigits}</p>

                        <div className="relative flex items-end justify-between mt-3 gap-2">
                          <div className="min-w-0">
                            <p className="text-white/70 text-[10px] font-semibold uppercase truncate">{acc.name}</p>
                            <p className="text-white font-extrabold text-lg mt-0.5 truncate">{formatMoney(accountBalance(acc, transactions))}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-white/60 text-[9px] font-semibold uppercase">Loại ví</p>
                            <p className="text-white/90 text-xs font-bold whitespace-nowrap">{ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label || acc.type}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {showAddWallet && <EditAccountModal onClose={() => setShowAddWallet(false)} onSaved={reload} isNew={true} />}
            </div>

            <div className="frost-card rounded-3xl p-6 flex-1">
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-blueberry dark:text-white font-extrabold">Hoạt động gần đây</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setScreen('report');
                      // Nhảy thẳng tới khối "Hoạt động gần đây" trong màn Báo cáo, không cần
                      // người dùng tự cuộn lên tìm — đợi 1 nhịp để Report render xong rồi mới
                      // scrollIntoView (bản mobile/desktop của Report cùng tồn tại trong DOM,
                      // chỉ khác CSS ẩn/hiện, nên tìm khối đang thực sự hiển thị mà cuộn tới).
                      setTimeout(() => {
                        const targets = document.querySelectorAll('[data-report-anchor="recent-activity"]');
                        const visible = Array.from(targets).find((el) => el.offsetParent !== null);
                        (visible || targets[0])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    title="Xem chi tiết"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-turquoise hover:bg-turquoise/10 transition flex-shrink-0"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              {loading ? <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-turquoise" /></div>
                : recentTxList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-4">Không có giao dịch nào.</p>
                : (
                  <div className="flex flex-col gap-3 scrollbar-hide">
                    {sortedGroupKeys.map((key) => (
                      <div key={key}>
                        <p className="text-xs font-bold text-steel dark:text-light-grey mb-1">{formatDateLabel(key)}</p>
                        <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                          {groupedRecentTx[key].map((tx) => {
                            const cat = categories.find((c) => c.id === tx.category_id);
                            const isOverLimit = (tx.note || '').includes('[Vượt hạn mức]');
                            // FIX: với khoản chi tiêu KHÔNG phải quỹ (danh mục thường, VD "Điện thoại")
                            // và được trừ trực tiếp từ thu nhập của kỳ (không qua ví), hiển thị thêm
                            // "Thu nhập kỳ còn lại" — tương tự cách quỹ hiển thị "Số dư" sau mỗi giao dịch.
                            const isFromPeriodIncome = tx.type === 'expense' && tx.account_id == null && !cat?.is_fund;
                            const periodRemaining = isFromPeriodIncome ? periodPool(transactions, transactionPeriodKey(tx)).remaining : null;
                            const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                            const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && Number(tx.amount) > 0);
                            const label = tx.type === 'adjustment' ? 'Cập nhật số dư ví' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                            const balanceAfter = txBalanceAfter(tx, categories, accounts, transactions, spendingPoolByPeriod);
                            const timeOrNote = isDirectSet && balanceAfter !== null ? `Số dư mới: ${formatMoney(balanceAfter)}` : new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                                <EmojiCircle emoji={txIconEmoji(tx, categories, accounts)} size={36} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-blueberry dark:text-white font-bold text-sm truncate">{label}</p>
                                    {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                  </div>
                                  <p className="text-steel dark:text-light-grey text-xs">{timeOrNote}</p>
                                  {isFromPeriodIncome && (
                                    <p className="text-[11px] text-steel dark:text-light-grey">Thu nhập kỳ còn lại: <span className={`font-semibold ${periodRemaining < 0 ? 'text-cotton-candy' : 'text-turquoise'}`}>{formatMoney(periodRemaining)}</span></p>
                                  )}
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

          <div style={{ gridArea: 'incexp' }} className="grid grid-cols-2 gap-6 items-stretch">
            <div className="frost-card rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Tổng thu nhập</h3>
              </div>
              {incomeYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <SegmentDonut segments={incomeYearSegments} centerLabel="Tổng" centerValue={formatMoney(totalIncomeYear)} />
                  <div className="flex flex-col gap-2 text-sm w-full max-w-xs mx-auto">
                    {(showAllIncomeYearLegend ? incomeYearSegments : incomeYearSegments.slice(0, 4)).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                    {incomeYearSegments.length > 4 && (
                      <button onClick={() => setShowAllIncomeYearLegend((v) => !v)} className="text-turquoise text-xs font-bold text-left mt-1 hover:underline">
                        {showAllIncomeYearLegend ? 'Thu gọn' : `Xem tất cả ${incomeYearSegments.length} danh mục`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="frost-card rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Tổng chi tiêu</h3>
              </div>
              {expenseYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <SegmentDonut segments={expenseYearSegments} centerLabel="Tổng" centerValue={formatMoney(totalExpenseYear)} />
                  <div className="flex flex-col gap-2 text-sm w-full max-w-xs mx-auto">
                    {(showAllExpenseYearLegend ? expenseYearSegments : expenseYearSegments.slice(0, 4)).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                    {expenseYearSegments.length > 4 && (
                      <button onClick={() => setShowAllExpenseYearLegend((v) => !v)} className="text-turquoise text-xs font-bold text-left mt-1 hover:underline">
                        {showAllExpenseYearLegend ? 'Thu gọn' : `Xem tất cả ${expenseYearSegments.length} danh mục`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ gridArea: 'cost' }} className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-blueberry dark:text-white font-extrabold">Phân tích chi phí</h3>
            </div>
            {costExpenseSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong khoảng này.</p> : (
              <IncomeExpenseComboChart buckets={costBuckets} series={costExpenseSeries} incomeTotals={costIncomeTotals} maxVal={costMaxVal} />
            )}
          </div>

          <div style={{ gridArea: 'goal' }} className="frost-card rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blueberry dark:text-white font-extrabold">Mục tiêu</h3>
              <button onClick={() => setScreen('goals')} className="text-turquoise text-xs font-bold">Xem tất cả</button>
            </div>
            {/* FIX: trước đây rỗng chỉ có 1 dòng chữ "Chưa có mục tiêu nào." căn giữa theo
                py-4, còn thẻ này lại cao bằng thẻ "Phân tích chi phí" bên cạnh (chart khá cao)
                nên phần lớn thẻ là khoảng trống vô nghĩa. Giờ khối rỗng chiếm trọn phần còn
                lại của thẻ (flex-1) và có icon + lời mời tạo mục tiêu, biến chỗ trống thành
                1 lời gọi hành động thay vì chỉ là khoảng trắng. */}
            {(!goals || goals.length === 0) ? (
              <button
                onClick={() => setScreen('goals')}
                className="flex-1 flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-steel/25 dark:border-light-grey/20 hover:border-turquoise/50 hover:bg-turquoise/5 transition-colors py-6"
              >
                <Target size={22} className="text-steel dark:text-light-grey" />
                <p className="text-steel dark:text-light-grey text-sm">Chưa có mục tiêu nào.</p>
                <span className="text-turquoise text-xs font-bold">+ Tạo mục tiêu đầu tiên</span>
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                        <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} colorClass="bg-turquoise" title={`Hiện có: ${formatMoney(g.current_amount || 0)}`} />
                      {g.target_amount > 0 && (
                        <p className="text-steel dark:text-light-grey text-[11px] mt-1">Mục tiêu: {formatMoney(g.target_amount)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="frost-card rounded-3xl p-6 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-blueberry dark:text-white font-extrabold">Thu nhập theo danh mục</h3>
              <button onClick={() => setLedgerModal({ title: `Thu nhập theo danh mục — ${labelForCardFilter(globalFilter)}`, txs: filteredTxsForCard(transactions, globalFilter, incomeCardBuckets, 'income') })} title="Xem chi tiết" className="w-7 h-7 rounded-full flex items-center justify-center text-turquoise hover:bg-turquoise/10 transition flex-shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>
            {incomeCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập trong khoảng này.</p> : (
              <CategoryBarChart series={incomeCardSeries} maxVal={incomeCardMax} buckets={incomeCardBuckets} />
            )}
          </div>

          <div className="frost-card rounded-3xl p-6 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-blueberry dark:text-white font-extrabold">Chi tiêu theo danh mục</h3>
              <button onClick={() => setLedgerModal({ title: `Chi tiêu theo danh mục — ${labelForCardFilter(globalFilter)}`, txs: [...filteredTxsForCard(transactions, globalFilter, expenseCardBuckets, 'expense'), ...filteredTxsForCard(transactions, globalFilter, expenseCardBuckets, 'allocation').filter((t) => !isInitialAllocationTx(t))] })} title="Xem chi tiết" className="w-7 h-7 rounded-full flex items-center justify-center text-cotton-candy hover:bg-cotton-candy/10 transition flex-shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>
            {expenseCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu trong khoảng này.</p> : (
              <CategoryBarChart series={expenseCardSeries} maxVal={expenseCardMax} buckets={expenseCardBuckets} />
            )}
          </div>
        </div>
      </div>
  );
}
