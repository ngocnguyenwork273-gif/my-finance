/* ==============================================================================
   Giao diện Báo cáo trên mobile.
   ============================================================================== */
import { Fragment } from 'react';
import { CustomSelect } from '../../components/inputs';
import { AssetBreakdownDetail, BreakdownDetailList } from '../../components/ledger';
import { HoverDetailCard } from '../../components/ui';
import DateField from '../../DateField';
import { FileText, X } from '../../icons';
import { formatMoney, formatMoneySigned } from '../../lib/format';
import { RemainingBreakdownDetail } from '../ReportParts';
import { ActivityFilterBar, TxDetailRow } from './ReportWidgets';

export function ReportMobile({ v }) {
  const { accumulationBeforeSpend, activityAnchorMobileRef, allocation, allPeriodTxsSorted, assetFundItems, assetGoldItems, assetWalletItems, captureIncomeCardScrollAnchor, customEnd, customStart, expenseBreakdown, expenseDetailItems, expenseFromFund, expenseFromIncome, expenseLedgerTxs, filteredActivityTxs, formatTxDateLabel, formatTxMonthLabel, groupedFilteredTxs, income, incomeCardMobileRef, incomeDetailItems, incomeForSpendingPool, incomeLedgerTxs, isOverSpendingPool, isSameTxMonth, periodLabel, poolIncomeDetailItems, poolIncomeLedgerTxs, remaining, selectedDay, selectedHalf, selectedMonth, selectedQuarter, selectedWeek, selectedYear, setCustomEnd, setCustomStart, setLedgerModal, setScreen, setSelectedDay, setSelectedHalf, setSelectedMonth, setSelectedQuarter, setSelectedWeek, setSelectedYear, setShowExportModal, setTimeType, sortedFilteredTxKeys, specialIncome, spendingPool, theme, timeType, totalActualExpense, totalAssetsEnd, totalRemainingAll } = v;
  return (
    <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <h1 className="text-blueberry dark:text-white text-lg font-bold">Báo cáo</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowExportModal(true)} title="Xuất báo cáo PDF" className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><FileText size={17} className="text-blueberry dark:text-white" /></button>
              <button aria-label="Đóng" onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
            </div>
          </div>
          <div onClickCapture={captureIncomeCardScrollAnchor} onChangeCapture={captureIncomeCardScrollAnchor} className="px-5 mt-2">
            <CustomSelect value={timeType} onChange={(e) => setTimeType(e.target.value)} className="" triggerClassName="w-full frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="quarter">Quý</option>
              <option value="6month">6 tháng</option>
              <option value="year">Năm</option>
              <option value="custom">Tùy chỉnh</option>
            </CustomSelect>
            {timeType === 'day' && <DateField value={selectedDay} onChange={setSelectedDay} className="w-full justify-between mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />}
            {timeType === 'week' && <DateField value={selectedWeek} onChange={setSelectedWeek} className="w-full justify-between mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />}
            {timeType === 'month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m}</option>)}
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === 'quarter' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === '6month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedHalf} onChange={(e) => setSelectedHalf(Number(e.target.value))} className="" triggerClassName="flex-1 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>H1</option><option value={2}>H2</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
              </div>
            )}
            {timeType === 'year' && (
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full mt-2 frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white outline-none" />
            )}
            {timeType === 'custom' && (
              <div className="flex gap-2 mt-2">
                <DateField value={customStart} onChange={setCustomStart} className="flex-1 justify-between frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />
                <DateField value={customEnd} onChange={setCustomEnd} align="right" className="flex-1 justify-between frost-inset rounded-xl px-4 py-2 text-sm text-blueberry dark:text-white" />
              </div>
            )}
          </div>
          <div className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Tổng quan</h2>
            <p className="text-steel dark:text-light-grey text-[11px] mb-2">Chạm vào 1 dòng để xem chi tiết</p>
            <div className="grid grid-cols-1 gap-2">
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<AssetBreakdownDetail wallets={assetWalletItems} funds={assetFundItems} gold={assetGoldItems} total={totalAssetsEnd} />}>
                <span className="text-steel dark:text-light-grey">Tài sản (cuối kỳ)</span><span className="font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Tổng thu nhập" items={incomeDetailItems} total={income} colorClass="text-turquoise" onViewDetail={() => setLedgerModal({ title: `Thu nhập — ${periodLabel}`, txs: incomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập{specialIncome > 0 && <span className="block text-[10px] text-lavender font-semibold">Trong đó, đặc biệt: {formatMoney(specialIncome)}</span>}</span><span className="font-bold text-turquoise">{formatMoney(income)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Thu nhập được chi" items={poolIncomeDetailItems} total={spendingPool} colorClass="text-baby-blue" onViewDetail={() => setLedgerModal({ title: `Thu nhập được chi — ${periodLabel}`, txs: poolIncomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập được chi</span><span className="font-bold text-baby-blue">{formatMoney(spendingPool)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Chi tiêu</span><span className="font-bold text-cotton-candy">{formatMoney(totalActualExpense)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<RemainingBreakdownDetail pool={remaining} funds={assetFundItems} wallets={assetWalletItems} total={totalRemainingAll} />}>
                <span className="text-steel dark:text-light-grey">Còn lại</span><span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</span>
              </HoverDetailCard>
            </div>
          </div>
          <div ref={incomeCardMobileRef} className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-1">Thu nhập đã đi đâu?</h2>
            <p className="text-steel dark:text-light-grey text-[11px] mb-3">Tổng thu nhập → Thu nhập được chi + Thu nhập đặc biệt</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Tổng thu nhập</span><span className="font-bold text-blueberry dark:text-white">{formatMoney(income)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey pl-3">— Thu nhập tính vào Thu nhập được chi</span><span className="font-semibold text-baby-blue">{formatMoney(incomeForSpendingPool)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey pl-3">— Thu nhập đặc biệt</span><span className="font-semibold text-lavender">{formatMoney(specialIncome)}</span></div>
            </div>
            <div className="border-t border-[rgba(126,127,144,0.2)] dark:border-[rgba(189,189,203,0.15)] my-3" />
            <p className="text-steel dark:text-light-grey text-xs font-bold mb-1">Trong Thu nhập được chi ({formatMoney(spendingPool)})</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Nạp quỹ</span><span className="font-bold text-baby-blue">{formatMoney(allocation)}</span></div>
              <div className="flex justify-between"><span>Chi tiêu</span><span className="font-bold text-cotton-candy">{formatMoney(expenseFromIncome)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-bold">Dư sau chi</span><span className={`font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</span></div>
            </div>
            {accumulationBeforeSpend > 0 && (
              <p className="text-xs text-lavender mt-2 font-semibold">Tích lũy trước chi: {formatMoney(accumulationBeforeSpend)}</p>
            )}
            {expenseFromFund > 0 && (
              <p className="text-xs text-steel dark:text-light-grey mt-2">Chi từ tiền đã tích lũy (quỹ): <span className="font-bold text-blueberry dark:text-white">{formatMoney(expenseFromFund)}</span> — không trừ vào Dư sau chi.</p>
            )}
            {isOverSpendingPool && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Đã sử dụng vượt quá Thu nhập được chi của kỳ này.</p>}
          </div>
          <div className="px-5 mt-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Top chi tiêu</h2>
            {expenseBreakdown.slice(0,3).map(c => (
              <div key={c.id} className="flex justify-between py-1"><span>{c.name}</span><span className="font-bold text-cotton-candy">{formatMoney(c.amount)}</span></div>
            ))}
          </div>

          <div data-report-anchor="recent-activity" ref={activityAnchorMobileRef} className="px-5 mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-base">Hoạt động gần đây</h2>
              <ActivityFilterBar v={v} compact />
            </div>
            {filteredActivityTxs.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-4">
                {allPeriodTxsSorted.length === 0 ? 'Không có giao dịch nào trong khoảng thời gian này.' : 'Không có giao dịch nào khớp bộ lọc.'}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedFilteredTxKeys.map((key, i) => (
                  <Fragment key={key}>
                    {!isSameTxMonth(key, sortedFilteredTxKeys[i - 1]) && (
                      <div className="flex items-center gap-2 mt-1 first:mt-0">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-turquoise whitespace-nowrap">{formatTxMonthLabel(key)}</span>
                        <div className="flex-1 h-px bg-[rgba(189,189,203,0.25)]" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-steel dark:text-light-grey mb-1">{formatTxDateLabel(key)}</p>
                      <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                        {groupedFilteredTxs[key].map((tx) => <TxDetailRow v={v} key={tx.id} tx={tx} />)}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
