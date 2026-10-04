/* ==============================================================================
   Màn Report: chỉ ghép hook logic + các component trình bày (xem thư mục screens/report/).
   ============================================================================== */
import { ReportDesktop } from './report/ReportDesktop';
import { ReportMobile } from './report/ReportMobile';
import { ReportModals } from './report/ReportModals';
import { useReportView } from './report/useReportView';

export function Report() {
  const v = useReportView();
  return (
    <>
      <ReportMobile v={v} />
      <ReportDesktop v={v} />
      <ReportModals v={v} />
    </>
  );
}
