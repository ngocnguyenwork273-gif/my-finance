/* ==============================================================================
   Toàn bộ state, dữ liệu dẫn xuất và hành động của màn chi tiết Quỹ. Component trình bày (FundDetailMobile/FundDetailDesktop/FundDetailModals) chỉ việc đọc kết quả.
   ============================================================================== */
import { useState } from 'react';
import { useAppData } from '../../context';
import { confirmDialog, toast } from '../../feedback';
import { compareTxTime, findInitialAllocation, firstProfitCreditDate, fundBalance, fundBalanceAtDate, fundBalanceWithProfit, fundDailyProfitHistory } from '../../lib/finance';
import { txDeleteDescription } from '../../lib/format';

export function useFundDetailView({ category, onBack }) {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { transactions, categories, reload, softDelete, spendingPoolByPeriod } = useAppData();
  const [filter, setFilter] = useState('all');
  const [showEdit, setShowEdit] = useState(false);
  const [quickMode, setQuickMode] = useState(null);
  // FIX: sửa 1 dòng nạp/rút quỹ (không phải "ban đầu") ngay từ Lịch sử -> mở đúng popup
  // Nạp/Rút quỹ (QuickAllocateWithdrawForm) ở chế độ sửa, KHÔNG mở form Sửa giao dịch chung
  // chung như trước (dễ gây nhầm lẫn vì form đó có nhiều lựa chọn không liên quan tới quỹ).
  const [editingQuickTx, setEditingQuickTx] = useState(null);
  // FIX: bộ lọc khoảng thời gian cho Lịch sử quỹ (áp dụng cho cả bản mobile lẫn desktop)
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const hasHistoryDateFilter = historyDateFrom || historyDateTo;

  async function handleDeleteTx(tx) {
    if (!(await confirmDialog('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload();
  }

  // Lấy tất cả giao dịch nạp/rút, sắp xếp theo thời gian tăng dần
  const allHistory = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => compareTxTime(a, b));

  // FIX: xác định "khoản nạp ban đầu" qua cờ is_initial, không suy luận theo ngày sớm nhất
  const firstAllocation = findInitialAllocation(transactions, category.id);
  const initialAmount = firstAllocation ? Number(firstAllocation.amount) : 0;

  // Lịch sử lợi nhuận hàng ngày (mỗi ngày 1 dòng, đã làm tròn xuống)
  const dailyProfitHistory = fundDailyProfitHistory(category, transactions);

  // Ngày nhận lợi nhuận kỳ đầu tiên, tính theo ngày nạp tiền đầu tiên của quỹ (quy tắc Túi Thần Tài)
  const firstDepositDate = firstAllocation ? new Date(firstAllocation.date || firstAllocation.created_at) : null;
  const firstCreditDate = firstDepositDate ? firstProfitCreditDate(firstDepositDate) : null;

  // Kết hợp tất cả: giao dịch nạp/rút + lợi nhuận, sắp xếp theo thời gian tăng dần.
  // Riêng cho danh sách gộp "Tất cả": vẫn bỏ qua ngày lãi = 0đ để đỡ rác màn hình
  // (tab "Lợi nhuận" riêng ở dailyProfitHistory thì hiện đủ mọi ngày, không ẩn).
  const combinedHistory = [
    // FIX: tính sẵn "số dư sau giao dịch" (balanceAfter) cho từng dòng nạp/rút, dùng chung
    // hàm fundBalanceAtDate() đã có sẵn trong app (đúng logic cộng dồn lãi suất, đang được
    // dùng ở sổ giao dịch/ledger) — trước đây chỉ dòng "Lợi nhuận" mới có balanceAfter nên
    // các dòng Nạp/Rút quỹ không hiện dòng "Số dư: ..." như thiết kế.
    ...allHistory.map(tx => ({ ...tx, type: tx.type, isProfit: false, balanceAfter: fundBalanceAtDate(category, transactions, historyItemDate(tx), tx) })),
    ...dailyProfitHistory.filter(d => d.profit > 0).map(d => {
      // Những ngày lợi nhuận trước "kỳ đầu tiên" đều dồn hiển thị vào đúng firstCreditDate;
      // từ firstCreditDate trở đi, lợi nhuận ngày D hiển thị vào ngày D+1 như bình thường
      const dDay = new Date(d.date); dDay.setHours(0, 0, 0, 0);
      let displayDate;
      if (firstCreditDate && dDay < firstCreditDate) {
        displayDate = new Date(firstCreditDate);
      } else {
        displayDate = new Date(d.date);
        displayDate.setDate(displayDate.getDate() + 1);
      }
      displayDate.setHours(0, 27, 30, 0);
      return {
        id: `profit-${d.date.getTime()}`,
        type: 'profit',
        isProfit: true,
        amount: d.profit,
        date: d.date.toISOString(),
        created_at: displayDate.toISOString(),
        balanceAfter: d.balance,
        note: `Lợi nhuận ngày ${d.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`,
        displayDate: displayDate,
      };
    })
    // Chỉ hiển thị dòng lợi nhuận khi thời điểm thực tế đã tới đúng ngày credit (displayDate),
    // tránh việc dòng lợi nhuận bị "lộ" sớm 1-nhiều ngày trước khi thực sự được ghi nhận
    .filter(d => d.displayDate <= new Date())
  ].sort((a, b) => {
    // Sắp theo đúng NGÀY nghiệp vụ (từ "date", không phải created_at — created_at có thể
    // khác ngày nghiệp vụ nếu nhập bù/chỉnh sửa sau), nhưng vẫn ưu tiên GIỜ từ created_at
    // để các dòng cùng ngày sắp đúng theo giờ người dùng đã chọn (xem historyItemDate).
    // FIX: nếu historyItemDate() ra bằng nhau tuyệt đối (2 giao dịch trùng cả ngày lẫn
    // giờ:phút:giây trong created_at), phá tie cuối cùng bằng "seq" (bigserial ở DB, không
    // bao giờ trùng) để thứ tự luôn nhất quán, không phụ thuộc thứ tự ngẫu nhiên DB trả về.
    const diff = historyItemDate(a) - historyItemDate(b);
    if (diff !== 0) return diff;
    return (a.seq || 0) - (b.seq || 0);
  });

  // Lọc theo filter
  const filteredHistory = filter === 'all' ? combinedHistory :
    filter === 'profit' ? combinedHistory.filter(item => item.isProfit) :
    combinedHistory.filter(item => item.type === filter && !item.isProfit);

  // Ngày/giờ "thực" của 1 dòng lịch sử. Lợi nhuận luôn dùng "created_at" (đã được set = ngày
  // credit). Giao dịch thường: NGÀY lấy từ "date" (ngày nghiệp vụ), còn GIỜ lấy từ
  // "created_at" — vì "date" chỉ lưu ngày thuần "YYYY-MM-DD" (không có giờ), nếu dùng thẳng
  // để tính giờ thì new Date("YYYY-MM-DD") bị hiểu là 00:00 UTC, hiển thị ra giờ Việt Nam
  // (UTC+7) sẽ luôn lệch thành 07:00 bất kể giờ thật đã lưu là mấy giờ.
  function historyItemDate(item) {
    if (item.isProfit) return new Date(item.created_at);
    if (item.date && item.created_at) {
      const dayPart = String(item.date).slice(0, 10);
      const timeD = new Date(item.created_at);
      if (!isNaN(timeD)) {
        const hh = String(timeD.getHours()).padStart(2, '0');
        const mm = String(timeD.getMinutes()).padStart(2, '0');
        const ss = String(timeD.getSeconds()).padStart(2, '0');
        const combined = new Date(`${dayPart}T${hh}:${mm}:${ss}`);
        if (!isNaN(combined)) return combined;
      }
    }
    return new Date(item.date || item.created_at);
  }

  // Lọc theo khoảng ngày do người dùng chọn (nếu có)
  const dateFilteredHistory = !hasHistoryDateFilter ? filteredHistory : filteredHistory.filter((item) => {
    const d = historyItemDate(item);
    if (historyDateFrom && d < new Date(historyDateFrom + 'T00:00:00')) return false;
    if (historyDateTo && d > new Date(historyDateTo + 'T23:59:59')) return false;
    return true;
  });

  // Đảo ngược để hiển thị mới nhất lên đầu
  const displayHistory = [...dateFilteredHistory].reverse();

  const balance = fundBalanceWithProfit(category, transactions);
  const principalBalance = fundBalance(category.id, transactions);
  const accruedProfit = Math.max(0, balance - principalBalance);
  const totalIn = allHistory.filter((t) => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = allHistory.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const rate = Number(category.interest_rate || 0);
  const dailyProfit = balance > 0 ? balance * (rate / 100) / 365 : 0;
  const target = Number(category.target_amount || 0);
  const targetPct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;

  async function handleDelete() {
    if (!(await confirmDialog('Xóa quỹ này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.', { title: 'Xác nhận xóa', confirmText: 'Xóa', danger: true }))) return;
    const { error } = await softDelete('categories', category.id, `Xoá danh mục "${category.name}"`, 'delete_category');
    if (error) { toast('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  // Format thời gian cho hiển thị
  const formatDisplayTime = (item) => {
    if (item.isProfit) {
      // Lợi nhuận hiển thị với giờ 00:27:30 của ngày hôm sau
      const d = new Date(item.displayDate || item.created_at);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return new Date(item.created_at || item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Remove outer wrapper with padding

  // Mọi thứ các component trình bày bên dưới cần dùng
  return {
    accruedProfit, balance, categories, category, dailyProfit, dailyProfitHistory,
    displayHistory, editingQuickTx, filter, firstAllocation, formatDisplayTime, handleDelete,
    handleDeleteTx, hasHistoryDateFilter, historyDateFrom, historyDateTo, historyItemDate, initialAmount,
    onBack, quickMode, rate, reload, setEditingQuickTx, setFilter,
    setHistoryDateFrom, setHistoryDateTo, setQuickMode, setShowEdit, showEdit, spendingPoolByPeriod,
    target, targetPct, totalIn, totalOut, transactions,
  };
}
