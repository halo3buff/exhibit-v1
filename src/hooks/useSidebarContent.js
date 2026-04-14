'use client';
// src/hooks/useSidebarContent.js
// Push contextual content into the global sidebar.
// Call with a stable React node (useMemo) — re-registers whenever node reference changes.

import { useContext, useEffect } from 'react';
import { SidebarContentCtx } from '@/components/layout/AppShell';

export function useSidebarContent(content) {
  const { setSidebarContent } = useContext(SidebarContentCtx);
  useEffect(() => {
    setSidebarContent(content);
    return () => setSidebarContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);
}
