/* ==============================================================================
   01. IMPORTS
   ============================================================================== */
import { useState, useEffect, useRef, Fragment, Children } from 'react';
import { supabase } from './supabaseClient';
import {
  Home, Sparkles, Plus, BarChart3, Settings as SettingsIcon, TrendingUp, TrendingDown, PiggyBank, HeartPulse,
  ArrowLeft, Download, X, Check, Loader2, Target, Wallet, Trash2, Pencil, LogOut, Mail, Lock, Search, Bell, Sun, Moon, User,
  Filter, MoreHorizontal, Eye, EyeOff, LayoutGrid, List, ArrowUpDown, Calendar, Clock, Star,
  ChevronDown, ChevronRight, ChevronLeft, Camera, KeyRound, UserCog, SlidersHorizontal,
  AlertTriangle, Info, PieChart, LineChart, BarChart, CircleDollarSign, FileText, SendHorizontal,
  BadgeCheck, CreditCard, Wifi
} from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import DateField from './DateField';

/* ==============================================================================
   02. CUSTOM STYLES (Fincheck palette + ẩn scrollbar)
   ============================================================================== */
const fincheckStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
  * { font-family: 'Nunito', sans-serif; }
  :root {
    --turquoise: #0DBACC;
    --baby-blue: #74ACEF;
    --cotton-candy: #F18AB5;
    --lavender: #9F7FE0;
    --ice-cream: #EEF0F4;
    --white: #FFFFFF;
    --light-grey: #BDBDCB;
    --steel: #7E7F90;
    --blueberry: #303150;
    --night-sky: #2B2B46;
    --dodger-blue: #69ADFF;
    --turquoise-light: #B4F1F1;
    --baby-blue-light: #C1DDFF;
    --cotton-candy-light: #FFCDDB;
    --lavender-light: #E3D6FF;

    /* Typography hierarchy (avoid pure #FFFFFF everywhere) */
    --text-primary: rgba(255,255,255,0.92);
    --text-secondary: rgba(255,255,255,0.70);
    --text-tertiary: rgba(255,255,255,0.55);
    --text-placeholder: rgba(255,255,255,0.48);
    --text-disabled: rgba(255,255,255,0.35);

    /* Liquid glass tokens — blur/saturate mạnh hơn, viền + highlight rõ hơn
       để cảm giác "kính lỏng" rõ rệt hơn trên mọi bề mặt, cả sáng lẫn tối. */
    --glass-bg: rgba(20,20,45,0.50);
    --glass-border: rgba(255,255,255,0.18);
    --glass-blur: blur(30px) saturate(190%);
    --glass-shadow: 0 10px 42px rgba(0,0,0,0.24);
    --glass-highlight: rgba(255,255,255,0.35);
  }

  /* App shell base: avoid the default browser bg (white/black) showing
     through during elastic/overscroll, which reads as an unintended
     "black patch" on mobile, especially in dark theme. */
  html, body, #root {
    width: 100%;
    min-height: 100%;
    margin: 0;
    background-color: var(--ice-cream);
  }
  html.dark, html.dark body, html.dark #root {
    background-color: #1a1a2e;
  }

  /* Liquid glass — reusable surface for auth card / modal / dropdown / popover.
     Tăng blur/saturate + thêm lớp "sheen" (ánh sáng lướt) chuyển động rất chậm
     để bề mặt có cảm giác kính lỏng sống động thay vì kính mờ tĩnh. Đồng thời
     bổ sung biến thể .dark thực sự (trước đây chỉ có .glass-surface-dark —
     một class không được gắn ở đâu cả nên auth card KHÔNG đổi theo dark mode). */
  .glass-surface {
    background: rgba(255,255,255,0.24);
    backdrop-filter: blur(34px) saturate(190%);
    -webkit-backdrop-filter: blur(34px) saturate(190%);
    border: 1px solid rgba(255,255,255,0.36);
    box-shadow: 0 24px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 0 46px rgba(255,255,255,0.06);
  }
  .glass-surface::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(115deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.25) 100%);
    background-size: 220% 220%;
    animation: liquidSheen 10s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
  }
  .dark .glass-surface {
    background: rgba(20,20,45,0.55);
    backdrop-filter: blur(34px) saturate(190%);
    -webkit-backdrop-filter: blur(34px) saturate(190%);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12),
      inset 0 0 46px rgba(255,255,255,0.03);
  }
  @keyframes liquidSheen {
    0%, 100% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
  }
  .glass-input {
    background: rgba(255,255,255,0.20);
    backdrop-filter: blur(18px) saturate(170%);
    -webkit-backdrop-filter: blur(18px) saturate(170%);
    border: 1px solid rgba(255,255,255,0.34);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
    transition: background-color .15s, border-color .15s, box-shadow .15s;
  }
  .glass-input:focus {
    border-color: rgba(34,211,238,0.65);
    box-shadow: 0 0 0 3px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.28);
  }
  .bg-ice-cream { background-color: var(--ice-cream); }
  .bg-turquoise { background-color: var(--turquoise); }
  .bg-baby-blue { background-color: var(--baby-blue); }
  .bg-cotton-candy { background-color: var(--cotton-candy); }
  .bg-lavender { background-color: var(--lavender); }
  .bg-night-sky { background-color: var(--night-sky); }
  .bg-blueberry { background-color: var(--blueberry); }
  .bg-steel { background-color: var(--steel); }
  .bg-light-grey { background-color: var(--light-grey); }
  .bg-turquoise-light { background-color: var(--turquoise-light); }
  .bg-baby-blue-light { background-color: var(--baby-blue-light); }
  .bg-cotton-candy-light { background-color: var(--cotton-candy-light); }
  .bg-lavender-light { background-color: var(--lavender-light); }
  .text-turquoise { color: var(--turquoise); }
  .text-baby-blue { color: var(--baby-blue); }
  .text-cotton-candy { color: var(--cotton-candy); }
  .text-lavender { color: var(--lavender); }
  .text-blueberry { color: var(--blueberry); }
  .text-steel { color: var(--steel); }
  .text-light-grey { color: var(--light-grey); }
  .text-white { color: var(--white); }
  .text-night-sky { color: var(--night-sky); }
  .border-turquoise { border-color: var(--turquoise); }
  .border-baby-blue { border-color: var(--baby-blue); }
  .border-cotton-candy { border-color: var(--cotton-candy); }
  .border-lavender { border-color: var(--lavender); }
  .border-steel { border-color: var(--steel); }
  .border-light-grey { border-color: var(--light-grey); }
  .shadow-soft { box-shadow: 0 1px 2px rgba(48,49,80,0.04), 0 10px 30px rgba(48,49,80,0.10), inset 0 1px 0 rgba(255,255,255,0.5); }
  .shadow-card { box-shadow: 0 2px 4px rgba(48,49,80,0.05), 0 18px 48px rgba(48,49,80,0.14), inset 0 1px 0 rgba(255,255,255,0.55); }
  .dark .bg-ice-cream { background-color: var(--night-sky); }
  /* "bg-white" / "dark:bg-[#1e1e32]" / "dark:bg-[#2a2a44]" là các nền đặc dùng
     cho card, modal, dropdown, segmented-control khắp app. Đổi sang kính lỏng
     (nền bán trong suốt + backdrop-blur) thay vì màu đặc, cả sáng lẫn tối,
     để hiệu ứng liquid glass nhất quán trên toàn bộ giao diện. */
  .bg-white {
    background-color: rgba(255,255,255,0.66);
    backdrop-filter: blur(28px) saturate(190%);
    -webkit-backdrop-filter: blur(28px) saturate(190%);
  }
  .dark .bg-white {
    background-color: rgba(30,30,50,0.62);
    backdrop-filter: blur(28px) saturate(190%);
    -webkit-backdrop-filter: blur(28px) saturate(190%);
  }
  .dark .dark\:bg-\[\#1e1e32\] {
    background-color: rgba(30,30,50,0.62);
    backdrop-filter: blur(28px) saturate(190%);
    -webkit-backdrop-filter: blur(28px) saturate(190%);
  }
  .dark .dark\:bg-\[\#2a2a44\] {
    background-color: rgba(42,42,68,0.68);
    backdrop-filter: blur(18px) saturate(190%);
    -webkit-backdrop-filter: blur(18px) saturate(190%);
  }
  /* Tăng độ dày mặc định của backdrop-blur (Tailwind) để mọi bề mặt bán
     trong suốt còn lại (thanh tìm kiếm, nút tròn, menu...) cũng dày kính hơn. */
  .backdrop-blur {
    backdrop-filter: blur(22px) saturate(190%);
    -webkit-backdrop-filter: blur(22px) saturate(190%);
  }
  .dark .text-blueberry { color: var(--text-primary); }
  .dark .text-steel { color: var(--light-grey); }
  .dark .border-steel { border-color: #3a3a5a; }
  .dark .border-light-grey { border-color: #3a3a5a; }
  .dark .shadow-soft { box-shadow: 0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08); }
  .dark .shadow-card { box-shadow: 0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1); }
  .bg-gradient-primary { background: linear-gradient(135deg, var(--turquoise), var(--baby-blue)); }
  .bg-gradient-secondary { background: linear-gradient(135deg, var(--cotton-candy), var(--lavender)); }
  .bg-gradient-warm { background: linear-gradient(135deg, var(--cotton-candy-light), var(--lavender-light)); }
  .bg-gradient-cool { background: linear-gradient(135deg, var(--turquoise-light), var(--baby-blue-light)); }
  .bg-gradient-hero { background: linear-gradient(135deg, var(--turquoise), var(--lavender)); }

  /* ==========================================================================
     Mobile: Frosted-glass + Neumorphism blend (pastel, layered, soft shadows)
     Reusable across mobile screens — panels, cards, and inset stat tiles.
     ========================================================================== */
  .frost-card {
    position: relative;
    background: linear-gradient(150deg, rgba(255,255,255,0.82), rgba(255,255,255,0.46));
    backdrop-filter: blur(46px) saturate(240%);
    -webkit-backdrop-filter: blur(46px) saturate(240%);
    border: 1px solid rgba(255,255,255,0.95);
    box-shadow: 22px 22px 44px rgba(48,49,80,0.20), -12px -12px 28px rgba(255,255,255,0.92),
      0 0 0 1px rgba(13,186,204,0.08), 0 14px 32px -14px rgba(159,127,224,0.4),
      inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(48,49,80,0.05);
    isolation: isolate;
  }
  .frost-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(115deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 22%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.3) 100%);
    background-size: 220% 220%;
    animation: liquidSheen 12s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
  }
  .dark .frost-card {
    background: linear-gradient(150deg, rgba(52,52,86,0.76), rgba(24,24,42,0.58));
    backdrop-filter: blur(46px) saturate(240%);
    -webkit-backdrop-filter: blur(46px) saturate(240%);
    border: 1px solid rgba(255,255,255,0.20);
    box-shadow: 22px 22px 44px rgba(0,0,0,0.58), -8px -8px 24px rgba(255,255,255,0.04),
      0 0 0 1px rgba(13,186,204,0.1), 0 14px 32px -14px rgba(159,127,224,0.3),
      inset 0 1px 0 rgba(255,255,255,0.16);
  }
  .dark .frost-card::before {
    background: linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 22%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%);
    background-size: 220% 220%;
  }
  .frost-inset {
    position: relative;
    background: rgba(255,255,255,0.42);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.7);
    box-shadow: inset 7px 7px 16px rgba(48,49,80,0.16), inset -7px -7px 16px rgba(255,255,255,0.95);
  }
  .dark .frost-inset {
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    border: 1px solid rgba(255,255,255,0.13);
    box-shadow: inset 7px 7px 16px rgba(0,0,0,0.45), inset -7px -7px 16px rgba(255,255,255,0.05);
  }
  .frost-pill {
    background: rgba(255,255,255,0.58);
    backdrop-filter: blur(30px) saturate(220%);
    -webkit-backdrop-filter: blur(30px) saturate(220%);
    border: 1px solid rgba(255,255,255,0.85);
    box-shadow: 8px 8px 18px rgba(48,49,80,0.13), -5px -5px 12px rgba(255,255,255,0.85);
  }
  .dark .frost-pill {
    background: rgba(255,255,255,0.09);
    backdrop-filter: blur(30px) saturate(220%);
    -webkit-backdrop-filter: blur(30px) saturate(220%);
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 8px 8px 18px rgba(0,0,0,0.4), -5px -5px 12px rgba(255,255,255,0.04);
  }
  /* Soft ambient pastel blobs for layered depth behind frosted panels — bigger & more saturated
     so the backdrop-blur on cards has real color/contrast to blur (this is what makes the glass
     effect actually read as "glass" instead of a flat translucent panel). */
  .frost-blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(50px);
    pointer-events: none;
    opacity: 0.9;
  }


  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Mobile: ẩn scrollbar toàn bộ */
  @media (max-width: 767px) {
    * {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    *::-webkit-scrollbar {
      display: none;
    }
  }

  /* ==========================================================================
     vanilla-calendar-pro — skin theo bộ mã màu Fincheck + liquid glass
     Chỉ import layout.css + themes/light.css (xem DateField.jsx) để có sẵn
     các khai báo var(--vc-*), sau đó override toàn bộ giá trị màu tại đây.
     Nền calendar để trong suốt vì panel bọc ngoài (.glass-surface /
     .glass-surface-dark) đã lo phần kính mờ + blur + border + shadow.
     ========================================================================== */
  .vc-glass .vc {
    --vc-bg: transparent;
    --vc-color: var(--blueberry);
    --vc-focus-outline-color: var(--turquoise);

    --vc-header-color: var(--blueberry);
    --vc-title-color: var(--blueberry);
    --vc-title-color-hover: var(--turquoise);
    --vc-title-color-disabled: var(--light-grey);

    --vc-months-years-bg: transparent;
    --vc-months-years-color: var(--steel);
    --vc-months-years-bg-hover: rgba(13, 186, 204, 0.12);
    --vc-months-years-color-disabled: var(--light-grey);
    --vc-months-years-bg-selected: var(--turquoise);
    --vc-months-years-color-selected: var(--white);

    --vc-week-numbers-title-color: var(--steel);
    --vc-week-number-color: var(--steel);
    --vc-week-number-color-hover: var(--blueberry);
    --vc-week-day-color: var(--steel);
    --vc-week-day-color-hover: var(--blueberry);
    --vc-week-day-off-color: var(--cotton-candy);
    --vc-week-day-off-color-hover: var(--cotton-candy);

    --vc-date-bg: transparent;
    --vc-date-color: var(--blueberry);
    --vc-date-bg-hover: rgba(13, 186, 204, 0.12);
    --vc-date-hover-bg: rgba(13, 186, 204, 0.12);
    --vc-date-hover-edge-bg: rgba(13, 186, 204, 0.22);
    --vc-date-disabled-color: var(--light-grey);
    --vc-date-outside-color: var(--light-grey);
    --vc-date-today-bg: rgba(13, 186, 204, 0.12);
    --vc-date-today-color: var(--turquoise);
    --vc-date-today-outside-color: var(--steel);
    --vc-date-selected-bg: var(--turquoise);
    --vc-date-selected-color: var(--white);
    --vc-date-selected-outside-bg: var(--turquoise-light);
    --vc-date-selected-outside-color: var(--white);

    --vc-date-weekend-color: var(--cotton-candy);
    --vc-date-weekend-bg-hover: rgba(241, 138, 181, 0.12);
    --vc-date-weekend-hover-bg: rgba(241, 138, 181, 0.12);
    --vc-date-weekend-hover-edge-bg: rgba(241, 138, 181, 0.22);
    --vc-date-weekend-disabled-color: var(--light-grey);
    --vc-date-weekend-today-color: var(--cotton-candy);
    --vc-date-weekend-today-disabled-color: var(--light-grey);
    --vc-date-weekend-outside-bg: transparent;
    --vc-date-weekend-outside-color: var(--light-grey);
    --vc-date-weekend-outside-bg-hover: rgba(241, 138, 181, 0.08);
    --vc-date-weekend-outside-hover-bg: rgba(241, 138, 181, 0.08);
    --vc-date-weekend-today-outside-color: var(--light-grey);
    --vc-date-weekend-disabled-outside-color: var(--light-grey);
    --vc-date-weekend-selected-bg: var(--cotton-candy);
    --vc-date-weekend-selected-color: var(--white);
  }
  .dark .vc-glass .vc {
    --vc-color: var(--text-primary);
    --vc-header-color: var(--text-primary);
    --vc-title-color: var(--text-primary);
    --vc-title-color-hover: var(--turquoise);
    --vc-title-color-disabled: var(--text-disabled);

    --vc-months-years-color: var(--text-secondary);
    --vc-months-years-bg-hover: rgba(13, 186, 204, 0.18);
    --vc-months-years-color-disabled: var(--text-disabled);

    --vc-week-numbers-title-color: var(--text-secondary);
    --vc-week-number-color: var(--text-secondary);
    --vc-week-number-color-hover: var(--text-primary);
    --vc-week-day-color: var(--text-secondary);
    --vc-week-day-color-hover: var(--text-primary);

    --vc-date-color: var(--text-primary);
    --vc-date-bg-hover: rgba(255, 255, 255, 0.08);
    --vc-date-hover-bg: rgba(255, 255, 255, 0.08);
    --vc-date-hover-edge-bg: rgba(255, 255, 255, 0.14);
    --vc-date-disabled-color: var(--text-disabled);
    --vc-date-outside-color: var(--text-disabled);
    --vc-date-today-bg: rgba(13, 186, 204, 0.18);
    --vc-date-today-outside-color: var(--text-tertiary);

    --vc-date-weekend-bg-hover: rgba(241, 138, 181, 0.16);
    --vc-date-weekend-hover-bg: rgba(241, 138, 181, 0.16);
    --vc-date-weekend-hover-edge-bg: rgba(241, 138, 181, 0.24);
    --vc-date-weekend-disabled-color: var(--text-disabled);
    --vc-date-weekend-today-disabled-color: var(--text-disabled);
    --vc-date-weekend-outside-color: var(--text-disabled);
    --vc-date-weekend-outside-bg-hover: rgba(241, 138, 181, 0.1);
    --vc-date-weekend-outside-hover-bg: rgba(241, 138, 181, 0.1);
    --vc-date-weekend-today-outside-color: var(--text-disabled);
    --vc-date-weekend-disabled-outside-color: var(--text-disabled);
  }
  /* Bo góc + font đồng bộ với phần còn lại của app */
  .vc-glass .vc { font-family: 'Nunito', sans-serif; }
  .vc-glass .vc-date__btn,
  .vc-glass .vc-months__month,
  .vc-glass .vc-years__year { border-radius: 9999px; }
`;

/* ==============================================================================
   03. CONSTANTS
   ============================================================================== */
const monthlyLimit = 5000000;
const monthlySpent = 3420000;

const NAV_ITEMS = [
  { key: 'dashboard', icon: Home, label: 'Trang chủ' },
  { key: 'funds', icon: PiggyBank, label: 'Quản lý quỹ' },
  { key: 'accounts', icon: Wallet, label: 'Quản lý ví' },
  { key: 'goals', icon: Sparkles, label: 'Mục tiêu' },
  { key: 'report', icon: BarChart3, label: 'Báo cáo' },
  { key: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
];

/* ==============================================================================
   03B. SHARED HOOKS — dùng chung toàn app
   ============================================================================== */
// Đóng dropdown/menu khi nhấn ESC. Việc đóng khi click ra ngoài đã được xử lý
// riêng ở từng nơi gọi (thường bằng 1 lớp overlay fixed inset-0), hook này
// chỉ bổ sung phần ESC cho đồng bộ hành vi trên toàn app.
function useCloseOnEscape(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
}

/* ==============================================================================
   03C. IMAGE UPLOADER / IMAGE EDITOR — dùng chung toàn app
   ------------------------------------------------------------------------------
   Component dùng chung cho MỌI nơi trong app cho phép upload ảnh (avatar,
   banner, ảnh card, ...). Flow chuẩn: chọn ảnh → mở editor (crop/zoom/pan) →
   preview → xác nhận → callback trả về file ảnh đã crop để nơi gọi tự upload.

   Props:
   - aspectRatio: "1:1" | "16:9" | "4:3" | ... (mặc định "1:1")
   - circularCrop: bool — hiển thị khung crop tròn (dùng cho avatar)
   - value: url ảnh hiện tại để hiển thị preview nhỏ (không bắt buộc)
   - onConfirm(file): được gọi với File ảnh đã crop khi người dùng bấm "Lưu"
   - uploading: bool — disable nút chọn ảnh khi đang upload
   - renderTrigger({ open, uploading }): tuỳ biến nút/khu vực trigger chọn ảnh;
     nếu không truyền, dùng nút mặc định dạng pill có icon Camera.
   - triggerClassName / triggerLabel: tuỳ biến nhanh nút mặc định
   ============================================================================== */
function parseAspectRatio(aspectRatio) {
  if (typeof aspectRatio === 'number') return aspectRatio;
  const [w, h] = String(aspectRatio || '1:1').split(':').map(Number);
  if (!w || !h) return 1;
  return w / h;
}

// Tự động tính khung crop được canh giữa, khớp đúng tỉ lệ đích (vd 1:1 cho avatar)
// dựa trên kích thước THẬT của ảnh vừa tải lên — để khung crop hiện ra sẵn đúng
// hình dạng mong muốn NGAY khi ảnh load xong, trước khi người dùng kéo/chỉnh tay.
function centeredAspectCrop(mediaWidth, mediaHeight, ratio) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, ratio, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

function ImageUploader({
  aspectRatio = '1:1',
  circularCrop = false,
  uploading = false,
  onConfirm,
  renderTrigger,
  triggerClassName = 'bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-2.5 text-sm text-blueberry dark:text-white font-semibold cursor-pointer hover:bg-turquoise/10 transition flex items-center gap-2',
  triggerLabel = 'Đổi ảnh',
}) {
  const ratio = parseAspectRatio(aspectRatio);
  const [showEditor, setShowEditor] = useState(false);
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 80, aspect: ratio });
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef(null);
  const inputRef = useRef(null);

  function onSelectFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImgSrc(reader.result);
      setZoom(1);
      // Chưa có khung crop cho tới khi ảnh load xong (xem onImageLoad) — để tránh
      // hiện thoáng qua 1 khung sai kích thước trước khi khung thật (đã canh giữa,
      // đúng tỉ lệ) xuất hiện.
      setCrop(undefined);
      setShowEditor(true);
    });
    reader.readAsDataURL(file);
  }

  // Ảnh vừa load xong trong editor → tự tính & hiển thị ngay khung crop đã canh giữa,
  // khớp đúng tỉ lệ đích (vd khung vuông cho avatar), to gần hết ảnh — người dùng chỉ
  // cần kéo để chọn đúng vùng muốn giữ, không phải tự vẽ khung từ đầu.
  // Lưu ý: khung được lưu ở đơn vị % (không phải px) — vì % luôn khớp tỉ lệ đúng
  // dù người dùng kéo thanh Zoom to/nhỏ ảnh sau đó (px cố định sẽ bị lệch khi ảnh
  // đổi kích thước hiển thị do zoom, khiến khung nhìn như "tự nhiên" sai kích cỡ).
  function onImageLoad(e) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setCrop(centeredAspectCrop(naturalWidth, naturalHeight, ratio));
  }

  function handleCancel() {
    setShowEditor(false);
    setImgSrc(null);
    setZoom(1);
  }

  function handleConfirm() {
    if (!imageRef.current || !crop || !crop.width || !crop.height) return;
    const canvas = document.createElement('canvas');
    const image = imageRef.current;
    // crop ở đơn vị % nên quy đổi thẳng sang toạ độ pixel của ẢNH GỐC (naturalWidth/
    // naturalHeight) — không phụ thuộc kích thước đang hiển thị (đã bị zoom to/nhỏ),
    // nhờ vậy ảnh xuất ra luôn đúng vùng đã chọn dù trước đó có zoom bao nhiêu đi nữa.
    const cropX = (crop.x / 100) * image.naturalWidth;
    const cropY = (crop.y / 100) * image.naturalHeight;
    const cropWidth = (crop.width / 100) * image.naturalWidth;
    const cropHeight = (crop.height / 100) * image.naturalHeight;
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
      onConfirm && onConfirm(file);
      setShowEditor(false);
      setImgSrc(null);
      setZoom(1);
    }, 'image/jpeg', 0.92);
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => inputRef.current?.click(), uploading })
      ) : (
        <label className={triggerClassName}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {uploading ? 'Đang tải...' : triggerLabel}
          <input ref={inputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" disabled={uploading} />
        </label>
      )}
      {/* Trigger ẩn để renderTrigger tuỳ biến vẫn dùng chung 1 input file */}
      {renderTrigger && (
        <input ref={inputRef} type="file" accept="image/*" onChange={onSelectFile} className="hidden" disabled={uploading} />
      )}

      {showEditor && imgSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleCancel}>
          <div className="bg-white dark:bg-[#1e1e32] rounded-3xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-3">Cắt ảnh</h3>
            {/* overflow-auto cho phép kéo/pan ảnh khi ảnh lớn hơn khung xem sau khi zoom */}
            <div className="flex items-center justify-center bg-ice-cream dark:bg-night-sky rounded-2xl overflow-auto max-h-[50vh]">
              <ReactCrop crop={crop} onChange={setCrop} aspect={ratio} circularCrop={circularCrop} keepSelection disabled={!crop}>
                <img
                  ref={imageRef}
                  src={imgSrc}
                  alt="Crop"
                  className="select-none"
                  style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto' }}
                  draggable={false}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs text-steel dark:text-light-grey font-semibold flex-shrink-0">Zoom</span>
              <input
                type="range" min="1" max="3" step="0.05" value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-turquoise"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleCancel} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44]">Huỷ</button>
              <button onClick={handleConfirm} disabled={!crop} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary shadow-md shadow-turquoise/30 disabled:opacity-60">Lưu ảnh</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const FUND_CARD_GRADIENTS = [
  'linear-gradient(135deg, #B4F1F1, #C1DDFF)',
  'linear-gradient(135deg, #FFCDDB, #E3D6FF)',
  'linear-gradient(135deg, #0DBACC, #74ACEF)',
  'linear-gradient(135deg, #F18AB5, #9F7FE0)',
  'linear-gradient(135deg, #B4F1F1, #74ACEF)',
  'linear-gradient(135deg, #FFCDDB, #F18AB5)',
];

const FUND_RATE_TIERS = [
  { value: 'Không lãi suất', color: '#7E7F90', bg: '#F7F7F8' },
  { value: '<5%/năm', color: '#0DBACC', bg: '#B4F1F1' },
  { value: '5-10%/năm', color: '#9F7FE0', bg: '#E3D6FF' },
  { value: '>10%/năm', color: '#F18AB5', bg: '#FFCDDB' },
];

const FUND_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (c) => new Date(c.created_at || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (c) => (c.name || '').toLowerCase() },
  { key: 'balance', label: 'Số dư', get: (c, tx) => fundBalanceWithProfit(c, tx) },
  { key: 'target', label: 'Số tiền mục tiêu', get: (c) => Number(c.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ mục tiêu', get: (c, tx) => (c.target_amount ? Math.min(100, (fundBalanceWithProfit(c, tx) / c.target_amount) * 100) : 0) },
  { key: 'interest', label: 'Lãi suất', get: (c) => Number(c.interest_rate || 0) },
];

const PRIORITY_TERMS = [
  { value: '<1 năm - Siêu ngắn hạn', color: '#F18AB5', bg: '#FFCDDB' },
  { value: '1-3 năm - Hơi ngắn hạn', color: '#0DBACC', bg: '#B4F1F1' },
  { value: '3-5 năm - Ngắn hạn', color: '#74ACEF', bg: '#C1DDFF' },
  { value: '5-10 năm - Hơi dài hạn', color: '#9F7FE0', bg: '#E3D6FF' },
  { value: '>10 năm - Siêu dài hạn', color: '#303150', bg: '#F7F7F8' },
];

const GOAL_SORT_FIELDS = [
  { key: 'created', label: 'Ngày tạo', get: (g) => new Date(g.start_date || 0).getTime() },
  { key: 'name', label: 'Tên (A-Z)', get: (g) => (g.name || '').toLowerCase() },
  { key: 'target', label: 'Số tiền mục tiêu', get: (g) => Number(g.target_amount || 0) },
  { key: 'progress', label: 'Tiến độ', get: (g) => (g.status === 'Hoàn thành' ? 100 : (g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0)) },
  { key: 'priority', label: 'Mức độ ưu tiên', get: (g) => priorityRank(g.priority_term) },
];

const ACCOUNT_TYPES = [
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
function accountCardGradient(type) { return ACCOUNT_TYPE_STYLES[type] || ACCOUNT_TYPE_STYLES.other; }

/* ==============================================================================
   04. UTILITY FUNCTIONS
   ============================================================================== */
function formatMoney(n) {
  return Math.abs(n).toLocaleString('en-US') + 'đ';
}

// Giống formatMoney nhưng GIỮ dấu âm — dùng cho các số có thể âm (Dư sau chi...)
// để không bị lệch với phần trăm âm hiển thị bên cạnh, gây hiểu nhầm số liệu.
function formatMoneySigned(n) {
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US') + 'đ';
}

// ==============================================================================
// XOÁ GIAO DỊCH TRONG CÁC DÒNG LỊCH SỬ (dùng chung cho mọi màn hình có hiển thị
// lịch sử giao dịch — Trang chủ, Chi tiết quỹ, Chi tiết ví, Báo cáo...).
// Xoá ở đây LUÔN LÀ soft-delete qua softDelete('transactions', ...): giao dịch
// chỉ bị ẩn khỏi ứng dụng (deleted_at được set) và được ghi log restorable vào
// system_logs, để người dùng có thể khôi phục trong 30 ngày ở Cài đặt > Lịch sử
// hệ thống — KHÔNG xoá cứng khỏi database.
// ==============================================================================
function txDeleteDescription(tx, categories) {
  const cat = (categories || []).find((c) => c.id === tx.category_id);
  const label = cat?.name || (tx.type === 'income' ? 'Thu nhập' : tx.type === 'allocation' ? 'Nạp quỹ' : tx.type === 'adjustment' ? 'Cập nhật số dư' : 'Chi tiêu');
  return `Xoá giao dịch "${label}" ${formatMoney(tx.amount)}`;
}

function TxDeleteButton({ onClick, className = '', size = 14 }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title="Xoá giao dịch"
      className={`w-7 h-7 rounded-full hover:bg-cotton-candy-light dark:hover:bg-cotton-candy/10 flex items-center justify-center text-steel dark:text-light-grey hover:text-cotton-candy flex-shrink-0 transition ${className}`}
    >
      <Trash2 size={size} />
    </button>
  );
}

// Supabase Storage object key không chấp nhận dấu tiếng Việt, khoảng trắng, ký tự đặc biệt.
// Chuẩn hoá tên file trước khi upload để tránh lỗi "Invalid key".
function sanitizeFileName(name) {
  const dotIndex = name.lastIndexOf('.');
  const base = dotIndex > -1 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > -1 ? name.slice(dotIndex + 1) : '';
  const cleanBase = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '-') // ký tự khác -> gạch ngang
    .replace(/^-+|-+$/g, '') // bỏ gạch ngang ở đầu/cuối
    .toLowerCase() || 'file';
  const cleanExt = ext.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}

function fundCardBackground(f, index) {
  if (f.background_url) return `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.15)), url(${f.background_url})`;
  return FUND_CARD_GRADIENTS[index % FUND_CARD_GRADIENTS.length];
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} tháng trước`;
  return `${Math.floor(months / 12)} năm trước`;
}

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Quy tắc "kỳ nhận lợi nhuận đầu tiên" của Túi Thần Tài:
// - Nạp tiền Thứ 2 -> Thứ 5: nhận lợi nhuận kỳ đầu vào "ngày kia" (nạp + 2 ngày)
// - Nạp tiền Thứ 6 -> Chủ nhật: nhận lợi nhuận kỳ đầu vào Thứ 3 tuần kế tiếp
// Getday(): 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
function firstProfitCreditDate(depositDate) {
  const d = new Date(depositDate);
  d.setHours(0, 0, 0, 0);
  const w = d.getDay();
  let offsetDays;
  if (w >= 1 && w <= 4) {
    // Thứ 2 - Thứ 5: +2 ngày
    offsetDays = 2;
  } else {
    // Thứ 6 (5), Thứ 7 (6), Chủ nhật (0): dời tới Thứ 3 (2) kế tiếp
    offsetDays = (2 - w + 7) % 7;
    if (offsetDays === 0) offsetDays = 7;
  }
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// Ngày mà 1 khoản NẠP QUỸ (allocation) bắt đầu được cộng vào "gốc sinh lời"
// (interestBase) để tính lãi hàng ngày — áp dụng đúng quy tắc "kỳ nhận lợi
// nhuận đầu tiên" ở trên cho MỌI lần nạp (không chỉ lần nạp đầu tiên của quỹ):
// = firstProfitCreditDate(ngày nạp) - 1 ngày (vì lợi nhuận của "ngày sinh lời X"
// luôn được hiển thị vào ngày X+1, nên gốc phải sẵn sàng từ ngày X = creditDate-1
// để lợi nhuận đầu tiên hiển thị đúng vào creditDate).
// => Nạp T2-T5: gốc bắt đầu sinh lời từ hôm sau (nạp +1 ngày).
// => Nạp T6/T7/CN: gốc bắt đầu sinh lời từ đúng Thứ 2 tuần kế tiếp.
// Tiền nạp vẫn được cộng vào SỐ DƯ (balance) ngay lập tức để hiển thị đúng —
// chỉ riêng phần TÍNH LÃI là bị delay theo quy tắc này.
function allocationInterestEligibleDate(depositDate) {
  const creditDate = firstProfitCreditDate(depositDate);
  const eligible = new Date(creditDate);
  eligible.setDate(eligible.getDate() - 1);
  return eligible;
}

// FIX: xác định giao dịch "nạp ban đầu" của 1 quỹ CHỈ dựa vào cờ is_initial (được set khi
// tạo quỹ hoặc khi nhập/sửa "Số tiền nạp quỹ lần đầu" trong form chỉnh sửa quỹ).
// KHÔNG fallback về "giao dịch allocation có ngày sớm nhất" nữa — cách cũ khiến 1 lần nạp
// quỹ bình thường (qua nút Nạp quỹ) bị nhầm hiển thị thành "Nạp quỹ ban đầu" chỉ vì nó
// tình cờ là khoản nạp đầu tiên theo thời gian, dù người dùng chưa hề khai báo số tiền ban
// đầu ở form Sửa quỹ. Nếu quỹ chưa từng khai báo "Số tiền nạp quỹ lần đầu" thì đơn giản là
// KHÔNG có dòng "ban đầu" nào cả — mọi khoản nạp/rút đều hiển thị là Nạp quỹ/Rút quỹ bình thường.
function findInitialAllocation(transactions, categoryId) {
  const allocations = transactions.filter((t) => t.category_id === categoryId && t.type === 'allocation');
  return allocations.find((t) => t.is_initial === true) || null;
}

function fundBalance(categoryId, transactions) {
  return transactions
    .filter((t) => t.category_id === categoryId)
    .reduce((s, t) => {
      if (t.type === 'allocation') return s + Number(t.amount);
      if (t.type === 'expense') return s - Number(t.amount);
      return s;
    }, 0);
}

// Cache kết quả tính lãi theo quỹ — tránh lặp lại vòng lặp tốn kém mỗi lần render.
// Cache được khóa theo: mảng transactions hiện tại (WeakMap tự giải phóng khi data cũ bị thay),
// + id quỹ + lãi suất + ngày hôm nay (để qua ngày mới thì tự tính lại đúng).
const _fundBalanceCache = new WeakMap();

function fundBalanceWithProfit(category, transactions) {
  let cacheForTx = _fundBalanceCache.get(transactions);
  if (!cacheForTx) {
    cacheForTx = new Map();
    _fundBalanceCache.set(transactions, cacheForTx);
  }
  const todayKey = new Date().toDateString();
  const cacheKey = `${category.id}_${category.interest_rate}_${todayKey}`;
  if (cacheForTx.has(cacheKey)) return cacheForTx.get(cacheKey);

  const result = _computeFundBalanceWithProfit(category, transactions);
  cacheForTx.set(cacheKey, result);
  return result;
}

function _computeFundBalanceWithProfit(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  if (history.length === 0) return 0;

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  // changesByDay: tổng số dư THỰC (hiển thị) — nạp/rút cộng trừ ngay theo ngày giao dịch.
  // eligibleChangesByDay: phần "gốc sinh lời" dùng để TÍNH LÃI — khoản nạp chỉ được cộng
  // vào gốc sinh lời kể từ allocationInterestEligibleDate() (delay theo quy tắc kỳ đầu),
  // khoản rút thì trừ khỏi gốc sinh lời ngay lập tức (rút rồi thì không còn sinh lời nữa).
  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    // Lợi nhuận = Gốc sinh lời * Tỷ suất/365, làm tròn xuống
    if (interestBase > 0 && dailyRate > 0) {
      const profit = Math.floor(interestBase * dailyRate);
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  balance += changesByDay[today.getTime()] || 0;
  return balance;
}

// Cache tương tự fundBalanceWithProfit — Report và FundDetail gọi hàm này rất nhiều lần
// (mỗi quỹ x nhiều mốc ngày), nếu không cache thì vòng lặp từng-ngày chạy lại liên tục gây lag.
const _fundBalanceAtDateCache = new WeakMap();

function fundBalanceAtDate(category, transactions, cutoffDate) {
  let cacheForTx = _fundBalanceAtDateCache.get(transactions);
  if (!cacheForTx) {
    cacheForTx = new Map();
    _fundBalanceAtDateCache.set(transactions, cacheForTx);
  }
  const cutoffKey = new Date(cutoffDate).toDateString();
  const cacheKey = `${category.id}_${category.interest_rate}_${cutoffKey}`;
  if (cacheForTx.has(cacheKey)) return cacheForTx.get(cacheKey);

  const result = _computeFundBalanceAtDate(category, transactions, cutoffDate);
  cacheForTx.set(cacheKey, result);
  return result;
}

function _computeFundBalanceAtDate(category, transactions, cutoffDate) {
  const rate = Number(category.interest_rate || 0);
  const dailyRate = rate / 100 / 365;
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  if (history.length === 0) return 0;

  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const endDate = toDay(cutoffDate); // inclusive? we process until endDate (including that day)

  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    if (interestBase > 0 && dailyRate > 0) {
      const profit = Math.floor(interestBase * dailyRate);
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return balance;
}

function accountBalanceAtDate(account, transactions, cutoffDate) {
  const delta = transactions
    .filter((t) => {
      if (t.account_id !== account.id) return false;
      const d = new Date(t.date || t.created_at);
      return d <= cutoffDate;
    })
    .reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount);
      if (t.type === 'expense' || t.type === 'allocation') return s - Number(t.amount); // tiền rời khỏi ví
      return s + Number(t.amount); // adjustment
    }, 0);
  return Number(account.initial_balance || 0) + delta;
}

function fundTransactionsWithBalance(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const dailyRate = rate / 100 / 365;
  const txs = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));
  if (txs.length === 0) return [];

  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(txs[0].date || txs[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const txsByDay = {};
  // Gốc sinh lời được cộng vào theo ngày ĐỦ ĐIỀU KIỆN (quy tắc kỳ đầu), không phải
  // ngày giao dịch thực tế — xem allocationInterestEligibleDate()
  const eligibleChangesByDay = {};
  txs.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    (txsByDay[key] = txsByDay[key] || []).push(t);
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  const result = [];
  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    (txsByDay[cursor.getTime()] || []).forEach((t) => {
      balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
      result.push({ ...t, balanceAfter: balance });
    });
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    if (interestBase > 0 && dailyRate > 0) {
      const profit = Math.floor(interestBase * dailyRate);
      balance += profit;
      interestBase += profit;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  (txsByDay[today.getTime()] || []).forEach((t) => {
    balance += t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    result.push({ ...t, balanceAfter: balance });
  });
  return result;
}

function fundDailyProfitHistory(category, transactions) {
  const rate = Number(category.interest_rate || 0);
  const history = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  if (history.length === 0 || rate <= 0) return [];

  const dailyRate = rate / 100 / 365;
  const toDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const startDate = toDay(history[0].date || history[0].created_at);
  const today = toDay(new Date());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const changesByDay = {};
  const eligibleChangesByDay = {};
  history.forEach((t) => {
    const key = toDay(t.date || t.created_at).getTime();
    const delta = t.type === 'allocation' ? Number(t.amount) : -Number(t.amount);
    changesByDay[key] = (changesByDay[key] || 0) + delta;
    const eligibleKey = t.type === 'allocation'
      ? toDay(allocationInterestEligibleDate(t.date || t.created_at)).getTime()
      : key;
    eligibleChangesByDay[eligibleKey] = (eligibleChangesByDay[eligibleKey] || 0) + delta;
  });

  const days = [];
  let balance = 0;
  let interestBase = 0;
  const cursor = new Date(startDate);
  while (cursor <= yesterday) {
    balance += changesByDay[cursor.getTime()] || 0;
    interestBase += eligibleChangesByDay[cursor.getTime()] || 0;
    let profit = 0;
    if (interestBase > 0 && dailyRate > 0) {
      profit = Math.floor(interestBase * dailyRate);
      balance += profit;
      interestBase += profit;
    }
    // FIX: trước đây chỉ push khi profit > 0, khiến những ngày lãi làm tròn xuống
    // còn 0đ (gốc sinh lời còn nhỏ, hoặc vừa rút bớt) bị ẩn hẳn khỏi lịch sử thay vì
    // hiển thị "0đ" — nhìn giống như bị "mất" dòng lợi nhuận của ngày đó.
    // Giờ luôn ghi nhận đủ mọi ngày trong chuỗi, kể cả ngày lãi = 0đ.
    days.push({ date: new Date(cursor), profit, balance });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.reverse();
}

function accountBalance(acc, transactions) {
  const delta = transactions
    .filter((t) => t.account_id === acc.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment' || t.type === 'allocation'))
    .reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount);
      if (t.type === 'expense' || t.type === 'allocation') return s - Number(t.amount); // tiền rời khỏi ví (chi tiêu hoặc chuyển sang quỹ)
      return s + Number(t.amount);
    }, 0);
  return Number(acc.initial_balance || 0) + delta;
}

function fundRateStyle(cat) {
  const rate = Number(cat.interest_rate || 0);
  if (rate <= 0) return FUND_RATE_TIERS[0];
  if (rate < 5) return FUND_RATE_TIERS[1];
  if (rate < 10) return FUND_RATE_TIERS[2];
  return FUND_RATE_TIERS[3];
}

function priorityStyle(value) {
  return PRIORITY_TERMS.find((p) => p.value === value) || { color: '#7E7F90', bg: '#F7F7F8' };
}

function priorityRank(value) {
  const idx = PRIORITY_TERMS.findIndex((p) => p.value === value);
  return idx === -1 ? PRIORITY_TERMS.length : idx;
}

function sortGoals(list) {
  return [...list].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    return priorityRank(a.priority_term) - priorityRank(b.priority_term);
  });
}

function durationText(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr), end = new Date(endStr);
  if (end < start) return null;
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) { months -= 1; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  if (months < 0) { years -= 1; months += 12; }
  const parts = [];
  if (years > 0) parts.push(`${years} năm`);
  if (months > 0) parts.push(`${months} tháng`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ngày`);
  return parts.join(' ');
}

const PERIOD_TAG_RE = /^\[KY:(\d{4}-\d{2})\]\s?/;
function tagPeriodNote(periodKey, note) { return periodKey ? `[KY:${periodKey}] ${note || ''}`.trim() : (note || null); }
function parsePeriodTag(note) { const m = (note || '').match(PERIOD_TAG_RE); return m ? m[1] : null; }
function stripPeriodTag(note) { return (note || '').replace(PERIOD_TAG_RE, ''); }

function buildPeriods(year) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let startM = m - 1, startY = year;
    if (startM === 0) { startM = 12; startY = year - 1; }
    return {
      key: `${year}-${String(m).padStart(2, '0')}`,
      label: `Tháng ${m} (21/${startM} - 20/${m})`,
    };
  });
}
function dateToPeriodKey(d) {
  const date = new Date(d);
  let m = date.getMonth() + 1, y = date.getFullYear();
  if (date.getDate() > 20) { m += 1; if (m > 12) { m = 1; y += 1; } }
  return `${y}-${String(m).padStart(2, '0')}`;
}
function currentPeriodKey(today = new Date()) {
  return dateToPeriodKey(today);
}
function transactionPeriodKey(t) {
  return parsePeriodTag(t.note) || dateToPeriodKey(t.date || t.created_at);
}
function periodPool(transactions, periodKey) {
  const total = transactions.filter((t) => t.type === 'income' && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  const used = transactions.filter((t) => (t.type === 'allocation' || t.type === 'expense') && parsePeriodTag(t.note) === periodKey).reduce((s, t) => s + Number(t.amount), 0);
  return { total, used, remaining: total - used };
}
function periodKeyToRange(periodKey) {
  const [y, m] = periodKey.split('-').map(Number);
  let startM = m - 1, startY = y;
  if (startM === 0) { startM = 12; startY = y - 1; }
  const start = new Date(startY, startM - 1, 21, 0, 0, 0);
  const end = new Date(y, m - 1, 20, 23, 59, 59);
  return { start, end };
}

// Danh sách năm cố định cho các dropdown lọc "Năm" trong Dashboard: 2025 -> 2035.
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2025 + i);
const PERIOD_WEEK_DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Sinh danh sách bucket thời gian dùng chung cho các chart lọc theo Tuần/Tháng/Năm.
// - week: khoảng ngày tuỳ chọn (weekStart -> weekEnd), mỗi bucket là 1 ngày.
// - year: 12 tháng của năm được chọn.
// - month: chia kỳ tài chính (21 -> 20) hiện tại thành 5 khoảng.
function computePeriodBuckets({ period, year, periodKey, weekStart, weekEnd }) {
  if (period === 'week') {
    const start = new Date(weekStart || new Date()); start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd || weekStart || new Date()); end.setHours(23, 59, 59, 999);
    if (end < start) {
      const dayEnd = new Date(start); dayEnd.setHours(23, 59, 59, 999);
      return [{ label: `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}`, start, end: dayEnd }];
    }
    const totalDays = Math.min(62, Math.round((end - start) / 86400000) + 1);
    return Array.from({ length: totalDays }, (_, i) => {
      const dayStart = new Date(start); dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
      return { label: `${String(dayStart.getDate()).padStart(2, '0')}/${String(dayStart.getMonth() + 1).padStart(2, '0')}`, start: dayStart, end: dayEnd };
    });
  }
  if (period === 'year') {
    return Array.from({ length: 12 }, (_, i) => ({
      label: `Th${i + 1}`,
      start: new Date(year, i, 1, 0, 0, 0),
      end: new Date(year, i + 1, 0, 23, 59, 59),
    }));
  }
  const { start: periodStart, end: periodEnd } = periodKeyToRange(periodKey);
  const totalDays = Math.round((periodEnd - periodStart) / 86400000) + 1;
  const chunks = 5;
  const base = Math.floor(totalDays / chunks) || 1;
  const cursor = new Date(periodStart);
  const buckets = [];
  for (let i = 0; i < chunks; i++) {
    const daysInChunk = i === chunks - 1 ? totalDays - base * (chunks - 1) : base;
    const start = new Date(cursor);
    const end = new Date(cursor); end.setDate(end.getDate() + daysInChunk - 1); end.setHours(23, 59, 59, 999);
    buckets.push({ label: `${start.getDate()}-${end.getDate()}`, start, end });
    cursor.setDate(cursor.getDate() + daysInChunk);
  }
  return buckets;
}
function periodBucketMatch(t, b, bi, buckets, period, year) {
  if (period === 'year') {
    const [py, pm] = transactionPeriodKey(t).split('-').map(Number);
    return py === year && pm === bi + 1;
  }
  const d = new Date(t.date || t.created_at);
  if (period === 'week') return d >= b.start && d <= b.end;
  // month (kỳ 21->20): giao dịch ngoài khoảng hiển thị dồn vào bucket đầu/cuối
  if (d < buckets[0].start) return bi === 0;
  if (d > buckets[buckets.length - 1].end) return bi === buckets.length - 1;
  return d >= b.start && d <= b.end;
}
// Chuỗi số liệu theo từng danh mục, cho 1 card lọc thời gian độc lập.
function buildCategorySeriesFor(transactions, cats, txType, buckets, period, periodKey, year) {
  const isPeriodMode = period === 'month';
  return cats
    .map((c) => {
      let catTx = transactions.filter((t) => t.category_id === c.id && t.type === txType);
      if (isPeriodMode) catTx = catTx.filter((t) => transactionPeriodKey(t) === periodKey);
      const values = buckets.map((b, bi) => catTx.filter((t) => periodBucketMatch(t, b, bi, buckets, period, year)).reduce((s, t) => s + Number(t.amount), 0));
      return { ...c, values, total: values.reduce((s, v) => s + v, 0) };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}
// Tổng theo bucket (không chia theo danh mục) — dùng cho đường xu hướng thu nhập.
function bucketTotalsFor(transactions, txType, buckets, period, periodKey, year) {
  const isPeriodMode = period === 'month';
  let txs = transactions.filter((t) => t.type === txType);
  if (isPeriodMode) txs = txs.filter((t) => transactionPeriodKey(t) === periodKey);
  return buckets.map((b, bi) => txs.filter((t) => periodBucketMatch(t, b, bi, buckets, period, year)).reduce((s, t) => s + Number(t.amount), 0));
}
// Giao dịch thô đang được lọc bởi 1 bộ lọc thời gian độc lập (dùng cho modal "Xem chi tiết").
function filteredTxsForCard(transactions, filter, buckets, txType) {
  let txs = transactions.filter((t) => t.type === txType);
  if (filter.period === 'month') {
    txs = txs.filter((t) => transactionPeriodKey(t) === filter.periodKey);
  } else if (filter.period === 'year') {
    txs = txs.filter((t) => Number(transactionPeriodKey(t).split('-')[0]) === filter.year);
  } else {
    const rangeStart = buckets[0].start, rangeEnd = buckets[buckets.length - 1].end;
    txs = txs.filter((t) => { const d = new Date(t.date || t.created_at); return d >= rangeStart && d <= rangeEnd; });
  }
  return txs;
}
function labelForCardFilter(filter) {
  if (filter.period === 'month') return `Tháng ${Number(filter.periodKey.split('-')[1])} (${buildPeriods(filter.year).find((p) => p.key === filter.periodKey)?.label.match(/\(([^)]+)\)/)?.[1] || ''})`;
  if (filter.period === 'year') return `Năm ${filter.year}`;
  const dmy = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  return `${dmy(filter.weekStart)} - ${dmy(filter.weekEnd)}`;
}
// Bộ lọc thời gian (Tuần/Tháng/Năm) độc lập cho 1 card cụ thể trong Dashboard — mỗi
// lần gọi tạo ra 1 state riêng, không chia sẻ với card khác hay với bộ lọc chung.
function useCardPeriod(defaultPeriod = 'month') {
  const [period, setPeriod] = useState(defaultPeriod);
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodKey, setPeriodKey] = useState(currentPeriodKey());
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); });
  const [weekEnd, setWeekEnd] = useState(() => new Date().toISOString().slice(0, 10));
  return { period, setPeriod, year, setYear, periodKey, setPeriodKey, weekStart, setWeekStart, weekEnd, setWeekEnd };
}

// Gộp nhiều "kỳ tài chính" (21 → 20) liên tiếp thành 1 khoảng — dùng cho filter
// Quý / 6 tháng / Năm của Report để KHÔNG phá vỡ financial period (không dùng
// tháng lịch đơn giản 1 → cuối tháng).
function financialMonthRange(year, month) {
  return periodKeyToRange(`${year}-${String(month).padStart(2, '0')}`);
}
function financialMultiMonthRange(year, months) {
  const first = financialMonthRange(year, months[0]);
  const last = financialMonthRange(year, months[months.length - 1]);
  return { start: first.start, end: last.end };
}

// ========== TIME RANGE HELPERS ==========
function getPeriodStartEnd(type, value, year) {
  // value: for month: month number (1-12), for quarter: 1-4, for half: 1 or 2, for year: year, for day: date string, for week: week number? We'll handle week separately.
  // For simplicity, we'll use a date range object.
  let start, end;
  const now = new Date();
  const currentYear = now.getFullYear();
  if (type === 'day') {
    const d = new Date(value);
    start = new Date(d); start.setHours(0,0,0,0);
    end = new Date(d); end.setHours(23,59,59,999);
  } else if (type === 'week') {
    // value is a date representing the week start? We'll use a week picker; for now assume value is a date string of the Monday of that week.
    const d = new Date(value);
    start = new Date(d); start.setHours(0,0,0,0);
    end = new Date(d); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
  } else if (type === 'month') {
    const m = value; // 1-12
    const y = year || currentYear;
    start = new Date(y, m-1, 1, 0,0,0);
    end = new Date(y, m, 0, 23,59,59);
  } else if (type === 'quarter') {
    const q = value; // 1-4
    const y = year || currentYear;
    const startMonth = (q-1)*3;
    start = new Date(y, startMonth, 1, 0,0,0);
    end = new Date(y, startMonth+3, 0, 23,59,59);
  } else if (type === '6month') {
    const h = value; // 1 or 2
    const y = year || currentYear;
    const startMonth = (h-1)*6;
    start = new Date(y, startMonth, 1, 0,0,0);
    end = new Date(y, startMonth+6, 0, 23,59,59);
  } else if (type === 'year') {
    const y = value || currentYear;
    start = new Date(y, 0, 1, 0,0,0);
    end = new Date(y, 11, 31, 23,59,59);
  } else if (type === 'custom') {
    start = new Date(value.start); start.setHours(0,0,0,0);
    end = new Date(value.end); end.setHours(23,59,59,999);
  } else {
    // default to current month
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59);
  }
  return { start, end };
}

function getPreviousPeriod(type, value, year) {
  // returns { start, end } for previous period of same length
  if (type === 'day') {
    const d = new Date(value);
    d.setDate(d.getDate() - 1);
    return getPeriodStartEnd('day', d.toISOString().slice(0,10));
  } else if (type === 'week') {
    const d = new Date(value);
    d.setDate(d.getDate() - 7);
    return getPeriodStartEnd('week', d.toISOString().slice(0,10));
  } else if (type === 'month') {
    let m = value - 1;
    let y = year;
    if (m === 0) { m = 12; y--; }
    return getPeriodStartEnd('month', m, y);
  } else if (type === 'quarter') {
    let q = value - 1;
    let y = year;
    if (q === 0) { q = 4; y--; }
    return getPeriodStartEnd('quarter', q, y);
  } else if (type === '6month') {
    let h = value - 1;
    let y = year;
    if (h === 0) { h = 2; y--; }
    return getPeriodStartEnd('6month', h, y);
  } else if (type === 'year') {
    const y = (value || new Date().getFullYear()) - 1;
    return getPeriodStartEnd('year', y);
  } else if (type === 'custom') {
    // previous same duration: shift both start and end by same duration
    const dur = new Date(value.end) - new Date(value.start);
    const prevStart = new Date(value.start); prevStart.setTime(prevStart.getTime() - dur - 1000); // roughly same length
    const prevEnd = new Date(value.end); prevEnd.setTime(prevEnd.getTime() - dur - 1000);
    return { start: prevStart, end: prevEnd };
  }
  return null;
}

// Filter transactions within date range (using date field)
function filterTransactionsByDate(transactions, start, end) {
  return transactions.filter(t => {
    const d = new Date(t.date || t.created_at);
    return d >= start && d <= end;
  });
}

// Aggregate period data. "Quỹ" và "danh mục chi tiêu thường" được phân biệt qua
// category.is_fund (không suy luận qua account_id) để không lẫn số liệu khi
// khoản chi từ quỹ và khoản chi từ nguồn tiền "Thu nhập" đều có account_id = null.
function aggregatePeriodData(txs, categories) {
  const fundIds = new Set((categories || []).filter((c) => c.is_fund).map((c) => c.id));
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const allocation = txs.filter(t => t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
  const normalExpenses = txs.filter(t => t.type === 'expense' && !fundIds.has(t.category_id));
  const fundExpenses = txs.filter(t => t.type === 'expense' && fundIds.has(t.category_id));
  const expenseFromIncome = normalExpenses.filter(t => t.account_id === null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromWallet = normalExpenses.filter(t => t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromFund = fundExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalActualExpense = expenseFromIncome + expenseFromWallet + expenseFromFund;
  const remaining = income - allocation - expenseFromIncome;
  return { income, allocation, expenseFromIncome, expenseFromWallet, expenseFromFund, totalActualExpense, remaining };
}

// ==== [PHASE 1 — logic tài chính mới theo yêu cầu nghiệp vụ Excel] ====================
// calculatePeriodFinancials: hàm aggregation DUY NHẤT cho 1 "kỳ thu nhập" (21 → 20).
// KHÔNG dùng remaining = income - allocation - expense nữa.
// Dashboard/Report nên chuyển sang gọi hàm này thay cho aggregatePeriodData/periodPool
// (việc thay thế các nơi gọi cũ sẽ làm ở các bước tiếp theo, chưa động vào ở bước này
// để không phá vỡ những màn hình chưa sẵn sàng dùng logic mới).
//
// spendingPoolOverride: số tiền "được phép chi" do người dùng tự cài đặt cho kỳ này
// (lưu ở bảng period_spending_pool). Nếu chưa cài đặt (null/undefined) thì mặc định
// spendingPool = incomeForSpendingPool (giống Ví dụ 1 trong yêu cầu: tích lũy trước chi = 0).
function calculatePeriodFinancials(periodKey, transactions, categories, spendingPoolOverride) {
  const periodTxs = (transactions || []).filter((t) => transactionPeriodKey(t) === periodKey);
  return { periodKey, ...calculateFinancialsFromTxs(periodTxs, categories, spendingPoolOverride) };
}

// Core: tính toàn bộ 10 khái niệm tài chính từ 1 danh sách transaction ĐÃ được lọc sẵn
// (theo kỳ, theo ngày, theo khoảng tuỳ chọn...). Dùng chung cho Dashboard/Report ở mọi chế độ xem.
function calculateFinancialsFromTxs(txs, categories, spendingPoolOverride) {
  const catById = new Map((categories || []).map((c) => [c.id, c]));
  const fundIds = new Set((categories || []).filter((c) => c.is_fund).map((c) => c.id));
  const periodTxs = txs || [];

  // 1-2. Tổng thu nhập + thu nhập tính Chi pool / thu nhập đặc biệt
  const incomeTxs = periodTxs.filter((t) => t.type === 'income');
  const totalIncome = incomeTxs.reduce((s, t) => s + Number(t.amount), 0);
  const incomeForSpendingPool = incomeTxs
    .filter((t) => {
      const cat = catById.get(t.category_id);
      // Dữ liệu cũ chưa có include_in_spending_pool -> coi như true để không đổi hành vi cũ
      return cat ? cat.include_in_spending_pool !== false : true;
    })
    .reduce((s, t) => s + Number(t.amount), 0);
  const specialIncome = totalIncome - incomeForSpendingPool;

  // 5. Chi pool = số tiền người dùng cho phép chi trong kỳ (mặc định = thu nhập tính Chi pool)
  const spendingPool = spendingPoolOverride != null && spendingPoolOverride !== ''
    ? Number(spendingPoolOverride)
    : incomeForSpendingPool;

  // 6. Tích lũy trước chi
  const accumulationBeforeSpend = Math.max(incomeForSpendingPool - spendingPool, 0);

  // 8A. Nạp quỹ từ Chi pool
  // Loại trừ khoản "Nạp quỹ lần đầu" (is_initial === true): khoản này không chọn nguồn
  // tiền, không phải chi từ Thu nhập được chi của kỳ — nó chỉ dùng để tính Tổng tài sản.
  // Đồng thời chỉ tính vào Thu nhập được chi những lần nạp quỹ có nguồn = "Thu nhập"
  // (account_id === null). Nạp quỹ từ 1 ví/tài khoản khác (account_id != null) không
  // trừ vào Thu nhập được chi — tiền chỉ chuyển từ ví đó sang quỹ.
  const allocationFromSpendingPool = periodTxs
    .filter((t) => t.type === 'allocation' && t.is_initial !== true && t.account_id === null)
    .reduce((s, t) => s + Number(t.amount), 0);

  // 8B/8C. Chi tiêu: phân biệt chi từ quỹ (isFund) vs chi thường (theo nguồn tiền)
  const expenseTxs = periodTxs.filter((t) => t.type === 'expense');
  const fundExpenseTxs = expenseTxs.filter((t) => fundIds.has(t.category_id));
  const nonFundExpenseTxs = expenseTxs.filter((t) => !fundIds.has(t.category_id));
  // Nguồn tiền = "Thu nhập" được lưu với account_id === null
  const expenseFromSpendingPool = nonFundExpenseTxs.filter((t) => t.account_id === null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromWallet = nonFundExpenseTxs.filter((t) => t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0);
  const expenseFromFund = fundExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

  const totalSpentFromSpendingPool = allocationFromSpendingPool + expenseFromSpendingPool;
  const remainingAfterSpend = spendingPool - totalSpentFromSpendingPool;
  const totalActualExpense = expenseFromSpendingPool + expenseFromFund;
  const isOverSpendingPool = totalSpentFromSpendingPool > spendingPool;

  return {
    totalIncome,
    incomeForSpendingPool,
    specialIncome,
    spendingPool,
    accumulationBeforeSpend,
    allocationFromSpendingPool,
    expenseFromSpendingPool,
    expenseFromWallet, // giữ lại để hiển thị breakdown, KHÔNG nằm trong totalActualExpense theo spec
    expenseFromFund,
    totalSpentFromSpendingPool,
    remainingAfterSpend,
    totalActualExpense,
    isOverSpendingPool,
  };
}

// Gộp calculatePeriodFinancials của nhiều kỳ liên tiếp (dùng cho Quý / 6 tháng / Năm)
// — cộng dồn theo từng kỳ, KHÔNG gộp transactions rồi tính 1 lần, vì spendingPool
// là khái niệm theo TỪNG kỳ (mỗi kỳ có thể có Chi pool khác nhau).
function calculateFinancialsForPeriods(periodKeys, transactions, categories, spendingPoolByPeriod) {
  const results = (periodKeys || []).map((pk) => calculatePeriodFinancials(pk, transactions, categories, spendingPoolByPeriod?.[pk]));
  const sum = (field) => results.reduce((s, r) => s + r[field], 0);
  return {
    periodKeys,
    totalIncome: sum('totalIncome'),
    incomeForSpendingPool: sum('incomeForSpendingPool'),
    specialIncome: sum('specialIncome'),
    spendingPool: sum('spendingPool'),
    accumulationBeforeSpend: sum('accumulationBeforeSpend'),
    allocationFromSpendingPool: sum('allocationFromSpendingPool'),
    expenseFromSpendingPool: sum('expenseFromSpendingPool'),
    expenseFromWallet: sum('expenseFromWallet'),
    expenseFromFund: sum('expenseFromFund'),
    totalSpentFromSpendingPool: sum('totalSpentFromSpendingPool'),
    remainingAfterSpend: sum('remainingAfterSpend'),
    totalActualExpense: sum('totalActualExpense'),
    byPeriod: results,
  };
}

// Sinh danh sách periodKey (kỳ 21->20) liên tiếp cho 1 khoảng Quý/6 tháng/Năm — dùng để
// gọi calculateFinancialsForPeriods thay vì gộp transaction theo ngày (phá vỡ khái niệm Chi pool theo kỳ).
function periodKeysForMonths(year, months) {
  return months.map((m) => `${year}-${String(m).padStart(2, '0')}`);
}


/* ==============================================================================
   05. SHARED COMPONENTS
   ============================================================================== */
function Gauge({ limit, spent }) {
  const ticks = 48;
  const filledTicks = Math.round((spent / limit) * ticks);
  const radius = 85, center = 100, tickLength = 14;
  const items = [];
  for (let i = 0; i < ticks; i++) {
    const angle = (i / ticks) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const x1 = center + (radius - tickLength) * Math.cos(rad);
    const y1 = center + (radius - tickLength) * Math.sin(rad);
    const x2 = center + radius * Math.cos(rad);
    const y2 = center + radius * Math.sin(rad);
    items.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i < filledTicks ? '#0DBACC' : '#E3D6FF'} strokeWidth="4" strokeLinecap="round" />);
  }
  const labelAngle = (filledTicks / ticks) * 360 - 90;
  const labelRad = (labelAngle * Math.PI) / 180;
  const labelX = center + (radius + 24) * Math.cos(labelRad);
  const labelY = center + (radius + 24) * Math.sin(labelRad);
  return (
    <svg viewBox="0 0 200 200" className="w-56 h-56">
      {items}
      <foreignObject x={labelX - 34} y={labelY - 14} width="68" height="28"><div className="bg-blueberry text-white text-[11px] font-bold rounded-full px-2 py-1 text-center whitespace-nowrap">{formatMoney(spent)}</div></foreignObject>
      <text x={center} y={center - 6} textAnchor="middle" fill="#7E7F90" fontSize="11" fontFamily="Nunito">Hạn mức tháng</text>
      <text x={center} y={center + 18} textAnchor="middle" fill="#303150" fontWeight="700" fontSize="20" fontFamily="Nunito">{formatMoney(limit)}</text>
    </svg>
  );
}

function ProgressBar({ pct, colorClass = 'bg-turquoise' }) {
  return <div className="w-full h-1.5 bg-light-grey/30 dark:bg-light-grey/20 rounded-full overflow-hidden"><div className={`h-full ${colorClass} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>;
}

function ChangeBadge({ pct, good = true }) {
  if (pct === null) return null;
  const isUp = pct >= 0;
  const isGoodDirection = isUp === good;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isGoodDirection ? 'text-turquoise' : 'text-cotton-candy'}`}>
      <Icon size={12} />{Math.abs(Math.round(pct))}% so với tháng trước
    </span>
  );
}

// FIX: cho phép gõ biểu thức cộng/trừ/nhân/chia (vd "50000+2000") rồi tự tính ra kết quả.
// Hỗ trợ 2 kiểu: (1) gõ số thường rồi rời khỏi ô/Enter mới tính; (2) gõ kèm dấu "="
// ở bất kỳ đâu (vd "45000+5000=" hoặc "=45000+5000") sẽ TÍNH NGAY LẬP TỨC, giống máy tính/Excel.
function evalMoneyExpression(str) {
  const cleaned = (str || '').replace(/[^0-9+\-*/.() ]/g, '');
  if (!cleaned.trim()) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + cleaned + ')')();
    if (typeof result === 'number' && isFinite(result)) return Math.round(result);
  } catch (e) { /* biểu thức không hợp lệ -> bỏ qua, giữ giá trị cũ */ }
  return null;
}

// Thêm dấu phẩy ngăn cách hàng nghìn vào TỪNG phần số trong chuỗi (chuỗi có thể
// là biểu thức toán như "1000+2000" — MoneyInput cho phép gõ +-*/() để tính nhanh).
// Phần thập phân sau dấu "." KHÔNG bị chèn dấu phẩy.
function formatWithThousands(text) {
  if (!text) return '';
  return text.split(/([+\-*/()])/).map((part) => {
    if (/^[+\-*/()]$/.test(part)) return part;
    return part.replace(/\d+/g, (digits, offset, str) => {
      // Nếu ngay trước cụm số này là dấu "." thì đây là phần thập phân -> giữ nguyên
      if (str[offset - 1] === '.') return digits;
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
  }).join('');
}

// Đếm số ký tự "thật" (không tính dấu phẩy hiển thị) đứng trước vị trí index trong str.
function countRealCharsBefore(str, index) {
  let count = 0;
  for (let i = 0; i < index && i < str.length; i++) { if (str[i] !== ',') count++; }
  return count;
}
// Tìm vị trí trong str sao cho có đúng "count" ký tự thật đứng trước nó.
function indexAfterRealCharCount(str, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== ',') { seen++; if (seen === count) return i + 1; }
  }
  return str.length;
}

function MoneyInput({ value, onChange, placeholder, className }) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState(''); // luôn KHÔNG có dấu phẩy — dùng để tính toán
  const inputRef = useRef(null);
  const pendingCursor = useRef(null); // số ký tự thật trước con trỏ, để khôi phục vị trí sau khi format lại

  function handleFocus() { setFocused(true); setRawText(value ? String(value) : ''); }

  function handleChange(e) {
    const typed = e.target.value;
    const cursorPos = e.target.selectionStart ?? typed.length;
    if (typed.includes('=')) {
      // người dùng gõ dấu "=" -> tính ngay, không đợi rời ô
      const expr = typed.replace('=', '');
      const cleaned = expr.replace(/[^0-9+\-*/.() ]/g, '');
      const result = evalMoneyExpression(cleaned);
      onChange(result !== null ? String(result) : (value || ''));
      setRawText('');
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    // Ghi nhớ số ký tự thật trước con trỏ (loại bỏ dấu phẩy hiển thị) để canh lại
    // vị trí con trỏ sau khi định dạng lại có thêm/bớt dấu phẩy.
    pendingCursor.current = countRealCharsBefore(typed, cursorPos);
    // vẫn cho gõ số + các phép toán, không chặn ký tự toán tử như trước; bỏ dấu phẩy hiển thị
    setRawText(typed.replace(/[^0-9+\-*/.() ]/g, ''));
  }

  function commit() {
    const result = evalMoneyExpression(rawText);
    onChange(result !== null ? String(result) : (value || ''));
  }

  function handleBlur() { setFocused(false); commit(); }
  function handleKeyDown(e) { if (e.key === 'Enter') { e.currentTarget.blur(); } }

  // Luôn hiện dấu phẩy ngăn cách hàng nghìn — cả khi đang gõ lẫn khi đã rời ô.
  const displayValue = focused ? formatWithThousands(rawText) : (value ? Number(value).toLocaleString('en-US') : '');

  useEffect(() => {
    if (focused && inputRef.current && pendingCursor.current != null) {
      const pos = indexAfterRealCharCount(inputRef.current.value, pendingCursor.current);
      inputRef.current.setSelectionRange(pos, pos);
      pendingCursor.current = null;
    }
  }, [displayValue, focused]);

  return (
    <input ref={inputRef} type="text" inputMode="text" value={displayValue}
      onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown}
      placeholder={placeholder} className={className} />
  );
}

// ==============================================================================
// CUSTOM SELECT — thay thế thẻ select gốc của trình duyệt dùng chung toàn app.
// Lý do: danh sách lựa chọn của select gốc do hệ điều hành/trình duyệt tự vẽ
// (native picker), không thể tô theo theme sáng/tối của app — trên mobile
// thường ra nền trắng/xanh dương mặc định, lệch hẳn với giao diện tối.
// API giữ tương thích với select gốc: nhận value/onChange (onChange nhận object
// dạng { target: { value } } giống sự kiện thật) và các <option> con y hệt,
// nên chỉ cần đổi tên thẻ select/select thành CustomSelect/CustomSelect.
// - className: áp cho khung ngoài (dùng cho margin, width tổng thể, ví dụ mb-3)
// - triggerClassName: áp cho nút hiển thị giá trị đang chọn (dùng lại nguyên
//   className cũ của select gốc để giữ đúng màu nền/bo góc/padding sẵn có)
// - align: 'left' | 'right' — căn menu theo cạnh nào của nút trigger
// ==============================================================================
function CustomSelect({ value, onChange, children, className = '', triggerClassName = '', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children)
    .filter((opt) => opt && opt.props)
    .map((opt) => ({ value: opt.props.value, label: opt.props.children, disabled: opt.props.disabled }));
  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClassName} flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{selected ? selected.label : ''}</span>
        <ChevronDown size={14} className={`flex-shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute' }} className={`z-40 mt-1 ${align === 'right' ? 'right-0' : 'left-0'} min-w-full frost-card rounded-2xl shadow-card overflow-hidden`}>
            {/* Blob màu mờ cố định (không cuộn theo list) — cho hiệu ứng kính lỏng
                rõ ràng ngay cả khi nền phía sau phẳng/không có gì để blur. */}
            <div className="pointer-events-none absolute -top-8 -left-8 w-28 h-28 rounded-full bg-turquoise/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-lavender/25 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent" />
            <div className="relative max-h-64 overflow-y-auto overflow-x-hidden scrollbar-hide py-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  onClick={() => { onChange({ target: { value: o.value } }); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm whitespace-nowrap hover:bg-white/40 dark:hover:bg-white/10 transition disabled:opacity-40 ${String(o.value) === String(value) ? 'text-turquoise font-bold' : 'text-blueberry dark:text-white'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmojiCircle({ emoji, size = 36, active = false, activeColor = '#0DBACC', bg = '#F7F7F8' }) {
  return <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size, height: size, background: active ? activeColor : bg, fontSize: size * 0.5 }}>{emoji || '❔'}</div>;
}

function SummaryCard({ icon: Icon, iconBg, label, value, sub }) {
  return (
    <div className="frost-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-steel dark:text-light-grey text-xs font-semibold mb-1">{label}</p>
      <p className="text-blueberry dark:text-white text-xl font-bold">{value}</p>
      {sub && <p className="text-steel dark:text-light-grey text-xs mt-1">{sub}</p>}
    </div>
  );
}

function MiniRing({ pct, color, label }) {
  const r = 15, c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 36 36" className="w-8 h-8 flex-shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E3D6FF" className="dark:stroke-light-grey/20" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="leading-tight">
        <p className="text-blueberry dark:text-white text-xs font-bold">{Math.round(pct)}%</p>
        <p className="text-steel dark:text-light-grey text-[10px]">{label}</p>
      </div>
    </div>
  );
}

/* ==============================================================================
   06. LAYOUT COMPONENTS (Sidebar, Header, BottomNav)
   ============================================================================== */

function SidebarDesktop({ screen, setScreen, sidebarCollapsed, toggleSidebar, theme, toggleTheme, appLogoUrl }) {
  const isDark = theme === 'dark';
  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 sticky top-0 self-start h-[100dvh] ${sidebarCollapsed ? 'w-20' : 'w-64'} py-6 z-20 overflow-y-auto overflow-x-hidden scrollbar-hide transition-[width] duration-200 relative`}
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(29,30,56,0.70) 0%, rgba(17,18,37,0.78) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 100%)',
        backdropFilter: 'blur(26px) saturate(180%)',
        WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        borderRight: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.55)',
        boxShadow: isDark
          ? 'inset -1px 0 0 rgba(255,255,255,0.05), 8px 0 32px -18px rgba(0,0,0,0.55)'
          : 'inset -1px 0 0 rgba(255,255,255,0.5), 8px 0 32px -18px rgba(48,49,80,0.16)',
      }}
    >
      {/* ambient glass glow blobs — decorative only */}
      <div className={`pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl ${isDark ? 'bg-turquoise/25' : 'bg-turquoise-light/60'}`} />
      <div className={`pointer-events-none absolute bottom-24 -right-14 w-56 h-56 rounded-full blur-3xl ${isDark ? 'bg-lavender/25' : 'bg-lavender-light/60'}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent to-transparent ${isDark ? 'via-white/10' : 'via-white/70'}`} />

      <div className={`relative flex items-center mb-8 overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-1'}`}>
        <button onClick={toggleSidebar} title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'} className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 hover:opacity-90 transition shadow-md shadow-turquoise/30 overflow-hidden">
          {appLogoUrl ? <img src={appLogoUrl} alt="" className="w-full h-full object-cover" /> : <Wallet size={17} className="text-white" />}
        </button>
        <span className={`font-extrabold text-blueberry dark:text-white text-lg whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'}`}>PandaFi</span>
      </div>

      <div className="relative flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              onClick={() => setScreen(key)}
              title={sidebarCollapsed ? label : undefined}
              className={`flex items-center rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'} ${active ? 'text-turquoise' : 'text-steel dark:text-light-grey hover:bg-white/40 dark:hover:bg-white/[0.06]'}`}
              style={active ? {
                background: isDark ? 'rgba(13,186,204,0.14)' : 'rgba(13,186,204,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: isDark ? '1px solid rgba(13,186,204,0.25)' : '1px solid rgba(13,186,204,0.18)',
                boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
              } : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className={`relative mt-auto flex flex-col gap-3 ${sidebarCollapsed ? 'items-center' : ''}`}>
        {sidebarCollapsed ? (
          <button onClick={toggleTheme} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50 dark:bg-white/[0.06] backdrop-blur text-steel dark:text-light-grey border border-white/60 dark:border-white/10">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-white/50 dark:bg-white/[0.06] backdrop-blur rounded-full p-1 self-start border border-white/60 dark:border-white/10">
            <button onClick={() => theme !== 'light' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'light' ? 'bg-white dark:bg-night-sky shadow text-blueberry dark:text-white' : 'text-steel dark:text-light-grey'}`}>
              <Sun size={15} />
            </button>
            <button onClick={() => theme !== 'dark' && toggleTheme()} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${theme === 'dark' ? 'bg-blueberry shadow text-white' : 'text-steel dark:text-light-grey'}`}>
              <Moon size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// Menu dropdown avatar dùng chung (desktop header + mobile dashboard),
// theo cấu trúc "trigger + card menu (nhóm mục + separator + đăng xuất)"
// giống DropdownMenuAvatar (shadcn) mà người dùng cung cấp — viết lại bằng
// React thuần vì project này không cài shadcn/ui (@/components/ui/...).
function AvatarMenu({ avatarUrl, displayName, openSettings, variant = 'desktop' }) {
  const [open, setOpen] = useState(false);
  useCloseOnEscape(open, () => setOpen(false));

  const items = [
    { key: 'profile', label: 'Hồ sơ', icon: BadgeCheck },
    { key: 'data', label: 'Dữ liệu', icon: CreditCard },
    { key: 'history', label: 'Lịch sử', icon: Clock },
  ];

  function go(section) {
    setOpen(false);
    openSettings && openSettings(section);
  }

  async function handleLogout() {
    setOpen(false);
    await supabase.auth.signOut();
  }

  const initial = (displayName || 'B')[0].toUpperCase();
  const isDesktop = variant === 'desktop';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={isDesktop
          ? 'flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 transition'
          : 'w-11 h-11 rounded-full bg-white/30 backdrop-blur flex items-center justify-center text-white border border-white/40 overflow-hidden'}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={isDesktop ? 'w-9 h-9 rounded-full object-cover flex-shrink-0' : 'w-full h-full object-cover'} />
        ) : isDesktop ? (
          <div className="w-9 h-9 rounded-full bg-gradient-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{initial}</div>
        ) : (
          <span className="font-bold">{initial}</span>
        )}
        {isDesktop && (
          <>
            <span className="text-sm font-bold text-blueberry dark:text-white">{displayName || 'Bạn'}</span>
            <ChevronDown size={14} className="text-steel dark:text-light-grey" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute' }} className={`${isDesktop ? 'top-12' : 'top-14'} right-0 bg-white/78 dark:bg-[#1e1e32]/70 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-card border border-white/60 dark:border-[rgba(255,255,255,0.10)] py-1.5 w-56 z-40 overflow-hidden`}>
            <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent" />
            {items.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => go(key)}
                className="relative w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-blueberry dark:text-white hover:bg-white/40 dark:hover:bg-white/10"
              >
                <Icon size={15} className="text-steel dark:text-light-grey" /> {label}
              </button>
            ))}
            <div className="relative h-px bg-light-grey/20 dark:bg-light-grey/10 my-1.5" />
            <button
              onClick={handleLogout}
              className="relative w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-cotton-candy hover:bg-cotton-candy-light/60 dark:hover:bg-white/10"
            >
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HeaderDesktop({ onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings }) {
  const [search, setSearch] = useState('');
  const isDark = theme === 'dark';

  return (
    <header
      className="hidden md:flex sticky top-0 z-10 px-6 md:px-8 py-4 items-center justify-between relative"
      style={{
        background: isDark ? 'rgba(20,20,45,0.55)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.5)',
        boxShadow: isDark ? '0 10px 30px -18px rgba(0,0,0,0.45)' : '0 10px 30px -18px rgba(48,49,80,0.18)',
      }}
    >
      {/* Lớp riêng chỉ để cắt viền các blob trang trí — KHÔNG bọc luôn nội dung
          tương tác (menu avatar), tránh bị overflow-hidden cắt mất khi mở dropdown. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15" />
        <div className="absolute -top-10 right-24 w-56 h-32 rounded-full bg-turquoise-light/45 dark:bg-turquoise/20 blur-2xl" />
      </div>
      <div className="flex items-center gap-2 bg-white/50 dark:bg-white/[0.06] backdrop-blur rounded-full px-4 py-2.5 w-72 border border-white/60 dark:border-white/10 relative z-10">
        <Search size={16} className="text-steel dark:text-light-grey" />
        <input
          placeholder="Tìm kiếm nhanh"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white placeholder:text-steel dark:placeholder:text-light-grey"
        />
      </div>
      <div className="flex items-center gap-3 relative z-10">
        <button onClick={onAddClick} className="bg-gradient-primary text-white rounded-full px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-md shadow-turquoise/30">
          <Plus size={16} /> Thêm giao dịch
        </button>
        <button className="w-9 h-9 rounded-full bg-white/50 dark:bg-white/[0.06] backdrop-blur border border-white/60 dark:border-white/10 flex items-center justify-center text-steel dark:text-light-grey">
          <Bell size={16} />
        </button>
        <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} openSettings={openSettings} variant="desktop" />
      </div>
    </header>
  );
}

function BottomNavMobile({ screen, setScreen, onAddClick, theme, toggleTheme, openSettings }) {
  const isDark = theme === 'dark';
  // "Quản lý" (funds / accounts / goals) floating glass sub-menu
  const [manageOpen, setManageOpen] = useState(false);
  const [manageMounted, setManageMounted] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const navWrapRef = useRef(null);

  const isManageActive = screen === 'funds' || screen === 'accounts' || screen === 'goals';

  // Mount for enter animation, keep mounted briefly for exit animation (transform/opacity only — no layout shift)
  useEffect(() => {
    let t;
    if (manageOpen) {
      setManageMounted(true);
    } else if (manageMounted) {
      t = setTimeout(() => setManageMounted(false), 220);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageOpen]);

  // Click/tap outside the whole nav complex closes the menu
  useEffect(() => {
    if (!manageOpen) return;
    function handleOutside(e) {
      if (navWrapRef.current && !navWrapRef.current.contains(e.target)) {
        setManageOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [manageOpen]);

  function go(nextScreen) {
    setManageOpen(false);
    setQuickMenuOpen(false);
    setScreen(nextScreen);
  }

  function handleAdd() {
    setManageOpen(false);
    setQuickMenuOpen((v) => !v);
  }

  function handleProfile() {
    setManageOpen(false);
    setQuickMenuOpen(false);
    if (openSettings) openSettings('profile');
    else setScreen('settings');
  }

  const manageItems = [
    { key: 'funds', label: 'Quản lý quỹ', sub: 'Theo dõi các quỹ', icon: PiggyBank },
    { key: 'accounts', label: 'Quản lý ví', sub: 'Theo dõi tài khoản / ví', icon: Wallet },
    { key: 'goals', label: 'Quản lý mục tiêu', sub: 'Theo dõi tiến độ mục tiêu', icon: Target },
  ];

  const NavIcon = ({ icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex items-center justify-center w-11 h-11 active:scale-90 transition-transform duration-150"
    >
      {active && (
        <span
          className="absolute top-0.5 w-1 h-1 rounded-full"
          style={{ background: '#0DBACC', boxShadow: '0 0 8px 1px rgba(13,186,204,0.8)' }}
        />
      )}
      <Icon
        size={20}
        strokeWidth={2.1}
        style={{ color: active ? '#0DBACC' : isDark ? 'rgba(255,255,255,0.72)' : 'rgba(48,49,80,0.55)' }}
      />
    </button>
  );

  return (
    <>
      {/* Theme toggle button on mobile */}
      <button onClick={toggleTheme} className="fixed top-6 right-5 w-10 h-10 rounded-full bg-white/40 dark:bg-night-sky/45 backdrop-blur-[24px] backdrop-saturate-[200%] border border-white/70 dark:border-white/10 shadow-lg flex items-center justify-center z-20 md:hidden">
        {theme === 'dark' ? <Sun size={17} className="text-turquoise" /> : <Moon size={17} className="text-blueberry" />}
      </button>

      {/* Floating Curved Liquid Glass Bottom Navigation */}
      <div
        ref={navWrapRef}
        className="fixed left-1/2 z-20 md:hidden"
        style={{
          transform: 'translateX(-50%)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          width: 'calc(100% - 28px)',
          maxWidth: '430px',
        }}
      >
        <div className="relative">

          {/* Floating "Quản lý" glass popup menu */}
          {manageMounted && (
            <div
              className="absolute left-1 bottom-[70px] w-[240px] max-w-[80%] rounded-[22px] overflow-hidden transition-all ease-out"
              style={{
                transitionDuration: '220ms',
                transformOrigin: 'bottom left',
                opacity: manageOpen ? 1 : 0,
                transform: manageOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
                pointerEvents: manageOpen ? 'auto' : 'none',
                background: isDark ? 'rgba(25,27,48,0.72)' : 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(48,49,80,0.08)',
                boxShadow: isDark
                  ? '0 20px 50px rgba(0,0,0,0.35), 0 0 30px -8px rgba(13,186,204,0.20), inset 0 1px 0 rgba(255,255,255,0.16)'
                  : '0 20px 50px rgba(48,49,80,0.18), 0 0 30px -8px rgba(13,186,204,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
              }}
            >
              {/* subtle color reflections, purely decorative */}
              <div className="pointer-events-none absolute -top-10 -left-6 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -right-6 w-24 h-24 rounded-full bg-lavender/25 blur-2xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative px-3.5 pt-3.5 pb-2.5">
                <p className="text-[11px] font-extrabold tracking-wide mb-2 px-1" style={{ color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(48,49,80,0.85)' }}>
                  Quản lý tài chính
                </p>
                <div className="flex flex-col gap-0.5">
                  {manageItems.map(({ key, label, sub, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => go(key)}
                      className={`flex items-center gap-2.5 px-1.5 py-2 rounded-2xl text-left active:scale-[0.98] transition ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]'}`}
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(13,186,204,0.25), rgba(159,127,224,0.25))', border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(48,49,80,0.10)' }}
                      >
                        <Icon size={16} style={{ color: screen === key ? '#0DBACC' : '#B88CFF' }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold leading-tight" style={{ color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(48,49,80,0.90)' }}>{label}</span>
                        <span className="block text-[11px] leading-tight truncate" style={{ color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(48,49,80,0.55)' }}>{sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick action menu (from + button) */}
          {quickMenuOpen && (
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-[70px] w-[220px] rounded-[22px] overflow-hidden transition-all ease-out"
              style={{
                background: isDark ? 'rgba(25,27,48,0.80)' : 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(48,49,80,0.08)',
                boxShadow: isDark
                  ? '0 20px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.16)'
                  : '0 20px 50px rgba(48,49,80,0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
                padding: '10px 0',
              }}
            >
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('income'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <TrendingUp size={18} className="text-turquoise" /> Thu nhập
              </button>
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('allocation'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <PiggyBank size={18} className="text-baby-blue" /> Nạp quỹ
              </button>
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('expense'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <TrendingDown size={18} className="text-cotton-candy" /> Chi tiêu
              </button>
              <button onClick={() => { setQuickMenuOpen(false); onAddClick('transfer'); }} className={`w-full flex items-center gap-3 px-5 py-2.5 transition ${isDark ? 'text-white hover:bg-white/10' : 'text-blueberry hover:bg-black/[0.04]'}`}>
                <SendHorizontal size={18} className="text-lavender" /> Chuyển khoản
              </button>
            </div>
          )}

          {/* Raised center "+" button — absolutely positioned, never causes layout shift */}
          <button
            onClick={handleAdd}
            aria-label="Thêm giao dịch"
            className="absolute left-1/2 z-10 flex items-center justify-center rounded-full active:scale-95 transition-transform duration-150"
            style={{
              top: '-18px',
              transform: 'translateX(-50%)',
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #0DBACC 0%, #3BC9E8 55%, #B88CFF 100%)',
              boxShadow: '0 8px 18px -4px rgba(13,186,204,0.55), 0 0 0 5px rgba(13,186,204,0.10), 0 3px 8px rgba(0,0,0,0.30)',
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)', mixBlendMode: 'overlay' }}
            />
            <Plus size={20} strokeWidth={2.5} className="text-white relative z-10" />
          </button>

          {/* Curved liquid-glass bar */}
          <div
            className="relative rounded-[24px] h-[58px] flex items-center justify-between px-3 overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(29,30,56,0.72) 0%, rgba(17,18,37,0.78) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.68) 100%)',
              backdropFilter: 'blur(26px) saturate(180%)',
              WebkitBackdropFilter: 'blur(26px) saturate(180%)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.5)',
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -14px 24px -18px rgba(159,127,224,0.18), 0 18px 40px -12px rgba(0,0,0,0.55), 0 0 36px -14px rgba(13,186,204,0.22)'
                : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 14px 32px -12px rgba(48,49,80,0.22), 0 6px 18px -8px rgba(48,49,80,0.12)',
            }}
          >
            {/* top highlight line + soft inner glow blobs — decorative only */}
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDark ? 'via-white/45' : 'via-white/80'}`} />
            <div className={`pointer-events-none absolute -top-6 left-8 w-24 h-16 rounded-full blur-2xl ${isDark ? 'bg-white/10' : 'bg-turquoise/15'}`} />
            <div className="pointer-events-none absolute -bottom-6 right-10 w-20 h-16 rounded-full bg-lavender/15 blur-2xl" />

            <div className="relative z-10 flex items-center justify-between w-full">
              <NavIcon icon={Home} label="Trang chủ" active={screen === 'dashboard'} onClick={() => go('dashboard')} />
              <NavIcon icon={LayoutGrid} label="Quản lý" active={isManageActive || manageOpen} onClick={() => setManageOpen((v) => !v)} />

              {/* spacer reserving space under the raised + button */}
              <span className="w-11 flex-shrink-0" aria-hidden="true" />

              <NavIcon icon={BarChart3} label="Báo cáo" active={screen === 'report'} onClick={() => go('report')} />
              <NavIcon icon={User} label="Profile" active={screen === 'settings'} onClick={handleProfile} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ==============================================================================
   07. MODALS
   ============================================================================== */
function AddTransaction({ onClose, accounts, categories, transactions, onSaved, initialType, spendingPoolByPeriod }) {
  const [type, setType] = useState(initialType || 'expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedYear, setSelectedYear] = useState(Number(currentPeriodKey().split('-')[0]));
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodKey());
  const [expenseSource, setExpenseSource] = useState(null);
  const [note, setNote] = useState('');
  const [dateTime, setDateTime] = useState(nowForInput());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  const categoryType = type === 'income' ? 'income' : 'expense';
  const categoryList = categories.filter((c) => c.type === categoryType && (type !== 'allocation' || c.is_fund));
  const activeCat = categories.find((c) => c.id === selectedCategory);
  const isFundCategory = type === 'expense' && !!activeCat?.is_fund;
  const overLimit = type === 'expense' && activeCat?.monthly_limit && Number(amount) > Number(activeCat.monthly_limit);

  const usesPeriod = type === 'income' || (type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income');
  // Compute financials for the selected period using the new logic
  const financials = usesPeriod && selectedPeriod
    ? calculatePeriodFinancials(selectedPeriod, transactions, categories, spendingPoolByPeriod?.[selectedPeriod])
    : null;
  const remainingAfterSpend = financials?.remainingAfterSpend ?? 0;
  const periodOverLimit = ((type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income'))
    && amount
    && Number(amount) > remainingAfterSpend;

  const fundBalanceNow = isFundCategory ? fundBalanceWithProfit(activeCat, transactions || []) : null;
  const fundOverBalance = isFundCategory && amount && Number(amount) > fundBalanceNow;
  const sourceAccount = ((type === 'expense' && !isFundCategory) || type === 'allocation') && expenseSource && expenseSource !== 'income' ? accounts.find((a) => a.id === expenseSource) : null;
  const sourceOverBalance = sourceAccount && amount && Number(amount) > accountBalance(sourceAccount, transactions || []);

  // FIX: dùng chung MoneyInput để hỗ trợ gõ biểu thức cộng/trừ/nhân/chia (xem MoneyInput ở trên).
  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }

  function handleTypeChange(t) {
    setType(t);
    setSelectedCategory(null);
    setExpenseSource(null);
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }

  function handleCategoryChange(id) {
    setSelectedCategory(id);
    setExpenseSource(null);
  }

  function handleExpenseSourceSelect(source) {
    setExpenseSource(source);
  }

  function resetForm() {
    setAmount('');
    setSelectedCategory(null);
    setExpenseSource(null);
    setNote('');
    setDateTime(nowForInput());
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { alert('Vui lòng chọn danh mục'); return; }

    let accountIdToSave = null;
    let noteToSave = note || null;

    // Check overlimit
    if (overLimit) {
      const confirm = window.confirm(
        `Khoản chi này vượt quá hạn mức ${formatMoney(activeCat.monthly_limit)}. Bạn vẫn muốn tiếp tục nhập?`
      );
      if (!confirm) return;
      noteToSave = `[Vượt hạn mức] ${noteToSave || ''}`;
    }

    if (type === 'income') {
      if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
      noteToSave = tagPeriodNote(selectedPeriod, note);
    } else if (type === 'allocation') {
      if (!expenseSource) { alert('Vui lòng chọn Nguồn tiền cho khoản nạp quỹ này.'); return; }
      if (expenseSource === 'income') {
        if (!selectedPeriod) { alert('Vui lòng chọn Kỳ (nguồn thu nhập để nạp quỹ)'); return; }
        if (periodOverLimit) { alert('Số tiền nạp vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
        noteToSave = tagPeriodNote(selectedPeriod, note);
      } else {
        if (sourceOverBalance) { alert('Số dư nguồn tiền không đủ.'); return; }
        accountIdToSave = expenseSource;
      }
    } else if (type === 'expense') {
      if (isFundCategory) {
        // Chi tiêu từ quỹ: trừ thẳng vào quỹ, không cần chọn nguồn tiền.
        if (fundOverBalance) { alert('Số dư quỹ không đủ.'); return; }
      } else {
        if (!expenseSource) { alert('Vui lòng chọn Nguồn tiền cho khoản chi tiêu này.'); return; }
        if (expenseSource === 'income') {
          if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
          if (periodOverLimit) { alert('Số tiền chi vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
          noteToSave = tagPeriodNote(selectedPeriod, note);
        } else {
          if (sourceOverBalance) { alert('Số dư nguồn tiền không đủ.'); return; }
          accountIdToSave = expenseSource;
        }
      }
    }

    setSaving(true);
    const { error } = await supabase.from('transactions').insert({
      account_id: accountIdToSave, category_id: selectedCategory, type, amount: Number(amount),
      note: noteToSave, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi khi lưu: ' + error.message); return; }
    onSaved();
    resetForm();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e1e32] w-full h-full md:h-auto md:max-h-[88vh] md:max-w-xl md:rounded-3xl md:overflow-y-auto overflow-y-auto relative scrollbar-hide">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e1e32] z-10">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ice-cream dark:bg-night-sky flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
          <h1 className="text-blueberry dark:text-white text-lg font-bold">Thêm giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1">
            <button onClick={() => handleTypeChange('income')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Thu nhập</button>
            <button onClick={() => handleTypeChange('allocation')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'allocation' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Nạp quỹ</button>
            <button onClick={() => handleTypeChange('expense')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Chi tiêu</button>
          </div>
          {type === 'allocation' && <p className="text-steel dark:text-light-grey text-xs mt-2 text-center">Nạp quỹ từ Thu nhập của 1 Kỳ, hoặc chuyển thẳng từ 1 ví/tài khoản.</p>}
          {type === 'income' && <p className="text-steel dark:text-light-grey text-xs mt-2 text-center">Thu nhập được gom theo Kỳ — nhiều khoản thu trong cùng 1 Kỳ sẽ được cộng dồn lại.</p>}
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit || periodOverLimit ? 'text-cotton-candy' : type === 'income' || type === 'allocation' ? 'text-turquoise' : 'text-blueberry dark:text-white'}`} />
            <span className="text-4xl font-bold text-light-grey">đ</span>
          </div>
          {overLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt hạn mức {formatMoney(activeCat.monthly_limit)} của danh mục này!</p>}
          {periodOverLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt Thu nhập được chi còn lại ({formatMoney(remainingAfterSpend)}) của kỳ này!</p>}
          {fundOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của quỹ ({formatMoney(fundBalanceNow)})!</p>}
          {sourceOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của nguồn tiền này ({formatMoney(accountBalance(sourceAccount, transactions || []))})!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">{type === 'income' ? 'Danh mục thu nhập' : 'Quỹ / Danh mục'} <span className="text-cotton-candy">*</span></p>
          {categoryList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = type === 'expense' && cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
                return (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={cat.icon} size={48} active={active} activeColor={willExceed ? '#F18AB5' : '#0DBACC'} />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {type === 'expense' && isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-steel dark:text-light-grey text-xs bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3">Khoản này được trừ trực tiếp từ quỹ "{activeCat.name}" — không cần chọn nguồn tiền.</p>
          </div>
        )}

        {type === 'allocation' && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chọn "Thu nhập" nếu nạp quỹ từ Thu nhập được chi của Kỳ (sẽ trừ vào Thu nhập được chi). Chọn 1 ví/tài khoản khác nếu chuyển thẳng tiền có sẵn vào quỹ (KHÔNG trừ vào Thu nhập được chi).</p>
          </div>
        )}

        {type === 'expense' && !isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chỉ được chọn 1 nguồn tiền cho khoản chi này.</p>
          </div>
        )}

        {usesPeriod && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Năm <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Kỳ <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
            {financials && (
              <div className="mt-2 text-xs space-y-1 text-steel dark:text-light-grey">
                <p><span className="font-semibold">Thu nhập tính vào Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.incomeForSpendingPool)}</span></p>
                <p><span className="font-semibold">Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.spendingPool)}</span></p>
                <p><span className="font-semibold">Đã sử dụng (nạp quỹ + chi từ Thu nhập được chi):</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.totalSpentFromSpendingPool)}</span></p>
                <p><span className="font-semibold">Còn lại trong Thu nhập được chi:</span> <span className={`font-bold ${financials.remainingAfterSpend >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoney(financials.remainingAfterSpend)}</span></p>
                {financials.specialIncome > 0 && (
                  <p><span className="font-semibold">Thu nhập đặc biệt:</span> <span className="text-lavender font-bold">{formatMoney(financials.specialIncome)}</span></p>
                )}
                {financials.accumulationBeforeSpend > 0 && (
                  <p><span className="font-semibold">Tích lũy trước chi:</span> <span className="text-lavender font-bold">{formatMoney(financials.accumulationBeforeSpend)}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ngày giờ</p>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-10 pb-10">
          {savedMsg && <p className="text-turquoise text-sm text-center mb-3 bg-turquoise-light dark:bg-turquoise/10 rounded-xl py-2 font-semibold">✓ Đã lưu giao dịch. Bạn có thể thêm giao dịch tiếp theo.</p>}
          <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Lưu giao dịch'}</button>
        </div>
      </div>
    </div>
  );
}

function EditTransaction({ transaction, onClose, accounts, categories, transactions: allTx, onSaved, spendingPoolByPeriod }) {
  const [type, setType] = useState(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [selectedCategory, setSelectedCategory] = useState(transaction.category_id);
  const [selectedYear, setSelectedYear] = useState(() => {
    const pk = parsePeriodTag(transaction.note) || dateToPeriodKey(transaction.date || transaction.created_at);
    return Number(pk.split('-')[0]);
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => parsePeriodTag(transaction.note) || dateToPeriodKey(transaction.date || transaction.created_at));
  const [expenseSource, setExpenseSource] = useState(transaction.account_id || 'income');
  const [note, setNote] = useState(stripPeriodTag(transaction.note || ''));
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date(transaction.created_at || transaction.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  const activeCat = categories.find((c) => c.id === selectedCategory);
  const isFundCategory = type === 'expense' && !!activeCat?.is_fund;
  const overLimit = type === 'expense' && activeCat?.monthly_limit && Number(amount) > Number(activeCat.monthly_limit);
  const usesPeriod = type === 'income' || (type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income');

  // Exclude the current transaction from the pool calculation to check if the new amount exceeds remaining
  const otherTxs = (allTx || []).filter(t => t.id !== transaction.id);
  const financials = usesPeriod && selectedPeriod
    ? calculatePeriodFinancials(selectedPeriod, otherTxs, categories, spendingPoolByPeriod?.[selectedPeriod])
    : null;
  const remainingAfterSpend = financials?.remainingAfterSpend ?? 0;
  const periodOverLimit = ((type === 'allocation' && expenseSource === 'income') || (type === 'expense' && !isFundCategory && expenseSource === 'income'))
    && amount
    && Number(amount) > remainingAfterSpend;

  const fundBalanceNow = isFundCategory ? fundBalanceWithProfit(activeCat, allTx || []) : null;
  const fundOverBalance = isFundCategory && amount && Number(amount) > fundBalanceNow;
  const sourceAccount = ((type === 'expense' && !isFundCategory) || type === 'allocation') && expenseSource && expenseSource !== 'income' ? accounts.find((a) => a.id === expenseSource) : null;
  const sourceOverBalance = sourceAccount && amount && Number(amount) > accountBalance(sourceAccount, allTx || []);

  // Fix categoryList bug
  const categoryList = categories.filter(c => {
    if (type === 'allocation') return c.is_fund;
    return c.type === (type === 'income' ? 'income' : 'expense');
  });

  // FIX: dùng chung MoneyInput để hỗ trợ gõ biểu thức cộng/trừ/nhân/chia.
  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }
  function handleTypeChange(t) {
    setType(t);
    setSelectedCategory(null);
    setExpenseSource(null);
    setSelectedYear(Number(currentPeriodKey().split('-')[0]));
    setSelectedPeriod(currentPeriodKey());
  }
  function handleCategoryChange(id) {
    setSelectedCategory(id);
    setExpenseSource(null);
  }
  function handleExpenseSourceSelect(source) {
    setExpenseSource(source);
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Vui lòng nhập số tiền'); return; }
    if (!selectedCategory) { alert('Vui lòng chọn danh mục'); return; }

    let accountIdToSave = null;
    let noteToSave = note || null;

    if (overLimit) {
      const confirm = window.confirm(
        `Khoản chi này vượt quá hạn mức ${formatMoney(activeCat.monthly_limit)}. Bạn vẫn muốn tiếp tục nhập?`
      );
      if (!confirm) return;
      noteToSave = `[Vượt hạn mức] ${noteToSave || ''}`;
    }

    if (type === 'income') {
      if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
      noteToSave = tagPeriodNote(selectedPeriod, note);
    } else if (type === 'allocation') {
      if (!expenseSource) { alert('Vui lòng chọn Nguồn tiền cho khoản nạp quỹ này.'); return; }
      if (expenseSource === 'income') {
        if (!selectedPeriod) { alert('Vui lòng chọn Kỳ (nguồn thu nhập để nạp quỹ)'); return; }
        if (periodOverLimit) { alert('Số tiền nạp vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
        noteToSave = tagPeriodNote(selectedPeriod, note);
      } else {
        if (sourceOverBalance) { alert('Số dư nguồn tiền không đủ.'); return; }
        accountIdToSave = expenseSource;
      }
    } else if (type === 'expense') {
      if (isFundCategory) {
        if (fundOverBalance) { alert('Số dư quỹ không đủ.'); return; }
      } else {
        if (!expenseSource) { alert('Vui lòng chọn Nguồn tiền cho khoản chi tiêu này.'); return; }
        if (expenseSource === 'income') {
          if (!selectedPeriod) { alert('Vui lòng chọn Kỳ'); return; }
          if (periodOverLimit) { alert('Số tiền chi vượt quá Thu nhập được chi còn lại của kỳ thu nhập.'); return; }
          noteToSave = tagPeriodNote(selectedPeriod, note);
        } else {
          if (sourceOverBalance) { alert('Số dư nguồn tiền không đủ.'); return; }
          accountIdToSave = expenseSource;
        }
      }
    }

    setSaving(true);
    const { error } = await supabase.from('transactions').update({
      account_id: accountIdToSave, category_id: selectedCategory, type, amount: Number(amount),
      note: noteToSave, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    }).eq('id', transaction.id);
    setSaving(false);
    if (error) { alert('Lỗi khi lưu: ' + error.message); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/0 md:bg-black/40 z-30 md:flex md:items-center md:justify-center md:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1e1e32] w-full h-full md:h-auto md:max-h-[88vh] md:max-w-xl md:rounded-3xl md:overflow-y-auto overflow-y-auto relative scrollbar-hide">
        <div className="px-5 pt-8 md:pt-6 flex items-center justify-between sticky top-0 bg-white dark:bg-[#1e1e32] z-10">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-ice-cream dark:bg-night-sky flex items-center justify-center"><X size={18} className="text-blueberry dark:text-white" /></button>
          <h1 className="text-blueberry dark:text-white text-lg font-bold">Sửa giao dịch</h1>
          <div className="w-9 h-9" />
        </div>
        <div className="px-5 mt-6">
          <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1">
            <button onClick={() => handleTypeChange('income')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Thu nhập</button>
            <button onClick={() => handleTypeChange('allocation')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'allocation' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Nạp quỹ</button>
            <button onClick={() => handleTypeChange('expense')} className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${type === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Chi tiêu</button>
          </div>
        </div>
        <div className="px-5 mt-8 text-center">
          <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Số tiền</p>
          <div className="flex items-center justify-center gap-1">
            <MoneyInput value={amount} onChange={setAmount} placeholder="0" className={`text-4xl font-bold text-center bg-transparent outline-none w-full ${overLimit || periodOverLimit ? 'text-cotton-candy' : type === 'income' || type === 'allocation' ? 'text-turquoise' : 'text-blueberry dark:text-white'}`} />
            <span className="text-4xl font-bold text-light-grey">đ</span>
          </div>
          {overLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt hạn mức {formatMoney(activeCat.monthly_limit)} của danh mục này!</p>}
          {periodOverLimit && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt Thu nhập được chi còn lại ({formatMoney(remainingAfterSpend)}) của kỳ này!</p>}
          {fundOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của quỹ ({formatMoney(fundBalanceNow)})!</p>}
          {sourceOverBalance && <p className="text-cotton-candy text-xs mt-2 font-semibold">⚠️ Vượt số dư hiện có của nguồn tiền này ({formatMoney(accountBalance(sourceAccount, allTx || []))})!</p>}
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">{type === 'income' ? 'Danh mục thu nhập' : 'Quỹ / Danh mục'} <span className="text-cotton-candy">*</span></p>
          {categoryList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm">Chưa có danh mục. Vào Cài đặt để thêm.</p> : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {categoryList.map((cat) => {
                const active = selectedCategory === cat.id;
                const willExceed = type === 'expense' && cat.monthly_limit && Number(amount) > Number(cat.monthly_limit);
                return (
                  <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={cat.icon} size={48} active={active} activeColor={willExceed ? '#F18AB5' : '#0DBACC'} />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {type === 'expense' && isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-steel dark:text-light-grey text-xs bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3">Khoản này được trừ trực tiếp từ quỹ "{activeCat.name}" — không cần chọn nguồn tiền.</p>
          </div>
        )}

        {type === 'allocation' && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chọn "Thu nhập" nếu nạp quỹ từ Thu nhập được chi của Kỳ (sẽ trừ vào Thu nhập được chi). Chọn 1 ví/tài khoản khác nếu chuyển thẳng tiền có sẵn vào quỹ (KHÔNG trừ vào Thu nhập được chi).</p>
          </div>
        )}

        {type === 'expense' && !isFundCategory && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Nguồn tiền <span className="text-cotton-candy">*</span></p>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              <button onClick={() => handleExpenseSourceSelect('income')} className="flex flex-col items-center gap-1.5">
                <EmojiCircle emoji="💵" size={48} active={expenseSource === 'income'} activeColor="#0DBACC" />
                <span className={`text-[11px] text-center leading-tight ${expenseSource === 'income' ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>Thu nhập</span>
              </button>
              {accounts.map((acc) => {
                const active = expenseSource === acc.id;
                return (
                  <button key={acc.id} onClick={() => handleExpenseSourceSelect(acc.id)} className="flex flex-col items-center gap-1.5">
                    <EmojiCircle emoji={acc.icon} size={48} active={active} activeColor="#0DBACC" />
                    <span className={`text-[11px] text-center leading-tight ${active ? 'text-blueberry dark:text-white font-semibold' : 'text-steel dark:text-light-grey'}`}>{acc.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Chỉ được chọn 1 nguồn tiền cho khoản chi này.</p>
          </div>
        )}

        {usesPeriod && (
          <div className="px-5 mt-8">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Năm <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Kỳ <span className="text-cotton-candy">*</span></p>
            <CustomSelect value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
            {financials && (
              <div className="mt-2 text-xs space-y-1 text-steel dark:text-light-grey">
                <p><span className="font-semibold">Thu nhập tính vào Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.incomeForSpendingPool)}</span></p>
                <p><span className="font-semibold">Thu nhập được chi:</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.spendingPool)}</span></p>
                <p><span className="font-semibold">Đã sử dụng (nạp quỹ + chi từ Thu nhập được chi):</span> <span className="text-blueberry dark:text-white font-bold">{formatMoney(financials.totalSpentFromSpendingPool)}</span></p>
                <p><span className="font-semibold">Còn lại trong Thu nhập được chi:</span> <span className={`font-bold ${financials.remainingAfterSpend >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoney(financials.remainingAfterSpend)}</span></p>
                {financials.specialIncome > 0 && (
                  <p><span className="font-semibold">Thu nhập đặc biệt:</span> <span className="text-lavender font-bold">{formatMoney(financials.specialIncome)}</span></p>
                )}
                {financials.accumulationBeforeSpend > 0 && (
                  <p><span className="font-semibold">Tích lũy trước chi:</span> <span className="text-lavender font-bold">{formatMoney(financials.accumulationBeforeSpend)}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ngày giờ</p>
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-8">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ghi chú</p>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" className="w-full bg-ice-cream dark:bg-night-sky rounded-2xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        <div className="px-5 mt-10 pb-10">
          <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
        </div>
      </div>
    </div>
  );
}

function EditAccountModal({ account, onClose, onSaved, isNew }) {
  const [form, setForm] = useState({ name: account?.name || '', icon: account?.icon || '', type: account?.type || 'cash', initial_balance: account?.initial_balance || '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name) { alert('Nhập tên tài khoản'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '💰', type: form.type, initial_balance: form.initial_balance ? Number(form.initial_balance) : 0, is_active: true };
    const { error } = isNew ? await supabase.from('accounts').insert(payload) : await supabase.from('accounts').update(payload).eq('id', account.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Thêm ví mới' : 'Sửa tài khoản'}</h3>
          <button onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tài khoản" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🏦)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <CustomSelect value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
          {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </CustomSelect>
        <MoneyInput value={form.initial_balance} onChange={(v) => setForm({ ...form, initial_balance: v })} placeholder="Số dư ban đầu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu
        </button>
      </div>
    </div>
  );
}

function EditFundForm({ category, onClose, onSaved, isNew, initialAmount, firstAllocation }) {
  const [form, setForm] = useState({
    name: category?.name || '',
    icon: category?.icon || '',
    description: category?.description || '',
    target_amount: category?.target_amount || '',
    interest_rate: category?.interest_rate || '',
    background_url: category?.background_url || '',
    initial_allocation: isNew ? '' : (initialAmount || ''),
    // FIX: cho phép sửa ngày nhập số tiền nạp quỹ lần đầu (trước đây hard-code = ngày hôm nay,
    // không có cách nào chỉnh lại sau khi đã tạo quỹ).
    initial_allocation_date: (!isNew && firstAllocation) ? (firstAllocation.date || new Date(firstAllocation.created_at).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Nhận file ảnh đã crop từ ImageUploader dùng chung (giống flow avatar), rồi upload lên storage
  async function handleCroppedBannerUpload(file) {
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('fund-images').upload(fileName, file);
    if (uploadError) { alert('Lỗi tải ảnh lên: ' + uploadError.message); setUploading(false); return; }
    const { data } = supabase.storage.from('fund-images').getPublicUrl(fileName);
    setForm((f) => ({ ...f, background_url: data.publicUrl }));
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên quỹ'); return; }
    setSaving(true);
    const payload = {
      name: form.name, icon: form.icon || '💰', type: 'expense', is_fund: true,
      description: form.description || null,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : 0,
      background_url: form.background_url || null,
    };
    const initialDate = form.initial_allocation_date || new Date().toISOString().slice(0, 10);
    if (isNew) {
      const { data: newCat, error } = await supabase.from('categories').insert(payload).select().single();
      if (error) { setSaving(false); alert('Lỗi: ' + error.message); return; }
      if (form.initial_allocation && Number(form.initial_allocation) > 0) {
        await supabase.from('transactions').insert({
          category_id: newCat.id, type: 'allocation', amount: Number(form.initial_allocation),
          note: 'Nạp quỹ lần đầu', date: initialDate,
          is_initial: true, // FIX: đánh dấu rõ đây là khoản nạp ban đầu, không suy luận theo ngày
        });
      }
    } else {
      const { error } = await supabase.from('categories').update(payload).eq('id', category.id);
      if (error) { setSaving(false); alert('Lỗi: ' + error.message); return; }
      const newInitial = form.initial_allocation ? Number(form.initial_allocation) : 0;
      const dateChanged = firstAllocation && initialDate !== (firstAllocation.date || new Date(firstAllocation.created_at).toISOString().slice(0, 10));
      // FIX: luôn cập nhật (update) vào ĐÚNG 1 dòng "ban đầu" khi sửa số tiền — kể cả
      // khi dòng đó chỉ là kết quả fallback "giao dịch sớm nhất" (dữ liệu cũ, chưa có
      // cờ is_initial). Trước đây trong trường hợp này code lại INSERT thêm 1 dòng mới,
      // khiến quỹ bị cộng dồn sai (VD: dòng cũ 2tr + dòng mới 1tr = 3tr thay vì đúng 1tr).
      // Giờ luôn update thẳng vào dòng cũ và tự gắn cờ is_initial=true cho nó để lần sau
      // không còn bị coi là "fallback" nữa.
      if (firstAllocation) {
        if (newInitial > 0 && (newInitial !== Number(initialAmount || 0) || dateChanged || firstAllocation.is_initial !== true)) {
          await supabase.from('transactions').update({ amount: newInitial, date: initialDate, is_initial: true }).eq('id', firstAllocation.id);
        }
      } else if (newInitial > 0) {
        await supabase.from('transactions').insert({
          category_id: category.id, type: 'allocation', amount: newInitial,
          note: 'Nạp quỹ lần đầu', date: initialDate,
          is_initial: true,
        });
      }
    }
    setSaving(false);
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Tạo quỹ mới' : 'Sửa quỹ'}</h3>
          <button onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên quỹ" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji icon (vd: 💊)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả quỹ (không bắt buộc)" rows={2} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        {!isNew && <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Số tiền ban đầu</p>}
        <MoneyInput value={form.initial_allocation} onChange={(v) => setForm({ ...form, initial_allocation: v })} placeholder="Số tiền nạp quỹ lần đầu (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        {(isNew || (firstAllocation && Number(form.initial_allocation) > 0)) && (
          <div className="mb-3">
            <label className="text-xs text-steel dark:text-light-grey font-semibold block mb-1">Ngày nạp quỹ lần đầu</label>
            <DateField value={form.initial_allocation_date} max={new Date().toISOString().slice(0, 10)} onChange={(v) => setForm({ ...form, initial_allocation_date: v })} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm dark:text-white text-blueberry" />
          </div>
        )}
        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <div className="relative mb-3">
          <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận /năm (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 pr-10 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          {form.interest_rate && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey text-sm font-semibold">%</span>}
        </div>

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ảnh nền quỹ</p>
        {form.background_url && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-2 bg-ice-cream dark:bg-night-sky">
            <img src={form.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <ImageUploader
            aspectRatio="16:9"
            uploading={uploading}
            triggerLabel="Tải ảnh từ thiết bị"
            triggerClassName="flex-1 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm text-steel dark:text-light-grey text-center cursor-pointer hover:bg-light-grey/30 transition flex items-center justify-center gap-2"
            onConfirm={handleCroppedBannerUpload}
          />
        </div>
        <input value={form.background_url} onChange={(e) => setForm({ ...form, background_url: e.target.value })} placeholder="Hoặc dán link ảnh" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <button onClick={handleSave} disabled={saving || uploading} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu quỹ
        </button>
      </div>
    </div>
  );
}

function QuickAllocateWithdrawForm({ category, mode, transaction, onClose, onSaved }) {
  const isEditing = !!transaction;
  const [amount, setAmount] = useState(isEditing ? String(transaction.amount) : '');
  const [note, setNote] = useState(isEditing ? stripPeriodTag(transaction.note || '') : '');
  const [saving, setSaving] = useState(false);
  const initialPeriod = isEditing ? (parsePeriodTag(transaction.note) || currentPeriodKey()) : currentPeriodKey();
  const [selectedYear, setSelectedYear] = useState(Number(initialPeriod.split('-')[0]));
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);
  // FIX: cho phép chỉnh sửa cả ngày lẫn giờ:phút nhập (trước đây chỉ chỉnh được ngày,
  // giờ:phút luôn tự động lấy giờ hiện tại lúc lưu). Đồng bộ pattern datetime-local
  // đang dùng ở AddTransaction / EditTransaction — mặc định = giờ hiện tại, cho sửa tự do.
  const [dateTime, setDateTime] = useState(() => {
    if (!isEditing) return nowForInput();
    const d = new Date(transaction.created_at || transaction.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => yearNow - 2 + i);
  const periods = buildPeriods(selectedYear);

  function handleYearChange(y) {
    setSelectedYear(y);
    const month = selectedPeriod.split('-')[1];
    setSelectedPeriod(`${y}-${month}`);
  }

  async function handleSave() {
    if (!amount || Number(amount) === 0) { alert('Nhập số tiền'); return; }
    if (!dateTime) { alert('Chọn ngày giờ nhập'); return; }
    setSaving(true);
    let noteToSave = note || null;
    if (mode === 'allocation' && selectedPeriod) {
      noteToSave = tagPeriodNote(selectedPeriod, note);
    }
    const { error } = isEditing
      ? await supabase.from('transactions').update({
          amount: Number(amount), note: noteToSave,
          date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
        }).eq('id', transaction.id)
      : await supabase.from('transactions').insert({
          category_id: category.id, type: mode, amount: Number(amount), note: noteToSave,
          date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
        });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">
            {isEditing
              ? (mode === 'allocation' ? `Sửa khoản nạp — ${category.name}` : `Sửa khoản rút — ${category.name}`)
              : (mode === 'allocation' ? `Nạp vào ${category.name}` : `Rút từ ${category.name}`)}
          </h3>
          <button onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        <MoneyInput value={amount} onChange={setAmount} placeholder="Số tiền" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-lg font-bold outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        {mode === 'allocation' && (
          <div className="mb-3">
            <p className="text-blueberry dark:text-white font-bold text-sm mb-2">Nguồn nạp (Kỳ thu nhập)</p>
            <CustomSelect value={selectedYear} onChange={(e) => handleYearChange(Number(e.target.value))} className="mb-2" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
            <p className="text-steel dark:text-light-grey text-xs mt-2">Số tiền sẽ được trừ từ thu nhập của kỳ này.</p>
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md ${mode === 'allocation' ? 'bg-gradient-primary shadow-turquoise/30' : 'bg-cotton-candy shadow-cotton-candy/30'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {isEditing ? 'Lưu thay đổi' : (mode === 'allocation' ? 'Nạp quỹ' : 'Rút quỹ')}
        </button>
      </div>
    </div>
  );
}

function QuickAdjustBalanceForm({ account, currentBalance, onClose, onSaved }) {
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  // FIX: cho phép chỉnh sửa cả ngày lẫn giờ:phút nhập (trước đây chỉ chỉnh được ngày,
  // giờ:phút luôn tự động lấy giờ hiện tại lúc lưu). Đồng bộ pattern datetime-local
  // đang dùng ở QuickAllocateWithdrawForm — mặc định = giờ hiện tại, cho sửa tự do.
  const [dateTime, setDateTime] = useState(nowForInput());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!amount) { alert('Nhập số tiền'); return; }
    if (!dateTime) { alert('Chọn ngày giờ nhập'); return; }
    setSaving(true);
    let signedAmount;
    if (mode === 'increase') signedAmount = Number(amount);
    else if (mode === 'decrease') signedAmount = -Number(amount);
    else signedAmount = Number(amount) - currentBalance;

    if (signedAmount === 0) { setSaving(false); alert('Số dư không đổi, không cần cập nhật.'); return; }

    const isDirectSet = mode === null;
    const savedNote = note || (mode === 'increase' ? 'Tăng số dư' : mode === 'decrease' ? 'Giảm số dư' : 'Đặt số dư mới');
    const { error } = await supabase.from('transactions').insert({
      account_id: account.id, type: 'adjustment', amount: signedAmount,
      note: isDirectSet ? `[SET] ${savedNote}` : savedNote, date: dateTime.slice(0, 10), created_at: new Date(dateTime).toISOString(),
    });
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">Cập nhật số dư — {account.name}</h3>
          <button onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>
        <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1 mb-2">
          <button onClick={() => { setMode(mode === 'increase' ? null : 'increase'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${mode === 'increase' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Tăng số dư</button>
          <button onClick={() => { setMode(mode === 'decrease' ? null : 'decrease'); setAmount(''); }} className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${mode === 'decrease' ? 'bg-white dark:bg-[#2a2a44] text-cotton-candy shadow' : 'text-steel dark:text-light-grey'}`}>Giảm số dư</button>
        </div>
        <p className="text-xs text-steel dark:text-light-grey mb-3">{mode ? 'Nhập số tiền muốn tăng/giảm.' : 'Không chọn gì cả — nhập thẳng số dư mới, hệ thống tự tính chênh lệch.'}</p>
        <MoneyInput value={amount} onChange={setAmount} placeholder={mode ? 'Số tiền' : 'Số dư mới'} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-lg font-bold outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày giờ nhập</p>
        <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-4 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        <button onClick={handleSave} disabled={saving} className={`w-full text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md ${mode === 'decrease' ? 'bg-cotton-candy shadow-cotton-candy/30' : mode === 'increase' ? 'bg-gradient-primary shadow-turquoise/30' : 'bg-blueberry shadow-blueberry/30'}`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu cập nhật
        </button>
      </div>
    </div>
  );
}

function EditGoalForm({ goal, onClose, onSaved, isNew, softDelete, categories = [], transactions = [] }) {
  const funds = categories.filter((c) => c.is_fund);
  const [form, setForm] = useState({
    name: goal?.name || '',
    priority_term: goal?.priority_term || PRIORITY_TERMS[1].value,
    target_amount: goal?.target_amount || '',
    current_amount: goal?.current_amount || '',
    fund_id: goal?.fund_id || '',
    start_date: goal?.start_date || new Date().toISOString().slice(0, 10),
    note: goal?.note || '',
    isDone: goal?.status === 'Hoàn thành',
    end_date: goal?.end_date || new Date().toISOString().slice(0, 10),
    actual_amount: goal?.actual_amount || '',
  });
  const [saving, setSaving] = useState(false);

  const linkedFund = form.fund_id ? funds.find((f) => f.id === form.fund_id) : null;
  const linkedFundBalance = linkedFund ? fundBalanceWithProfit(linkedFund, transactions) : null;

  async function handleSave() {
    if (!form.name) { alert('Nhập tên mục tiêu'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      priority_term: form.priority_term,
      target_amount: form.target_amount ? Number(form.target_amount) : null,
      fund_id: form.fund_id || null,
      current_amount: linkedFund ? linkedFundBalance : (form.current_amount ? Number(form.current_amount) : 0),
      start_date: form.start_date || null,
      note: form.note || null,
      status: form.isDone ? 'Hoàn thành' : 'Đang làm',
      end_date: form.isDone ? form.end_date : null,
      actual_amount: form.isDone && form.actual_amount ? Number(form.actual_amount) : null,
    };
    const { error } = isNew ? await supabase.from('goals').insert(payload) : await supabase.from('goals').update(payload).eq('id', goal.id);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  async function handleDelete() {
    if (!confirm('Xóa mục tiêu này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    setSaving(true);
    const { error } = await softDelete('goals', goal.id, `Xoá mục tiêu "${goal.name}"`, 'delete_goal');
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    onSaved(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-30" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e1e32] w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-5 max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blueberry dark:text-white">{isNew ? 'Mục tiêu mới' : 'Sửa mục tiêu'}</h3>
          <button onClick={onClose}><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên mục tiêu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Mức độ ưu tiên</p>
        <CustomSelect value={form.priority_term} onChange={(e) => setForm({ ...form, priority_term: e.target.value })} className="mb-3" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
          {PRIORITY_TERMS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
        </CustomSelect>

        <MoneyInput value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: v })} placeholder="Số tiền mục tiêu" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Nguồn tiền mục tiêu (không bắt buộc)</p>
        <CustomSelect
          value={form.fund_id}
          onChange={(e) => setForm({ ...form, fund_id: e.target.value })}
          className="mb-1" triggerClassName="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value="">— Không liên kết quỹ, nhập tay —</option>
          {funds.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
        </CustomSelect>
        {funds.length === 0 && (
          <p className="text-xs text-steel dark:text-light-grey mb-3">Chưa có quỹ nào trong Quản lý quỹ. Tạo quỹ trước để có thể chọn làm nguồn tiền cho mục tiêu này.</p>
        )}

        {linkedFund ? (
          <div className="frost-inset rounded-xl px-4 py-3 mb-3">
            <p className="text-xs text-steel dark:text-light-grey">Số tiền hiện có (lấy tự động từ quỹ "{linkedFund.name}")</p>
            <p className="text-lg font-bold text-blueberry dark:text-white">{formatMoney(linkedFundBalance)}</p>
          </div>
        ) : (
          <MoneyInput value={form.current_amount} onChange={(v) => setForm({ ...form, current_amount: v })} placeholder="Số tiền hiện có" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        )}

        <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày bắt đầu</p>
        <DateField value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />

        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (không bắt buộc)" rows={2} className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 resize-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />

        <label className="flex items-center gap-2 mb-3 text-sm text-blueberry dark:text-white font-semibold">
          <input type="checkbox" checked={form.isDone} onChange={(e) => setForm({ ...form, isDone: e.target.checked })} /> Đã hoàn thành
        </label>

        {form.isDone && (
          <>
            <p className="text-sm text-blueberry dark:text-white font-semibold mb-2">Ngày hoàn thành</p>
            <DateField value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} className="w-full justify-between bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm mb-3 dark:text-white text-blueberry" />
            <MoneyInput value={form.actual_amount} onChange={(v) => setForm({ ...form, actual_amount: v })} placeholder="Số tiền thực tế khi hoàn thành (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          </>
        )}

        <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30 mb-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu mục tiêu
        </button>
        {!isNew && (
          <button onClick={handleDelete} disabled={saving} className="w-full bg-cotton-candy-light dark:bg-cotton-candy/20 text-cotton-candy rounded-xl py-3 font-bold flex items-center justify-center gap-2">
            <Trash2 size={16} /> Xóa mục tiêu
          </button>
        )}
      </div>
    </div>
  );
}

/* ==============================================================================
   08. DASHBOARD
   ============================================================================== */
function Dashboard({ setScreen, transactions, categories, accounts, goals, loading, displayName, avatarUrl, onAddClick, theme, toggleTheme, onOpenFund, onOpenAccount, reload, softDelete, openSettings, sidebarCollapsed, toggleSidebar, spendingPoolByPeriod, saveSpendingPoolForPeriod }) {
  async function handleDeleteTx(tx) {
    if (!confirm('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }
  const [search, setSearch] = useState('');
  const [editingTx, setEditingTx] = useState(null);
  const [recentTxFilter, setRecentTxFilter] = useState('7d');
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showWalletPopover, setShowWalletPopover] = useState(false);
  // Bật/tắt khi rê chuột vào khối "Tổng quan tài sản" — dùng để nâng z-index của CẢ khối
  // này lên trên các card anh em (Ví, Thu/chi theo danh mục,...) mỗi khi 1 trong 3 popup
  // hover bên trong (Tiền ví/Tiền quỹ/Tổng cộng) đang mở, để popup không bị các card khác
  // đè lên/che mất (bản thân mỗi frost-card có isolation:isolate nên z-index nâng ở BÊN
  // TRONG không tự thoát ra ngoài được, phải nâng luôn z-index của card cha chứa nó).
  const [assetOverviewHovered, setAssetOverviewHovered] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [incomeTotalsMonth, setIncomeTotalsMonth] = useState('all');
  const [incomeTotalsYear, setIncomeTotalsYear] = useState(new Date().getFullYear());
  const [expenseTotalsMonth, setExpenseTotalsMonth] = useState('all');
  const [expenseTotalsYear, setExpenseTotalsYear] = useState(new Date().getFullYear());
  const totalsYearOptions = (() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => cur - 10 + i);
  })();
  const [walletActiveIndex, setWalletActiveIndex] = useState(0);
  const walletTouchStartX = useRef(null);
  const walletWheelLocked = useRef(false);
  function goToWalletIndex(idx) {
    setWalletActiveIndex((cur) => {
      const clamped = Math.max(0, Math.min(accounts.length - 1, idx));
      return clamped;
    });
  }
  function walletStep(dir) {
    setWalletActiveIndex((cur) => Math.max(0, Math.min(accounts.length - 1, cur + dir)));
  }
  function handleWalletTouchStart(e) {
    walletTouchStartX.current = e.touches[0].clientX;
  }
  function handleWalletTouchEnd(e) {
    if (walletTouchStartX.current == null) return;
    const deltaX = e.changedTouches[0].clientX - walletTouchStartX.current;
    walletTouchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    walletStep(deltaX < 0 ? 1 : -1);
  }
  function handleWalletWheel(e) {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 12) return;
    const dir = delta > 0 ? 1 : -1;
    if ((dir === 1 && walletActiveIndex >= accounts.length - 1) || (dir === -1 && walletActiveIndex <= 0)) return;
    e.preventDefault();
    if (walletWheelLocked.current) return;
    walletWheelLocked.current = true;
    walletStep(dir);
    setTimeout(() => { walletWheelLocked.current = false; }, 380);
  }
  function walletStackStyle(depth) {
    if (depth < 0) return { transform: 'translateY(14px) scale(0.92)', opacity: 0, zIndex: 0, pointerEvents: 'none' };
    if (depth === 0) return { transform: 'translateY(0px) scale(1)', opacity: 1, zIndex: 30 };
    if (depth === 1) return { transform: 'translateY(-10px) scale(0.97)', opacity: 0.85, zIndex: 20, pointerEvents: 'none' };
    if (depth === 2) return { transform: 'translateY(-18px) scale(0.94)', opacity: 0.55, zIndex: 10, pointerEvents: 'none' };
    return { transform: 'translateY(-18px) scale(0.94)', opacity: 0, zIndex: 0, pointerEvents: 'none' };
  }
  useEffect(() => {
    setWalletActiveIndex((cur) => Math.max(0, Math.min(accounts.length - 1, cur)));
  }, [accounts.length]);
  // Mỗi card có bộ lọc thời gian (Tuần/Tháng/Năm) RIÊNG — đổi ở 1 card chỉ đổi dữ
  // liệu của card đó, không ảnh hưởng các card khác.
  const mobileComboFilter = useCardPeriod('month');
  const incomeCardFilter = useCardPeriod('month');
  const expenseCardFilter = useCardPeriod('month');
  const costFilter = useCardPeriod('month');
  const allCardFilters = [mobileComboFilter, incomeCardFilter, expenseCardFilter, costFilter];

  // WIDGET LỌC THỜI GIAN CHUNG CHO CẢ DASHBOARD (nút cạnh "Thêm widget") — chọn 1 lần
  // ở đây sẽ đồng bộ TẤT CẢ chart có bộ lọc thời gian riêng (Biến động, Thu/chi theo
  // danh mục, Hoạt động gần đây, Tổng thu nhập/chi tiêu, Phân tích chi phí) về cùng 1
  // mốc. Chọn lọc riêng ở từng card thì chỉ card đó đổi.
  const [globalPeriod, setGlobalPeriod] = useState('month');
  const [globalYear, setGlobalYear] = useState(new Date().getFullYear());
  const [globalPeriodKey, setGlobalPeriodKey] = useState(currentPeriodKey());
  const [globalWeekStart, setGlobalWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); });
  const [globalWeekEnd, setGlobalWeekEnd] = useState(() => new Date().toISOString().slice(0, 10));
  function applyGlobalPeriod(val) {
    setGlobalPeriod(val);
    const y = new Date().getFullYear();
    const m = new Date().getMonth() + 1;
    const pk = currentPeriodKey();
    allCardFilters.forEach((f) => {
      f.setPeriod(val);
      if (val === 'year') f.setYear(y);
      if (val === 'month') { f.setYear(y); f.setPeriodKey(pk); }
      if (val === 'week') { f.setWeekStart(globalWeekStart); f.setWeekEnd(globalWeekEnd); }
    });
    if (val === 'week') {
      setRecentTxFilter('7d');
    } else if (val === 'month') {
      setGlobalYear(y);
      setGlobalPeriodKey(pk);
      setRecentTxFilter('month');
      setIncomeTotalsMonth(m);
      setIncomeTotalsYear(y);
      setExpenseTotalsMonth(m);
      setExpenseTotalsYear(y);
    } else if (val === 'year') {
      setGlobalYear(y);
      setRecentTxFilter('year');
      setIncomeTotalsMonth('all');
      setIncomeTotalsYear(y);
      setExpenseTotalsMonth('all');
      setExpenseTotalsYear(y);
    }
  }
  function GlobalPeriodWidget({ className = '', wrapClassName = '', inactiveClass = 'text-steel dark:text-light-grey' }) {
    return (
      <div className={`flex items-center gap-1.5 flex-wrap justify-end ${className}`}>
        <div className={`flex backdrop-blur-md rounded-full p-0.5 flex-shrink-0 ${wrapClassName || 'bg-white/50 dark:bg-white/10'}`}>
          {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
            <button
              key={p.k}
              onClick={() => applyGlobalPeriod(p.k)}
              title="Áp dụng cho tất cả chart trong Dashboard"
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${globalPeriod === p.k ? 'bg-turquoise text-white shadow' : inactiveClass}`}
            >
              {p.l}
            </button>
          ))}
        </div>
        {globalPeriod === 'week' && (
          <div className="flex items-center gap-1.5">
            <DateField value={globalWeekStart} max={globalWeekEnd} showIcon={false} clearable={false}
              onChange={(v) => { setGlobalWeekStart(v); allCardFilters.forEach((f) => f.setWeekStart(v)); }}
              className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
            <span className="text-steel dark:text-light-grey text-xs">-</span>
            <DateField value={globalWeekEnd} align="right" max={new Date().toISOString().slice(0, 10)} showIcon={false} clearable={false}
              onChange={(v) => { setGlobalWeekEnd(v); allCardFilters.forEach((f) => f.setWeekEnd(v)); }}
              className="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
          </div>
        )}
        {globalPeriod === 'year' && (
          <CustomSelect value={globalYear} onChange={(e) => { const y = Number(e.target.value); setGlobalYear(y); allCardFilters.forEach((f) => f.setYear(y)); }}
            triggerClassName="bg-white/50 dark:bg-white/10 rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </CustomSelect>
        )}
      </div>
    );
  }
  const fundCategories = categories.filter((c) => c.is_fund);
  const expenseCats = categories.filter((c) => c.type === 'expense');
  const incomeCats = categories.filter((c) => c.type === 'income');
  const spentByCat = expenseCats.map((c) => ({ ...c, amount: transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) })).filter((c) => c.amount > 0);
  const total = spentByCat.reduce((s, c) => s + c.amount, 0) || 1;
  const radius = 60, circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  const palette = ['#0DBACC', '#74ACEF', '#F18AB5', '#9F7FE0', '#B4F1F1', '#C1DDFF', '#FFCDDB', '#E3D6FF'];
  const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Buckets + chuỗi số liệu cho từng card — mỗi card dùng bộ lọc thời gian độc lập
  // của riêng nó (mobileComboFilter / incomeCardFilter / expenseCardFilter / costFilter).
  const mobileBuckets = computePeriodBuckets(mobileComboFilter);
  const mobileIncomeSeries = buildCategorySeriesFor(transactions, incomeCats, 'income', mobileBuckets, mobileComboFilter.period, mobileComboFilter.periodKey, mobileComboFilter.year);
  const mobileExpenseSeries = buildCategorySeriesFor(transactions, expenseCats, 'expense', mobileBuckets, mobileComboFilter.period, mobileComboFilter.periodKey, mobileComboFilter.year);
  const mobileMaxIncome = Math.max(...mobileIncomeSeries.flatMap((c) => c.values), 1);
  const mobileMaxExpense = Math.max(...mobileExpenseSeries.flatMap((c) => c.values), 1);

  const incomeCardBuckets = computePeriodBuckets(incomeCardFilter);
  const incomeCardSeries = buildCategorySeriesFor(transactions, incomeCats, 'income', incomeCardBuckets, incomeCardFilter.period, incomeCardFilter.periodKey, incomeCardFilter.year);
  const incomeCardMax = Math.max(...incomeCardSeries.flatMap((c) => c.values), 1);

  const expenseCardBuckets = computePeriodBuckets(expenseCardFilter);
  const expenseCardSeries = buildCategorySeriesFor(transactions, expenseCats, 'expense', expenseCardBuckets, expenseCardFilter.period, expenseCardFilter.periodKey, expenseCardFilter.year);
  const expenseCardMax = Math.max(...expenseCardSeries.flatMap((c) => c.values), 1);

  // Card "Phân tích chi phí" — cột là từng loại chi tiêu (mỗi loại 1 màu), đường là
  // xu hướng thu nhập tổng, cùng lọc theo costFilter (Tuần/Tháng/Năm) riêng của card.
  const costBuckets = computePeriodBuckets(costFilter);
  const costExpenseSeries = buildCategorySeriesFor(transactions, expenseCats, 'expense', costBuckets, costFilter.period, costFilter.periodKey, costFilter.year);
  const costIncomeTotals = bucketTotalsFor(transactions, 'income', costBuckets, costFilter.period, costFilter.periodKey, costFilter.year);
  const costMaxVal = Math.max(...costExpenseSeries.flatMap((c) => c.values), ...costIncomeTotals, 1);

  // Ledger modal ("Xem chi tiết") cho 2 card "Thu nhập/Chi tiêu theo danh mục" — cùng
  // TxLedgerModal đang dùng ở màn Báo cáo, lấy đúng danh sách giao dịch thô đang được
  // lọc theo bộ lọc thời gian riêng của từng card.
  const [ledgerModal, setLedgerModal] = useState(null); // { title, txs } | null

  function PeriodControlsFor({ filter }) {
    const periodOptions = buildPeriods(filter.year);
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-0.5">
          {[{ k: 'week', l: 'Tuần' }, { k: 'month', l: 'Tháng' }, { k: 'year', l: 'Năm' }].map((p) => (
            <button key={p.k} onClick={() => filter.setPeriod(p.k)} className={`px-2.5 py-1 rounded-full text-xs font-bold ${filter.period === p.k ? 'bg-white dark:bg-[#2a2a44] shadow text-turquoise' : 'text-steel dark:text-light-grey'}`}>{p.l}</button>
          ))}
        </div>
        {filter.period === 'week' && (
          <div className="flex items-center gap-1.5">
            <DateField value={filter.weekStart} onChange={filter.setWeekStart} max={filter.weekEnd} showIcon={false} clearable={false} className="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
            <span className="text-steel dark:text-light-grey text-xs">-</span>
            <DateField value={filter.weekEnd} onChange={filter.setWeekEnd} align="right" max={new Date().toISOString().slice(0, 10)} showIcon={false} clearable={false} className="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 text-blueberry dark:text-white" />
          </div>
        )}
        {filter.period === 'year' && (
          <CustomSelect value={filter.year} onChange={(e) => filter.setYear(Number(e.target.value))} className="" triggerClassName="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </CustomSelect>
        )}
        {filter.period === 'month' && (
          <>
            <CustomSelect value={filter.year} onChange={(e) => { const y = Number(e.target.value); filter.setYear(y); filter.setPeriodKey(`${y}-${filter.periodKey.split('-')[1]}`); }} className="" triggerClassName="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={filter.periodKey} onChange={(e) => filter.setPeriodKey(e.target.value)} className="" triggerClassName="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark] max-w-[190px]">
              {periodOptions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
          </>
        )}
      </div>
    );
  }

  function CategoryBarChart({ series, maxVal, buckets }) {
    if (series.length === 0) return null;
    return (
      <div>
        <div className="flex items-end gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ height: 130 }}>
          {buckets.map((b, bi) => (
            <div key={bi} className="flex flex-col items-center justify-end h-full flex-shrink-0" style={{ minWidth: series.length * 9 + 10 }}>
              <div className="flex items-end gap-1 h-full">
                {series.map((c, i) => {
                  const v = c.values[bi];
                  return <div key={c.id} title={`${c.name}: ${formatMoney(v)}`} className="rounded-t-sm" style={{ width: 8, height: `${(v / maxVal) * 100}%`, minHeight: v > 0 ? 3 : 0, background: palette[i % palette.length] }} />;
                })}
              </div>
              <span className="text-[10px] text-steel dark:text-light-grey mt-1.5 whitespace-nowrap">{b.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 mt-4">
          {series.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
              <span className="text-blueberry dark:text-white text-xs truncate flex-1 min-w-0 font-semibold">{c.name}</span>
              <span className="text-blueberry dark:text-white text-xs font-bold flex-shrink-0">{formatMoney(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Biểu đồ kết hợp cột + đường cho card "Phân tích chi phí": mỗi loại chi tiêu là 1
  // cột màu riêng theo từng mốc thời gian, đường liền là xu hướng tổng thu nhập. Rê
  // chuột vào cột hoặc điểm trên đường để xem số liệu (dùng <title> — tooltip mặc định
  // của trình duyệt).
  function IncomeExpenseComboChart({ buckets, series, incomeTotals, maxVal }) {
    if (buckets.length === 0) return null;
    const bucketW = 52;
    const chartH = 128;
    const vbWidth = Math.max(buckets.length * bucketW, 200);
    const barW = 7, barGap = 3;
    const groupCenterX = (bi) => bi * bucketW + bucketW / 2;
    const valueY = (v) => chartH - (v / maxVal) * chartH;
    const linePoints = incomeTotals.map((v, bi) => `${groupCenterX(bi)},${valueY(v)}`).join(' ');
    return (
      <div>
        <div className="relative" style={{ height: chartH + 28 }}>
          <svg width="100%" height={chartH} viewBox={`0 0 ${vbWidth} ${chartH}`} preserveAspectRatio="none" className="absolute top-0 left-0 w-full" style={{ height: chartH }}>
            {series.map((c, i) => buckets.map((b, bi) => {
              const v = c.values[bi];
              if (!v) return null;
              const groupWidth = series.length * barW + (series.length - 1) * barGap;
              const startX = groupCenterX(bi) - groupWidth / 2;
              const x = startX + i * (barW + barGap);
              const y = valueY(v);
              return (
                <rect key={`${c.id}-${bi}`} x={x} y={y} width={barW} height={Math.max(chartH - y, v > 0 ? 2 : 0)} rx={1.5} fill={palette[i % palette.length]}>
                  <title>{`${c.name} (${b.label}): ${formatMoney(v)}`}</title>
                </rect>
              );
            }))}
            <polyline points={linePoints} fill="none" stroke="#0DBACC" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            {incomeTotals.map((v, bi) => (
              <circle key={bi} cx={groupCenterX(bi)} cy={valueY(v)} r="3.2" fill="#0DBACC" stroke="white" strokeWidth="1.2">
                <title>{`Thu nhập (${buckets[bi].label}): ${formatMoney(v)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="absolute left-0 right-0" style={{ top: chartH + 6, width: '100%' }}>
            <div className="relative" style={{ height: 16 }}>
              {buckets.map((b, bi) => (
                <span key={bi} className="absolute text-[10px] text-steel dark:text-light-grey whitespace-nowrap" style={{ left: `${(groupCenterX(bi) / vbWidth) * 100}%`, transform: 'translateX(-50%)' }}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-3 h-0.5 rounded-full bg-turquoise inline-block" />Xu hướng thu nhập</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          {series.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
              <span className="text-blueberry dark:text-white text-xs truncate flex-1 min-w-0 font-semibold">{c.name}</span>
              <span className="text-blueberry dark:text-white text-xs font-bold flex-shrink-0">{formatMoney(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalFunds = fundCategories.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalAccounts = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalAssets = totalFunds + totalAccounts;

  // Danh sách chi tiết cho popup hover ở khối "Tổng quan tài sản" — cùng cách tính với
  // "báo cáo" (Report) để số liệu khớp nhau, chỉ khác là lấy số dư HIỆN TẠI thay vì
  // số dư cuối kỳ đã chọn.
  const overviewWalletItems = accounts.filter((a) => a.type !== 'gold').map((a) => ({ key: a.id, name: a.name, amount: accountBalance(a, transactions) }));
  const overviewGoldItems = accounts.filter((a) => a.type === 'gold').map((a) => ({ key: a.id, name: a.name, amount: accountBalance(a, transactions) }));
  const overviewFundItems = fundCategories.map((c) => ({ key: c.id, name: c.name, amount: fundBalanceWithProfit(c, transactions) }));

  const now = new Date();
  const curPeriodKey = currentPeriodKey(now);
  const { start: curPeriodStart, end: curPeriodEnd } = periodKeyToRange(curPeriodKey);
  const thisMonthTx = transactions.filter((t) => transactionPeriodKey(t) === curPeriodKey);
  const incomeThisMonth = thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenseThisMonth = thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  // Thẻ "Thu nhập được chi kỳ này" đã được gỡ khỏi Dashboard theo yêu cầu — việc cài đặt
  // Thu nhập được chi cho từng kỳ nay chuyển sang mục Cài đặt > Danh mục (xem CategorySection).

  const prevPeriodDate = new Date(curPeriodStart); prevPeriodDate.setDate(prevPeriodDate.getDate() - 1);
  const prevPeriodKey = currentPeriodKey(prevPeriodDate);
  const prevMonthTx = transactions.filter((t) => transactionPeriodKey(t) === prevPeriodKey);
  const incomePrevMonth = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expensePrevMonth = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  function pctChange(current, prev) { return prev > 0 ? ((current - prev) / prev) * 100 : null; }
  const incomeChange = pctChange(incomeThisMonth, incomePrevMonth);
  const expenseChange = pctChange(expenseThisMonth, expensePrevMonth);
  const savedChange = pctChange(incomeThisMonth - expenseThisMonth, incomePrevMonth - expensePrevMonth);

  const monthLabels = [];
  const monthTotals = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const sum = transactions.filter((t) => { const td = new Date(t.created_at); return t.type === 'expense' && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear(); }).reduce((s, t) => s + Number(t.amount), 0);
    monthLabels.push(`Th${d.getMonth() + 1}`);
    monthTotals.push(sum);
  }
  const maxMonthTotal = Math.max(...monthTotals, 1);
  const monthShades = ['#E3D6FF', '#C1DDFF', '#B4F1F1', '#74ACEF', '#0DBACC', '#9F7FE0'];

  const daysInMonth = Math.round((curPeriodEnd - curPeriodStart) / 86400000) + 1;
  const periodDayOffset = (t) => {
    const d = new Date(t.date || t.created_at);
    return Math.min(daysInMonth - 1, Math.max(0, Math.round((d - curPeriodStart) / 86400000)));
  };
  const dailySpend = Array.from({ length: daysInMonth }, (_, i) => thisMonthTx.filter((t) => t.type === 'expense' && periodDayOffset(t) === i).reduce((s, t) => s + Number(t.amount), 0));
  const dailyIncome = Array.from({ length: daysInMonth }, (_, i) => thisMonthTx.filter((t) => t.type === 'income' && periodDayOffset(t) === i).reduce((s, t) => s + Number(t.amount), 0));
  const maxDaily = Math.max(...dailySpend, ...dailyIncome, 1);

  const todayOffset = Math.min(daysInMonth - 1, Math.max(0, Math.round((now - curPeriodStart) / 86400000)));
  const last7Start = Math.max(0, todayOffset - 6);
  const last7 = Array.from({ length: todayOffset - last7Start + 1 }, (_, i) => last7Start + i);
  const last7Date = (offset) => { const d = new Date(curPeriodStart); d.setDate(d.getDate() + offset); return d; };

  // Buckets cho chart "Biến động" ở Tổng quan tài sản — đi theo globalPeriod (Tuần/Tháng/Năm)
  // của widget lọc chung, thay vì luôn cố định 7 ngày gần nhất.
  const trendBuckets = (() => {
    if (globalPeriod === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const inc = transactions.filter((t) => t.type === 'income' && new Date(t.date || t.created_at).getFullYear() === globalYear && new Date(t.date || t.created_at).getMonth() === i).reduce((s, t) => s + Number(t.amount), 0);
        const exp = transactions.filter((t) => t.type === 'expense' && new Date(t.date || t.created_at).getFullYear() === globalYear && new Date(t.date || t.created_at).getMonth() === i).reduce((s, t) => s + Number(t.amount), 0);
        return { label: `Th${i + 1}`, inc, exp };
      });
    }
    if (globalPeriod === 'month') {
      return Array.from({ length: daysInMonth }, (_, i) => ({ label: String(last7Date(i).getDate()), inc: dailyIncome[i] || 0, exp: dailySpend[i] || 0 }));
    }
    // week: theo khoảng ngày -> ngày người dùng chọn (globalWeekStart -> globalWeekEnd),
    // không còn cố định 7 ngày gần nhất.
    const wBuckets = computePeriodBuckets({ period: 'week', weekStart: globalWeekStart, weekEnd: globalWeekEnd });
    return wBuckets.map((b) => ({
      label: b.label,
      inc: transactions.filter((t) => t.type === 'income' && new Date(t.date || t.created_at) >= b.start && new Date(t.date || t.created_at) <= b.end).reduce((s, t) => s + Number(t.amount), 0),
      exp: transactions.filter((t) => t.type === 'expense' && new Date(t.date || t.created_at) >= b.start && new Date(t.date || t.created_at) <= b.end).reduce((s, t) => s + Number(t.amount), 0),
    }));
  })();
  const maxTrend = Math.max(...trendBuckets.map((b) => Math.max(b.inc, b.exp)), 1);
  const fmtDMY = (iso) => { const [y, m, d] = String(iso).split('-'); return `${d}/${m}`; };
  const trendTitle = globalPeriod === 'year' ? `Biến động theo tháng (Năm ${globalYear})` : globalPeriod === 'month' ? 'Biến động theo ngày (kỳ hiện tại)' : `Biến động theo ngày (${fmtDMY(globalWeekStart)} - ${fmtDMY(globalWeekEnd)})`;

  const totalMonthlyLimit = categories.filter((c) => c.type === 'expense' && c.monthly_limit).reduce((s, c) => s + Number(c.monthly_limit), 0);
  const limitPct = totalMonthlyLimit > 0 ? (expenseThisMonth / totalMonthlyLimit) * 100 : 0;

  function catTotalsForYear(cats, txType, selectedYear, selectedMonth) {
    return cats
      .map((c) => ({
        ...c,
        amount: transactions
          .filter((t) => {
            if (t.category_id !== c.id || t.type !== txType) return false;
            const [py, pm] = transactionPeriodKey(t).split('-').map(Number);
            if (py !== selectedYear) return false;
            if (selectedMonth !== 'all' && pm !== Number(selectedMonth)) return false;
            return true;
          })
          .reduce((s, t) => s + Number(t.amount), 0),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }
  function pieSegments(catList, totalVal) {
    let acc = 0;
    return catList.map((c) => {
      const pct = c.amount / totalVal;
      const dash = pct * circumference;
      const offset = acc;
      acc += dash;
      return { ...c, pct, dash, offset };
    });
  }
  function TotalsPeriodSelect({ month, year, onMonthChange, onYearChange }) {
    return (
      <div className="flex items-center gap-1.5">
        <CustomSelect value={month} onChange={(e) => onMonthChange(e.target.value)} className="" triggerClassName="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
          <option value="all">Cả năm</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{`Th${m}`}</option>)}
        </CustomSelect>
        <CustomSelect value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="" triggerClassName="bg-ice-cream dark:bg-night-sky rounded-full text-xs font-bold px-2.5 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
          {totalsYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </CustomSelect>
      </div>
    );
  }

  const incomeByCatYear = catTotalsForYear(incomeCats, 'income', incomeTotalsYear, incomeTotalsMonth);
  const totalIncomeYear = incomeByCatYear.reduce((s, c) => s + c.amount, 0) || 1;
  const incomeYearSegments = pieSegments(incomeByCatYear, totalIncomeYear);
  const expenseByCatYear = catTotalsForYear(expenseCats, 'expense', expenseTotalsYear, expenseTotalsMonth);
  const totalExpenseYear = expenseByCatYear.reduce((s, c) => s + c.amount, 0) || 1;
  const expenseYearSegments = pieSegments(expenseByCatYear, totalExpenseYear);

  const savingsRate = incomeThisMonth > 0 ? Math.max(0, Math.min(100, ((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100)) : 0;

  function groupTransactionsByDate(txs) {
    const groups = {};
    txs.forEach(tx => {
      const date = new Date(tx.date || tx.created_at);
      const key = date.toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }

  function formatDateLabel(dateStr) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  const filteredTx = transactions.filter((t) => {
    if (!search) return true;
    const cat = categories.find((c) => c.id === t.category_id);
    return (cat?.name || '').toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase());
  });

  const recentTxList = (() => {
    const nowD = new Date();
    let list = transactions;
    if (recentTxFilter === '7d') {
      list = transactions.filter((t) => { const d = new Date(t.date || t.created_at); const diff = (nowD - d) / 86400000; return diff >= 0 && diff < 7; });
    } else if (recentTxFilter === 'month') {
      const pk = currentPeriodKey();
      list = transactions.filter((t) => transactionPeriodKey(t) === pk);
    } else if (recentTxFilter === 'year') {
      list = transactions.filter((t) => Number(transactionPeriodKey(t).split('-')[0]) === nowD.getFullYear());
    }
    return [...list].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)).slice(0, 5);
  })();

  const groupedRecentTx = groupTransactionsByDate(recentTxList);
  const sortedGroupKeys = Object.keys(groupedRecentTx).sort((a, b) => new Date(b) - new Date(a));

  // Trong dashboard mobile, thêm carousel ví
  const mobileWalletCarousel = (
    <div className="mt-4 px-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/80 text-xs font-semibold">Ví của bạn</p>
        <button onClick={() => setScreen('accounts')} className="text-white/70 text-xs font-bold">Xem tất cả</button>
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        <div className="flex gap-3 py-1">
          {accounts.length === 0 ? (
            <div className="snap-start shrink-0 w-[85%] bg-white/10 backdrop-blur rounded-2xl p-4 text-center text-white/60 text-sm">
              Chưa có ví nào. Bấm + để thêm.
            </div>
          ) : (
            accounts.map((acc) => {
              // Dãy số trang trí kiểu thẻ ngân hàng, lấy từ id ví — chỉ để hiển thị,
              // không phải số tài khoản/thẻ thật.
              const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
              return (
                <div key={acc.id} className="snap-start shrink-0 w-[85%] max-w-[300px]">
                  <button
                    onClick={() => onOpenAccount(acc.id, 'dashboard')}
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // Remove outer layout wrapper, just return the content
  return (
    <>
      {/* Mobile version */}
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-hero opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <div><p className="text-white/80 text-sm font-semibold">Chào bạn!</p><h1 className="text-white text-2xl font-extrabold">{displayName || 'Bạn'}</h1></div>
            <AvatarMenu avatarUrl={avatarUrl} displayName={displayName} openSettings={openSettings || (() => setScreen('settings'))} variant="mobile" />
          </div>
          <div className="px-5 mt-4">
            <GlobalPeriodWidget wrapClassName="bg-white/15" inactiveClass="text-white/70" />
          </div>
          <div className="px-5 mt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/70 text-xs font-semibold">Tổng tài sản</p>
                <p className="text-white text-3xl font-extrabold mt-1 truncate">{formatMoney(totalAssets)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <button onClick={onAddClick} aria-label="Thêm giao dịch" className="w-11 h-11 rounded-full bg-gradient-secondary flex items-center justify-center shadow-lg shadow-black/10 active:scale-95 transition">
                  <Plus size={18} className="text-white" />
                </button>
                <button onClick={() => setScreen('report')} aria-label="Xem báo cáo" className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg shadow-black/10 active:scale-95 transition">
                  <BarChart3 size={18} className="text-white" />
                </button>
              </div>
            </div>
            {/* Đường biểu đồ nhỏ mang tính trang trí, cùng phong cách với khu vực
                "Total balance" trong bản thiết kế tham khảo — không đại diện số liệu thật. */}
            <svg width="100%" height="26" viewBox="0 0 200 26" preserveAspectRatio="none" className="w-full mt-3 opacity-60">
              <polyline points="0,18 20,15 40,20 60,9 80,13 100,5 120,11 140,4 160,10 180,2 200,7" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Mobile wallet carousel */}
          {mobileWalletCarousel}

          <div className="mt-6 px-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', scrollPaddingLeft: 20 }}>
            {fundCategories.length === 0 ? <p className="text-white/70 text-sm">Đánh dấu danh mục là "Quỹ" trong Cài đặt để hiện ở đây.</p>
              : fundCategories.map((f) => (
                <button key={f.id} onClick={() => onOpenFund(f.id)} style={{ scrollSnapAlign: 'start' }} className="frost-card min-w-[150px] text-left rounded-3xl p-4 flex-shrink-0">
                  <EmojiCircle emoji={f.icon} size={36} active activeColor="#0DBACC" />
                  <p className="text-steel dark:text-light-grey text-xs mt-3 font-semibold">{f.name}</p>
                  <p className="text-blueberry dark:text-white font-bold text-base">{formatMoney(fundBalanceWithProfit(f, transactions))}</p>
                </button>
              ))}
          </div>
          <div className="frost-card mt-6 rounded-[2.5rem] min-h-[60vh] px-5 pt-6 pb-6 overflow-hidden">
            <div className="frost-blob z-0 w-56 h-56 bg-turquoise-light/70 dark:bg-turquoise/22 -top-10 -right-10" />
            <div className="frost-blob z-0 w-48 h-48 bg-cotton-candy-light/70 dark:bg-cotton-candy/22 bottom-24 -left-10" />
            <div className="relative flex items-center justify-between mb-4">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Ngân sách tháng này</h2>
            </div>
            {spentByCat.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào tháng này.</p> : (
              <div className="flex items-center gap-6">
                <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90 flex-shrink-0">
                  {spentByCat.map((cat, i) => {
                    const pct = cat.amount / total; const dash = pct * circumference; const offset = cumulative; cumulative += dash;
                    return <circle key={cat.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />;
                  })}
                </svg>
                <div className="flex flex-col gap-2 text-sm min-w-0">
                  {spentByCat.map((cat, i) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                      <span className="text-blueberry dark:text-white font-semibold">{cat.name}</span><span className="text-blueberry dark:text-white font-bold ml-auto">{formatMoney(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative grid grid-cols-2 gap-3 mt-8">
              <div className="frost-inset rounded-2xl p-4 flex flex-col items-center">
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-2 self-start">Sức khỏe tài chính</p>
                <svg width="72" height="72" viewBox="0 0 120 120" className="-rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#E3D6FF" strokeWidth="14" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#0DBACC" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={`${(savingsRate / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
                </svg>
                <p className="text-lg font-bold text-blueberry dark:text-white -mt-11">{Math.round(savingsRate)}%</p>
                <p className="text-steel dark:text-light-grey text-[10px] mt-11">Tỷ lệ tiết kiệm</p>
              </div>
              <div className="frost-inset rounded-2xl p-4 flex flex-col justify-center">
                <p className="text-steel dark:text-light-grey text-xs font-semibold mb-2">Hạn mức tháng</p>
                {totalMonthlyLimit === 0 ? (
                  <p className="text-steel dark:text-light-grey text-xs">Chưa đặt hạn mức nào.</p>
                ) : (
                  <>
                    <ProgressBar pct={limitPct} colorClass={limitPct > 100 ? 'bg-cotton-candy' : 'bg-turquoise'} />
                    <p className="text-steel dark:text-light-grey text-[11px] mt-2">{formatMoney(expenseThisMonth)} / {formatMoney(totalMonthlyLimit)}</p>
                  </>
                )}
              </div>
            </div>

            {goals && goals.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Mục tiêu</h2>
                  <button onClick={() => setScreen('goals')} className="text-turquoise text-sm font-bold">Xem tất cả</button>
                </div>
                <div className="flex flex-col gap-3">
                  {goals.slice(0, 2).map((g) => {
                    const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                          <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                        </div>
                        <ProgressBar pct={pct} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Thu/chi theo danh mục</h2>
                <PeriodControlsFor filter={mobileComboFilter} />
              </div>
              <p className="text-steel dark:text-light-grey text-xs font-bold mb-2">Thu nhập</p>
              {mobileIncomeSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-xs mb-4">Chưa có thu nhập trong khoảng này.</p> : (
                <div className="mb-5"><CategoryBarChart series={mobileIncomeSeries} maxVal={mobileMaxIncome} buckets={mobileBuckets} /></div>
              )}
              <p className="text-steel dark:text-light-grey text-xs font-bold mb-2">Chi tiêu</p>
              {mobileExpenseSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-xs">Chưa có chi tiêu trong khoảng này.</p> : (
                <CategoryBarChart series={mobileExpenseSeries} maxVal={mobileMaxExpense} buckets={mobileBuckets} />
              )}
            </div>

            <div className="flex items-center justify-between mt-8 mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
              <button onClick={() => setScreen('report')} className="text-turquoise text-sm font-bold">Xem chi tiết</button>
            </div>
            {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-turquoise" /></div>
              : recentTxList.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào. Bấm nút + để thêm.</p>
              : (
                <div className="flex flex-col gap-4 scrollbar-hide">
                  {sortedGroupKeys.map((key) => (
                    <div key={key}>
                      <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatDateLabel(key)}</p>
                      <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                        {groupedRecentTx[key].map((tx) => {
                          const cat = categories.find((c) => c.id === tx.category_id);
                          const isOverLimit = (tx.note || '').startsWith('[Vượt hạn mức]');
                          return (
                            <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                              <EmojiCircle emoji={cat?.icon} size={40} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-blueberry dark:text-white font-bold text-sm">{cat?.name || 'Khác'}</p>
                                  {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                </div>
                                <p className="text-steel dark:text-light-grey text-xs">{stripPeriodTag(tx.note) || new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <p className={`font-bold text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</p>
                              <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
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
      </div>

      {/* Desktop version */}
      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-0" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-64 -left-10" />
        <div className="relative flex items-center justify-between mb-6">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <GlobalPeriodWidget />
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
            className={`frost-card rounded-3xl p-6 relative ${assetOverviewHovered ? 'z-50' : 'z-0'}`}
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
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-turquoise" />Thu nhập</span>
                <span className="flex items-center gap-1.5 text-steel dark:text-light-grey font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-cotton-candy" />Chi tiêu</span>
              </div>
            </div>
            <div className="flex items-end gap-3 mt-4 h-32 overflow-x-auto scrollbar-hide">
              {trendBuckets.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" style={{ minWidth: trendBuckets.length > 12 ? 22 : undefined }}>
                  <div className="w-full flex items-end gap-1 h-full">
                    <div className="flex-1 bg-turquoise rounded-t-lg" style={{ height: `${(b.inc / maxTrend) * 100}%`, minHeight: b.inc > 0 ? 4 : 0 }} />
                    <div className="flex-1 bg-cotton-candy rounded-t-lg" style={{ height: `${(b.exp / maxTrend) * 100}%`, minHeight: b.exp > 0 ? 4 : 0 }} />
                  </div>
                  <span className="text-[11px] text-steel dark:text-light-grey whitespace-nowrap">{b.label}</span>
                </div>
              ))}
            </div>
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
                  className="relative isolate w-full overflow-hidden"
                  style={{ height: 172 }}
                  onTouchStart={handleWalletTouchStart}
                  onTouchEnd={handleWalletTouchEnd}
                  onWheel={handleWalletWheel}
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
                  <CustomSelect value={recentTxFilter} onChange={(e) => setRecentTxFilter(e.target.value)} className="" triggerClassName="frost-inset rounded-full text-xs font-bold px-3 py-1.5 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
                    <option value="7d">Tuần</option>
                    <option value="month">Tháng</option>
                    <option value="year">Năm</option>
                  </CustomSelect>
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
                            const isOverLimit = (tx.note || '').startsWith('[Vượt hạn mức]');
                            // FIX: với khoản chi tiêu KHÔNG phải quỹ (danh mục thường, VD "Điện thoại")
                            // và được trừ trực tiếp từ thu nhập của kỳ (không qua ví), hiển thị thêm
                            // "Thu nhập kỳ còn lại" — tương tự cách quỹ hiển thị "Số dư" sau mỗi giao dịch.
                            const isFromPeriodIncome = tx.type === 'expense' && tx.account_id == null && !cat?.is_fund;
                            const periodRemaining = isFromPeriodIncome ? periodPool(transactions, transactionPeriodKey(tx)).remaining : null;
                            return (
                              <div key={tx.id} onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
                                <EmojiCircle emoji={cat?.icon} size={36} bg={tx.type === 'income' ? '#B4F1F1' : '#E3D6FF'} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-blueberry dark:text-white font-bold text-sm truncate">{cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu')}</p>
                                    {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                                  </div>
                                  <p className="text-steel dark:text-light-grey text-xs">{new Date(tx.created_at || tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                  {isFromPeriodIncome && (
                                    <p className="text-[11px] text-steel dark:text-light-grey">Thu nhập kỳ còn lại: <span className={`font-semibold ${periodRemaining < 0 ? 'text-cotton-candy' : 'text-turquoise'}`}>{formatMoney(periodRemaining)}</span></p>
                                  )}
                                </div>
                                <p className={`font-bold text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</p>
                                <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
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
                <TotalsPeriodSelect month={incomeTotalsMonth} year={incomeTotalsYear} onMonthChange={setIncomeTotalsMonth} onYearChange={setIncomeTotalsYear} />
              </div>
              {incomeYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <svg width="120" height="120" viewBox="0 0 150 150" className="-rotate-90">
                      {incomeYearSegments.map((seg, i) => (
                        <circle key={seg.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset} strokeLinecap="round" />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-steel dark:text-light-grey">Tổng</span>
                      <span className="text-xs font-bold text-blueberry dark:text-white">{formatMoney(totalIncomeYear)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm w-full">
                    {incomeYearSegments.slice(0, 4).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="frost-card rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-blueberry dark:text-white font-extrabold">Tổng chi tiêu</h3>
                <TotalsPeriodSelect month={expenseTotalsMonth} year={expenseTotalsYear} onMonthChange={setExpenseTotalsMonth} onYearChange={setExpenseTotalsYear} />
              </div>
              {expenseYearSegments.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong năm nay.</p> : (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <svg width="120" height="120" viewBox="0 0 150 150" className="-rotate-90">
                      {expenseYearSegments.map((seg, i) => (
                        <circle key={seg.id} cx="75" cy="75" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="14" strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset} strokeLinecap="round" />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-steel dark:text-light-grey">Tổng</span>
                      <span className="text-xs font-bold text-blueberry dark:text-white">{formatMoney(totalExpenseYear)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm w-full">
                    {expenseYearSegments.slice(0, 4).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: palette[i % palette.length] }} />
                        <span className="text-blueberry dark:text-white truncate font-semibold">{c.name}</span>
                        <span className="text-blueberry dark:text-white text-xs font-bold ml-auto flex-shrink-0">{formatMoney(c.amount)}</span>
                        <span className="text-steel dark:text-light-grey text-xs w-9 text-right flex-shrink-0">{Math.round(c.pct * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ gridArea: 'cost' }} className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-blueberry dark:text-white font-extrabold">Phân tích chi phí</h3>
              <PeriodControlsFor filter={costFilter} />
            </div>
            {costExpenseSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu nào trong khoảng này.</p> : (
              <IncomeExpenseComboChart buckets={costBuckets} series={costExpenseSeries} incomeTotals={costIncomeTotals} maxVal={costMaxVal} />
            )}
          </div>

          <div style={{ gridArea: 'goal' }} className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-blueberry dark:text-white font-extrabold">Mục tiêu</h3>
              <button onClick={() => setScreen('goals')} className="text-turquoise text-xs font-bold">Xem tất cả</button>
            </div>
            {(!goals || goals.length === 0) ? <p className="text-steel dark:text-light-grey text-sm text-center py-4">Chưa có mục tiêu nào.</p> : (
              <div className="flex flex-col gap-4">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_amount ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-blueberry dark:text-white text-sm font-semibold">{g.name}</span>
                        <span className="text-steel dark:text-light-grey text-xs">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} colorClass="bg-turquoise" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-blueberry dark:text-white font-extrabold">Thu nhập theo danh mục</h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <PeriodControlsFor filter={incomeCardFilter} />
                <button onClick={() => setLedgerModal({ title: `Thu nhập theo danh mục — ${labelForCardFilter(incomeCardFilter)}`, txs: filteredTxsForCard(transactions, incomeCardFilter, incomeCardBuckets, 'income') })} className="text-xs font-bold text-turquoise hover:underline whitespace-nowrap">Xem chi tiết</button>
              </div>
            </div>
            {incomeCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có thu nhập trong khoảng này.</p> : (
              <CategoryBarChart series={incomeCardSeries} maxVal={incomeCardMax} buckets={incomeCardBuckets} />
            )}
          </div>

          <div className="frost-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-blueberry dark:text-white font-extrabold">Chi tiêu theo danh mục</h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <PeriodControlsFor filter={expenseCardFilter} />
                <button onClick={() => setLedgerModal({ title: `Chi tiêu theo danh mục — ${labelForCardFilter(expenseCardFilter)}`, txs: filteredTxsForCard(transactions, expenseCardFilter, expenseCardBuckets, 'expense') })} className="text-xs font-bold text-cotton-candy hover:underline whitespace-nowrap">Xem chi tiết</button>
              </div>
            </div>
            {expenseCardSeries.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có chi tiêu trong khoảng này.</p> : (
              <CategoryBarChart series={expenseCardSeries} maxVal={expenseCardMax} buckets={expenseCardBuckets} />
            )}
          </div>
        </div>
      </div>

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
              <button onClick={() => setShowAddWidget(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
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

/* ==============================================================================
   09. FUNDS
   ============================================================================== */
function Funds({ setScreen, categories, transactions, onOpenFund, reload, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingFund, setEditingFund] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterTarget, setFilterTarget] = useState('all');
  const [filterRate, setFilterRate] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const funds = categories.filter((c) => c.type === 'expense' && c.is_fund);
  const totalFunds = funds.reduce((s, c) => s + fundBalanceWithProfit(c, transactions), 0);
  const totalIn = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'allocation').reduce((a, t) => a + Number(t.amount), 0), 0);
  const totalOut = funds.reduce((s, c) => s + transactions.filter((t) => t.category_id === c.id && t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0), 0);

  function fundStatus(c) {
    const balance = fundBalanceWithProfit(c, transactions);
    const target = Number(c.target_amount || 0);
    if (target > 0 && balance >= target) return 'done';
    if (target > 0) return 'set';
    return 'none';
  }
  const doneCount = funds.filter((c) => fundStatus(c) === 'done').length;

  const filteredFunds = funds.filter((c) => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTarget = filterTarget === 'all' || filterTarget === fundStatus(c);
    const rStyle = fundRateStyle(c);
    const matchesRate = filterRate === 'all' || filterRate === rStyle.value;
    return matchesSearch && matchesTarget && matchesRate;
  });

  const activeSortField = FUND_SORT_FIELDS.find((f) => f.key === sortField) || FUND_SORT_FIELDS[0];
  const displayFunds = [...filteredFunds].sort((a, b) => {
    const av = activeSortField.get(a, transactions), bv = activeSortField.get(b, transactions);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const pageSize = viewMode === 'card' ? 9 : 8;
  const totalPages = Math.max(1, Math.ceil(displayFunds.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedFunds = displayFunds.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const editingFirstAllocation = editingFund ? findInitialAllocation(transactions, editingFund.id) : null;
  const editingInitialAmount = editingFirstAllocation ? Number(editingFirstAllocation.amount) : 0;

  // Remove outer wrapper with padding
  return (
    <>
      {/* Mobile version */}
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-secondary opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] rounded-2xl shadow-soft px-4 py-3">
              <Search size={16} className="text-steel dark:text-light-grey" />
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
            </div>
          </div>

          <div className="px-5 mt-5 flex items-center justify-between">
            <h1 className="text-blueberry dark:text-white text-lg font-extrabold">Danh sách quỹ</h1>
            <div className="flex items-center gap-1 bg-white dark:bg-[#2a2a44] rounded-full shadow-soft px-1 py-1">
              <button onClick={() => setViewMode((v) => (v === 'card' ? 'list' : 'card'))} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-blueberry dark:text-white">
                <List size={13} /> Quản lý
              </button>
              <span className="w-px h-4 bg-light-grey dark:bg-light-grey/20" />
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-turquoise">
                <Plus size={13} /> Tạo quỹ
              </button>
            </div>
          </div>

          <div className="mx-5 mt-2 mb-3 bg-white/70 dark:bg-[#2a2a44]/70 backdrop-blur rounded-xl px-3 py-2 flex items-center justify-between shadow-soft">
            <p className="text-steel dark:text-light-grey text-xs font-semibold">Tổng số dư mọi quỹ</p>
            <p className="text-blueberry dark:text-white font-bold text-sm">{formatMoney(totalFunds)}</p>
          </div>

          <div className="px-5 flex flex-col gap-4 scrollbar-hide">
            {filteredFunds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-10">{funds.length === 0 ? 'Chưa có quỹ nào. Bấm "Tạo quỹ" để tạo quỹ đầu tiên.' : 'Không tìm thấy quỹ nào.'}</p>
            ) : (
              filteredFunds.map((f, i) => {
                const balance = fundBalanceWithProfit(f, transactions);
                const target = Number(f.target_amount || 0);
                const rStyle = fundRateStyle(f);
                return (
                  <button key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="relative w-full h-44 rounded-3xl overflow-hidden text-left shadow-soft"
                    style={{ background: fundCardBackground(f, i), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/25 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                      <Star size={11} className="fill-white" /> Chủ quỹ
                    </span>
                    <span className="absolute top-3 left-4 flex items-center gap-1.5 text-white font-extrabold text-base drop-shadow">
                      <span>{f.icon || '💰'}</span> {f.name}
                    </span>
                    <span className="absolute bottom-3 left-4 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-white/90 flex items-center justify-center text-[11px]">{f.icon || '💰'}</span>
                      <span className="text-white font-bold text-lg drop-shadow">
                        {formatMoney(balance)}{target > 0 && <span className="font-semibold text-sm"> / {formatMoney(target)}</span>}
                      </span>
                    </span>
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 text-white text-[10px] font-bold bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: rStyle.color }} />
                      {rStyle.value} {f.interest_rate > 0 && `(${f.interest_rate}%)`}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-turquoise-light/70 dark:bg-turquoise/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-96 -left-10" />
        <h1 className="relative text-blueberry dark:text-white text-2xl font-extrabold mb-6">Quản lý quỹ</h1>

        <div className="relative grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={PiggyBank} iconBg="bg-turquoise" label="Tổng số dư mọi quỹ" value={formatMoney(totalFunds)} />
          <SummaryCard icon={TrendingUp} iconBg="bg-baby-blue" label="Tổng đã nạp" value={formatMoney(totalIn)} />
          <SummaryCard icon={TrendingDown} iconBg="bg-cotton-candy" label="Tổng đã rút" value={formatMoney(totalOut)} />
          <SummaryCard icon={Sparkles} iconBg="bg-lavender" label="Tổng số lượng quỹ" value={funds.length} sub={`${doneCount} đã đạt mục tiêu`} />
        </div>

 <div className="relative frost-card rounded-3xl overflow-hidden" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterTarget !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterTarget === 'done' ? 'Đã đạt mục tiêu' : filterTarget === 'set' ? 'Đang tích lũy' : 'Chưa đặt mục tiêu'}
                  <button onClick={() => { setFilterTarget('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterRate !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  {filterRate}
                  <button onClick={() => { setFilterRate('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {(filterTarget !== 'all' || filterRate !== 'all') && (
                <button onClick={() => { setFilterTarget('all'); setFilterRate('all'); setPage(1); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.3)] rounded-full px-3 py-1.5 text-xs font-bold text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="left-0 top-9 z-20 frost-card rounded-2xl shadow-card p-4 w-64">
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Mục tiêu quỹ</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['none', 'Chưa đặt'], ['set', 'Đang tích lũy'], ['done', 'Đã đạt']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterTarget(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterTarget === k ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Lãi suất</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterRate('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold ${filterRate === 'all' ? 'frost-inset text-blueberry dark:text-white' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>Tất cả</button>
                      {FUND_RATE_TIERS.map((t) => (
                        <button key={t.value} onClick={() => { setFilterRate(t.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${filterRate === t.value ? 'frost-inset' : 'hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} /> <span className="text-blueberry dark:text-white truncate">{t.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v); setShowFilterMenu(false); }} className="flex items-center gap-2 border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] rounded-full px-4 py-2 text-sm text-blueberry dark:text-white font-semibold">
                  <ArrowUpDown size={14} /> {activeSortField.label}
                </button>
                {showSortMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-0 top-10 z-20 frost-card rounded-2xl shadow-card p-2 w-56">
                    <p className="text-xs font-bold text-steel dark:text-light-grey px-2 py-1.5">Sắp xếp theo</p>
                    {FUND_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField((cur) => { if (cur === f.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return cur; } setSortDir(f.key === 'created' ? 'desc' : 'asc'); return f.key; }); }}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${sortField === f.key ? 'frost-inset text-blueberry dark:text-white font-bold' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                        {f.label}
                        {sortField === f.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 frost-inset rounded-full p-1">
                <button onClick={() => { setViewMode('card'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'card' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><LayoutGrid size={15} /></button>
                <button onClick={() => { setViewMode('list'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><List size={15} /></button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-4 flex-wrap gap-3">
            <p className="text-steel dark:text-light-grey text-sm font-semibold">{displayFunds.length} quỹ</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 frost-inset rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-steel dark:text-light-grey" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm quỹ..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
              </div>
              <button onClick={() => setShowCreate(true)} className="bg-gradient-primary text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-turquoise/30">
                <Plus size={16} /> Tạo quỹ mới
              </button>
            </div>
          </div>

          <div className="border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
            {funds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-16">Chưa có quỹ nào. Bấm "Tạo quỹ mới" để bắt đầu.</p>
            ) : displayFunds.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-16">Không tìm thấy quỹ nào.</p>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                {pagedFunds.map((f) => {
                  const balance = fundBalanceWithProfit(f, transactions);
                  const target = Number(f.target_amount || 0);
                  const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                  const isDone = target > 0 && balance >= target;
                  const rStyle = fundRateStyle(f);
                  return (
 <div key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="frost-card rounded-2xl overflow-hidden hover:shadow-card transition cursor-pointer">
                      <div
                        className="relative h-24 flex items-end p-4"
                        style={f.background_url
                          ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.45)), url(${f.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: 'linear-gradient(135deg,#0DBACC,#74ACEF)' }}
                      >
                        <span className="text-2xl">{f.icon}</span>
                        {isDone && (
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur text-[11px] font-bold px-2 py-1 rounded-full text-turquoise">
                            <Check size={11} /> Đã đạt mục tiêu
                          </span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur flex items-center justify-center text-blueberry dark:text-white">
                          <MoreHorizontal size={14} />
                        </button>
                        {openMenuId === f.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="top-10 right-2.5 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                            <button onClick={() => { onOpenFund(f.id, 'funds'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                              <Eye size={14} /> Xem chi tiết
                            </button>
                            <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                              <Pencil size={14} /> Chỉnh sửa
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-blueberry dark:text-white font-bold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{f.name}</h3>
                        <div className="flex items-center gap-4 mb-3">
                          <MiniRing pct={pct} color={isDone ? '#0DBACC' : '#74ACEF'} label="Tiến độ mục tiêu" />
                          <div className="leading-tight">
                            <p className="text-blueberry dark:text-white text-sm font-bold">{formatMoney(balance)}</p>
                            <p className="text-steel dark:text-light-grey text-[10px]">Số dư hiện tại</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: rStyle.color, background: rStyle.bg }}>
                            {rStyle.value} {f.interest_rate > 0 && `(${f.interest_rate}%)`}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'bg-turquoise/10 text-turquoise' : 'bg-ice-cream text-steel dark:bg-night-sky dark:text-light-grey'}`}>{target > 0 ? (isDone ? 'Đã đạt' : 'Đang tích lũy') : 'Chưa đặt mục tiêu'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-steel dark:text-light-grey pt-3 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : '—'}</span>
                          <span>{target > 0 ? formatMoney(target) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="text-left text-steel dark:text-light-grey border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                      <th className="p-4 font-bold">Tên quỹ</th>
                      <th className="p-4 font-bold">Lãi suất</th>
                      <th className="p-4 font-bold text-right">Số dư hiện tại</th>
                      <th className="p-4 font-bold text-right">Mục tiêu</th>
                      <th className="p-4 font-bold">Tiến độ</th>
                      <th className="p-4 font-bold">Trạng thái</th>
                      <th className="p-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedFunds.map((f) => {
                      const balance = fundBalanceWithProfit(f, transactions);
                      const target = Number(f.target_amount || 0);
                      const pct = target > 0 ? Math.min(100, (balance / target) * 100) : 0;
                      const isDone = target > 0 && balance >= target;
                      const rStyle = fundRateStyle(f);
                      return (
                        <tr key={f.id} onClick={() => onOpenFund(f.id, 'funds')} className="border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)] last:border-0 hover:bg-ice-cream dark:hover:bg-night-sky/30 cursor-pointer">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <EmojiCircle emoji={f.icon} size={36} bg="#E3D6FF" />
                              <p className="font-bold text-blueberry dark:text-white">{f.name}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: rStyle.color, background: rStyle.bg }}>
                              {rStyle.value} {f.interest_rate > 0 && `(${f.interest_rate}%)`}
                            </span>
                          </td>
                          <td className="p-4 text-right text-blueberry dark:text-white">{formatMoney(balance)}</td>
                          <td className="p-4 text-right text-steel dark:text-light-grey">{target > 0 ? formatMoney(target) : '—'}</td>
                          <td className="p-4 w-32">
                            {target > 0 ? (<><ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} /><p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(pct)}%</p></>) : <span className="text-light-grey">—</span>}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDone ? 'bg-turquoise/10 text-turquoise' : 'bg-ice-cream text-steel dark:bg-night-sky dark:text-light-grey'}`}>{target > 0 ? (isDone ? 'Đã đạt' : 'Đang tích lũy') : 'Chưa đặt mục tiêu'}</span>
                          </td>
                          <td className="p-4 text-right relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === f.id ? null : f.id); }} className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 inline-flex items-center justify-center text-steel dark:text-light-grey">
                              <MoreHorizontal size={18} />
                            </button>
                            {openMenuId === f.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-4 top-12 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                                <button onClick={() => { onOpenFund(f.id, 'funds'); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                  <Eye size={14} /> Xem chi tiết
                                </button>
                                <button onClick={() => { setEditingFund(f); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                  <Pencil size={14} /> Chỉnh sửa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {displayFunds.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
              <p className="text-steel dark:text-light-grey text-xs font-semibold">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-full border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] text-sm text-blueberry dark:text-white font-semibold disabled:opacity-40">Previous</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-full bg-gradient-primary text-white text-sm font-bold disabled:opacity-40 shadow-md shadow-turquoise/30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <EditFundForm onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
      {editingFund && <EditFundForm category={editingFund} onClose={() => setEditingFund(null)} onSaved={reload} isNew={false} initialAmount={editingInitialAmount} firstAllocation={editingFirstAllocation} />}
    </>
  );
}

/* ==============================================================================
   10. FUND DETAIL
   ============================================================================== */
function FundDetail({ category, transactions, categories, accounts, onBack, reload, softDelete, setScreen, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar, spendingPoolByPeriod }) {
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
    if (!confirm('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }

  // Lấy tất cả giao dịch nạp/rút, sắp xếp theo thời gian tăng dần
  const allHistory = transactions
    .filter((t) => t.category_id === category.id && (t.type === 'allocation' || t.type === 'expense'))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

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
    ...allHistory.map(tx => ({ ...tx, type: tx.type, isProfit: false })),
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
    // Giao dịch nạp/rút: sắp theo "date" (ngày nghiệp vụ, giống allHistory) chứ KHÔNG phải created_at
    // (created_at là thời điểm lưu vào DB, có thể khác ngày nghiệp vụ nếu nhập bù/chỉnh sửa sau)
    // Lợi nhuận: sắp theo created_at đã được set = displayDate
    const ka = a.isProfit ? new Date(a.created_at) : new Date(a.date || a.created_at);
    const kb = b.isProfit ? new Date(b.created_at) : new Date(b.date || b.created_at);
    return ka - kb;
  });

  // Lọc theo filter
  const filteredHistory = filter === 'all' ? combinedHistory :
    filter === 'profit' ? combinedHistory.filter(item => item.isProfit) :
    combinedHistory.filter(item => item.type === filter && !item.isProfit);

  // Ngày/giờ "thực" của 1 dòng lịch sử — giao dịch dùng "date" (ngày nghiệp vụ), lợi nhuận
  // dùng "created_at" (đã được set = ngày credit). Dùng chung cho hiển thị lẫn lọc theo ngày.
  function historyItemDate(item) {
    return new Date(item.isProfit ? item.created_at : (item.date || item.created_at));
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
    if (!confirm('Xóa quỹ này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('categories', category.id, `Xoá danh mục "${category.name}"`, 'delete_category');
    if (error) { alert('Lỗi: ' + error.message); return; }
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
  return (
    <>
      <div className="md:hidden min-h-[100dvh] pb-28 relative bg-ice-cream dark:bg-[#1a1a2e]">
        <div className="h-56 relative"
          style={{
            ...(category.background_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)), url(${category.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(180deg,#0DBACC,#74ACEF,#C1DDFF)' }),
          }}>
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
              <div className="flex items-center gap-2">
                <EmojiCircle emoji={category.icon} size={26} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
                <h1 className="text-white text-base font-bold">{category.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
              <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
            </div>
          </div>
          {category.description && <p className="px-5 mt-3 text-white/85 text-sm text-center">{category.description}</p>}
        </div>

        <div className="px-5 -mt-14 relative z-10">
          <div className="bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư quỹ</p>
                <p className="text-blueberry dark:text-white text-[26px] font-bold leading-tight mt-0.5 truncate">
                  {formatMoney(balance)}
                  {target > 0 && <span className="text-steel dark:text-light-grey text-base font-normal"> /{formatMoney(target)}</span>}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full ring-4 ring-turquoise/30 bg-turquoise-light dark:bg-turquoise/10 flex items-center justify-center text-2xl flex-shrink-0">
                {category.icon || '🐷'}
              </div>
            </div>

            {rate > 0 && (
              <button onClick={() => setFilter('profit')} className="mt-3 w-full flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold rounded-full pl-3 pr-2 py-2">
                <Sparkles size={13} className="flex-shrink-0" />
                <span className="flex-1 text-left truncate">Tổng lợi nhuận: {formatMoney(accruedProfit)} | Hôm nay: +{formatMoney(dailyProfit)}</span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
            )}

            {target > 0 && (
              <div className="mt-3">
                <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                <p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(targetPct)}% mục tiêu</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setQuickMode('allocation')} className="flex-1 flex items-center justify-center gap-1.5 bg-turquoise/10 text-turquoise rounded-2xl py-3 text-sm font-bold">
                <TrendingUp size={16} /> Góp quỹ
              </button>
              <button onClick={() => setQuickMode('expense')} className="flex-1 flex items-center justify-center gap-1.5 bg-cotton-candy/10 text-cotton-candy rounded-2xl py-3 text-sm font-bold">
                <Wallet size={16} /> Rút quỹ
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 mt-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-3">Hoạt động gần đây</h2>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Góp quỹ' }, { key: 'expense', label: 'Rút quỹ' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 font-semibold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey shadow-soft'}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] rounded-full px-3 py-1.5 shadow-soft">
              <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
              <span className="text-steel dark:text-light-grey text-xs">→</span>
              <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
            </div>
            {hasHistoryDateFilter && (
              <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
            )}
          </div>

          {displayHistory.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có hoạt động nào.</p>
          ) : (
            <div className="flex flex-col scrollbar-hide">
              {(() => {
                let lastDateKey = null;
                return displayHistory.map((item) => {
                  const isProfit = item.isProfit;
                  const isAlloc = item.type === 'allocation';
                  const isInitial = isAlloc && firstAllocation && item.id === firstAllocation.id;
                  const label = isAlloc ? 'Góp quỹ' : isProfit ? 'Nhận lợi nhuận tự động' : 'Rút quỹ';
                  const iconBg = item.type === 'expense' ? 'bg-cotton-candy/10' : 'bg-turquoise/10';
                  const amountColor = item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise';
                  const timeDisplay = formatDisplayTime(item);
                  const isOverLimit = (item.note || '').startsWith('[Vượt hạn mức]');
                  // Nhóm theo ngày thực hiện thực tế: giao dịch dùng "date" (thời điểm thật khi bấm nạp/rút),
                  // lợi nhuận dùng "created_at" (= ngày được credit theo quy tắc)
                  const itemDate = new Date(isProfit ? item.created_at : (item.date || item.created_at));
                  const dateKey = itemDate.toDateString();
                  const showHeader = dateKey !== lastDateKey;
                  lastDateKey = dateKey;
                  const noteText = isProfit ? item.note : stripPeriodTag(item.note);

                  return (
                    <Fragment key={item.id}>
                      {showHeader && (
                        <div className="-mx-5 px-5 py-2 mt-3 first:mt-0 bg-steel/5 dark:bg-white/5">
                          <p className="text-blueberry dark:text-white font-extrabold text-sm">
                            {itemDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div className={`flex items-start gap-3 py-3 ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : 'border-b border-[rgba(189,189,203,0.15)] last:border-b-0'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isInitial ? 'bg-turquoise' : iconBg}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : isAlloc ? <TrendingUp size={16} className="text-turquoise" /> : isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <p className="text-blueberry dark:text-white font-bold text-sm truncate">
                                {label}{isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                              </p>
                              {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                            </div>
                            <p className={`font-bold text-sm flex-shrink-0 ${amountColor}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs mt-0.5">{itemDate.toLocaleDateString('vi-VN')} · {timeDisplay}</p>
                          {noteText && <p className="text-steel dark:text-light-grey text-xs mt-0.5 truncate">{noteText}</p>}
                          {item.balanceAfter !== undefined && <p className="text-steel dark:text-light-grey text-xs mt-0.5">Số dư: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        {!isProfit && (
                          // Khoản "Nạp quỹ lần đầu" (isInitial) bấm bút chì -> mở popup chỉnh sửa
                          // THÔNG TIN QUỸ (vì số tiền ban đầu được sửa chung trong form đó);
                          // các khoản nạp/rút khác -> mở đúng popup Nạp quỹ/Rút quỹ (tuỳ item.type)
                          // ở chế độ sửa, KHÔNG mở form Sửa giao dịch chung chung.
                          <button onClick={() => (isInitial ? setShowEdit(true) : setEditingQuickTx(item))} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    </Fragment>
                  );
                });
              })()}
            </div>
          )}

          <div className="bg-white dark:bg-[#1e1e32] rounded-2xl p-4 mt-5 shadow-soft">
            <p className="text-steel dark:text-light-grey text-xs font-bold mb-1">Số tiền ban đầu</p>
            <p className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-turquoise/10 rounded-2xl p-4">
              <p className="text-turquoise text-xs font-bold mb-1">Tổng đã nạp</p>
              <p className="text-turquoise font-bold">{formatMoney(totalIn)}</p>
            </div>
            <div className="bg-cotton-candy/10 rounded-2xl p-4">
              <p className="text-cotton-candy text-xs font-bold mb-1">Tổng đã rút</p>
              <p className="text-cotton-candy font-bold">{formatMoney(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={category.icon} size={40} active activeColor="#0DBACC" />
              <div>
                <h1 className="text-blueberry dark:text-white text-xl font-bold leading-tight">{category.name}</h1>
                {category.description && <p className="text-steel dark:text-light-grey text-sm">{category.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuickMode('allocation')} className="bg-gradient-primary text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30"><TrendingUp size={15} /> Nạp quỹ</button>
            <button onClick={() => setQuickMode('expense')} className="bg-cotton-candy text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-cotton-candy/30"><TrendingDown size={15} /> Rút quỹ</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Pencil size={15} className="text-blueberry dark:text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Trash2 size={15} className="text-cotton-candy" /></button>
          </div>
        </div>

        {category.background_url && (
          <div className="w-full h-40 rounded-3xl overflow-hidden mb-6">
            <img src={category.background_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-6">
 <div className="frost-card rounded-3xl p-6 ">
              <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư hiện tại</p>
              <p className="text-blueberry dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
              {accruedProfit > 1 && <p className="text-turquoise text-sm mt-1 font-semibold">Trong đó lãi cộng dồn: {formatMoney(accruedProfit)}</p>}
              {target > 0 && (
                <div className="mt-4">
                  <ProgressBar pct={targetPct} colorClass="bg-turquoise" />
                  <p className="text-steel dark:text-light-grey text-xs mt-1">{formatMoney(balance)} / {formatMoney(target)} mục tiêu ({Math.round(targetPct)}%)</p>
                </div>
              )}
              {rate > 0 && <p className="text-turquoise text-sm mt-3 font-semibold">Lãi suất {rate}%/năm — ước tính {formatMoney(dailyProfit)}/ngày, cộng dồn tiếp tục sinh lời</p>}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-turquoise/10 rounded-2xl p-4">
                  <p className="text-turquoise text-xs font-bold mb-1">Tổng đã nạp</p>
                  <p className="text-turquoise font-bold">{formatMoney(totalIn)}</p>
                </div>
                <div className="bg-cotton-candy/10 rounded-2xl p-4">
                  <p className="text-cotton-candy text-xs font-bold mb-1">Tổng đã rút</p>
                  <p className="text-cotton-candy font-bold">{formatMoney(totalOut)}</p>
                </div>
              </div>
            </div>

 <div className="frost-card rounded-3xl p-6 ">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Lịch sử</h2>
                <div className="flex gap-2 flex-wrap">
                  {[{ key: 'all', label: 'Tất cả' }, { key: 'allocation', label: 'Nạp (Thu)' }, { key: 'expense', label: 'Chi' }, { key: 'profit', label: 'Lợi nhuận' }].map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs flex-shrink-0 font-bold ${filter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{f.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="flex items-center gap-2 frost-inset rounded-full px-3 py-1.5">
                  <DateField value={historyDateFrom} onChange={setHistoryDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                  <span className="text-steel dark:text-light-grey text-xs">→</span>
                  <DateField value={historyDateTo} onChange={setHistoryDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
                </div>
                {hasHistoryDateFilter && (
                  <button onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }} className="text-xs font-bold text-steel dark:text-light-grey underline">Xoá lọc ngày</button>
                )}
              </div>
              {filter === 'profit' ? (
                rate === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa đặt tỷ suất lợi nhuận cho quỹ này.</p> : (
                  <div className="frost-inset rounded-2xl p-5 text-center">
                    <p className="text-steel dark:text-light-grey text-sm font-semibold mb-1">Lợi nhuận cộng dồn đến hôm nay</p>
                    <p className="text-blueberry dark:text-white text-2xl font-bold">{formatMoney(accruedProfit)}</p>
                    <p className="text-steel dark:text-light-grey text-sm mt-2">Dự kiến ngày mai: +{formatMoney(dailyProfit)}</p>
                    {dailyProfitHistory.length > 0 && (
                      <div className="mt-4 text-left">
                        <p className="text-steel dark:text-light-grey text-sm font-bold mb-2">Lịch sử lợi nhuận theo ngày</p>
                        <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] max-h-80 overflow-y-auto scrollbar-hide">
                          {dailyProfitHistory.map((d) => (
                            <div key={d.date.getTime()} className="flex items-center gap-3 py-2.5">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-turquoise/10">
                                <TrendingUp size={14} className="text-turquoise" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-blueberry dark:text-white font-bold text-sm">{d.date.toLocaleDateString('vi-VN')}</p>
                                <p className="text-steel dark:text-light-grey text-xs">Số dư sau lãi: {formatMoney(d.balance)}</p>
                              </div>
                              <p className="font-bold text-sm flex-shrink-0 text-turquoise">+{formatMoney(d.profit)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : displayHistory.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col scrollbar-hide">
                  {displayHistory.map((item, idx) => {
                    const isInitial = item.type === 'allocation' && firstAllocation && item.id === firstAllocation.id;
                    const isOverLimit = (item.note || '').startsWith('[Vượt hạn mức]');
                    const showTopBorder = idx > 0 && !isInitial;
                    const itemDateTime = historyItemDate(item);
                    const dateTimeLabel = `${itemDateTime.toLocaleDateString('vi-VN')} ${itemDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
                    const noteLine = item.isProfit ? item.note : stripPeriodTag(item.note);
                    return (
                      <div key={item.id} className={`flex items-center gap-3 py-3 ${isInitial ? 'bg-turquoise/10 -mx-2 px-2 rounded-xl border border-turquoise' : showTopBorder ? 'border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]' : ''}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isInitial ? 'bg-turquoise' : item.type === 'allocation' ? 'bg-turquoise/10' : item.isProfit ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                          {isInitial ? <Star size={16} className="text-white fill-white" /> : item.type === 'allocation' ? <TrendingUp size={16} className="text-turquoise" /> : item.isProfit ? <Sparkles size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-blueberry dark:text-white font-bold text-sm">
                              {item.type === 'allocation' ? 'Nạp quỹ' : item.isProfit ? 'Lợi nhuận' : 'Rút quỹ (chi tiêu)'}
                              {isInitial && <span className="ml-1.5 text-[10px] font-bold text-turquoise bg-turquoise/20 px-1.5 py-0.5 rounded-full align-middle">Nạp ban đầu</span>}
                            </p>
                            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs">{dateTimeLabel}</p>
                          {noteLine && <p className="text-steel dark:text-light-grey text-xs">{noteLine}</p>}
                          {item.balanceAfter !== undefined && <p className="text-steel dark:text-light-grey text-xs">Số dư: {formatMoney(item.balanceAfter)}</p>}
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${item.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise'}`}>{item.type === 'expense' ? '-' : '+'}{formatMoney(item.amount)}</p>
                        {!item.isProfit && (
                          // Xem giải thích ở bản mobile: khoản nạp ban đầu -> mở sửa thông tin quỹ,
                          // các khoản khác -> mở popup Nạp/Rút quỹ ở chế độ sửa.
                          <button onClick={() => (isInitial ? setShowEdit(true) : setEditingQuickTx(item))} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        {!item.isProfit && <TxDeleteButton onClick={() => handleDeleteTx(item)} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

 <div className="frost-card rounded-3xl p-6 h-fit">
            <h3 className="text-blueberry dark:text-white font-extrabold mb-4">Thông tin quỹ</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Số tiền ban đầu</span><span className="text-blueberry dark:text-white font-bold">{initialAmount > 0 ? formatMoney(initialAmount) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Mục tiêu</span><span className="text-blueberry dark:text-white font-bold">{target > 0 ? formatMoney(target) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Lãi suất</span><span className="text-blueberry dark:text-white font-bold">{rate > 0 ? `${rate}%/năm` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã nạp</span><span className="text-turquoise font-bold">{formatMoney(totalIn)}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Tổng đã rút</span><span className="text-cotton-candy font-bold">{formatMoney(totalOut)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && <EditFundForm category={category} onClose={() => setShowEdit(false)} onSaved={reload} isNew={false} initialAmount={initialAmount} firstAllocation={firstAllocation} />}
      {quickMode && <QuickAllocateWithdrawForm category={category} mode={quickMode} onClose={() => setQuickMode(null)} onSaved={reload} />}
      {editingQuickTx && (
        <QuickAllocateWithdrawForm
          category={category}
          mode={editingQuickTx.type}
          transaction={editingQuickTx}
          onClose={() => setEditingQuickTx(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}

/* ==============================================================================
   11. ACCOUNTS
   ============================================================================== */
function Accounts({ setScreen, accounts, transactions, onOpenAccount, reload, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar }) {
  const [showCreate, setShowCreate] = useState(false);
  const totalBalance = accounts.reduce((s, a) => s + accountBalance(a, transactions), 0);
  const totalExcludingGold = accounts.filter((a) => a.type !== 'gold').reduce((s, a) => s + accountBalance(a, transactions), 0);

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-primary opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
              <h1 className="text-white text-lg font-bold">Quản lý ví</h1>
            </div>
            <button onClick={() => setShowCreate(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Plus size={18} className="text-white" /></button>
          </div>
          <div className="px-5 mt-4 text-center">
            <p className="text-white/80 text-sm font-semibold">Tổng tất cả tài khoản</p>
            <p className="text-white text-3xl font-bold">{formatMoney(totalBalance)}</p>
            <p className="text-white/70 text-xs font-semibold mt-1">Tổng tất cả trừ vàng: {formatMoney(totalExcludingGold)}</p>
          </div>
          <div className="mt-6 bg-white dark:bg-[#1e1e32] rounded-[2.5rem] min-h-[70vh] px-5 pt-6 pb-6 shadow-soft">
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
          <div className="relative grid grid-cols-3 gap-5 mt-6">
            {accounts.map((acc) => {
              const maskedDigits = String(acc.id || '').replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase().padStart(4, '0');
              return (
                <button
                  key={acc.id}
                  onClick={() => onOpenAccount(acc.id, 'accounts')}
                  style={{ background: accountCardGradient(acc.type) }}
                  className="text-left rounded-[1.75rem] p-5 relative overflow-hidden shadow-lg shadow-black/10 hover:shadow-card transition"
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

                  <p className="relative text-white/90 font-bold text-base tracking-[0.2em] mt-5">•••• •••• •••• {maskedDigits}</p>

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

      {showCreate && <EditAccountModal onClose={() => setShowCreate(false)} onSaved={reload} isNew={true} />}
    </>
  );
}

/* ==============================================================================
   12. ACCOUNT DETAIL
   ============================================================================== */
function AccountDetail({ account, transactions, categories, accounts, onBack, reload, softDelete, setScreen, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar, spendingPoolByPeriod }) {
  const [showAdjust, setShowAdjust] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const history = transactions
    .filter((t) => t.account_id === account.id && (t.type === 'income' || t.type === 'expense' || t.type === 'adjustment' || t.type === 'allocation'))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const balance = accountBalance(account, transactions);
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label || account.type;

  async function handleDelete() {
    if (!confirm('Xóa tài khoản này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('accounts', account.id, `Xoá ví "${account.name}"`, 'delete_account');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload(); onBack();
  }

  async function handleDeleteTx(tx) {
    if (!confirm('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }

  return (
    <>
      <div className="md:hidden min-h-[100dvh] pb-28 relative" style={{ background: 'linear-gradient(180deg,#0DBACC,#74ACEF,#C1DDFF)' }}>
        <div className="px-5 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <div className="flex items-center gap-2">
              <EmojiCircle emoji={account.icon} size={28} active activeColor="rgba(255,255,255,0.3)" bg="rgba(255,255,255,0.3)" />
              <div>
                <h1 className="text-white text-lg font-bold leading-tight">{account.name}</h1>
                <p className="text-white/70 text-xs font-semibold">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Pencil size={15} className="text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><Trash2 size={15} className="text-white" /></button>
          </div>
        </div>

        <div className="px-5 mt-4 text-center">
          <p className="text-white/70 text-sm font-semibold">Số dư hiện tại</p>
          <p className="text-white text-4xl font-bold">{formatMoney(balance)}</p>
          <div className="flex items-center justify-center mt-4">
            <button onClick={() => setShowAdjust(true)} className="bg-white text-blueberry dark:text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-1.5 shadow-card">
              <Pencil size={14} /> Cập nhật số dư
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-[#1e1e32] rounded-[2.5rem] min-h-[65vh] px-5 pt-6 pb-6 shadow-soft">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-3">Lịch sử</h2>
          {history.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
            <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] scrollbar-hide">
              {history.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : tx.note;
                const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && !isDirectSet && Number(tx.amount) > 0);
                const label = tx.type === 'adjustment' ? 'Cập nhật số dư' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                const isOverLimit = (tx.note || '').startsWith('[Vượt hạn mức]');
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'bg-ice-cream dark:bg-night-sky' : isPositive ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                      {isDirectSet ? <Pencil size={15} className="text-steel dark:text-light-grey" /> : isPositive ? <TrendingUp size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                        {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                      </div>
                      <p className="text-steel dark:text-light-grey text-xs">{new Date(tx.created_at || tx.date).toLocaleString('vi-VN')}{displayNote ? ` · ${displayNote}` : ''}</p>
                    </div>
                    <p className={`font-bold text-sm flex-shrink-0 ${isDirectSet ? 'text-blueberry dark:text-white' : isPositive ? 'text-turquoise' : 'text-cotton-candy'}`}>{isDirectSet ? '' : isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                    {!isDirectSet && (
                      <button onClick={() => setEditingTx(tx)} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                        <Pencil size={14} />
                      </button>
                    )}
                    <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><ArrowLeft size={18} className="text-blueberry dark:text-white" /></button>
            <div className="flex items-center gap-3">
              <EmojiCircle emoji={account.icon} size={40} active activeColor="#0DBACC" />
              <div>
                <h1 className="text-blueberry dark:text-white text-xl font-bold leading-tight">{account.name}</h1>
                <p className="text-steel dark:text-light-grey text-sm">{typeLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdjust(true)} className="bg-gradient-primary text-white rounded-full px-4 py-2 text-sm font-bold flex items-center gap-1.5 shadow-md shadow-turquoise/30"><Pencil size={14} /> Cập nhật số dư</button>
            <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Pencil size={15} className="text-blueberry dark:text-white" /></button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center shadow-soft"><Trash2 size={15} className="text-cotton-candy" /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
 <div className="frost-card rounded-3xl p-6 mb-6">
              <p className="text-steel dark:text-light-grey text-sm font-semibold">Số dư hiện tại</p>
              <p className="text-blueberry dark:text-white text-4xl font-bold mt-1">{formatMoney(balance)}</p>
            </div>
 <div className="frost-card rounded-3xl p-6 ">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Lịch sử</h2>
              {history.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-8">Chưa có giao dịch nào.</p> : (
                <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)] scrollbar-hide">
                  {history.map((tx) => {
                    const cat = categories.find((c) => c.id === tx.category_id);
                    const isDirectSet = tx.type === 'adjustment' && (tx.note || '').startsWith('[SET]');
                    const displayNote = isDirectSet ? (tx.note || '').replace('[SET] ', '') : tx.note;
                    const isPositive = tx.type === 'income' || (tx.type === 'adjustment' && !isDirectSet && Number(tx.amount) > 0);
                    const label = tx.type === 'adjustment' ? 'Cập nhật số dư' : (cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'));
                    const isOverLimit = (tx.note || '').startsWith('[Vượt hạn mức]');
                    return (
                      <div key={tx.id} className="flex items-center gap-3 py-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDirectSet ? 'frost-inset' : isPositive ? 'bg-turquoise/10' : 'bg-cotton-candy/10'}`}>
                          {isDirectSet ? <Pencil size={15} className="text-steel dark:text-light-grey" /> : isPositive ? <TrendingUp size={16} className="text-turquoise" /> : <TrendingDown size={16} className="text-cotton-candy" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-blueberry dark:text-white font-bold text-sm">{label}</p>
                            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full">Vượt hạn mức</span>}
                          </div>
                          <p className="text-steel dark:text-light-grey text-xs">{new Date(tx.created_at || tx.date).toLocaleString('vi-VN')}{displayNote ? ` · ${displayNote}` : ''}</p>
                        </div>
                        <p className={`font-bold text-sm flex-shrink-0 ${isDirectSet ? 'text-blueberry dark:text-white' : isPositive ? 'text-turquoise' : 'text-cotton-candy'}`}>{isDirectSet ? '' : isPositive ? '+' : '-'}{formatMoney(Math.abs(tx.amount))}</p>
                        {!isDirectSet && (
                          <button onClick={() => setEditingTx(tx)} className="w-7 h-7 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center text-steel dark:text-light-grey flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        )}
                        <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
 <div className="frost-card rounded-3xl p-6 h-fit">
            <h3 className="text-blueberry dark:text-white font-extrabold mb-4">Thông tin tài khoản</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Loại</span><span className="text-blueberry dark:text-white font-bold">{typeLabel}</span></div>
              <div className="flex justify-between"><span className="text-steel dark:text-light-grey font-semibold">Số dư ban đầu</span><span className="text-blueberry dark:text-white font-bold">{formatMoney(account.initial_balance || 0)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showAdjust && <QuickAdjustBalanceForm account={account} currentBalance={balance} onClose={() => setShowAdjust(false)} onSaved={reload} />}
      {showEdit && <EditAccountModal account={account} onClose={() => setShowEdit(false)} onSaved={reload} />}
      {editingTx && (
        <EditTransaction
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          accounts={accounts || []}
          categories={categories || []}
          transactions={transactions}
          onSaved={() => { reload(); setEditingTx(null); }}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </>
  );
}

/* ==============================================================================
   13. GOALS
   ============================================================================== */
function Goals({ setScreen, goals, loadingGoals, reload, softDelete, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar, categories = [], transactions = [] }) {
  const [editingGoal, setEditingGoal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sortField, setSortField] = useState('created');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalRemaining = goals.reduce((s, g) => s + Math.max(0, Number(g.target_amount || 0) - Number(g.current_amount || 0)), 0);
  const doneCount = goals.filter((g) => g.status === 'Hoàn thành').length;

  const sortedGoals = sortGoals(goals);
  const filteredGoals = sortedGoals.filter((g) => {
    const matchesSearch = (g.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'done' ? g.status === 'Hoàn thành' : g.status !== 'Hoàn thành');
    const matchesPriority = filterPriority === 'all' || g.priority_term === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  const hasActiveFilter = filterStatus !== 'all' || filterPriority !== 'all';

  const activeSortField = GOAL_SORT_FIELDS.find((f) => f.key === sortField) || GOAL_SORT_FIELDS[0];
  const displayGoals = [...filteredGoals].sort((a, b) => {
    const aDone = a.status === 'Hoàn thành', bDone = b.status === 'Hoàn thành';
    if (aDone !== bDone) return aDone ? 1 : -1;
    const av = activeSortField.get(a), bv = activeSortField.get(b);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const pageSize = viewMode === 'card' ? 9 : 8;
  const totalPages = Math.max(1, Math.ceil(displayGoals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedGoals = displayGoals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-secondary opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <h1 className="text-white text-lg font-bold">Mục tiêu</h1>
          </div>
          <div className="mt-6 bg-white dark:bg-[#1e1e32] rounded-[2.5rem] min-h-[80vh] px-5 pt-6 pb-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Mục tiêu của tôi</h2>
              <button onClick={() => setEditingGoal('new')} className="w-7 h-7 rounded-full bg-ice-cream dark:bg-night-sky flex items-center justify-center"><Plus size={16} className="text-blueberry dark:text-white" /></button>
            </div>
            {loadingGoals ? <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-turquoise" /></div>
              : goals.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-6">Chưa có mục tiêu nào.</p>
              : <div className="flex flex-col gap-5 scrollbar-hide">
                  {sortedGoals.map((goal) => {
                    const isDone = goal.status === 'Hoàn thành';
                    const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                    const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    return (
                      <button key={goal.id} onClick={() => setEditingGoal(goal)} className="text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-turquoise' : 'bg-gradient-primary'}`}>
                            {isDone ? <Check size={18} className="text-white" /> : <Target size={18} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-blueberry dark:text-white font-bold text-sm">{goal.name}</p>
                            {goal.priority_term && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                          </div>
                          <p className="text-blueberry dark:text-white font-bold text-sm flex-shrink-0">{formatMoney(goal.current_amount || 0)}</p>
                        </div>
                        <ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} />
                        <div className="flex justify-between mt-1 text-xs text-steel dark:text-light-grey font-semibold">
                          <span>{goal.target_amount ? `Còn thiếu ${formatMoney(Math.max(0, remaining))}` : ''}</span>
                          <span>{goal.target_amount ? formatMoney(goal.target_amount) : ''}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>}
          </div>
        </div>
      </div>

      <div className="hidden md:block relative" onClick={() => { setOpenMenuId(null); setShowFilterMenu(false); setShowSortMenu(false); }}>
        <div className="frost-blob z-0 w-96 h-96 bg-lavender-light/70 dark:bg-lavender/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-turquoise-light/70 dark:bg-turquoise/22 top-96 -left-10" />
        <h1 className="relative text-blueberry dark:text-white text-2xl font-extrabold mb-6">Mục tiêu</h1>

        <div className="relative grid grid-cols-4 gap-4 mb-6">
          <SummaryCard icon={Target} iconBg="bg-turquoise" label="Tổng tiền mục tiêu" value={formatMoney(totalTarget)} />
          <SummaryCard icon={PiggyBank} iconBg="bg-baby-blue" label="Tổng số tiền hiện có" value={formatMoney(totalCurrent)} />
          <SummaryCard icon={Wallet} iconBg="bg-cotton-candy" label="Tổng số tiền còn thiếu" value={formatMoney(totalRemaining)} />
          <SummaryCard icon={Sparkles} iconBg="bg-lavender" label="Tổng số lượng mục tiêu" value={goals.length} sub={`${doneCount} đã hoàn thành`} />
        </div>

 <div className="relative frost-card rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {filterStatus !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  Trạng thái: {filterStatus === 'done' ? 'Hoàn thành' : 'Đang làm'}
                  <button onClick={() => { setFilterStatus('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {filterPriority !== 'all' && (
                <span className="flex items-center gap-1.5 bg-turquoise/10 text-turquoise text-xs font-bold pl-3 pr-1.5 py-1.5 rounded-full">
                  Ưu tiên: {filterPriority}
                  <button onClick={() => { setFilterPriority('all'); setPage(1); }} className="w-4 h-4 rounded-full hover:bg-turquoise/20 flex items-center justify-center"><X size={11} /></button>
                </span>
              )}
              {hasActiveFilter && (
                <button onClick={() => { setFilterStatus('all'); setFilterPriority('all'); setPage(1); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">Reset</button>
              )}
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowFilterMenu((v) => !v); setShowSortMenu(false); }} className="flex items-center gap-1.5 border border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.3)] rounded-full px-3 py-1.5 text-xs font-bold text-steel dark:text-light-grey hover:border-turquoise dark:hover:border-turquoise">
                  <Filter size={13} /> Thêm bộ lọc
                </button>
                {showFilterMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="left-0 top-9 z-20 frost-card rounded-2xl shadow-card p-4 w-64">
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Trạng thái</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[['all', 'Tất cả'], ['active', 'Đang làm'], ['done', 'Hoàn thành']].map(([k, l]) => (
                        <button key={k} onClick={() => { setFilterStatus(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterStatus === k ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'frost-inset text-steel dark:text-light-grey'}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">Mức độ ưu tiên</p>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setFilterPriority('all'); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold ${filterPriority === 'all' ? 'frost-inset text-blueberry dark:text-white' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>Tất cả</button>
                      {PRIORITY_TERMS.map((p) => (
                        <button key={p.value} onClick={() => { setFilterPriority(p.value); setPage(1); }} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${filterPriority === p.value ? 'frost-inset' : 'hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} /> <span className="text-blueberry dark:text-white truncate">{p.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setShowSortMenu((v) => !v); setShowFilterMenu(false); }} className="flex items-center gap-2 border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] rounded-full px-4 py-2 text-sm text-blueberry dark:text-white font-semibold">
                  <ArrowUpDown size={14} /> Ngày tạo
                </button>
                {showSortMenu && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-0 top-10 z-20 frost-card rounded-2xl shadow-card p-2 w-56">
                    <p className="text-xs font-bold text-steel dark:text-light-grey px-2 py-1.5">Sắp xếp theo</p>
                    {GOAL_SORT_FIELDS.map((f) => (
                      <button key={f.key} onClick={() => { setSortField((cur) => { if (cur === f.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); return cur; } setSortDir(f.key === 'created' ? 'desc' : 'asc'); return f.key; }); }}
                        className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm ${sortField === f.key ? 'frost-inset text-blueberry dark:text-white font-bold' : 'text-steel dark:text-light-grey hover:bg-ice-cream dark:hover:bg-night-sky/30'}`}>
                        {f.label}
                        {sortField === f.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 frost-inset rounded-full p-1">
                <button onClick={() => { setViewMode('card'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'card' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><LayoutGrid size={15} /></button>
                <button onClick={() => { setViewMode('list'); setPage(1); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${viewMode === 'list' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'text-steel dark:text-light-grey'}`}><List size={15} /></button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-4 flex-wrap gap-3">
            <p className="text-steel dark:text-light-grey text-sm font-semibold">{displayGoals.length} mục tiêu</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 frost-inset rounded-full px-4 py-2.5 w-56">
                <Search size={15} className="text-steel dark:text-light-grey" />
                <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm mục tiêu..." className="bg-transparent outline-none text-sm flex-1 text-blueberry dark:text-white" />
              </div>
              <button onClick={() => setEditingGoal('new')} className="bg-gradient-primary text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-turquoise/30">
                <Plus size={16} /> Thêm mục tiêu
              </button>
            </div>
          </div>

          <div className="border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
            {loadingGoals ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-turquoise" /></div>
              : displayGoals.length === 0 ? <p className="text-steel dark:text-light-grey text-sm text-center py-16">Không tìm thấy mục tiêu nào.</p>
              : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                  {pagedGoals.map((goal) => {
                    const isDone = goal.status === 'Hoàn thành';
                    const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                    const pStyle = priorityStyle(goal.priority_term);
                    return (
 <div key={goal.id} onClick={() => setEditingGoal(goal)} className="frost-card rounded-2xl overflow-hidden hover:shadow-card transition cursor-pointer">
                        <div className="relative h-28 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${pStyle.bg}, ${pStyle.color}33)` }}>
                          {isDone ? <Check size={40} className="opacity-30" style={{ color: pStyle.color }} /> : <Target size={40} className="opacity-30" style={{ color: pStyle.color }} />}
                          <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur text-[11px] font-bold px-2 py-1 rounded-full text-blueberry dark:text-white">
                            {isDone ? <Check size={11} className="text-turquoise" /> : <Clock size={11} className="text-turquoise" />}
                            {isDone ? 'Hoàn thành' : 'Đang làm'}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-[#2a2a44]/80 backdrop-blur flex items-center justify-center text-blueberry dark:text-white">
                            <MoreHorizontal size={14} />
                          </button>
                          {openMenuId === goal.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="top-10 right-2.5 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                <Eye size={14} /> Xem chi tiết
                              </button>
                              <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                <Pencil size={14} /> Chỉnh sửa
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-blueberry dark:text-white font-bold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{goal.name}</h3>
                          <div className="flex items-center gap-4 mb-3">
                            <MiniRing pct={pct} color={isDone ? '#0DBACC' : '#74ACEF'} label="Tiến độ" />
                            <MiniRing pct={isDone ? 100 : 0} color={isDone ? '#0DBACC' : '#E3D6FF'} label="Hoàn thành" />
                          </div>
                          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            {goal.priority_term && <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span>}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'bg-turquoise/10 text-turquoise' : 'bg-ice-cream text-steel dark:bg-night-sky dark:text-light-grey'}`}>{isDone ? 'Hoàn thành' : 'Đang làm'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-steel dark:text-light-grey pt-3 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</span>
                            <span>{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1150px]">
                    <thead>
                      <tr className="text-left text-steel dark:text-light-grey border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
                        <th className="p-4 font-bold">Tên mục tiêu</th>
                        <th className="p-4 font-bold">Mức độ ưu tiên</th>
                        <th className="p-4 font-bold text-right">Số tiền mục tiêu</th>
                        <th className="p-4 font-bold text-right">Số tiền hiện có</th>
                        <th className="p-4 font-bold text-right">Số tiền còn thiếu</th>
                        <th className="p-4 font-bold">Tiến độ</th>
                        <th className="p-4 font-bold">Ngày bắt đầu</th>
                        <th className="p-4 font-bold">Hoàn thành</th>
                        <th className="p-4 font-bold">Ghi chú</th>
                        <th className="p-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedGoals.map((goal) => {
                        const isDone = goal.status === 'Hoàn thành';
                        const pct = isDone ? 100 : (goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0);
                        const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
                        const pStyle = priorityStyle(goal.priority_term);
                        const duration = isDone ? durationText(goal.start_date, goal.end_date) : null;
                        return (
                          <tr key={goal.id} onClick={() => setEditingGoal(goal)} className="border-b border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)] last:border-0 hover:bg-ice-cream dark:hover:bg-night-sky/30 cursor-pointer">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-turquoise' : 'bg-gradient-primary'}`}>
                                  {isDone ? <Check size={16} className="text-white" /> : <Target size={16} className="text-white" />}
                                </div>
                                <p className={`font-bold ${isDone ? 'text-turquoise' : 'text-blueberry dark:text-white'}`}>{goal.name}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              {goal.priority_term ? <span className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: pStyle.color, background: pStyle.bg }}>{goal.priority_term}</span> : <span className="text-light-grey">—</span>}
                            </td>
                            <td className="p-4 text-right text-blueberry dark:text-white">{goal.target_amount ? formatMoney(goal.target_amount) : '—'}</td>
                            <td className="p-4 text-right text-blueberry dark:text-white">{formatMoney(goal.current_amount || 0)}</td>
                            <td className="p-4 text-right text-steel dark:text-light-grey">{goal.target_amount ? formatMoney(Math.max(0, remaining)) : '—'}</td>
                            <td className="p-4 w-32">
                              <ProgressBar pct={pct} colorClass={isDone ? 'bg-turquoise' : 'bg-baby-blue'} />
                              <p className="text-steel dark:text-light-grey text-xs mt-1">{Math.round(pct)}%</p>
                            </td>
                            <td className="p-4 text-steel dark:text-light-grey whitespace-nowrap">{goal.start_date ? new Date(goal.start_date).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="p-4 text-steel dark:text-light-grey whitespace-nowrap">
                              {isDone ? (
                                <>
                                  <p>{new Date(goal.end_date).toLocaleDateString('vi-VN')}</p>
                                  {duration && <p className="text-xs text-steel dark:text-light-grey">{duration}</p>}
                                  {goal.actual_amount && <p className="text-xs text-turquoise font-bold">Thực tế: {formatMoney(goal.actual_amount)}</p>}
                                </>
                              ) : <span className="text-light-grey">Chưa xong</span>}
                            </td>
                            <td className="p-4 text-steel dark:text-light-grey text-xs max-w-[160px] truncate">{goal.note || '—'}</td>
                            <td className="p-4 text-right relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === goal.id ? null : goal.id); }}
                                className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 inline-flex items-center justify-center text-steel dark:text-light-grey"
                              >
                                <MoreHorizontal size={18} />
                              </button>
                              {openMenuId === goal.id && (
 <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute' }} className="right-4 top-12 z-20 frost-card rounded-xl shadow-card py-1 w-40 text-left">
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                    <Eye size={14} /> Xem chi tiết
                                  </button>
                                  <button onClick={() => { setEditingGoal(goal); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blueberry dark:text-white hover:bg-ice-cream dark:hover:bg-night-sky/30">
                                    <Pencil size={14} /> Chỉnh sửa
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          {displayGoals.length > 0 && (
            <div className="flex items-center justify-between p-5 border-t border-[rgba(189,189,203,0.2)] dark:border-[rgba(189,189,203,0.1)]">
              <p className="text-steel dark:text-light-grey text-xs font-semibold">Trang {currentPage} / {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-full border border-[rgba(126,127,144,0.3)] dark:border-[rgba(189,189,203,0.2)] text-sm text-blueberry dark:text-white font-semibold disabled:opacity-40">Previous</button>
                <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded-full bg-gradient-primary text-white text-sm font-bold disabled:opacity-40 shadow-md shadow-turquoise/30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingGoal && <EditGoalForm goal={editingGoal === 'new' ? null : editingGoal} isNew={editingGoal === 'new'} onClose={() => setEditingGoal(null)} onSaved={reload} softDelete={softDelete} categories={categories} transactions={transactions} />}
    </>
  );
}

/* ==============================================================================
   14. SETTINGS
   ============================================================================== */
function Settings({ setScreen, categories, accounts, reload, softDelete, user, onProfileUpdated, onAddClick, theme, toggleTheme, initialSection, openSettings, sidebarCollapsed, toggleSidebar, onResetData, resettingData, logs, logActivity, restoreLog, spendingPoolByPeriod, saveSpendingPoolForPeriod }) {
  const displayName = user?.user_metadata?.first_name || user?.user_metadata?.full_name;
  const avatarUrl = user?.user_metadata?.avatar_url;
  const [section, setSection] = useState(initialSection || 'profile');

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetError, setResetError] = useState('');
  const [verifyingPwd, setVerifyingPwd] = useState(false);

  function openResetModal() {
    setResetPassword(''); setResetError(''); setShowResetModal(true);
  }

  async function confirmResetWithPassword() {
    if (!resetPassword) { setResetError('Nhập mật khẩu để xác nhận'); return; }
    setVerifyingPwd(true); setResetError('');
    const { error } = await supabase.auth.signInWithPassword({ email: user?.email, password: resetPassword });
    if (error) {
      setResetError('Sai mật khẩu, vui lòng thử lại');
      setVerifyingPwd(false);
      return;
    }
    setVerifyingPwd(false);
    setShowResetModal(false);
    setResetPassword('');
    await onResetData();
  }

  const ResetDataPanel = (
    <div>
      <h3 className="text-blueberry dark:text-white font-bold text-base mb-1.5">Vùng nguy hiểm</h3>
      <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
        Xoá toàn bộ ví, giao dịch, danh mục và mục tiêu bạn đã nhập để bắt đầu lại từ đầu. Tài khoản đăng nhập của bạn vẫn được giữ nguyên. Dữ liệu sẽ được lưu <span className="font-bold">30 ngày</span> trong mục Lịch sử để bạn khôi phục nếu cần, sau đó sẽ bị xoá vĩnh viễn.
      </p>
      <button
        onClick={openResetModal} disabled={resettingData}
        className="flex items-center gap-2 bg-cotton-candy text-white rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-60"
      >
        {resettingData ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
        Reset toàn bộ dữ liệu
      </button>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !verifyingPwd && setShowResetModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] p-6">
            <div className="w-11 h-11 rounded-full bg-cotton-candy-light dark:bg-cotton-candy/10 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-cotton-candy" />
            </div>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-1.5">Xoá toàn bộ dữ liệu?</h3>
            <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
              Toàn bộ ví, giao dịch, danh mục và mục tiêu sẽ bị ẩn khỏi ứng dụng. Bạn có 30 ngày để khôi phục lại trong mục Lịch sử, sau đó dữ liệu sẽ bị xoá vĩnh viễn. Nhập mật khẩu đăng nhập để xác nhận.
            </p>
            <div className="relative mb-1">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey pointer-events-none" />
              <input
                type={showResetPwd ? 'text' : 'password'}
                value={resetPassword}
                onChange={(e) => { setResetPassword(e.target.value); setResetError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmResetWithPassword()}
                placeholder="Mật khẩu đăng nhập"
                autoFocus
                className="w-full bg-ice-cream dark:bg-[#2a2a44] border border-[rgba(189,189,203,0.3)] dark:border-[rgba(189,189,203,0.1)] rounded-full pl-11 pr-11 py-3 text-sm text-blueberry dark:text-white placeholder:text-steel dark:placeholder:text-light-grey outline-none focus:border-[rgba(241,138,181,0.5)] transition font-semibold"
              />
              <button type="button" onClick={() => setShowResetPwd((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-steel dark:text-light-grey">
                {showResetPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {resetError && <p className="text-xs text-cotton-candy font-semibold mb-2">{resetError}</p>}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowResetModal(false)} disabled={verifyingPwd} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44] disabled:opacity-60">
                Huỷ
              </button>
              <button onClick={confirmResetWithPassword} disabled={verifyingPwd} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white bg-cotton-candy disabled:opacity-60">
                {verifyingPwd ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const ACTION_META = {
    reset_data: { icon: Trash2, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    change_password: { icon: KeyRound, color: 'text-lavender bg-lavender/10' },
    delete_goal: { icon: Target, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_category: { icon: LayoutGrid, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_account: { icon: Wallet, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
    delete_transaction: { icon: Trash2, color: 'text-cotton-candy bg-cotton-candy-light dark:bg-cotton-candy/10' },
  };

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  async function handleConfirmRestore() {
    setRestoring(true);
    await restoreLog(restoreTarget);
    setRestoring(false);
    setRestoreTarget(null);
  }

  const SystemHistoryPanel = (
    <div>
      <h3 className="text-blueberry dark:text-white font-bold text-base mb-1.5">Lịch sử hệ thống</h3>
      <p className="text-sm text-steel dark:text-light-grey mb-4 leading-relaxed">
        Toàn bộ thay đổi liên quan đến hệ thống (đổi mật khẩu, xoá dữ liệu...) được ghi lại tại đây. Một số thao tác có thể khôi phục lại.
      </p>

      {(!logs || logs.length === 0) && (
        <p className="text-sm text-steel dark:text-light-grey italic">Chưa có lịch sử nào.</p>
      )}

      <div className="flex flex-col gap-2.5 scrollbar-hide">
        {logs?.map((log) => {
          const meta = ACTION_META[log.action_type] || { icon: Clock, color: 'text-steel bg-ice-cream dark:bg-[#2a2a44]' };
          const Icon = meta.icon;
          const daysLeft = 30 - Math.floor((Date.now() - new Date(log.created_at).getTime()) / 86400000);
          const canRestore = log.restorable && !log.restored_at && daysLeft > 0;
          return (
            <div key={log.id} className="flex items-center gap-3 bg-ice-cream dark:bg-[#2a2a44] rounded-2xl p-3.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blueberry dark:text-white truncate">{log.description}</p>
                <p className="text-xs text-steel dark:text-light-grey">
                  {new Date(log.created_at).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {log.restored_at && <span className="text-turquoise font-bold"> · Đã khôi phục</span>}
                  {!log.restored_at && log.restorable && (
                    <span className={daysLeft > 0 ? '' : 'text-cotton-candy font-bold'}>
                      {' · '}{daysLeft > 0 ? `Còn ${daysLeft} ngày để khôi phục` : 'Đã hết hạn khôi phục'}
                    </span>
                  )}
                </p>
              </div>
              {canRestore && (
                <button onClick={() => setRestoreTarget(log)} className="shrink-0 text-xs font-bold text-turquoise-light bg-turquoise/10 rounded-full px-3.5 py-2 hover:bg-turquoise/20 transition">
                  Khôi phục
                </button>
              )}
            </div>
          );
        })}
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => !restoring && setRestoreTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-[#1e1e32] rounded-3xl shadow-card border-0 dark:border dark:border-[rgba(189,189,203,0.1)] p-6">
            <div className="w-11 h-11 rounded-full bg-turquoise/10 flex items-center justify-center mb-4">
              <Clock size={20} className="text-turquoise" />
            </div>
            <h3 className="text-blueberry dark:text-white font-bold text-lg mb-1.5">Khôi phục thao tác này?</h3>
            <p className="text-sm text-steel dark:text-light-grey mb-5 leading-relaxed">
              "{restoreTarget.description}" sẽ được khôi phục về đúng như trước khi thao tác diễn ra.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRestoreTarget(null)} disabled={restoring} className="flex-1 py-2.5 rounded-full text-sm font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-[#2a2a44] disabled:opacity-60">
                Huỷ
              </button>
              <button onClick={handleConfirmRestore} disabled={restoring} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold text-white bg-gradient-primary disabled:opacity-60">
                {restoring ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-secondary opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center gap-3">
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><ArrowLeft size={18} className="text-white" /></button>
            <h1 className="text-white text-lg font-bold">Cài đặt</h1>
          </div>

          <div className="px-5 mt-4 flex gap-2">
            <button onClick={() => setSection('profile')} className={`flex-1 py-2 rounded-full text-sm font-bold ${section === 'profile' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-white'}`}>Hồ sơ</button>
            <button onClick={() => setSection('categories')} className={`flex-1 py-2 rounded-full text-sm font-bold ${section === 'categories' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-white'}`}>Danh mục</button>
            <button onClick={() => setSection('data')} className={`flex-1 py-2 rounded-full text-sm font-bold ${section === 'data' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-white'}`}>Dữ liệu</button>
            <button onClick={() => setSection('history')} className={`flex-1 py-2 rounded-full text-sm font-bold ${section === 'history' ? 'bg-white dark:bg-[#2a2a44] text-blueberry dark:text-white shadow' : 'bg-white/30 text-white'}`}>Lịch sử</button>
          </div>

          <div className="mt-4 bg-white dark:bg-[#1e1e32] rounded-[2.5rem] min-h-[76vh] px-5 pt-6 pb-6 shadow-soft scrollbar-hide">
            {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} logActivity={logActivity} />}
            {section === 'categories' && <CategorySection categories={categories} reload={reload} softDelete={softDelete} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />}
            {section === 'data' && ResetDataPanel}
            {section === 'history' && SystemHistoryPanel}
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Cài đặt</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-white dark:bg-[#2a2a44] text-cotton-candy rounded-full px-4 py-2 text-sm font-bold shadow-soft border-0 dark:border dark:border-[rgba(189,189,203,0.1)]"><LogOut size={15} /> Đăng xuất</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setSection('profile')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'profile' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Hồ sơ</button>
          <button onClick={() => setSection('categories')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'categories' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Danh mục</button>
          <button onClick={() => setSection('data')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'data' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Dữ liệu</button>
          <button onClick={() => setSection('history')} className={`px-5 py-2 rounded-full text-sm font-bold ${section === 'history' ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-white dark:bg-[#2a2a44] text-steel dark:text-light-grey border-0 dark:border dark:border-[rgba(189,189,203,0.1)]'}`}>Lịch sử</button>
        </div>

 <div className="frost-card rounded-3xl p-6">
          {section === 'profile' && <ProfileSection user={user} onUpdated={onProfileUpdated} logActivity={logActivity} />}
          {section === 'categories' && <CategorySection categories={categories} reload={reload} softDelete={softDelete} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />}
          {section === 'data' && ResetDataPanel}
          {section === 'history' && SystemHistoryPanel}
        </div>
      </div>
    </>
  );
}

/* ==============================================================================
   15. SETTINGS SUB-COMPONENTS (ProfileSection, CategorySection) + CROP AVATAR
   ============================================================================== */
function ProfileSection({ user, onUpdated, logActivity }) {
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [appLogoUrl, setAppLogoUrl] = useState(user?.user_metadata?.app_logo_url || '');
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const full = user?.user_metadata?.full_name || '';
    const first = user?.user_metadata?.first_name || '';
    setFirstName(first);
    setLastName(full.replace(first, '').trim());
    setAvatarUrl(user?.user_metadata?.avatar_url || '');
    setAppLogoUrl(user?.user_metadata?.app_logo_url || '');
  }, [user]);

  async function handleAvatarUpload(file) {
    if (!file) return;
    setUploading(true);
    const fileName = `${user.id}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setUploading(false);
    if (error) {
      console.error('Avatar update failed:', error);
      alert('Không thể cập nhật ảnh. Vui lòng thử lại.');
      return;
    }
    setAvatarUrl(data.publicUrl);
    onUpdated();
  }

  async function handleLogoUpload(file) {
    if (!file) return;
    setUploadingLogo(true);
    const fileName = `logo-${user.id}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
    if (uploadError) {
      console.error('Logo upload failed:', uploadError);
      alert('Không thể tải logo lên. Vui lòng thử lại.');
      setUploadingLogo(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const { error } = await supabase.auth.updateUser({ data: { app_logo_url: data.publicUrl } });
    setUploadingLogo(false);
    if (error) {
      console.error('Logo update failed:', error);
      alert('Không thể cập nhật logo. Vui lòng thử lại.');
      return;
    }
    setAppLogoUrl(data.publicUrl);
    onUpdated();
  }

  async function handleRemoveLogo() {
    const { error } = await supabase.auth.updateUser({ data: { app_logo_url: null } });
    if (error) { console.error('Remove logo failed:', error); return; }
    setAppLogoUrl('');
    onUpdated();
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const full_name = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.updateUser({ data: { full_name, first_name: firstName } });
    setSaving(false);
    if (error) { setMessage('Lỗi: ' + error.message); return; }
    setMessage('Đã lưu!');
    onUpdated();
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) { setPasswordMessage('Mật khẩu cần tối thiểu 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage('Mật khẩu nhập lại không khớp'); return; }
    setSavingPassword(true);
    setPasswordMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordMessage('Lỗi: ' + error.message); return; }
    setPasswordMessage('Đã đổi mật khẩu!');
    setNewPassword(''); setConfirmPassword('');
    logActivity?.('change_password', 'Đổi mật khẩu đăng nhập', null, false);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Ảnh đại diện</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-ice-cream dark:bg-night-sky flex items-center justify-center flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-steel dark:text-light-grey">{(firstName || user?.email || 'B')[0].toUpperCase()}</span>}
          </div>
          <ImageUploader
            aspectRatio="1:1"
            circularCrop
            uploading={uploading}
            triggerLabel="Đổi ảnh đại diện"
            onConfirm={handleAvatarUpload}
          />
        </div>
      </div>

      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Logo ứng dụng</p>
        <p className="text-steel dark:text-light-grey text-xs mb-3">Ảnh này sẽ thay cho logo mặc định ở góc trên sidebar.</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-primary flex items-center justify-center flex-shrink-0">
            {appLogoUrl ? <img src={appLogoUrl} alt="" className="w-full h-full object-cover" /> : <Wallet size={22} className="text-white" />}
          </div>
          <div className="flex items-center gap-2">
            <ImageUploader
              aspectRatio="1:1"
              uploading={uploadingLogo}
              triggerLabel="Đổi logo"
              onConfirm={handleLogoUpload}
            />
            {appLogoUrl && (
              <button onClick={handleRemoveLogo} className="bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-2.5 text-sm text-steel dark:text-light-grey font-semibold hover:bg-cotton-candy/10 transition">
                Xoá logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3">Thông tin cá nhân</p>
        <p className="text-steel dark:text-light-grey text-sm mb-3">{user?.email}</p>
        <div className="flex gap-3 mb-3">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tên" className="w-1/2 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Họ" className="w-1/2 bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        {message && <p className="text-sm text-turquoise font-semibold mb-3">{message}</p>}
        <button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu thay đổi
        </button>
      </div>

      <div>
        <p className="text-blueberry dark:text-white font-bold text-sm mb-3 flex items-center gap-2"><KeyRound size={15} /> Đổi mật khẩu</p>
        <div className="flex flex-col gap-3 max-w-sm">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" className="bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" className="bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none dark:text-white dark:placeholder:text-light-grey text-blueberry" />
        </div>
        {passwordMessage && <p className="text-sm text-turquoise font-semibold mt-3">{passwordMessage}</p>}
        <button onClick={handleChangePassword} disabled={savingPassword} className="mt-3 bg-ice-cream dark:bg-night-sky text-blueberry dark:text-white rounded-xl px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Đổi mật khẩu
        </button>
      </div>
    </div>
  );
}

function CategorySection({ categories, reload, softDelete, spendingPoolByPeriod, saveSpendingPoolForPeriod }) {
  const [tab, setTab] = useState('expense');
  // Bộ lọc hiển thị theo isFund — chỉ lọc hiển thị, không đổi dữ liệu
  const [fundFilter, setFundFilter] = useState('all'); // 'all' | 'fund' | 'not_fund'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '', monthly_limit: '', is_fund: false, interest_rate: '', include_in_spending_pool: true });
  const [saving, setSaving] = useState(false);

  // ==== Thu nhập được chi theo kỳ — chọn kỳ rồi nhập số tiền được phép chi ====
  const nowYear = new Date().getFullYear();
  const [poolYear, setPoolYear] = useState(nowYear);
  const [poolPeriodKey, setPoolPeriodKey] = useState(currentPeriodKey());
  const [poolAmountInput, setPoolAmountInput] = useState('');
  const [savingPool, setSavingPool] = useState(false);
  const poolPeriods = buildPeriods(poolYear);
  const currentPoolValue = spendingPoolByPeriod ? spendingPoolByPeriod[poolPeriodKey] : undefined;

  async function handleSavePool() {
    if (poolAmountInput === '' || Number.isNaN(Number(poolAmountInput))) { alert('Nhập số tiền hợp lệ'); return; }
    setSavingPool(true);
    const ok = await saveSpendingPoolForPeriod(poolPeriodKey, poolAmountInput);
    setSavingPool(false);
    if (ok) setPoolAmountInput('');
  }

  function startNew() { setForm({ name: '', icon: '', monthly_limit: '', is_fund: false, interest_rate: '', include_in_spending_pool: true }); setEditing('new'); }
  function startEdit(cat) { setForm({ name: cat.name, icon: cat.icon || '', monthly_limit: cat.monthly_limit || '', is_fund: cat.is_fund || false, interest_rate: cat.interest_rate || '', include_in_spending_pool: cat.include_in_spending_pool !== false }); setEditing(cat.id); }

  async function handleSave() {
    if (!form.name) { alert('Nhập tên danh mục'); return; }
    setSaving(true);
    const payload = { name: form.name, icon: form.icon || '❔', type: tab, monthly_limit: form.monthly_limit ? Number(form.monthly_limit) : null, is_fund: form.is_fund, interest_rate: form.interest_rate ? Number(form.interest_rate) : 0, ...(tab === 'income' ? { include_in_spending_pool: form.include_in_spending_pool } : {}) };
    const { error } = editing === 'new' ? await supabase.from('categories').insert(payload) : await supabase.from('categories').update(payload).eq('id', editing);
    setSaving(false);
    if (error) { alert('Lỗi: ' + error.message); return; }
    setEditing(null); reload();
  }

  async function handleDelete(id) {
    if (!confirm('Xóa danh mục này? Các giao dịch cũ vẫn giữ nguyên số tiền. Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const cat = categories.find((c) => c.id === id);
    const { error } = await softDelete('categories', id, `Xoá danh mục "${cat?.name || ''}"`, 'delete_category');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload();
  }

  // Filter chỉ dựa trực tiếp trên is_fund === true / false, không tạo dữ liệu mới
  const list = categories
    .filter((c) => c.type === tab)
    .filter((c) => (fundFilter === 'all' ? true : fundFilter === 'fund' ? c.is_fund === true : c.is_fund !== true));

  const FUND_FILTERS = [
    { key: 'all', label: 'Tất cả' },
    { key: 'fund', label: 'Quỹ' },
    { key: 'not_fund', label: 'Không phải quỹ' },
  ];

  return (
    <>
      <div className="flex bg-ice-cream dark:bg-night-sky rounded-full p-1 mb-4">
        <button onClick={() => setTab('expense')} className={`flex-1 py-2 rounded-full text-sm font-bold ${tab === 'expense' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Chi tiêu</button>
        <button onClick={() => setTab('income')} className={`flex-1 py-2 rounded-full text-sm font-bold ${tab === 'income' ? 'bg-white dark:bg-[#2a2a44] text-turquoise shadow' : 'text-steel dark:text-light-grey'}`}>Thu nhập</button>
      </div>

      {tab === 'income' && (
        <div className="bg-ice-cream dark:bg-night-sky rounded-2xl p-4 mb-4">
          <p className="text-blueberry dark:text-white font-bold text-sm mb-1">Thu nhập được chi theo kỳ</p>
          <p className="text-steel dark:text-light-grey text-xs mb-3">Chọn kỳ, rồi nhập số tiền được phép chi trong kỳ đó. Nếu chưa cài đặt, kỳ sẽ mặc định lấy bằng tổng thu nhập tính vào Thu nhập được chi.</p>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <CustomSelect value={poolYear} onChange={(e) => setPoolYear(Number(e.target.value))} className="" triggerClassName="bg-white dark:bg-[#2a2a44] rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {[nowYear - 1, nowYear, nowYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </CustomSelect>
            <CustomSelect value={poolPeriodKey} onChange={(e) => setPoolPeriodKey(e.target.value)} className="" triggerClassName="flex-1 bg-white dark:bg-[#2a2a44] rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-blueberry [color-scheme:light] dark:[color-scheme:dark]">
              {poolPeriods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </CustomSelect>
          </div>
          <div className="flex items-center gap-2">
            <MoneyInput value={poolAmountInput} onChange={setPoolAmountInput} placeholder="Số tiền được phép chi" className="flex-1 bg-white dark:bg-[#2a2a44] rounded-xl px-4 py-2.5 text-sm outline-none dark:text-white text-blueberry" />
            <button onClick={handleSavePool} disabled={savingPool} className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center flex-shrink-0 disabled:opacity-60">
              {savingPool ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
          <p className="text-steel dark:text-light-grey text-xs mt-2">
            Hiện tại: <span className="font-bold text-blueberry dark:text-white">{currentPoolValue != null ? formatMoney(currentPoolValue) : 'Chưa cài đặt (mặc định theo thu nhập)'}</span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {FUND_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFundFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition ${fundFilter === f.key ? 'bg-gradient-primary text-white shadow-md shadow-turquoise/30' : 'bg-ice-cream dark:bg-night-sky text-steel dark:text-light-grey'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <button onClick={startNew} className="w-full border-2 border-dashed border-[rgba(126,127,144,0.4)] dark:border-[rgba(189,189,203,0.2)] rounded-2xl py-3 text-sm text-steel dark:text-light-grey font-bold mb-4 flex items-center justify-center gap-2 hover:border-turquoise dark:hover:border-turquoise transition"><Plus size={16} /> Thêm danh mục mới</button>
      <div className="flex flex-col gap-2">
        {list.length === 0 ? (
          <p className="text-steel dark:text-light-grey text-sm text-center py-4">Không có danh mục nào phù hợp bộ lọc.</p>
        ) : list.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 bg-ice-cream dark:bg-night-sky rounded-2xl p-3">
            <EmojiCircle emoji={cat.icon} size={36} bg="#E3D6FF" />
            <div className="flex-1 min-w-0">
              <p className="text-blueberry dark:text-white font-bold text-sm flex items-center gap-1">
                {cat.name}
                {cat.is_fund ? (
                  <span className="text-[10px] bg-turquoise/10 text-turquoise px-1.5 py-0.5 rounded-full font-bold">Quỹ</span>
                ) : (
                  <span className="text-[10px] bg-steel/10 text-steel dark:bg-light-grey/10 dark:text-light-grey px-1.5 py-0.5 rounded-full font-bold">Chi tiêu</span>
                )}
                {cat.type === 'income' && (cat.include_in_spending_pool === false ? (
                  <span className="text-[10px] bg-cotton-candy/10 text-cotton-candy px-1.5 py-0.5 rounded-full font-bold">Thu nhập đặc biệt</span>
                ) : (
                  <span className="text-[10px] bg-baby-blue/10 text-baby-blue px-1.5 py-0.5 rounded-full font-bold">Vào Thu nhập được chi</span>
                ))}
              </p>
              <p className="text-steel dark:text-light-grey text-xs font-semibold">
                {cat.monthly_limit ? `Hạn mức: ${formatMoney(cat.monthly_limit)}` : ''}
                {cat.monthly_limit && cat.interest_rate > 0 ? ' • ' : ''}
                {cat.interest_rate > 0 ? `Lãi ${cat.interest_rate}%/năm` : ''}
              </p>
            </div>
            <button onClick={() => startEdit(cat)} className="w-8 h-8 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center"><Pencil size={14} className="text-blueberry dark:text-white" /></button>
            <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 rounded-full bg-white dark:bg-[#2a2a44] flex items-center justify-center"><Trash2 size={14} className="text-cotton-candy" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-20" onClick={() => setEditing(null)}>
          <div className="bg-white dark:bg-[#1e1e32] w-full rounded-t-3xl p-5 max-w-sm mx-auto max-h-[85vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-blueberry dark:text-white">{editing === 'new' ? 'Danh mục mới' : 'Sửa danh mục'}</h3><button onClick={() => setEditing(null)}><X size={18} className="text-steel dark:text-light-grey" /></button></div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Emoji (vd: 🍜)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            <MoneyInput value={form.monthly_limit} onChange={(v) => setForm({ ...form, monthly_limit: v })} placeholder="Hạn mức tối đa mỗi lần nhập (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            {tab === 'expense' && (
              <input value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value.replace(/[^0-9.]/g, '') })} inputMode="decimal" placeholder="Tỷ suất lợi nhuận %/năm (không bắt buộc)" className="w-full bg-ice-cream dark:bg-night-sky rounded-xl px-4 py-3 text-sm outline-none mb-3 dark:text-white dark:placeholder:text-light-grey text-blueberry" />
            )}
            {tab === 'expense' && (
              <label className="flex items-center gap-2 mb-4 text-sm text-blueberry dark:text-white font-semibold"><input type="checkbox" checked={form.is_fund} onChange={(e) => setForm({ ...form, is_fund: e.target.checked })} /> Đây là 1 "quỹ" — hiện thẻ tổng tiền ở Trang chủ</label>
            )}
            {tab === 'income' && (
              <label className="flex items-start gap-2 mb-4 text-sm text-blueberry dark:text-white font-semibold">
                <input type="checkbox" className="mt-0.5" checked={form.include_in_spending_pool} onChange={(e) => setForm({ ...form, include_in_spending_pool: e.target.checked })} />
                <span>
                  Tính vào Thu nhập được chi (số tiền được phép chi)
                  <span className="block text-xs font-normal text-steel dark:text-light-grey mt-0.5">Bỏ chọn nếu đây là khoản thu đặc biệt (vd: tiền quý, thưởng) — vẫn tính vào Tổng thu nhập nhưng không tự động làm tăng Thu nhập được chi.</span>
                </span>
              </label>
            )}
            <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-primary text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-turquoise/30">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==============================================================================
   15B. HOVER / TAP DETAIL CARD (dùng chung cho các card tổng quan ở Báo cáo)
   ============================================================================== */
function HoverDetailCard({ className, children, detail, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const [hasHover, setHasHover] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setHasHover(window.matchMedia('(hover: hover)').matches);
    }
  }, []);

  useEffect(() => {
    if (!open || hasHover) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open, hasHover]);

  return (
    <div
      ref={ref}
      // .frost-card dùng `isolation: isolate` (để giữ lớp gradient trang trí ::before
      // không lộ ra ngoài) — điều này vô tình "nhốt" popup bên dưới vào riêng 1 stacking
      // context của card. Khi popup đang mở, ta nâng hẳn z-index của CHÍNH card cha lên
      // trên các card anh em (và các khối phía dưới) để popup thoát ra hiển thị đúng.
      className={`relative ${open ? 'z-50' : 'z-0'} ${className || ''}`}
      onMouseEnter={() => { if (hasHover) setOpen(true); }}
      onMouseLeave={() => { if (hasHover) setOpen(false); }}
      onClick={() => { if (!hasHover) setOpen((v) => !v); }}
    >
      {children}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute' }}
        // LƯU Ý: trước đây className có cả "absolute" lẫn "relative" (đi kèm "isolate").
        // Tailwind biên dịch .relative SAU .absolute trong stylesheet, nên khi 1 phần tử có
        // cả 2 class, "position: relative" của .relative thắng (cùng độ đặc hiệu, đứng sau
        // thắng) — popup này bị rớt khỏi position:absolute, nằm lại trong flow bình thường
        // và CHIẾM CHỖ THẬT trong card dù đang ẩn (opacity-0), gây ra khoảng trắng to bên
        // dưới mỗi thẻ tổng kết. Bỏ "relative" (không cần cho isolate hoạt động) + ép cứng
        // bằng inline style để không bao giờ lặp lại lỗi này dù thứ tự CSS có đổi.
        className={`${align === 'right' ? 'right-0' : 'left-0'} top-[calc(100%+8px)] z-40 w-72 max-w-[85vw] bg-white/85 dark:bg-[#1e1e32]/75 backdrop-blur-xl backdrop-saturate-150 border-0 dark:border dark:border-[rgba(189,189,203,0.1)] rounded-2xl shadow-card p-4 max-h-72 overflow-y-auto overflow-x-hidden scrollbar-hide transition-all duration-150 origin-top isolate ${open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
      >
        <div className="pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full bg-turquoise/20 blur-2xl -z-10" />
        <div className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-lavender/20 blur-2xl -z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent -z-10" />
        {detail}
      </div>
    </div>
  );
}

// onViewDetail (optional): nếu được truyền, hiện nút "Xem chi tiết" ở cuối popup —
// bấm vào sẽ mở TxLedgerModal liệt kê từng giao dịch (nội dung, ghi chú, ngày, nguồn trừ,
// số dư nguồn sau GD, số tiền) thay vì chỉ xem tổng theo danh mục như popup hover này.
function BreakdownDetailList({ title, items, total, colorClass, onViewDetail }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-steel dark:text-light-grey mb-2 uppercase tracking-wide">{title}</p>
      {items.length === 0 ? (
        <p className="text-steel dark:text-light-grey text-sm py-1">Không có dữ liệu trong khoảng thời gian này.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-2">
          {items.map((it) => (
            <div key={it.key} className="flex items-center justify-between gap-3">
              <span className="text-blueberry dark:text-white text-sm font-semibold truncate">{it.name}</span>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${colorClass}`}>{formatMoney(it.amount)}</p>
                {total > 0 && <p className="text-[10px] text-steel dark:text-light-grey">{(it.amount / total * 100).toFixed(1)}%</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-light-grey/30 dark:border-[rgba(189,189,203,0.15)] pt-2 mt-1">
        <span className="text-sm font-bold text-blueberry dark:text-white">Tổng</span>
        <span className={`text-sm font-bold ${colorClass}`}>{formatMoney(total)}</span>
      </div>
      {onViewDetail && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
          className={`w-full text-center text-xs font-bold mt-3 py-1.5 rounded-full hover:opacity-80 transition ${colorClass} bg-current/10`}
        >
          Xem chi tiết →
        </button>
      )}
    </div>
  );
}

// Xác định "nguồn trừ" (nơi tiền đi ra) của 1 giao dịch — dùng chung cho cả việc
// hiển thị nhãn LẪN việc gom danh sách nguồn cho bộ lọc trong TxLedgerModal.
function txSourceInfo(tx, categories, accounts) {
  const cat = categories.find((c) => c.id === tx.category_id);
  const account = tx.account_id ? accounts.find((a) => a.id === tx.account_id) : null;
  if (tx.type === 'expense' && cat?.is_fund) return { key: `fund:${cat.id}`, label: `Quỹ: ${cat.name}` };
  if (account) return { key: `account:${account.id}`, label: account.name };
  // Khoản thu nhập: chỉ gắn nhãn "Thu nhập được chi" nếu danh mục thật sự được tính vào
  // Chi pool (include_in_spending_pool !== false). "Thu nhập đặc biệt" (vd: Thưởng Lễ/Tết)
  // chỉ là thu nhập thường, KHÔNG cộng vào Thu nhập được chi nên không được gắn nhãn đó.
  if (tx.type === 'income') {
    const isPoolIncome = cat ? cat.include_in_spending_pool !== false : true;
    return isPoolIncome ? { key: 'pool', label: 'Thu nhập được chi' } : { key: 'special-income', label: 'Thu nhập' };
  }
  return { key: 'pool', label: 'Thu nhập được chi' };
}

// Số dư "Thu nhập được chi" (pool) của KỲ chứa giao dịch `tx`, TÍNH NGAY SAU khi giao
// dịch đó xảy ra. Pool là khái niệm ảo theo từng kỳ (21 → 20) chứ không phải 1 ví có
// sẵn số dư trong DB, nên phải tự cộng dồn: spendingPool của kỳ đó, trừ dần các khoản
// nạp quỹ/chi tiêu trừ vào pool theo đúng thứ tự thời gian, tới đúng giao dịch này thì dừng.
function poolBalanceAfterTx(tx, allTx, categories, spendingPoolByPeriod) {
  const periodKey = transactionPeriodKey(tx);
  const financials = calculatePeriodFinancials(periodKey, allTx, categories, spendingPoolByPeriod?.[periodKey]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const poolTxs = allTx
    .filter((t) => transactionPeriodKey(t) === periodKey)
    .filter((t) => {
      if (t.type === 'allocation') return t.is_initial !== true && t.account_id === null;
      if (t.type === 'expense') { const c = catById.get(t.category_id); return !(c && c.is_fund) && t.account_id === null; }
      return false;
    })
    .sort((a, b) => {
      const da = new Date(a.date || a.created_at), db = new Date(b.date || b.created_at);
      if (da - db !== 0) return da - db;
      return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
    });
  let cumulative = 0;
  for (const t of poolTxs) {
    cumulative += Number(t.amount);
    if (t.id === tx.id) break;
  }
  return financials.spendingPool - cumulative;
}

// Với 1 khoản THU NHẬP được tính vào Thu nhập được chi (include_in_spending_pool !== false),
// "số dư nguồn sau GD" thể hiện tổng đã cộng dồn vào Thu nhập được chi của kỳ tính đến
// đúng giao dịch này (theo thứ tự thời gian) — giúp thấy Thu nhập được chi đang được
// "lấp đầy" tới đâu qua từng khoản thu.
function poolIncomeCumulativeAfterTx(tx, allTx, categories) {
  const periodKey = transactionPeriodKey(tx);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const incomeTxs = allTx
    .filter((t) => transactionPeriodKey(t) === periodKey && t.type === 'income')
    .filter((t) => { const c = catById.get(t.category_id); return c ? c.include_in_spending_pool !== false : true; })
    .sort((a, b) => {
      const da = new Date(a.date || a.created_at), db = new Date(b.date || b.created_at);
      if (da - db !== 0) return da - db;
      return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
    });
  let cumulative = 0;
  for (const t of incomeTxs) {
    cumulative += Number(t.amount);
    if (t.id === tx.id) break;
  }
  return cumulative;
}

// Bảng chi tiết từng giao dịch cho 1 nhóm (VD: "Chi tiêu tháng 9/2026") — mở từ nút
// "Xem chi tiết" trong popup hover của các thẻ tổng kết (Thu nhập / Thu nhập được chi /
// Thu nhập đặc biệt / Chi tiêu). Hiển thị: nội dung chi, ghi chú, ngày, nguồn trừ,
// số dư nguồn sau giao dịch, số tiền.
function TxLedgerRow({ tx, categories, accounts, allTx, spendingPoolByPeriod, onDeleteTx }) {
  const txDate = new Date(tx.date || tx.created_at);
  const source = txSourceInfo(tx, categories, accounts);

  let balanceAfter = null;
  if (source.key.startsWith('fund:')) {
    const cat = categories.find((c) => c.id === tx.category_id);
    balanceAfter = fundBalanceAtDate(cat, allTx, txDate);
  } else if (source.key.startsWith('account:')) {
    const account = accounts.find((a) => a.id === tx.account_id);
    balanceAfter = accountBalanceAtDate(account, allTx, txDate);
  } else if (source.key === 'pool') {
    // "Thu nhập được chi" (pool): với khoản CHI/nạp quỹ trừ vào pool, hiện số dư còn lại
    // sau giao dịch; với khoản THU NHẬP cộng vào pool, hiện tổng đã cộng dồn tính đến
    // giao dịch này (không có "số dư sau khi trừ" vì đây là chiều cộng vào, không phải trừ ra).
    const isPoolDeduction = (tx.type === 'expense') || (tx.type === 'allocation' && tx.is_initial !== true);
    if (isPoolDeduction) balanceAfter = poolBalanceAfterTx(tx, allTx, categories, spendingPoolByPeriod);
    else if (tx.type === 'income') balanceAfter = poolIncomeCumulativeAfterTx(tx, allTx, categories);
  }
  // source.key === 'special-income' (Thu nhập đặc biệt): không có số dư nguồn liên quan, giữ '—'.

  const cat = categories.find((c) => c.id === tx.category_id);
  const isOutflow = tx.type === 'expense' || tx.type === 'allocation';
  const dateTimeLabel = `${txDate.toLocaleDateString('vi-VN')} ${txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  return (
    <tr className="border-b border-[rgba(189,189,203,0.15)] dark:border-[rgba(189,189,203,0.08)] last:border-0">
      <td className="py-2.5 pl-3 pr-3 text-sm text-blueberry dark:text-white font-semibold whitespace-nowrap">{cat?.name || '—'}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{dateTimeLabel}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{source.label}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey whitespace-nowrap">{balanceAfter !== null ? formatMoney(balanceAfter) : '—'}</td>
      <td className="py-2.5 pr-3 text-xs text-steel dark:text-light-grey max-w-[200px] truncate">{stripPeriodTag(tx.note) || '—'}</td>
      <td className={`py-2.5 pr-3 text-sm font-bold text-right whitespace-nowrap ${isOutflow ? 'text-cotton-candy' : 'text-turquoise'}`}>
        {isOutflow ? '-' : '+'}{formatMoney(tx.amount)}
      </td>
      {onDeleteTx && (
        <td className="py-2.5 pr-3 text-right whitespace-nowrap">
          <TxDeleteButton onClick={() => onDeleteTx(tx)} />
        </td>
      )}
    </tr>
  );
}

function TxLedgerModal({ title, txs, categories, accounts, allTx, spendingPoolByPeriod, onClose, onDeleteTx }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Danh sách nguồn để đổ vào dropdown filter — lấy từ chính tập txs được truyền vào
  // (không lấy từ toàn bộ accounts/funds, để chỉ hiện những nguồn THỰC SỰ xuất hiện ở đây).
  const sourceOptions = (() => {
    const map = new Map();
    txs.forEach((t) => { const s = txSourceInfo(t, categories, accounts); if (!map.has(s.key)) map.set(s.key, s.label); });
    return Array.from(map, ([key, label]) => ({ key, label }));
  })();

  const filtered = txs.filter((t) => {
    const d = new Date(t.date || t.created_at);
    if (dateFrom && d < new Date(dateFrom + 'T00:00:00')) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    if (sourceFilter !== 'all' && txSourceInfo(t, categories, accounts).key !== sourceFilter) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  const total = sorted.reduce((s, t) => s + Number(t.amount), 0);
  const hasActiveFilter = dateFrom || dateTo || sourceFilter !== 'all';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="frost-card bg-white dark:bg-[#1e1e32] w-full max-w-5xl rounded-3xl p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-blueberry dark:text-white text-lg">{title}</h3>
            <p className="text-steel dark:text-light-grey text-xs mt-0.5">{sorted.length} giao dịch · Tổng {formatMoney(total)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ice-cream dark:hover:bg-night-sky/30 flex items-center justify-center flex-shrink-0"><X size={18} className="text-steel dark:text-light-grey" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 frost-inset rounded-full px-3 py-1.5">
            <DateField value={dateFrom} onChange={setDateFrom} showIcon={false} clearable={false} className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
            <span className="text-steel dark:text-light-grey text-xs">→</span>
            <DateField value={dateTo} onChange={setDateTo} showIcon={false} clearable={false} align="right" className="bg-transparent text-xs font-semibold text-blueberry dark:text-white" />
          </div>
          <CustomSelect value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="" triggerClassName="frost-inset rounded-full text-xs font-semibold px-3 py-2 outline-none text-blueberry dark:text-white [color-scheme:light] dark:[color-scheme:dark]">
            <option value="all">Tất cả nguồn</option>
            {sourceOptions.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </CustomSelect>
          {hasActiveFilter && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSourceFilter('all'); }} className="text-xs font-bold text-steel dark:text-light-grey hover:text-blueberry dark:hover:text-white underline">
              Xoá lọc
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1 -mx-2 px-2 scrollbar-hide">
          {sorted.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-10">Không có giao dịch nào khớp bộ lọc.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="text-[11px] uppercase font-bold text-steel dark:text-light-grey bg-ice-cream dark:bg-night-sky border-b border-[rgba(189,189,203,0.25)]">
                  <th className="py-2.5 pl-3 pr-3 rounded-l-lg">Nội dung</th>
                  <th className="py-2.5 pr-3">Ngày giờ</th>
                  <th className="py-2.5 pr-3">Nguồn</th>
                  <th className="py-2.5 pr-3">Số dư nguồn sau GD</th>
                  <th className="py-2.5 pr-3">Ghi chú</th>
                  <th className={`py-2.5 pr-3 text-right ${onDeleteTx ? '' : 'rounded-r-lg'}`}>Số tiền</th>
                  {onDeleteTx && <th className="py-2.5 pr-3 rounded-r-lg"></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((tx) => (
                  <TxLedgerRow key={tx.id} tx={tx} categories={categories} accounts={accounts} allTx={allTx} spendingPoolByPeriod={spendingPoolByPeriod} onDeleteTx={onDeleteTx} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetBreakdownDetail({ wallets, funds, gold, total }) {
  const Section = ({ label, items }) => (items.length === 0 ? null : (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] font-bold text-steel dark:text-light-grey uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-3">
            <span className="text-blueberry dark:text-white text-sm font-semibold truncate">{it.name}</span>
            <span className="text-sm font-bold text-blueberry dark:text-white flex-shrink-0">{formatMoney(it.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  ));
  return (
    <div>
      <p className="text-[11px] font-bold text-steel dark:text-light-grey mb-2 uppercase tracking-wide">Tổng tài sản</p>
      {wallets.length === 0 && funds.length === 0 && gold.length === 0 ? (
        <p className="text-steel dark:text-light-grey text-sm py-1">Không có dữ liệu.</p>
      ) : (
        <>
          <Section label="Ví" items={wallets} />
          <Section label="Quỹ" items={funds} />
          <Section label="Vàng" items={gold} />
        </>
      )}
      <div className="flex items-center justify-between border-t border-light-grey/30 dark:border-[rgba(189,189,203,0.15)] pt-2 mt-1">
        <span className="text-sm font-bold text-blueberry dark:text-white">Tổng tài sản</span>
        <span className="text-sm font-bold text-blueberry dark:text-white">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

/* ==============================================================================
   16. REPORT COMPONENT
   ============================================================================== */
function Report({ setScreen, transactions, categories, accounts, goals, onAddClick, displayName, avatarUrl, theme, toggleTheme, openSettings, sidebarCollapsed, toggleSidebar, spendingPoolByPeriod, saveSpendingPoolForPeriod, reload, softDelete }) {
  const [editingTx, setEditingTx] = useState(null);

  async function handleDeleteTx(tx) {
    if (!confirm('Xóa giao dịch này? Bạn có thể khôi phục trong 30 ngày ở mục Lịch sử.')) return;
    const { error } = await softDelete('transactions', tx.id, txDeleteDescription(tx, categories), 'delete_transaction');
    if (error) { alert('Lỗi: ' + error.message); return; }
    reload && reload();
  }
  // Time range state
  // FIX: dùng kỳ tài chính hiện tại (21 -> 20) làm mặc định, KHÔNG dùng tháng lịch thường.
  // Lý do: từ ngày 21 trở đi, giao dịch đã thuộc về kỳ tài chính của tháng SAU (xem dateToPeriodKey),
  // nếu mặc định theo tháng lịch thì giao dịch vừa nhập sau ngày 20 sẽ rơi ra ngoài kỳ đang xem
  // và không hiển thị trong Báo cáo (Chi tiêu/Thu nhập hiện 0đ dù đã có dữ liệu).
  const [defaultPeriodYear, defaultPeriodMonth] = currentPeriodKey().split('-').map(Number);
  const [timeType, setTimeType] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriodMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(defaultPeriodMonth / 3));
  const [selectedHalf, setSelectedHalf] = useState(defaultPeriodMonth <= 6 ? 1 : 2);
  const [selectedYear, setSelectedYear] = useState(defaultPeriodYear);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0,10));
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    return d.toISOString().slice(0,10);
  });
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0,10));

  // Compute start/end based on type — Tháng/Quý/6 tháng/Năm đều dựa trên
  // financial period (kỳ 21 → 20) của hệ thống, không dùng tháng lịch đơn giản.
  const getPeriod = () => {
    let start, end;
    const y = selectedYear;
    if (timeType === 'day') {
      const d = new Date(selectedDay);
      start = new Date(d); start.setHours(0,0,0,0);
      end = new Date(d); end.setHours(23,59,59,999);
    } else if (timeType === 'week') {
      const d = new Date(selectedWeek);
      start = new Date(d); start.setHours(0,0,0,0);
      end = new Date(d); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
    } else if (timeType === 'month') {
      ({ start, end } = financialMonthRange(y, selectedMonth));
    } else if (timeType === 'quarter') {
      const q = selectedQuarter;
      ({ start, end } = financialMultiMonthRange(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]));
    } else if (timeType === '6month') {
      const h = selectedHalf;
      const months = h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
      ({ start, end } = financialMultiMonthRange(y, months));
    } else if (timeType === 'year') {
      ({ start, end } = financialMultiMonthRange(y, [1,2,3,4,5,6,7,8,9,10,11,12]));
    } else if (timeType === 'custom') {
      start = new Date(customStart); start.setHours(0,0,0,0);
      end = new Date(customEnd); end.setHours(23,59,59,999);
    } else {
      // fallback: kỳ hiện tại
      ({ start, end } = periodKeyToRange(currentPeriodKey()));
    }
    return { start, end };
  };

  const { start, end } = getPeriod();
  const periodTxs = transactions.filter(t => {
    const d = new Date(t.date || t.created_at);
    return d >= start && d <= end;
  });

  // ==== [PHASE 3] Danh sách periodKey (kỳ 21->20) tương ứng với khoảng đang chọn ====
  // Dùng để tính Thu nhập được chi ĐÚNG theo từng kỳ thay vì gộp transaction theo ngày.
  const monthPeriodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const periodKeysInRange = (() => {
    if (timeType === 'month') return [monthPeriodKey];
    if (timeType === 'quarter') { const q = selectedQuarter; return periodKeysForMonths(selectedYear, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]); }
    if (timeType === '6month') { const h = selectedHalf; return periodKeysForMonths(selectedYear, h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]); }
    if (timeType === 'year') return periodKeysForMonths(selectedYear, [1,2,3,4,5,6,7,8,9,10,11,12]);
    return null; // day / week / custom — không map thẳng theo kỳ
  })();

  // ===== Danh sách giao dịch chi tiết trong khoảng thời gian đang filter =====
  // "Nguồn trừ/cộng" cho biết tiền được cộng vào đâu (thu nhập, quỹ) hay trừ từ đâu (ví, quỹ, thu nhập kỳ).
  function getTxSource(tx) {
    const cat = categories.find((c) => c.id === tx.category_id);
    if (tx.type === 'income') return { label: cat?.name ? `Thu nhập · ${cat.name}` : 'Thu nhập' };
    if (tx.type === 'allocation') return { label: `Góp quỹ · ${cat?.name || 'Quỹ'}` };
    if (cat?.is_fund) return { label: `Rút từ quỹ · ${cat?.name || 'Quỹ'}` };
    if (tx.account_id) {
      const acc = accounts.find((a) => a.id === tx.account_id);
      return { label: `Ví · ${acc?.name || 'Không rõ'}` };
    }
    return { label: 'Thu nhập kỳ' };
  }
  const allPeriodTxsSorted = [...periodTxs].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  function groupTxsByDate(txs) {
    const groups = {};
    txs.forEach((tx) => {
      const key = new Date(tx.date || tx.created_at).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }
  function formatTxDateLabel(dateStr) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const date = new Date(dateStr);
    if (date.toDateString() === today.toDateString()) return 'Hôm nay';
    if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  }
  const groupedPeriodTxs = groupTxsByDate(allPeriodTxsSorted);
  const sortedPeriodTxKeys = Object.keys(groupedPeriodTxs).sort((a, b) => new Date(b) - new Date(a));
  function TxDetailRow({ tx }) {
    const cat = categories.find((c) => c.id === tx.category_id);
    const src = getTxSource(tx);
    const isOverLimit = (tx.note || '').startsWith('[Vượt hạn mức]');
    const noteText = stripPeriodTag(tx.note);
    const timeLabel = new Date(tx.created_at || tx.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    return (
      <div onClick={() => setEditingTx(tx)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-ice-cream dark:hover:bg-night-sky/30 rounded-xl -mx-2 px-2 transition">
        <EmojiCircle emoji={cat?.icon} size={40} bg={tx.type === 'expense' ? '#E3D6FF' : '#B4F1F1'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-blueberry dark:text-white font-bold text-sm truncate">{cat?.name || (tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu')}</p>
            {isOverLimit && <span className="text-[10px] font-bold text-white bg-cotton-candy px-2 py-0.5 rounded-full flex-shrink-0">Vượt hạn mức</span>}
          </div>
          {noteText && <p className="text-steel dark:text-light-grey text-xs truncate">{noteText}</p>}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-steel dark:text-light-grey text-[11px] flex items-center gap-1"><Clock size={11} />{timeLabel}</span>
            <span className="text-[11px] font-semibold text-baby-blue">{src.label}</span>
          </div>
        </div>
        <p className={`font-bold text-sm flex-shrink-0 ${tx.type === 'expense' ? 'text-cotton-candy' : 'text-turquoise'}`}>{tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}</p>
        <TxDeleteButton onClick={() => handleDeleteTx(tx)} />
      </div>
    );
  }

  // ==== [PHASE 3] Aggregate — chuyển sang calculatePeriodFinancials/calculateFinancialsForPeriods ====
  // Giữ nguyên TÊN biến cũ (income/allocation/expenseFromIncome/totalActualExpense/remaining) để
  // không phải sửa lại toàn bộ JSX bên dưới đang tham chiếu các tên này — nhưng GIÁ TRỊ giờ được
  // tính đúng theo logic Thu nhập được chi mới, KHÔNG còn dùng remaining = income - allocation - expense.
  const financials = periodKeysInRange
    ? calculateFinancialsForPeriods(periodKeysInRange, transactions, categories, spendingPoolByPeriod)
    : calculateFinancialsFromTxs(periodTxs, categories, null);
  const agg = financials;
  const income = financials.totalIncome;
  const allocation = financials.allocationFromSpendingPool;
  const expenseFromIncome = financials.expenseFromSpendingPool;
  const expenseFromFund = financials.expenseFromFund;
  const totalActualExpense = financials.totalActualExpense;
  const remaining = financials.remainingAfterSpend;
  // Các số liệu MỚI theo yêu cầu nghiệp vụ — dùng cho section "Thu nhập đã đi đâu?" + hover card
  const { incomeForSpendingPool, specialIncome, spendingPool, accumulationBeforeSpend, isOverSpendingPool } = financials;

  // Previous period — cùng logic financial period với getPeriod()
  const getPrevPeriod = () => {
    if (timeType === 'day') {
      const d = new Date(selectedDay); d.setDate(d.getDate()-1);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      return { start: s, end: e };
    } else if (timeType === 'week') {
      const d = new Date(selectedWeek); d.setDate(d.getDate()-7);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setDate(e.getDate()+6); e.setHours(23,59,59,999);
      return { start: s, end: e };
    } else if (timeType === 'month') {
      let m = selectedMonth - 1; let y = selectedYear;
      if (m === 0) { m = 12; y--; }
      return financialMonthRange(y, m);
    } else if (timeType === 'quarter') {
      let q = selectedQuarter - 1; let y = selectedYear;
      if (q === 0) { q = 4; y--; }
      return financialMultiMonthRange(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]);
    } else if (timeType === '6month') {
      let h = selectedHalf - 1; let y = selectedYear;
      if (h === 0) { h = 2; y--; }
      const months = h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12];
      return financialMultiMonthRange(y, months);
    } else if (timeType === 'year') {
      return financialMultiMonthRange(selectedYear - 1, [1,2,3,4,5,6,7,8,9,10,11,12]);
    } else if (timeType === 'custom') {
      const dur = end - start;
      const ps = new Date(start); ps.setTime(ps.getTime() - dur - 1000);
      const pe = new Date(end); pe.setTime(pe.getTime() - dur - 1000);
      return { start: ps, end: pe };
    }
    return null;
  };

  const prev = getPrevPeriod();
  const prevPeriodKeysInRange = (() => {
    if (timeType === 'month') { let m = selectedMonth - 1, y = selectedYear; if (m === 0) { m = 12; y--; } return [`${y}-${String(m).padStart(2, '0')}`]; }
    if (timeType === 'quarter') { let q = selectedQuarter - 1, y = selectedYear; if (q === 0) { q = 4; y--; } return periodKeysForMonths(y, [(q-1)*3+1, (q-1)*3+2, (q-1)*3+3]); }
    if (timeType === '6month') { let h = selectedHalf - 1, y = selectedYear; if (h === 0) { h = 2; y--; } return periodKeysForMonths(y, h === 1 ? [1,2,3,4,5,6] : [7,8,9,10,11,12]); }
    if (timeType === 'year') return periodKeysForMonths(selectedYear - 1, [1,2,3,4,5,6,7,8,9,10,11,12]);
    return null;
  })();
  let prevFinancials = { totalIncome: 0, allocationFromSpendingPool: 0, expenseFromSpendingPool: 0, expenseFromFund: 0, totalActualExpense: 0, remainingAfterSpend: 0 };
  if (prev) {
    if (prevPeriodKeysInRange) {
      prevFinancials = calculateFinancialsForPeriods(prevPeriodKeysInRange, transactions, categories, spendingPoolByPeriod);
    } else {
      const prevTxs = transactions.filter(t => {
        const d = new Date(t.date || t.created_at);
        return d >= prev.start && d <= prev.end;
      });
      prevFinancials = calculateFinancialsFromTxs(prevTxs, categories, null);
    }
  }
  const prevAgg = { income: prevFinancials.totalIncome, allocation: prevFinancials.allocationFromSpendingPool, expenseFromIncome: prevFinancials.expenseFromSpendingPool, expenseFromFund: prevFinancials.expenseFromFund, totalActualExpense: prevFinancials.totalActualExpense, remaining: prevFinancials.remainingAfterSpend };

  // Asset snapshot at end of period
  const totalAccountsEnd = accounts.reduce((s, a) => s + accountBalanceAtDate(a, transactions, end), 0);
  const fundCats = categories.filter(c => c.is_fund);
  const totalFundsEnd = fundCats.reduce((s, c) => s + fundBalanceAtDate(c, transactions, end), 0);
  const totalAssetsEnd = totalAccountsEnd + totalFundsEnd;
  // Asset at start of period for comparison
  const totalAccountsStart = accounts.reduce((s, a) => s + accountBalanceAtDate(a, transactions, start), 0);
  const totalFundsStart = fundCats.reduce((s, c) => s + fundBalanceAtDate(c, transactions, start), 0);
  const totalAssetsStart = totalAccountsStart + totalFundsStart;
  const assetChange = totalAssetsStart > 0 ? ((totalAssetsEnd - totalAssetsStart) / totalAssetsStart) * 100 : null;

  // Income breakdown
  const incomeCats = categories.filter(c => c.type === 'income');
  const incomeBreakdown = incomeCats.map(c => ({
    ...c,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

  // Expense breakdown — chỉ tính danh mục chi tiêu thường (không gồm quỹ, quỹ đã có mục riêng ở trên)
  const expenseCats = categories.filter(c => c.type === 'expense' && !c.is_fund);
  const expenseBreakdown = expenseCats.map(c => ({
    ...c,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    fromIncome: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense' && t.account_id === null).reduce((s, t) => s + Number(t.amount), 0),
    fromWallet: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense' && t.account_id !== null).reduce((s, t) => s + Number(t.amount), 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount);

  // Hover-card breakdown data (dùng đúng periodTxs / mốc "end" của filter thời gian đang chọn)
  const incomeDetailItems = incomeBreakdown.map(c => ({ key: c.id, name: c.name, amount: c.amount }));
  const poolIncomeDetailItems = incomeBreakdown.filter(c => c.include_in_spending_pool !== false).map(c => ({ key: c.id, name: c.name, amount: c.amount }));
  const specialIncomeDetailItems = incomeBreakdown.filter(c => c.include_in_spending_pool === false).map(c => ({ key: c.id, name: c.name, amount: c.amount }));
  const expenseFundWithdrawn = fundCats.map(c => ({
    key: c.id,
    name: c.name,
    amount: periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
  })).filter(c => c.amount > 0);
  const expenseDetailItems = [
    ...expenseBreakdown.map(c => ({ key: c.id, name: c.name, amount: c.amount })),
    ...expenseFundWithdrawn,
  ].sort((a, b) => b.amount - a.amount);
  const assetWalletItems = accounts.filter(a => a.type !== 'gold').map(a => ({ key: a.id, name: a.name, amount: accountBalanceAtDate(a, transactions, end) }));
  const assetGoldItems = accounts.filter(a => a.type === 'gold').map(a => ({ key: a.id, name: a.name, amount: accountBalanceAtDate(a, transactions, end) }));
  const assetFundItems = fundCats.map(c => ({ key: c.id, name: c.name, amount: fundBalanceAtDate(c, transactions, end) }));

  // Fund data
  const fundData = fundCats.map(c => {
    const balanceNow = fundBalanceAtDate(c, transactions, end); // at end of period
    const contributed = periodTxs.filter(t => t.category_id === c.id && t.type === 'allocation').reduce((s, t) => s + Number(t.amount), 0);
    const withdrawn = periodTxs.filter(t => t.category_id === c.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const target = Number(c.target_amount || 0);
    const progress = target > 0 ? Math.min(100, (balanceNow / target) * 100) : 0;
    return { ...c, balanceNow, contributed, withdrawn, target, progress };
  }).filter(f => f.contributed > 0 || f.withdrawn > 0 || f.balanceNow > 0).sort((a,b) => b.contributed - a.contributed);

  // Lịch sử nạp/rút quỹ trong kỳ (dùng để gộp "Chi tiết đã nạp quỹ" + "Hoạt động quỹ"
  // thành 1 mục "Hoạt động quỹ" duy nhất, có kèm lịch sử từng giao dịch nạp/rút).
  const fundActivityEntries = periodTxs
    .filter(t => (t.type === 'allocation' || t.type === 'expense') && fundCats.some(c => c.id === t.category_id))
    .map(t => {
      const fc = fundCats.find(c => c.id === t.category_id);
      return { ...t, fundName: fc?.name || '', fundIcon: fc?.icon || '💰', amount: Number(t.amount) };
    })
    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  // Trends: if year, show 12 tháng (kỳ tài chính); if quarter/6month, show các tháng trong đó.
  // Luôn tính theo financial period (21 → 20), không dùng tháng lịch.
  const trendData = (() => {
    function monthsAgg(year, monthList) {
      return monthList.map((m) => {
        const pk = `${year}-${String(m).padStart(2, '0')}`;
        const a = calculatePeriodFinancials(pk, transactions, categories, spendingPoolByPeriod?.[pk]);
        return { label: `Th${m}`, month: m, year, income: a.totalIncome, allocation: a.allocationFromSpendingPool, expenseFromIncome: a.expenseFromSpendingPool, expenseFromFund: a.expenseFromFund, totalActualExpense: a.totalActualExpense, remaining: a.remainingAfterSpend };
      });
    }
    if (timeType === 'year') return monthsAgg(selectedYear, [1,2,3,4,5,6,7,8,9,10,11,12]);
    if (timeType === 'quarter') { const sm = (selectedQuarter-1)*3; return monthsAgg(selectedYear, [sm+1, sm+2, sm+3]); }
    if (timeType === '6month') { const sm = (selectedHalf-1)*6; return monthsAgg(selectedYear, Array.from({length:6}, (_,i)=>sm+i+1)); }
    return [];
  })();

  // Tổng kết năm (chỉ khi đang xem theo Năm) — dựa trên trendData 12 tháng đã tính ở trên
  const yearSummary = (() => {
    if (timeType !== 'year' || trendData.length === 0) return null;
    const pick = (key) => trendData.reduce((best, m) => (m[key] > (best ? best[key] : -Infinity) ? m : best), null);
    return {
      topIncomeMonth: pick('income'),
      topAllocationMonth: pick('allocation'),
      topExpenseMonth: pick('totalActualExpense'),
      topRemainingMonth: pick('remaining'),
    };
  })();

  // Insights
  const insights = [];
  const incomeChange = prevAgg.income > 0 ? ((income - prevAgg.income) / prevAgg.income) * 100 : null;
  if (incomeChange !== null && Math.abs(incomeChange) > 5) {
    insights.push({
      icon: incomeChange > 0 ? TrendingUp : TrendingDown,
      title: incomeChange > 0 ? 'Thu nhập tăng' : 'Thu nhập giảm',
      desc: `Thu nhập ${incomeChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(incomeChange))}% so với kỳ trước.`,
      color: incomeChange > 0 ? 'text-turquoise' : 'text-cotton-candy'
    });
  }
  const savingRate = income > 0 ? Math.round((allocation / income) * 100) : 0;
  insights.push({
    icon: PiggyBank,
    title: 'Tỷ lệ góp quỹ',
    desc: `Bạn đã dành ${savingRate}% thu nhập để góp quỹ.`,
    color: 'text-turquoise'
  });
  if (expenseBreakdown.length > 0) {
    const top = expenseBreakdown[0];
    insights.push({
      icon: Wallet,
      title: 'Chi tiêu lớn nhất',
      desc: `Danh mục "${top.name}" chiếm ${totalActualExpense > 0 ? Math.round((top.amount / totalActualExpense) * 100) : 0}% tổng chi.`,
      color: 'text-cotton-candy'
    });
  }
  if (isOverSpendingPool) {
    insights.push({
      icon: AlertTriangle,
      title: 'Vượt Thu nhập được chi',
      desc: `Nạp quỹ + chi tiêu từ Thu nhập được chi đã vượt quá số tiền được phép chi (${formatMoney(spendingPool)}) của kỳ.`,
      color: 'text-cotton-candy'
    });
  }
  if (assetChange !== null && Math.abs(assetChange) > 3) {
    insights.push({
      icon: CircleDollarSign,
      title: assetChange > 0 ? 'Tài sản tăng' : 'Tài sản giảm',
      desc: `Tổng tài sản ${assetChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(Math.round(assetChange))}% so với đầu kỳ.`,
      color: assetChange > 0 ? 'text-turquoise' : 'text-cotton-candy'
    });
  }
  // Goal progress
  const activeGoals = goals.filter(g => g.status !== 'Hoàn thành');
  if (activeGoals.length > 0) {
    const goal = activeGoals[0];
    const pct = goal.target_amount ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
    insights.push({
      icon: Target,
      title: `Mục tiêu "${goal.name}"`,
      desc: `Đạt ${Math.round(pct)}% mục tiêu.`,
      color: 'text-lavender'
    });
  }

  // Drilldown state
  const [drilldownCategory, setDrilldownCategory] = useState(null);
  const [drilldownTransactions, setDrilldownTransactions] = useState([]);
  const [showDrilldown, setShowDrilldown] = useState(false);

  // Ledger modal state — dùng cho nút "Xem chi tiết" trong popup hover của các thẻ
  // tổng kết (Thu nhập / Thu nhập được chi / Thu nhập đặc biệt / Chi tiêu).
  const [ledgerModal, setLedgerModal] = useState(null); // { title, txs } | null

  // Danh sách giao dịch thô (chưa gộp theo danh mục) cho từng thẻ — dùng để render
  // bảng chi tiết trong TxLedgerModal, khớp với cách tính income/spendingPool/specialIncome/
  // totalActualExpense ở trên (calculateFinancialsFromTxs).
  const incomeLedgerTxs = periodTxs.filter((t) => t.type === 'income');
  const poolIncomeLedgerTxs = periodTxs.filter((t) => {
    if (t.type !== 'income') return false;
    const c = categories.find((c2) => c2.id === t.category_id);
    return c ? c.include_in_spending_pool !== false : true;
  });
  const specialIncomeLedgerTxs = periodTxs.filter((t) => {
    if (t.type !== 'income') return false;
    const c = categories.find((c2) => c2.id === t.category_id);
    return c ? c.include_in_spending_pool === false : false;
  });
  const expenseLedgerTxs = periodTxs.filter((t) => t.type === 'expense');

  function openDrilldown(categoryId, txType = 'expense') {
    const cat = categories.find(c => c.id === categoryId);
    const txs = periodTxs.filter(t => t.category_id === categoryId && t.type === txType)
      .sort((a,b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    setDrilldownCategory(cat);
    setDrilldownTransactions(txs);
    setShowDrilldown(true);
  }

  // Format period label for header
  const getPeriodLabel = () => {
    if (timeType === 'day') return `Ngày ${new Date(selectedDay).toLocaleDateString('vi-VN')}`;
    if (timeType === 'week') return `Tuần ${new Date(selectedWeek).toLocaleDateString('vi-VN')} - ${new Date(new Date(selectedWeek).getTime()+6*86400000).toLocaleDateString('vi-VN')}`;
    if (timeType === 'month') return `Tháng ${selectedMonth}/${selectedYear}`;
    if (timeType === 'quarter') return `Quý ${selectedQuarter}/${selectedYear}`;
    if (timeType === '6month') return `${selectedHalf === 1 ? 'H1' : 'H2'}/${selectedYear}`;
    if (timeType === 'year') return `Năm ${selectedYear}`;
    if (timeType === 'custom') return `${new Date(customStart).toLocaleDateString('vi-VN')} - ${new Date(customEnd).toLocaleDateString('vi-VN')}`;
    return '';
  };

  const periodLabel = getPeriodLabel();

  // Stacked bar component
  function StackedBar({ data }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <div className="text-center text-steel dark:text-light-grey py-2">Không có dữ liệu</div>;
    const segments = data.map(d => ({ ...d, pct: (d.value / total) * 100 }));
    return (
      <div className="w-full h-8 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => (
          <div key={i} style={{ width: `${seg.pct}%`, background: seg.color }} title={`${seg.label}: ${formatMoney(seg.value)}`} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden relative">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-gradient-hero opacity-70'}`} />
        <div className="w-full min-h-[100dvh] pb-28 relative">
          <div className="px-5 pt-8 flex items-center justify-between">
            <h1 className="text-white text-lg font-bold">Báo cáo</h1>
            <button onClick={() => setScreen('dashboard')} className="w-9 h-9 rounded-full bg-white/30 backdrop-blur flex items-center justify-center"><X size={18} className="text-white" /></button>
          </div>
          <div className="px-5 mt-2">
            <CustomSelect value={timeType} onChange={(e) => setTimeType(e.target.value)} className="" triggerClassName="w-full bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="quarter">Quý</option>
              <option value="6month">6 tháng</option>
              <option value="year">Năm</option>
              <option value="custom">Tùy chỉnh</option>
            </CustomSelect>
            {timeType === 'day' && <DateField value={selectedDay} onChange={setSelectedDay} className="w-full justify-between mt-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white" />}
            {timeType === 'week' && <DateField value={selectedWeek} onChange={setSelectedWeek} className="w-full justify-between mt-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white" />}
            {timeType === 'month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="" triggerClassName="flex-1 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  {Array.from({length:12}, (_,i) => i+1).map(m => <option key={m} value={m}>{m}</option>)}
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none" />
              </div>
            )}
            {timeType === 'quarter' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="" triggerClassName="flex-1 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>Q1</option><option value={2}>Q2</option><option value={3}>Q3</option><option value={4}>Q4</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none" />
              </div>
            )}
            {timeType === '6month' && (
              <div className="flex gap-2 mt-2">
                <CustomSelect value={selectedHalf} onChange={(e) => setSelectedHalf(Number(e.target.value))} className="" triggerClassName="flex-1 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none [color-scheme:light] dark:[color-scheme:dark]">
                  <option value={1}>H1</option><option value={2}>H2</option>
                </CustomSelect>
                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-20 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none" />
              </div>
            )}
            {timeType === 'year' && (
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-full mt-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white outline-none" />
            )}
            {timeType === 'custom' && (
              <div className="flex gap-2 mt-2">
                <DateField value={customStart} onChange={setCustomStart} className="flex-1 justify-between bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white" />
                <DateField value={customEnd} onChange={setCustomEnd} align="right" className="flex-1 justify-between bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-sm text-white" />
              </div>
            )}
          </div>
          <div className="px-5 mt-4 bg-white dark:bg-[#1e1e32] rounded-3xl shadow-soft p-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Tổng quan</h2>
            <p className="text-steel dark:text-light-grey text-[11px] mb-2">Chạm vào 1 dòng để xem chi tiết</p>
            <div className="grid grid-cols-1 gap-2">
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<AssetBreakdownDetail wallets={assetWalletItems} funds={assetFundItems} gold={assetGoldItems} total={totalAssetsEnd} />}>
                <span className="text-steel dark:text-light-grey">Tài sản (cuối kỳ)</span><span className="font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Tổng thu nhập" items={incomeDetailItems} total={income} colorClass="text-turquoise" onViewDetail={() => setLedgerModal({ title: `Thu nhập — ${periodLabel}`, txs: incomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập</span><span className="font-bold text-turquoise">{formatMoney(income)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Thu nhập được chi" items={poolIncomeDetailItems} total={spendingPool} colorClass="text-baby-blue" onViewDetail={() => setLedgerModal({ title: `Thu nhập được chi — ${periodLabel}`, txs: poolIncomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập được chi</span><span className="font-bold text-baby-blue">{formatMoney(spendingPool)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Thu nhập đặc biệt" items={specialIncomeDetailItems} total={specialIncome} colorClass="text-lavender" onViewDetail={() => setLedgerModal({ title: `Thu nhập đặc biệt — ${periodLabel}`, txs: specialIncomeLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Thu nhập đặc biệt</span><span className="font-bold text-lavender">{formatMoney(specialIncome)}</span>
              </HoverDetailCard>
              <HoverDetailCard className="flex justify-between items-center py-1" detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}>
                <span className="text-steel dark:text-light-grey">Chi tiêu</span><span className="font-bold text-cotton-candy">{formatMoney(totalActualExpense)}</span>
              </HoverDetailCard>
            </div>
          </div>
          <div className="px-5 mt-4 bg-white dark:bg-[#1e1e32] rounded-3xl shadow-soft p-4">
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
          <div className="px-5 mt-4 bg-white dark:bg-[#1e1e32] rounded-3xl shadow-soft p-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Top chi tiêu</h2>
            {expenseBreakdown.slice(0,3).map(c => (
              <div key={c.id} className="flex justify-between py-1"><span>{c.name}</span><span className="font-bold text-cotton-candy">{formatMoney(c.amount)}</span></div>
            ))}
          </div>

          <div data-report-anchor="recent-activity" className="px-5 mt-4 bg-white dark:bg-[#1e1e32] rounded-3xl shadow-soft p-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-base mb-3">Hoạt động gần đây</h2>
            {allPeriodTxsSorted.length === 0 ? (
              <p className="text-steel dark:text-light-grey text-sm text-center py-4">Không có giao dịch nào trong khoảng thời gian này.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedPeriodTxKeys.map((key) => (
                  <div key={key}>
                    <p className="text-xs font-bold text-steel dark:text-light-grey mb-1">{formatTxDateLabel(key)}</p>
                    <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                      {groupedPeriodTxs[key].map((tx) => <TxDetailRow key={tx.id} tx={tx} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:block relative">
        <div className="frost-blob z-0 w-96 h-96 bg-baby-blue-light/70 dark:bg-baby-blue/22 -top-10 right-10" />
        <div className="frost-blob z-0 w-80 h-80 bg-lavender-light/70 dark:bg-lavender/22 top-[600px] -left-10" />
        <div className="relative flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-blueberry dark:text-white text-2xl font-extrabold">Báo cáo &amp; Phân tích</h1>
          <div className="flex items-center gap-2 flex-wrap">
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
            <div><p className="text-steel dark:text-light-grey text-sm">Còn lại</p><p className={`text-xl font-bold ${remaining >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>{formatMoneySigned(remaining)}</p></div>
            <div><p className="text-steel dark:text-light-grey text-sm">Tài sản cuối kỳ</p><p className="text-xl font-bold text-blueberry dark:text-white">{formatMoney(totalAssetsEnd)}</p></div>
          </div>
          {assetChange !== null && (
            <p className={`text-sm mt-2 ${assetChange >= 0 ? 'text-turquoise' : 'text-cotton-candy'}`}>
              {assetChange >= 0 ? '▲' : '▼'} {Math.abs(Math.round(assetChange))}% so với đầu kỳ
            </p>
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
            detail={<BreakdownDetailList title="Thu nhập đặc biệt" items={specialIncomeDetailItems} total={specialIncome} colorClass="text-lavender" onViewDetail={() => setLedgerModal({ title: `Thu nhập đặc biệt — ${periodLabel}`, txs: specialIncomeLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Thu nhập đặc biệt</p>
            <p className="text-lavender text-2xl font-bold">{formatMoney(specialIncome)}</p>
          </HoverDetailCard>
          <HoverDetailCard
 className="frost-card rounded-3xl p-6 cursor-pointer hover:shadow-card transition"
            align="right"
            detail={<BreakdownDetailList title="Chi tiêu" items={expenseDetailItems} total={totalActualExpense} colorClass="text-cotton-candy" onViewDetail={() => setLedgerModal({ title: `Chi tiêu — ${periodLabel}`, txs: expenseLedgerTxs })} />}
          >
            <p className="text-steel dark:text-light-grey text-sm font-semibold">Chi tiêu</p>
            <p className="text-cotton-candy text-2xl font-bold">{formatMoney(totalActualExpense)}</p>
          </HoverDetailCard>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
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
              <StackedBar data={[
                { label: 'Nạp quỹ', value: allocation, color: '#74ACEF' },
                { label: 'Chi tiêu', value: expenseFromIncome, color: '#F18AB5' },
                { label: 'Dư sau chi', value: Math.max(0, remaining), color: '#0DBACC' }
              ]} />
              {isOverSpendingPool && <p className="text-cotton-candy text-xs mt-2">⚠️ Đã sử dụng vượt quá Thu nhập được chi của kỳ này.</p>}
            </div>
          </div>
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
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

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Hoạt động quỹ</h2>
          {fundData.length === 0 ? <p className="text-steel dark:text-light-grey">Không có hoạt động quỹ.</p> : (
            <>
              <div className="space-y-3">
                {fundData.slice(0,5).map(f => (
                  <button key={f.id} onClick={() => openDrilldown(f.id, f.contributed >= f.withdrawn ? 'allocation' : 'expense')} className="w-full flex items-center justify-between border-b last:border-0 py-2 text-left hover:bg-turquoise/5 transition rounded-lg px-1">
                    <div><p className="font-bold text-blueberry dark:text-white">{f.icon} {f.name}</p><p className="text-xs text-steel dark:text-light-grey">Số dư hiện tại: {formatMoney(f.balanceNow)}</p></div>
                    <div className="text-right">
                      {f.contributed > 0 && <p className="text-sm text-turquoise">+{formatMoney(f.contributed)} {allocation > 0 && <span className="text-xs font-semibold">({Math.round((f.contributed/allocation)*100)}%)</span>}</p>}
                      {f.withdrawn > 0 && <p className="text-sm text-cotton-candy">-{formatMoney(f.withdrawn)}</p>}
                      {f.target > 0 && <p className="text-xs text-steel dark:text-light-grey">{Math.round(f.progress)}% mục tiêu</p>}
                    </div>
                  </button>
                ))}
                {fundData.length > 5 && <p className="text-steel dark:text-light-grey text-sm">... và {fundData.length-5} quỹ khác</p>}
              </div>

              <div className="border-t border-[rgba(126,127,144,0.2)] dark:border-[rgba(189,189,203,0.15)] my-4" />
              <p className="text-steel dark:text-light-grey text-xs font-bold mb-2">Lịch sử nạp / rút quỹ trong kỳ</p>
              {fundActivityEntries.length === 0 ? (
                <p className="text-steel dark:text-light-grey text-sm">Không có giao dịch nạp/rút quỹ nào trong kỳ.</p>
              ) : (
                <div className="space-y-1.5">
                  {fundActivityEntries.slice(0,8).map(e => (
                    <button key={e.id} onClick={() => openDrilldown(e.category_id, e.type)} className="w-full flex items-center justify-between py-1.5 text-left hover:bg-turquoise/5 rounded-lg px-1 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${e.type === 'allocation' ? 'text-turquoise bg-turquoise-light/60' : 'text-cotton-candy bg-cotton-candy-light/60'}`}>{e.type === 'allocation' ? 'Nạp' : 'Rút'}</span>
                        <span className="text-blueberry dark:text-white font-semibold truncate">{e.fundIcon} {e.fundName}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`text-sm font-bold ${e.type === 'allocation' ? 'text-turquoise' : 'text-cotton-candy'}`}>{e.type === 'allocation' ? '+' : '-'}{formatMoney(e.amount)}</p>
                        <p className="text-[11px] text-steel dark:text-light-grey">{new Date(e.date || e.created_at).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </button>
                  ))}
                  {fundActivityEntries.length > 8 && <p className="text-steel dark:text-light-grey text-sm mt-1">... và {fundActivityEntries.length-8} hoạt động khác</p>}
                </div>
              )}
            </>
          )}
        </div>

 <div className="frost-card rounded-3xl p-6 mb-6">
          <h2 className="text-blueberry dark:text-white font-extrabold text-lg mb-4">Chi tiêu theo danh mục</h2>
          {expenseBreakdown.length === 0 ? <p className="text-steel dark:text-light-grey">Không có chi tiêu.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className="h-48 flex items-end gap-2">
              {trendData.map((d, i) => {
                const max = Math.max(...trendData.map(t => t.income), 1);
                const heightInc = (d.income / max) * 100;
                const heightAlloc = (d.allocation / max) * 100;
                const heightExp = (d.expenseFromIncome / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center justify-end h-full relative">
                      <div className="absolute bottom-0 w-full flex flex-col items-end" style={{ height: `${heightInc}%` }}>
                        <div className="w-full bg-turquoise/30 rounded-t-sm" style={{ height: `${heightExp}%` }} />
                        <div className="w-full bg-turquoise/60 rounded-t-sm" style={{ height: `${heightAlloc}%` }} />
                        <div className="w-full bg-turquoise rounded-t-sm" style={{ height: `${Math.max(0, heightInc - heightAlloc - heightExp)}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-steel dark:text-light-grey mt-1">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise rounded" /> Thu nhập</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise/60 rounded" /> Góp quỹ</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-turquoise/30 rounded" /> Chi tiêu</span>
            </div>
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

 <div data-report-anchor="recent-activity" className="frost-card rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-blueberry dark:text-white font-extrabold text-lg">Hoạt động gần đây</h2>
            <span className="text-steel dark:text-light-grey text-xs font-semibold">{periodLabel} · {allPeriodTxsSorted.length} giao dịch</span>
          </div>
          {allPeriodTxsSorted.length === 0 ? (
            <p className="text-steel dark:text-light-grey text-sm text-center py-6">Không có giao dịch nào trong khoảng thời gian này.</p>
          ) : (
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-1">
              {sortedPeriodTxKeys.map((key) => (
                <div key={key}>
                  <p className="text-xs font-bold text-steel dark:text-light-grey mb-2">{formatTxDateLabel(key)}</p>
                  <div className="flex flex-col divide-y divide-[rgba(189,189,203,0.2)] dark:divide-[rgba(189,189,203,0.1)]">
                    {groupedPeriodTxs[key].map((tx) => <TxDetailRow key={tx.id} tx={tx} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showDrilldown && drilldownCategory && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowDrilldown(false)}>
 <div className="frost-card w-full max-w-md rounded-3xl p-6 max-h-[80vh] overflow-y-auto scrollbar-hide" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-blueberry dark:text-white">Chi tiết "{drilldownCategory.name}"</h3>
                <button onClick={() => setShowDrilldown(false)}><X size={18} className="text-steel dark:text-light-grey" /></button>
              </div>
              {drilldownTransactions.length === 0 ? <p className="text-steel dark:text-light-grey">Không có giao dịch.</p> : (
                <div className="space-y-2">
                  {drilldownTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between border-b py-2">
                      <div>
                        <p className="text-sm text-blueberry dark:text-white">{new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN')}</p>
                        <p className="text-xs text-steel dark:text-light-grey">{stripPeriodTag(tx.note) || 'Không có ghi chú'}</p>
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

/* ==============================================================================
   17. MAIN APP
   ============================================================================== */
// FIX: nhớ vị trí màn hình hiện tại + các id liên quan (quỹ/ví đang xem, tab cài đặt)
// vào localStorage để khi load lại trang (F5) không bị nhảy về Trang chủ.
function loadNavState() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('navState') || '{}'); } catch { return {}; }
}
function saveNavState(patch) {
  if (typeof window === 'undefined') return;
  const current = loadNavState();
  localStorage.setItem('navState', JSON.stringify({ ...current, ...patch }));
}

function MainApp({ user, theme, toggleTheme }) {
  const initialNav = loadNavState();
  const [screen, setScreenRaw] = useState(() => initialNav.screen || 'dashboard');
  function setScreen(next) { setScreenRaw(next); saveNavState({ screen: next }); }
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  // spendingPoolByPeriod: { [periodKey]: amount } — "Số tiền được phép chi" người dùng tự cài đặt cho từng kỳ.
  // Nếu 1 kỳ chưa có trong map này thì calculatePeriodFinancials sẽ tự lấy mặc định = incomeForSpendingPool.
  const [spendingPoolByPeriod, setSpendingPoolByPeriod] = useState({});

  async function loadSpendingPoolSettings() {
    const { data, error } = await supabase.from('period_spending_pool').select('period_key, amount');
    if (error) { setSpendingPoolByPeriod({}); return; } // bảng có thể chưa được tạo trong Supabase -> fallback an toàn
    const map = {};
    (data || []).forEach((row) => { map[row.period_key] = row.amount; });
    setSpendingPoolByPeriod(map);
  }

  // Lưu/cập nhật Chi pool cho 1 kỳ cụ thể (upsert theo period_key)
  async function saveSpendingPoolForPeriod(periodKey, amount) {
    const { error } = await supabase
      .from('period_spending_pool')
      .upsert({ period_key: periodKey, amount: Number(amount) }, { onConflict: 'user_id,period_key' });
    if (error) { alert('Lỗi lưu Thu nhập được chi: ' + error.message); return false; }
    setSpendingPoolByPeriod((prev) => ({ ...prev, [periodKey]: Number(amount) }));
    return true;
  }
  const [loading, setLoading] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [currentUser, setCurrentUser] = useState(user);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('sidebarCollapsed') === '1'));
  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v;
      if (typeof window !== 'undefined') localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  }

  const displayName = currentUser?.user_metadata?.first_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0];
  const avatarUrl = currentUser?.user_metadata?.avatar_url;
  const appLogoUrl = currentUser?.user_metadata?.app_logo_url;
  const [settingsSection, setSettingsSection] = useState(() => initialNav.settingsSection || 'profile');
  function goToSettings(section) {
    const s = section || 'profile';
    setSettingsSection(s); saveNavState({ settingsSection: s });
    setScreen('settings');
  }

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    setCurrentUser(data.user);
  }

  const [logs, setLogs] = useState([]);
  async function loadLogs() {
    // Chỉ lấy 100 log gần nhất thay vì toàn bộ lịch sử — bảng system_logs sẽ càng ngày càng phình to
    const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs(data || []);
  }

  async function logActivity(action_type, description, payload = null, restorable = false) {
    await supabase.from('system_logs').insert({ action_type, description, payload, restorable });
    loadLogs();
  }

  async function loadAll() {
    setLoading(true); setLoadingGoals(true);
    const [{ data: accData }, { data: catData }, { data: txData }, { data: goalData }] = await Promise.all([
      supabase.from('accounts').select('*').eq('is_active', true).is('deleted_at', null),
      supabase.from('categories').select('*').is('deleted_at', null),
      // Chỉ lấy các cột thực sự đang dùng trong app thay vì '*' (giảm dung lượng response).
      // Lưu ý: KHÔNG thêm .limit() ở đây — fundBalanceWithProfit() cần TOÀN BỘ lịch sử
      // giao dịch của từng quỹ để tính lãi kép đúng, giới hạn số dòng sẽ làm sai số dư quỹ.
      supabase.from('transactions').select('id, account_id, category_id, type, amount, date, created_at, note').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    ]);
    // Mục tiêu có liên kết quỹ (fund_id) thì "Số tiền hiện có" luôn lấy trực tiếp từ số dư quỹ đó,
    // không dùng giá trị nhập tay đã lưu trước đó.
    const syncedGoals = (goalData || []).map((g) => {
      if (!g.fund_id) return g;
      const fund = (catData || []).find((c) => c.id === g.fund_id);
      if (!fund) return g;
      return { ...g, current_amount: fundBalanceWithProfit(fund, txData || []) };
    });
    setAccounts(accData || []); setCategories(catData || []); setTransactions(txData || []); setGoals(syncedGoals);
    setLoading(false); setLoadingGoals(false);
    loadLogs();
    loadSpendingPoolSettings();
  }

  useEffect(() => { loadAll(); }, []);

  const [resettingData, setResettingData] = useState(false);
  async function resetAllData() {
    setResettingData(true);
    try {
      const batchId = crypto.randomUUID();
      const now = new Date().toISOString();
      const desc = `Reset toàn bộ dữ liệu (${accounts.length} ví, ${categories.length} danh mục, ${transactions.length} giao dịch, ${goals.length} mục tiêu)`;
      await supabase.from('transactions').update({ deleted_at: now, deleted_batch_id: batchId }).is('deleted_at', null);
      await supabase.from('goals').update({ deleted_at: now, deleted_batch_id: batchId }).is('deleted_at', null);
      await supabase.from('categories').update({ deleted_at: now, deleted_batch_id: batchId }).is('deleted_at', null);
      await supabase.from('accounts').update({ deleted_at: now, deleted_batch_id: batchId }).is('deleted_at', null);
      await logActivity('reset_data', desc, { batchId, tables: ['transactions', 'goals', 'categories', 'accounts'] }, true);
    } finally {
      await loadAll();
      setResettingData(false);
    }
  }

  async function softDelete(table, id, description, actionType) {
    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from(table).update({ deleted_at: now, deleted_batch_id: batchId }).eq('id', id);
    if (!error) await logActivity(actionType, description, { batchId, tables: [table] }, true);
    return { error };
  }

  async function restoreLog(log) {
    const { batchId, tables } = log.payload || {};
    if (!batchId || !tables?.length) return;
    await Promise.all(tables.map((t) => supabase.from(t).update({ deleted_at: null, deleted_batch_id: null }).eq('deleted_batch_id', batchId)));
    await supabase.from('system_logs').update({ restored_at: new Date().toISOString() }).eq('id', log.id);
    await loadAll();
  }

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('expense');
  const [selectedFundId, setSelectedFundId] = useState(() => initialNav.selectedFundId || null);
  const [fundReturnScreen, setFundReturnScreen] = useState(() => initialNav.fundReturnScreen || 'dashboard');
  function openFund(id, from = 'dashboard') {
    setSelectedFundId(id); setFundReturnScreen(from);
    saveNavState({ selectedFundId: id, fundReturnScreen: from });
    setScreen('fund-detail');
  }
  const [selectedAccountId, setSelectedAccountId] = useState(() => initialNav.selectedAccountId || null);
  const [accountReturnScreen, setAccountReturnScreen] = useState(() => initialNav.accountReturnScreen || 'accounts');
  function openAccount(id, from = 'accounts') {
    setSelectedAccountId(id); setAccountReturnScreen(from);
    saveNavState({ selectedAccountId: id, accountReturnScreen: from });
    setScreen('account-detail');
  }

  function handleAddClick(type = 'expense') {
    setAddType(type);
    if (type === 'transfer') {
      alert('Tính năng chuyển khoản đang được phát triển.');
      return;
    }
    setShowAdd(true);
  }

  // Helper to render screen content inside layout
  function renderScreenContent() {
    if (screen === 'fund-detail') {
      const cat = categories.find((c) => c.id === selectedFundId);
      if (!cat) { setScreen('dashboard'); return null; }
      return <FundDetail category={cat} transactions={transactions} categories={categories} accounts={accounts} onBack={() => setScreen(fundReturnScreen)} reload={loadAll} softDelete={softDelete} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} spendingPoolByPeriod={spendingPoolByPeriod} />;
    }
    if (screen === 'account-detail') {
      const acc = accounts.find((a) => a.id === selectedAccountId);
      if (!acc) { setScreen('accounts'); return null; }
      return <AccountDetail account={acc} transactions={transactions} categories={categories} accounts={accounts} onBack={() => setScreen(accountReturnScreen)} reload={loadAll} softDelete={softDelete} setScreen={setScreen} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} spendingPoolByPeriod={spendingPoolByPeriod} />;
    }
    if (screen === 'funds') return <Funds setScreen={setScreen} categories={categories} transactions={transactions} onOpenFund={openFund} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />;
    if (screen === 'goals') return <Goals setScreen={setScreen} goals={goals} loadingGoals={loadingGoals} reload={loadAll} softDelete={softDelete} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} categories={categories} transactions={transactions} />;
    if (screen === 'accounts') return <Accounts setScreen={setScreen} accounts={accounts} transactions={transactions} onOpenAccount={openAccount} reload={loadAll} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />;
    if (screen === 'settings') return <Settings setScreen={setScreen} categories={categories} accounts={accounts} reload={loadAll} softDelete={softDelete} user={currentUser} onProfileUpdated={refreshUser} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} initialSection={settingsSection} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} onResetData={resetAllData} resettingData={resettingData} logs={logs} logActivity={logActivity} restoreLog={restoreLog} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />;
    if (screen === 'report') return <Report setScreen={setScreen} transactions={transactions} categories={categories} accounts={accounts} goals={goals} onAddClick={() => setShowAdd(true)} displayName={displayName} avatarUrl={avatarUrl} theme={theme} toggleTheme={toggleTheme} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} reload={loadAll} softDelete={softDelete} />;
    // Dashboard default
    return <Dashboard setScreen={setScreen} transactions={transactions} categories={categories} accounts={accounts} goals={goals} loading={loading} displayName={displayName} avatarUrl={avatarUrl} onAddClick={() => setShowAdd(true)} theme={theme} toggleTheme={toggleTheme} onOpenFund={openFund} onOpenAccount={openAccount} reload={loadAll} softDelete={softDelete} openSettings={goToSettings} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} spendingPoolByPeriod={spendingPoolByPeriod} saveSpendingPoolForPeriod={saveSpendingPoolForPeriod} />;
  }

  // Layout wrapper — true flex-row App Shell (Sidebar is a real flex item,
  // no fixed positioning / margin-left offset hack).
  return (
    <div
      className="flex w-full min-h-[100dvh] dark:bg-[#1a1a2e]"
      style={theme === 'dark' ? undefined : {
        background: 'linear-gradient(135deg, #EEF0F4 0%, #E4ECFB 45%, #ECE6FB 100%)',
      }}
    >
      {/* Sidebar Desktop — flex item, flex-shrink: 0 */}
      <SidebarDesktop
        screen={screen}
        setScreen={setScreen}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        theme={theme}
        toggleTheme={toggleTheme}
        appLogoUrl={appLogoUrl}
      />

      {/* AppBody — flex: 1, min-width: 0 so it never gets pushed wider than the viewport */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Desktop Header — width: 100%, no manual offset math */}
        <HeaderDesktop
          onAddClick={() => setShowAdd(true)}
          displayName={displayName}
          avatarUrl={avatarUrl}
          theme={theme}
          toggleTheme={toggleTheme}
          openSettings={goToSettings}
        />

        {/* MainContent — width: 100%, min-width: 0 */}
        <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {renderScreenContent()}
        </main>
      </div>

      {/* Mobile BottomNav */}
      <BottomNavMobile
        screen={screen}
        setScreen={setScreen}
        onAddClick={handleAddClick}
        theme={theme}
        toggleTheme={toggleTheme}
        openSettings={goToSettings}
      />

      {/* AddTransaction Modal - rendered globally */}
      {showAdd && (
        <AddTransaction
          onClose={() => setShowAdd(false)}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          onSaved={loadAll}
          initialType={addType}
          spendingPoolByPeriod={spendingPoolByPeriod}
        />
      )}
    </div>
  );
}

/* ==============================================================================
   18. ROOT APP
   ============================================================================== */
const AUTH_BG_DESKTOP = 'images/hk.jpg'; // Set your desktop background image URL here
const AUTH_BG_MOBILE = 'images/hk2.jpg';   // Set your mobile background image URL here

function AuthScreen() {
  const [mode, setMode] = useState('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  function switchMode(next) {
    setMode(next);
    setMessage('');
    setIsError(false);
  }

  async function handleSubmit() {
    if (!email || !password) { setMessage('Nhập đủ email và mật khẩu'); setIsError(true); return; }
    if (mode === 'signup' && !firstName) { setMessage('Nhập tên của bạn'); setIsError(true); return; }
    setLoading(true);
    setMessage('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage(error.message); setIsError(true); }
    } else {
      const full_name = `${firstName} ${lastName}`.trim();
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, first_name: firstName } } });
      if (error) { setMessage(error.message); setIsError(true); }
      else { setMessage('Tạo tài khoản thành công! Giờ bấm Đăng nhập.'); setIsError(false); switchMode('login'); }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) { setMessage('Nhập email để nhận link đặt lại mật khẩu'); setIsError(true); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { setMessage(error.message); setIsError(true); }
    else { setMessage('Đã gửi link đặt lại mật khẩu tới email của bạn.'); setIsError(false); }
    setLoading(false);
  }

  const fieldClass = "glass-input w-full rounded-full py-3.5 text-sm text-black placeholder:text-black/45 outline-none transition font-semibold";

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-10">
      <div className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={AUTH_BG_MOBILE} />
          <img src={AUTH_BG_DESKTOP} alt="" className="w-full h-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-black/35" />
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-cotton-candy/20 blur-[120px]" />
      <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-turquoise-light/25 blur-3xl" />
      <div className="absolute bottom-10 -right-16 w-60 h-60 rounded-full bg-lavender-light/25 blur-3xl" />

      <div className="relative w-full max-w-[390px]">
        <div
          className="glass-surface relative rounded-[1.75rem] overflow-hidden p-6"
        >
          {/* Subtle top highlight only — a real pane of glass, not a white box */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/25 via-white/0 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          <div className="relative z-10">
          <div className="flex bg-white/18 border border-white/25 rounded-full p-1 mb-5">
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition ${mode === 'signup' ? 'bg-gradient-primary text-white shadow' : 'text-blueberry/70'}`}>
              Đăng ký
            </button>
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-full text-sm font-bold transition ${mode === 'login' ? 'bg-gradient-primary text-white shadow' : 'text-blueberry/70'}`}>
              Đăng nhập
            </button>
          </div>

          <p className="text-xs text-blueberry/60 font-semibold mb-5">
            {mode === 'signup' ? 'Điền thông tin để tạo tài khoản mới' : 'Chào mừng trở lại, đăng nhập để tiếp tục'}
          </p>

          <div className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div className="flex gap-3">
                <input
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Tên" className="glass-input w-1/2 rounded-full px-5 py-3.5 text-sm text-black placeholder:text-black/45 outline-none transition font-semibold"
                />
                <input
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Họ" className="glass-input w-1/2 rounded-full px-5 py-3.5 text-sm text-black placeholder:text-black/45 outline-none transition font-semibold"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blueberry/50 pointer-events-none" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn" autoCapitalize="none"
                className={`${fieldClass} pl-11 pr-5`}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blueberry/50 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                className={`${fieldClass} pl-11 pr-11`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-blueberry/50 hover:text-blueberry transition">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between mt-3.5 px-1">
              <label className="flex items-center gap-1.5 text-xs text-blueberry/70 font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 rounded accent-turquoise" />
                Ghi nhớ đăng nhập
              </label>
              <button type="button" onClick={handleForgotPassword} className="text-xs text-blueberry font-bold hover:underline">
                Quên mật khẩu?
              </button>
            </div>
          )}

          {message && (
            <p className={`text-sm text-center mt-4 rounded-xl py-2 px-3 border ${isError ? 'text-cotton-candy bg-white/60 border-[rgba(241,138,181,0.3)]' : 'text-turquoise bg-white/60 border-[rgba(13,186,204,0.3)]'}`}>
              {message}
            </p>
          )}

          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full bg-gradient-primary text-white rounded-full py-3.5 font-bold flex items-center justify-center gap-2 disabled:opacity-60 mt-5 shadow-lg shadow-turquoise/40 hover:brightness-105 transition"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>

          <p className="text-center text-xs text-blueberry/70 mt-5 font-semibold">
            {mode === 'signup' ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <button type="button" onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')} className="text-blueberry font-bold hover:underline">
              {mode === 'signup' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>

          <p className="text-center text-[11px] text-blueberry/50 mt-4 font-semibold">
            Dữ liệu tài chính của bạn được mã hóa và chỉ bạn có thể xem.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() { setTheme((t) => (t === 'dark' ? 'light' : 'dark')); }

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = fincheckStyles;
    document.head.appendChild(styleTag);
    return () => { document.head.removeChild(styleTag); };
  }, []);

  if (session === undefined) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-ice-cream dark:bg-[#1a1a2e]"><Loader2 size={28} className="animate-spin text-turquoise" /></div>;
  }
  if (!session) return <AuthScreen />;
  return <MainApp user={session.user} theme={theme} toggleTheme={toggleTheme} />;
}