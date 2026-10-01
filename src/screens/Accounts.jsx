/* ==============================================================================
   Màn danh sách Ví.
   ============================================================================== */
import { useState } from 'react';
import { EmojiCircle } from '../components/ui';
import { useAppData, useShell } from '../context';
import { EditAccountModal } from '../forms/EditAccountModal';
import { ArrowLeft, Plus, Wifi } from '../icons';
import { ACCOUNT_TYPES, accountCardGradient } from '../lib/accountStyles';
import { accountBalance } from '../lib/finance';
import { formatMoney } from '../lib/format';

export function Accounts() {
  // Lấy state dùng chung từ Context (không nhận qua props nữa)
  const { setScreen, theme } = useShell();
  const { accounts, transactions, onOpenAccount, reload } = useAppData();
  const [showCreate, setShowCreate] = useState(false);
  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalExcludingGold = accounts.filter((a) => a.type !== 'gold').reduce((s, a) => s + accountBalance(a, transactions), 0);

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-page'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
              <h1 className="text-blueberry dark:text-white text-lg font-bold">Quản lý ví</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full frost-inset flex items-center justify-center"><Plus size={18} className="text-turquoise" /></button>
          </div>
          <div className="px-5 mt-4 text-center">
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Tổng tất cả tài khoản</p>
            <p className="text-blueberry dark:text-white text-3xl font-bold">{formatMoney(totalBalance)}</p>
            <p className="text-steel dark:text-light-grey text-xs font-semibold mt-1">Tổng tất cả trừ vàng: {formatMoney(totalExcludingGold)}</p>
          </div>
          <div className="mt-6 px-5 pt-6 pb-6">
            {accounts.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-10">Chưa có ví nào. Bấm + để thêm ví đầu tiên.</p> : (
              <div className="flex flex-col gap-4 scrollbar-hide">
                {accounts.map((acc) => {
                  const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onOpenAccount(acc.id, 'accounts')}
                      style={{ background: accountCardGradient(acc.type) }}
                      className="w-full text-left rounded-[1.75rem] p-5 relative overflow-hidden shadow-lg shadow-black/10"
                    >
                      <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15" />
                      <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-black/10" />

                      <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-6 rounded-md bg-white/35 border border-white/40" />
                          <EmojiCircle emoji={acc.icon} size={30} bg="rgba(255,255,255,0.16)" />
                        </div>
                        <Wifi size={20} className="text-white/85 rotate-90" />
                      </div>

                      <p className="relative text-white/90 font-bold text-base sm:text-lg tracking-[0.2em] mt-5">•••• •••• •••• {maskedDigits}</p>

                      <div className="relative flex items-end justify-between mt-4 gap-2">
                        <div className="min-w-0">
                          <p className="text-white/70 text-[10px] font-semibold uppercase truncate">{acc.name}</p>
                          <p className="text-white font-extrabold text-xl mt-0.5 truncate">{formatMoney(accountBalance(acc, transactions))}</p>
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
          </div>
        </div>
      </div>

      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-cotton-candy-light/70 dark:bg-cotton-candy/22 top-96 -left-10" />
        <div className="relative flex items-center justify-between mb-2">
          <div>
            <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Quản lý ví</h1>
            <p className="text-steel dark:text-light-grey text-sm mt-1">Tổng tất cả tài khoản: <span className="text-blueberry dark:text-white font-bold">{formatMoney(totalBalance)}</span></p>
            <p className="text-steel dark:text-light-grey text-sm mt-0.5">Tổng tất cả trừ vàng: <span className="text-blueberry dark:text-white font-bold">{formatMoney(totalExcludingGold)}</span></p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-gradient-primary text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md shadow-turquoise/30">
            <Plus size={16} /> Thêm ví mới
          </button>
        </div>

        {accounts.length === 0 ? (
          <p className="text-steel dark:text-light-grey text-sm text-center py-16">Chưa có ví nào. Bấm "Thêm ví mới" để bắt đầu.</p>
        ) : (
          // FIX: trước đây ép cứng 5/6 cột (`repeat(N, 1fr)`) bất kể chiều rộng khả dụng.
          // Trên các màn hình laptop tỉ lệ thấp hơn 16:9 (vd 16:10) hoặc cửa sổ trình duyệt
          // hẹp hơn, khu vực nội dung (đã trừ sidebar) hẹp lại nhưng vẫn bị ép đủ 5-6 cột
          // -> mỗi thẻ bị bóp quá hẹp, kéo theo chiều cao (aspect ratio cố định) quá thấp
          // so với cỡ chữ/khoảng đệm cố định bên trong -> số dư & nhãn "LOẠI VÍ" bị tràn ra
          // ngoài rồi bị overflow-hidden cắt cụt ở mép dưới thẻ (đúng lỗi trong ảnh chụp).
          // Đổi sang auto-fill + minmax: số cột tự co giãn theo bề rộng thật, mỗi thẻ luôn
          // có bề rộng tối thiểu 200px nên đủ cao để chứa hết nội dung, không còn bị cắt.
          <div className="relative grid gap-5 mt-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {accounts.map((acc) => {
              const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
              return (
                <button
                  key={acc.id}
                  onClick={() => onOpenAccount(acc.id, 'accounts')}
                  style={{ background: accountCardGradient(acc.type) }}
                  className="text-left rounded-2xl p-4 relative overflow-hidden shadow-lg shadow-black/10 hover:shadow-card transition aspect-[1.586/1] flex flex-col justify-between min-h-[126px]"
                >
                  <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15" />
                  <div className="pointer-events-none absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-black/10" />

                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-5 rounded-md bg-white/35 border border-white/40" />
                      <EmojiCircle emoji={acc.icon} size={26} bg="rgba(255,255,255,0.16)" />
                    </div>
                    <Wifi size={18} className="text-white/85 rotate-90" />
                  </div>

                  <p className="relative text-white/90 font-bold text-sm tracking-[0.18em]">•••• •••• •••• {maskedDigits}</p>

                  <div className="relative flex items-end justify-between gap-2">
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
      </div>

      {showCreate && <EditAccountModal onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
    </>
  );
}
