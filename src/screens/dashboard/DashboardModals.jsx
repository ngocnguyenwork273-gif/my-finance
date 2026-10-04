/* ==============================================================================
   Các modal của màn Tổng quan: sổ chi tiết, thêm widget, sửa giao dịch.
   ============================================================================== */
import { TxLedgerModal } from '../../components/ledger';
import { EditTransaction } from '../../forms/EditTransaction';
import { X } from '../../icons';

export function DashboardModals({ v }) {
  const { accounts, categories, editingTx, handleDeleteTx, ledgerModal, reload, setEditingTx, setLedgerModal, setShowAddWidget, showAddWidget, spendingPoolByPeriod, transactions } = v;
  return (
    <>
      {ledgerModal && (
        <TxLedgerModal
          title={ledgerModal.title}
          txs={ledgerModal.txs}
          categories={categories}
          accounts={accounts}
          allTx={transactions}
          spendingPoolByPeriod={spendingPoolByPeriod}
          onClose={() => setLedgerModal(null)}
          onDeleteTx={handleDeleteTx}
        />
      )}

      {showAddWidget && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={() => setShowAddWidget(false)}>
          <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-blueberry dark:text-white">Thêm widget</h3>
              <button aria-label="Đóng" onClick={() => setShowAddWidget(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
            </div>
            <p className="text-steel dark:text-light-grey text-sm">Tính năng tuỳ chỉnh widget cho Dashboard đang được xây dựng — bạn sẽ sớm chọn được dữ liệu và nội dung muốn hiển thị ở đây.</p>
          </div>
        </div>
      )}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={() => { reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
