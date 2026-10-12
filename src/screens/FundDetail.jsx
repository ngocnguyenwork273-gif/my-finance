/* ==============================================================================
   Màn FundDetail: chỉ ghép hook logic + các component trình bày (xem thư mục screens/fundDetail/).
   ============================================================================== */
import { FundDetailDesktop } from './fundDetail/FundDetailDesktop';
import { FundDetailMobile } from './fundDetail/FundDetailMobile';
import { FundDetailModals } from './fundDetail/FundDetailModals';
import { useFundDetailView } from './fundDetail/useFundDetailView';

export function FundDetail(props) {
  const v = useFundDetailView(props);
  return (
    <>
      <FundDetailMobile v={v} />
      <FundDetailDesktop v={v} />
      <FundDetailModals v={v} />
    </>
  );
}
