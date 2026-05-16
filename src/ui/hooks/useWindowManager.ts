import { useState, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: ComponentChildren;
  isModule?: boolean;
}

export type SavedWindowState = Omit<WindowState, 'content'>;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);

  const openWindow = useCallback((id: string, title: string, content: ComponentChildren, isModule: boolean = false) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);

      if (existing) {
        // Use focus logic for existing window
        const otherWindows = prev
          .filter(w => w.id !== id)
          .sort((a, b) => a.zIndex - b.zIndex);

        let newWindows = otherWindows.map((w, index) => ({
          ...w,
          zIndex: 10 + index
        }));

        let newZ = 10 + otherWindows.length;

        // Z-Index Normalization: Reset if too high
        if (newZ > 1000) {
          newWindows = newWindows.map((w, i) => ({ ...w, zIndex: 10 + i }));
          newZ = 10 + newWindows.length;
        }

        const updatedWindow = {
          ...existing,
          isMinimized: false,
          isOpen: true,
          zIndex: newZ,
          content
        };

        return [...newWindows, updatedWindow];
      }

      // Normalize existing z-indices
      let normalizedPrev = prev
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((w, index) => ({
          ...w,
          zIndex: 10 + index
        }));

      let newZ = 10 + normalizedPrev.length;

      // Z-Index Normalization: Reset if too high
      if (newZ > 1000) {
        normalizedPrev = normalizedPrev.map((w, i) => ({ ...w, zIndex: 10 + i }));
        newZ = 10 + normalizedPrev.length;
      }
      const newWindow: WindowState = {
        id,
        title,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: newZ,
        position: { x: 100 + (prev.length * 30), y: 100 + (prev.length * 30) },
        size: { width: 600, height: 400 },
        content,
        isModule,
      };

      return [...normalizedPrev, newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const win = prev.find(w => w.id === id);
      if (!win) return prev;

      // Bring to front and normalize z-indices
      const otherWindows = prev
        .filter(w => w.id !== id)
        .sort((a, b) => a.zIndex - b.zIndex);

      let newWindows = otherWindows.map((w, index) => ({
        ...w,
        zIndex: 10 + index
      }));

      let newZ = 10 + otherWindows.length;

      // Z-Index Normalization: Reset if too high
      if (newZ > 1000) {
        newWindows = newWindows.map((w, i) => ({ ...w, zIndex: 10 + i }));
        newZ = 10 + newWindows.length;
      }

      const focusedWindow = {
        ...win,
        isMinimized: false,
        zIndex: newZ
      };

      const finalWindows = [...newWindows, focusedWindow];

      return finalWindows;
    });
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;

      // Boundary Enforcement
      const taskbarHeight = 48;
      const headerHeight = 44;

      const maxX = window.innerWidth - 100;
      const minX = 0;
      const maxY = window.innerHeight - taskbarHeight - headerHeight;
      const minY = 0;

      const boundedX = Math.max(minX, Math.min(x, maxX));
      const boundedY = Math.max(minY, Math.min(y, maxY));

      return { ...w, position: { x: boundedX, y: boundedY } };
    }));
  }, []);

  const updateWindowSize = useCallback((id: string, width: number, height: number) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;

      const taskbarHeight = 48;
      const minWidth = 200;
      const minHeight = 150;

      // Bound size to viewport
      const maxWidth = window.innerWidth - (w.position?.x ?? 0);
      const maxHeight = window.innerHeight - taskbarHeight - (w.position?.y ?? 0);

      const boundedWidth = Math.max(minWidth, Math.min(width, maxWidth));
      const boundedHeight = Math.max(minHeight, Math.min(height, maxHeight));

      return { ...w, size: { width: boundedWidth, height: boundedHeight } };
    }));
  }, []);

  const hydrateWindows = useCallback((savedWindows: WindowState[]) => {
    setWindows(savedWindows);
  }, []);

  return {
    windows,
    setWindows,
    hydrateWindows,
    openWindow,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
  };
}
