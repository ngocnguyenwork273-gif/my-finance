/* ==============================================================================
   Điểm vào: chọn giữa màn đăng nhập và ứng dụng chính, gắn Toast/Confirm toàn cục.
   ============================================================================== */
import { useEffect, useState } from 'react';
import { MainApp } from './MainApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmHost, ToastHost } from './feedback';
import { Loader2 } from './icons';
import { AuthScreen } from './screens/AuthScreen';
import { supabase } from './supabaseClient';

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
    supabase.auth.getSession()
      .then(({ data }) => setSession(data?.session ?? null))
      .catch((err) => { console.error('getSession failed:', err); setSession(null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() { setTheme((t) => (t === 'dark' ? 'light' : 'dark')); }

  let content;
  if (session === undefined) {
    content = <div className="min-h-[100dvh] flex items-center justify-center bg-ice-cream dark:bg-[#1a1a2e]"><Loader2 size={28} className="animate-spin text-turquoise" /></div>;
  } else if (!session) {
    content = <AuthScreen />;
  } else {
    content = <MainApp user={session.user} theme={theme} toggleTheme={toggleTheme} />;
  }
  return <ErrorBoundary><ToastHost /><ConfirmHost />{content}</ErrorBoundary>;
}
