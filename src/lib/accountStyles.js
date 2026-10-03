/* ==============================================================================
   Loại ví và kiểu hiển thị thẻ ví.
   ============================================================================== */

export const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank', label: 'Ngân hàng' },
  { value: 'ewallet', label: 'Ví điện tử' },
  { value: 'gold', label: 'Vàng' },
  { value: 'debt', label: 'Thu nợ' },
  { value: 'other', label: 'Khác' },
];

const ACCOUNT_TYPE_STYLES = {
  cash: 'linear-gradient(135deg, #B4F1F1, #0DBACC)',
  bank: 'linear-gradient(135deg, #C1DDFF, #74ACEF)',
  ewallet: 'linear-gradient(135deg, #E3D6FF, #9F7FE0)',
  gold: 'linear-gradient(135deg, #FFCDDB, #F18AB5)',
  debt: 'linear-gradient(135deg, #F18AB5, #9F7FE0)',
  other: 'linear-gradient(135deg, #BDBDCB, #7E7F90)',
};

export function accountCardGradient(type) { return ACCOUNT_TYPE_STYLES[type] || ACCOUNT_TYPE_STYLES.other; }
