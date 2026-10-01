/* ==============================================================================
   Context dùng chung: ShellContext (giao diện/điều hướng) và DataContext (dữ liệu & hành động). Cung cấp bởi MainApp; màn hình dùng useShell() / useAppData().
   ============================================================================== */
import { createContext, useContext } from 'react';

export const ShellContext = createContext(null);

export const DataContext = createContext(null);

export function useShell() {
  const v = useContext(ShellContext);
  if (!v) throw new Error('useShell phải được dùng bên trong <MainApp>');
  return v;
}

export function useAppData() {
  const v = useContext(DataContext);
  if (!v) throw new Error('useAppData phải được dùng bên trong <MainApp>');
  return v;
}
