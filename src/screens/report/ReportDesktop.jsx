/* ==============================================================================
   Giao diện Báo cáo trên desktop.
   ============================================================================== */
import { Fragment } from 'react';
import { CustomSelect } from '../../components/inputs';
import { AssetBreakdownDetail, BreakdownDetailList } from '../../components/ledger';
import { HoverDetailCard, ProgressBar } from '../../components/ui';
import DateField from '../../DateField';
import { FileText, X } from '../../icons';
import { displayTxNote } from '../../lib/finance';
import { formatMoney, formatMoneySigned } from '../../lib/format';
import { MonthlyTrendChart, RemainingBreakdownDetail } from '../ReportParts';
import { ActivityFilterBar, DonutChart, TxDetailRow } from './ReportWidgets';

export function ReportDesktop({ v }) {
  const { accumulationBeforeSpend, activityAnchorDesktopRef, agg, allocation, allPeriodTxsSorted, assetChange, assetFundItems, assetGoldItems, assetWalletItems, captureIncomeCardScrollAnchor, customEnd, customStart, drilldownCategory, drilldownTransactions, expenseBreakdown, expenseDetailItems, expenseFromFund, expenseFromIncome, expenseLedgerTxs, filteredActivityTxs, formatTxDateLabel, formatTxMonthLabel, fundData, goals, groupedFilteredTxs, income, incomeBreakdown, incomeCardDesktopRef, incomeDetailItems, incomeForSpendingPool, incomeLedgerTxs, insights, isOverSpendingPool, isPeriodOngoing, isSameTxMonth, openDrilldown, openFund, periodLabel, poolIncomeDetailItems, poolIncomeLedgerTxs, prevAgg, remaining, selectedDay, selectedHalf, selectedMonth, selectedQuarter, selectedWeek, selectedYear, setCustomEnd, setCustomStart, setLedgerModal, setScreen, setSelectedDay, setSelectedHalf, setSelectedMonth, setSelectedQuarter, setSelectedWeek, setSelectedYear, setShowDrilldown, setShowExportModal, setTimeType, showDrilldown, sortedFilteredTxKeys, specialIncome, spendingPool, timeType, totalActualExpense, totalAssetsEnd, totalAssetsStart, totalContributedAllFunds, totalRemainingAll, trendData, yearSummary } = v;
  return (
    <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-[600px] -left-10" />
        <div className="relative flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Báo cáo &amp; Phân tích</h1>
            <button onClick={() => setShowExportModal(true)} className="frost-inset rounded-full text-sm font-bold px-4 py-2 flex items-center gap-2 text-blueberry dark:text-white"><FileText size={15} className="text-turquoise" /> Xuất PDF</button>
          </div>
          <div onClickCapture={captureIncomeCardScrollAnchor} onChangeCapture={captureIncomeCardScrollAnchor} className="flex items-center gap-2 flex-wrap">
            <CustomSelect value={timeType} onChange={(e) => setTimeType(e.target.value)} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="quarter">Quý</option>
              <option value="6month">6 tháng</option>
              <option value="year">Năm</option>
              <option value="custom">Tùy chỉnh</option>
            </CustomSelect>
            {timeType === 'day' && <DateField value={selectedDay} onChange={setSelectedDay} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />}
            {timeType === 'week' && <DateField value={selectedWeek} onChange={setSelectedWeek} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />}
            {timeType === 'month' && (
              <>
                <CustomSelect value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m}</option>)}
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === 'quarter' && (
              <>
                <CustomSelect value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === '6month' && (
              <>
                <CustomSelect value={selectedHalf} onChange={(e) => setSelectedHalf(Number(e.target.value))} className="" triggerClassName="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>H1</option><option value={2}>H2</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
              </>
            )}
            {timeType === 'year' && (
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="frost-inset rounded-full text-sm font-bold px-4 py-2 outline-none text-blueberry dark:text-white w-24" />
            )}
            {timeType === 'custom' && (
              <>
                <DateField value={customStart} onChange={setCustomStart} className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />
                <DateField value={customEnd} onChange={setCustomEnd} align="right" className="frost-inset rounded-full text-sm font-bold px-4 py-2 text-blueberry dark:text-white" />
              </>
            )}
          </div>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-2">Tổng kết {periodLabel}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div><p className="text-steel dark:text-light-grey text-sm">Thu nhập</p><p className="text-xl font-bold text-turquoise">{formatMoney(income)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Góp quỹ</p><p className="text-xl font-bold text-baby-blue">{formatMoney(allocation)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Chi tiêu</p><p className="text-xl font-bold text-cotton-candy">{formatMoney(totalActualExpense)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Tài sản đầu kỳ</p><p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsStart)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Tài sản cuối kỳ</p><p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</p></div>
          </div>
          {assetChange !== null && (
            <p className={`text-sm mt-2 ${assetChange >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>
              {assetChange >= 0 ? '▲' : '▼'} {Math.abs(Math.round(assetChange))}% so với đầu kỳ
            </p>
          )}
          {isPeriodOngoing && (
            <p className="text-steel dark:text-light-grey text-xs mt-1">Kỳ chưa kết thúc — Tài sản cuối kỳ đang tính đến hôm nay. Tài sản đầu kỳ chốt cuối ngày liền trước kỳ (bằng cuối kỳ trước).</p>
          )}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-6 mb-6">
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<AssetBreakdownDetail wallets={assetWalletItems} funds={assetFundItems} gold={assetGoldItems} total={totalAssetsEnd} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Tổng tài sản</p>
            <p className="text-blueberry dark:text-white text-2xl font-bold">{formatMoney(totalAssetsEnd)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Tổng thu nhập" items={incomeDetailItems} total={income} colorClass="text-turquoise" onViewDetail={() => setLedgerModal({ title: `Thu nhập — ${periodLabel}`, txs: incomeLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Thu nhập</p>
            <p className="text-turquoise text-2xl font-bold">{formatMoney(income)}</p>
            {specialIncome > 0 && (
              <p className="text-lavender text-[11px] font-semibold mt-1">Trong đó, đặc biệt: {formatMoney(specialIncome)}</p>
            )}
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Thu nhập được chi" items={poolIncomeDetailItems} total={spendingPool} colorClass="text-baby-blue" onViewDetail={() => setLedgerModal({ title: `Thu nhập được chi — ${periodLabel}`, txs: poolIncomeLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Thu nhập được chi</p>
            <p className="text-baby-blue text-2xl font-bold">{formatMoney(spendingPool)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Chi tiêu</p>
            <p className="text-cotton-candy text-2xl font-bold">{formatMoney(totalActualExpense)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            align="right"
            detail={<RemainingBreakdownDetail pool={remaining} funds={assetFundItems} wallets={assetWalletItems} total={totalRemainingAll} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Còn lại</p>
            <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p>
          </HoverDetailCard>
        </div>

 <div ref={incomeCardDesktopRef} className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Thu nhập đã đi đâu?</h2>
          <p className="text-steel dark:text-light-grey text-xs font-semibold mb-4">Tổng thu nhập → Thu nhập được chi + Thu nhập đặc biệt (không tự động tăng Thu nhập được chi)</p>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-steel dark:text-light-grey">Tổng thu nhập</span>
                  <span className="font-bold text-blueberry dark:text-white">{formatMoney(income)}</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-steel dark:text-light-grey">— Thu nhập tính vào Thu nhập được chi</span>
                  <span className="font-semibold text-baby-blue">{formatMoney(incomeForSpendingPool)}</span>
                </div>
                <div className="flex justify-between pl-3">
                  <span className="text-steel dark:text-light-grey">— Thu nhập đặc biệt</span>
                  <span className="font-semibold text-lavender">{formatMoney(specialIncome)}</span>
                </div>
                {accumulationBeforeSpend > 0 && (
                  <div className="flex justify-between pl-3">
                    <span className="text-steel dark:text-light-grey">— Tích lũy trước chi</span>
                    <span className="font-semibold text-lavender">{formatMoney(accumulationBeforeSpend)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-[rgba(126,127,144,0.2)] dark:border-[rgba(189,189,203,0.15)] my-4" />
              <p className="text-steel dark:text-light-grey text-xs font-bold mb-2">Trong Thu nhập được chi ({formatMoney(spendingPool)})</p>
              <div className="space-y-2">
                <button onClick={() => setScreen('funds')} className="w-full flex justify-between text-left hover:opacity-70 transition">
                  <span className="text-steel dark:text-light-grey">Nạp quỹ</span>
                  <span className="font-bold text-baby-blue">{formatMoney(allocation)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((allocation/spendingPool)*100)}%)</span>}</span>
                </button>
                <div className="flex justify-between">
                  <span className="text-steel dark:text-light-grey">Chi tiêu</span>
                  <span className="font-bold text-cotton-candy">{formatMoney(expenseFromIncome)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((expenseFromIncome/spendingPool)*100)}%)</span>}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Dư sau chi</span>
                  <span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)} {spendingPool > 0 && <span className="text-xs font-semibold">({Math.round((remaining/spendingPool)*100)}%)</span>}</span>
                </div>
              </div>
              {expenseFromFund > 0 && (
                <p className="text-xs text-steel dark:text-light-grey mt-3">Chi tiêu từ tiền đã tích lũy (quỹ): <span className="font-bold text-blueberry dark:text-white">{formatMoney(expenseFromFund)}</span> — không trừ vào Dư sau chi ở trên.</p>
              )}
            </div>
            <div className="flex-1">
              <DonutChart total={spendingPool} data={[
                { label: 'Nạp quỹ', value: allocation, color: '#74ACEF' },
                { label: 'Chi tiêu', value: expenseFromIncome, color: '#F18AB5' },
                { label: 'Dư sau chi', value: Math.max(0, remaining), color: '#0DBACC' }
              ]} />
              {isOverSpendingPool && <p className="text-cotton-candy text-xs mt-2 text-center">⚠️ Đã sử dụng vượt quá Thu nhập được chi của kỳ này.</p>}
            </div>
          </div>
        </div>

 {/* Thu nhập theo danh mục & Chi tiêu theo danh mục — đặt ngang hàng nhau (grid 2 cột
            trên desktop, xếp dọc trên màn hẹp) thay vì tách rời như trước. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="frost-card rounded-3xl p-6 min-w-0">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Thu nhập theo danh mục</h2>
            {incomeBreakdown.length === 0 ? <p className="text-steel dark:text-light-grey">Không có thu nhập.</p> : (
              <div className="grid grid-cols-2 gap-2">
                {incomeBreakdown.map(c => (
                  <button key={c.id} onClick={() => openDrilldown(c.id, 'income')} className="flex justify-between frost-inset rounded-xl px-4 py-2 text-left hover:bg-turquoise/10 transition">
                    <span>{c.icon} {c.name}</span>
                    <span className="font-bold text-turquoise">{formatMoney(c.amount)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="frost-card rounded-3xl p-6 min-w-0">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Chi tiêu theo danh mục</h2>
            {expenseBreakdown.length === 0 ? <p className="text-steel dark:text-light-grey">Không có chi tiêu.</p> : (
              <div className="grid grid-cols-1 gap-3">
                {expenseBreakdown.map(c => {
                  const total = c.fromIncome + c.fromWallet;
                  const nonFundTotal = expenseFromIncome + agg.expenseFromWallet;
                  const pct = nonFundTotal > 0 ? Math.round((total / nonFundTotal) * 100) : 0;
                  return (
                    <button key={c.id} onClick={() => openDrilldown(c.id)} className="frost-inset rounded-xl px-4 py-3 text-left hover:bg-turquoise/10 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-blueberry dark:text-white">{c.icon} {c.name}</span>
                        <span className="font-bold text-cotton-candy">{formatMoney(total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-light-grey/30 rounded-full mt-1">
                        <div className="h-full bg-cotton-candy rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-steel dark:text-light-grey mt-1">
                        <span>{pct}%</span>
                        <span>{c.fromIncome > 0 ? `Từ thu nhập: ${formatMoney(c.fromIncome)}` : ''}</span>
                        <span>{c.fromWallet > 0 ? `Từ ví: ${formatMoney(c.fromWallet)}` : ''}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Hoạt động quỹ</h2>
          {fundData.length === 0 ? <p className="text-steel dark:text-light-grey">Không có hoạt động quỹ.</p> : (
            <>
              <div className="space-y-3">
                {fundData.slice(0,5).map(f => (
                  <button key={f.id} onClick={() => openFund(f.id, 'report')} className="w-full flex items-center justify-between border-b last:border-0 py-2 text-left hover:bg-turquoise/5 transition rounded-lg px-1">
                    <div><p className="font-bold text-blueberry dark:text-white">{f.icon} {f.name}</p><p className="text-xs text-steel dark:text-light-grey">Số dư hiện tại: {formatMoney(f.balanceNow)}</p></div>
                    <div className="text-right">
                      {f.contributed > 0 && <p className="text-sm text-turquoise">+{formatMoney(f.contributed)} {totalContributedAllFunds > 0 && <span className="text-xs font-semibold">({Math.round((f.contributed/totalContributedAllFunds)*100)}%)</span>}</p>}
                      {f.withdrawn > 0 && <p className="text-sm text-cotton-candy">-{formatMoney(f.withdrawn)}</p>}
                      {f.target > 0 && <p className="text-xs text-steel dark:text-light-grey">{Math.round(f.progress)}% mục tiêu</p>}
                    </div>
                  </button>
                ))}
                {fundData.length > 5 && (
                  <button onClick={() => setScreen('funds')} className="text-turquoise text-sm font-semibold hover:underline">
                    Xem thêm {fundData.length - 5} quỹ khác
                  </button>
                )}
              </div>
            </>
          )}
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Chi tiêu từ tiền đã tích lũy</h2>
          <p className="text-steel dark:text-light-grey text-xs font-semibold mb-4">Đây là các khoản chi sử dụng tiền đã tích lũy trong quỹ — không tính vào "Còn lại từ thu nhập"</p>
          {fundData.filter(f => f.withdrawn > 0).length === 0 ? (
            <p className="text-steel dark:text-light-grey">Không có khoản chi nào từ quỹ trong kỳ.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fundData.filter(f => f.withdrawn > 0).map(f => {
                const pct = expenseFromFund > 0 ? Math.round((f.withdrawn / expenseFromFund) * 100) : 0;
                return (
                  <button key={f.id} onClick={() => openDrilldown(f.id, 'expense')} className="frost-inset rounded-xl px-4 py-3 text-left hover:bg-cotton-candy/10 transition">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blueberry dark:text-white">{f.icon} Quỹ {f.name}</span>
                      <span className="font-bold text-cotton-candy">{formatMoney(f.withdrawn)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-light-grey/30 rounded-full mt-1">
                      <div className="h-full bg-cotton-candy rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-steel dark:text-light-grey mt-1">{pct}% tổng chi từ quỹ</p>
                  </button>
                );
              })}
              <div className="md:col-span-2 flex justify-between border-t pt-3 mt-1">
                <span className="font-bold text-blueberry dark:text-white">Tổng chi từ quỹ</span>
                <span className="font-bold text-cotton-candy">{formatMoney(expenseFromFund)}</span>
              </div>
            </div>
          )}
        </div>

        {yearSummary && (
 <div className="frost-card rounded-3xl p-6 mb-6">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Tổng kết năm {selectedYear}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div><p className="text-steel dark:text-light-grey text-sm">Tổng thu nhập năm</p><p className="text-lg font-bold text-turquoise">{formatMoney(income)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Đã nạp quỹ năm</p><p className="text-lg font-bold text-baby-blue">{formatMoney(allocation)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Đã chi từ thu nhập</p><p className="text-lg font-bold text-cotton-candy">{formatMoney(expenseFromIncome)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Còn lại từ thu nhập</p><p className={`text-lg font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p></div>
              <div><p className="text-steel dark:text-light-grey text-sm">Tổng chi từ quỹ</p><p className="text-lg font-bold text-cotton-candy">{formatMoney(expenseFromFund)}</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {yearSummary.topIncomeMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng thu nhập cao nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topIncomeMonth.label} — {formatMoney(yearSummary.topIncomeMonth.income)}</p></div>}
              {yearSummary.topAllocationMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng nạp quỹ nhiều nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topAllocationMonth.label} — {formatMoney(yearSummary.topAllocationMonth.allocation)}</p></div>}
              {yearSummary.topExpenseMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng chi tiêu cao nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topExpenseMonth.label} — {formatMoney(yearSummary.topExpenseMonth.totalActualExpense)}</p></div>}
              {yearSummary.topRemainingMonth && <div className="frost-inset rounded-xl px-4 py-3"><p className="text-xs text-steel dark:text-light-grey">Tháng còn lại nhiều nhất</p><p className="font-bold text-blueberry dark:text-white">{yearSummary.topRemainingMonth.label} — {formatMoney(yearSummary.topRemainingMonth.remaining)}</p></div>}
            </div>
          </div>
        )}

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">So với kỳ trước</h2>
          <div className="grid grid-cols-4 gap-4">
            <div><p className="text-steel dark:text-light-grey text-sm">Thu nhập</p><p className="text-xl font-bold">{formatMoney(income)}</p>
              {prevAgg.income > 0 && <span className={`text-xs ${income >= prevAgg.income ? 'text-turquoise' : 'text-cotton-candy'}`}>{income >= prevAgg.income ? '▲' : '▼'} {Math.abs(Math.round(((income - prevAgg.income)/prevAgg.income)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Góp quỹ</p><p className="text-xl font-bold">{formatMoney(allocation)}</p>
              {prevAgg.allocation > 0 && <span className={`text-xs ${allocation >= prevAgg.allocation ? 'text-turquoise' : 'text-cotton-candy'}`}>{allocation >= prevAgg.allocation ? '▲' : '▼'} {Math.abs(Math.round(((allocation - prevAgg.allocation)/prevAgg.allocation)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Chi tiêu</p><p className="text-xl font-bold">{formatMoney(totalActualExpense)}</p>
              {prevAgg.totalActualExpense > 0 && <span className={`text-xs ${totalActualExpense <= prevAgg.totalActualExpense ? 'text-turquoise' : 'text-cotton-candy'}`}>{totalActualExpense <= prevAgg.totalActualExpense ? '▼' : '▲'} {Math.abs(Math.round(((totalActualExpense - prevAgg.totalActualExpense)/prevAgg.totalActualExpense)*100))}%</span>}
            </div>
            <div><p className="text-steel dark:text-light-grey text-sm">Còn lại</p><p className={`text-xl font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p>
              {prevAgg.remaining > 0 && <span className={`text-xs ${remaining >= prevAgg.remaining ? 'text-turquoise' : 'text-cotton-candy'}`}>{remaining >= prevAgg.remaining ? '▲' : '▼'} {Math.abs(Math.round(((remaining - prevAgg.remaining)/prevAgg.remaining)*100))}%</span>}
            </div>
          </div>
        </div>

        {(timeType === 'year' || timeType === 'quarter' || timeType === '6month') && trendData.length > 0 && (
 <div className="frost-card rounded-3xl p-6 mb-6">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Xu hướng theo tháng</h2>
            <MonthlyTrendChart trendData={trendData} />
          </div>
        )}

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Mục tiêu tài chính</h2>
          {goals.length === 0 ? <p className="text-steel dark:text-light-grey">Chưa có mục tiêu.</p> : (
            <div className="space-y-3">
              {goals.slice(0,5).map(g => {
                const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between"><span className="font-bold text-blueberry dark:text-white">{g.name}</span><span className="text-steel dark:text-light-grey">{Math.round(pct)}%</span></div>
                    <ProgressBar pct={pct} colorClass={g.status === 'Hoàn thành' ? 'bg-turquoise' : 'bg-baby-blue'} />
                    <div className="flex justify-between text-xs text-steel dark:text-light-grey mt-1">
                      <span>{formatMoney(g.current_amount || 0)} / {formatMoney(g.target_amount || 0)}</span>
                      <span>Còn thiếu {formatMoney(Math.max(0, (g.target_amount||0) - (g.current_amount||0)))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Nhận xét {periodLabel}</h2>
          {insights.length === 0 ? <p className="text-steel dark:text-light-grey">Chưa có nhận xét.</p> : (
            <div className="grid grid-cols-2 gap-4">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 frost-inset rounded-xl p-4">
                  <ins.icon size={20} className={`${ins.color} flex-shrink-0`} />
                  <div><p className="font-bold text-blueberry dark:text-white">{ins.title}</p><p className="text-steel dark:text-light-grey text-sm">{ins.desc}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

 <div data-report-anchor="recent-activity" ref={activityAnchorDesktopRef} className="frost-card rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
            <span className="text-steel dark:text-light-grey text-xs font-semibold">{periodLabel} · {filteredActivityTxs.length} giao dịch</span>
          </div>
          <ActivityFilterBar v={v} />
          {filteredActivityTxs.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-6">
              {allPeriodTxsSorted.length === 0 ? 'Không có giao dịch nào trong khoảng thời gian này.' : 'Không có giao dịch nào khớp bộ lọc.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-1">
              {sortedFilteredTxKeys.map((key, i) => (
                <Fragment key={key}>
                  {!isSameTxMonth(key, sortedFilteredTxKeys[i - 1]) && (
                    <div className="flex items-center gap-2 mt-1 first:mt-0">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-turquoise whitespace-nowrap">{formatTxMonthLabel(key)}</span>
                      <div className="flex-1 h-px bg-[rgba(189,189,203,0.25)]" />
                    </div>
                  )}
                <div>
                  <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatTxDateLabel(key)}</p>
                  <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                    {groupedFilteredTxs[key].map((tx) => <TxDetailRow v={v} key={tx.id} tx={tx} />)}
                  </div>
                </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {showDrilldown && drilldownCategory && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDrilldown(false)}>
 <div className="frost-card w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blueberry dark:text-white">Chi tiết "{drilldownCategory.name}"</h3>
                <button aria-label="Đóng" onClick={() => setShowDrilldown(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
              </div>
              {drilldownTransactions.length === 0 ? <p className="text-steel dark:text-light-grey">Không có giao dịch.</p> : (
                <div className="space-y-2">
                  {drilldownTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between border-b py-2">
                      <div>
                        <p className="text-sm text-blueberry dark:text-white">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</p>
                        <p className="text-xs text-steel dark:text-light-grey">{displayTxNote(tx.note) || 'Không có ghi chú'}</p>
                      </div>
                      <span className="font-bold text-cotton-candy">{formatMoney(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}
