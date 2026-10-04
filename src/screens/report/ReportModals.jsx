/* ==============================================================================
   Các modal của màn Báo cáo: sổ chi tiết, xuất báo cáo, sửa giao dịch.
   ============================================================================== */
import { TxLedgerModal } from '../../components/ledger';
import { EditTransaction } from '../../forms/EditTransaction';
import { ReportExportModal } from '../ReportExport';

export function ReportModals({ v }) {
  const { accounts, categories, editingTx, handleDeleteTx, ledgerModal, reload, setEditingTx, setLedgerModal, setShowExportModal, showExportModal, spendingPoolByPeriod, transactions } = v;
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
      {showExportModal && (
        <ReportExportModal onClose={() => setShowExportModal(false)} transactions={transactions} categories={categories} accounts={accounts} spendingPoolByPeriod={spendingPoolByPeriod} />
      )}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={() => { reload && reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}
