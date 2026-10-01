/* ==============================================================================
   Màn đăng nhập / đăng ký.
   ============================================================================== */
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail } from '../icons';
import { supabase } from '../supabaseClient';

const AUTH_BG_DESKTOP = 'images/hk.jpg'; // Set your desktop background image URL here

const AUTH_BG_MOBILE = 'images/hk2.jpg';   // Set your mobile background image URL here

export function AuthScreen() {
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !loading) handleSubmit();
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
                onKeyDown={handleKeyDown}
                placeholder="Email của bạn" autoCapitalize="none"
                className={`${fieldClass} pl-11 pr-5`}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blueberry/50 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
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
            Dữ liệu tài chính được bảo vệ và chỉ tài khoản của bạn truy cập được.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
