'use client';
// src/components/layout/AppShell.js
// Universal app shell — persistent 240px sidebar + main content area.
// Pages push contextual sidebar content via SidebarContentCtx.

import { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export const SidebarContentCtx = createContext({ setSidebarContent: () => {} });

export function useSidebarContent(content) {
  const { setSidebarContent } = useContext(SidebarContentCtx);
  // Caller is responsible for stabilising `content` (useMemo / useCallback).
  // We use a layout-effect pattern via regular effect so SSR is safe.
  const [, forceUpdate] = useState(0);
  // Register on first render + whenever content reference changes
  // (useLayoutEffect unavailable in server; guard with typeof)
  if (typeof window !== 'undefined') {
    // Will be called synchronously by the browser on first paint
  }
  return setSidebarContent;
}

// Routes where the sidebar should be hidden entirely (auth pages)
const NO_SIDEBAR_ROUTES = ['/login', '/register'];

// Routes where the sidebar collapses to 56px rail (canvas editor)
function isEditorRoute(pathname) {
  return pathname?.startsWith('/exhibits/') && pathname !== '/exhibits';
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [sidebarContent, setSidebarContent] = useState(null);

  const setContent = useCallback((node) => {
    setSidebarContent(node);
  }, []);

  const noSidebar  = NO_SIDEBAR_ROUTES.includes(pathname);
  const collapsed  = isEditorRoute(pathname);

  return (
    <SidebarContentCtx.Provider value={{ setSidebarContent: setContent }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {!noSidebar && (
          <Sidebar collapsed={collapsed} contextContent={sidebarContent} />
        )}
        <div style={{
          flex:       1,
          minWidth:   0,
          height:     '100vh',
          overflowY:  'auto',
          overflowX:  'hidden',
          background: 'var(--bg)',
        }}>
          {children}
        </div>
      </div>
    </SidebarContentCtx.Provider>
  );
}
