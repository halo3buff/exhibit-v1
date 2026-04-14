'use client';
// src/components/layout/AppShell.js
// Universal app shell — fixed top nav + full-width content area.
// SidebarContentCtx kept as a no-op so legacy useSidebarContent calls are harmless.

import { createContext } from 'react';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';

export const SidebarContentCtx = createContext({ setSidebarContent: () => {} });

const NO_NAV_ROUTES = ['/login', '/register'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const noNav    = NO_NAV_ROUTES.includes(pathname);

  return (
    <SidebarContentCtx.Provider value={{ setSidebarContent: () => {} }}>
      {!noNav && <TopNav />}
      <div style={{
        paddingTop: noNav ? 0 : 44,
        minHeight:  '100vh',
        background: 'var(--bg)',
      }}>
        {children}
      </div>
    </SidebarContentCtx.Provider>
  );
}
