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

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10);

  const openWindow = useCallback((id: string, title: string, content: ComponentChildren, isModule: boolean = false) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);

      if (existing) {
        // Use focus logic for existing window
        const otherWindows = prev
          .filter(w => w.id !== id)
          .sort((a, b) => a.zIndex - b.zIndex);

        const newWindows = otherWindows.map((w, index) => ({
          ...w,
          zIndex: 10 + index
        }));

        const updatedWindow = {
          ...existing,
          isMinimized: false,
          isOpen: true,
          zIndex: 10 + otherWindows.length,
          content
        };

        const maxZ = 10 + otherWindows.length;
        setMaxZIndex(maxZ);

        return [...newWindows, updatedWindow];
      }

      // Normalize existing z-indices
      const normalizedPrev = prev
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((w, index) => ({
          ...w,
          zIndex: 10 + index
        }));

      const newZ = 10 + normalizedPrev.length;
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

      setMaxZIndex(newZ);
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

      const newWindows = otherWindows.map((w, index) => ({
        ...w,
        zIndex: 10 + index
      }));

      const focusedWindow = {
        ...win,
        isMinimized: false,
        zIndex: 10 + otherWindows.length
      };

      const finalWindows = [...newWindows, focusedWindow];
      const maxZ = 10 + otherWindows.length;
      setMaxZIndex(maxZ);

      return finalWindows;
    });
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;

      // Boundary Enforcement
      const taskbarHeight = 48;
      const headerHeight = 44;
      const minVisible = 100;

      const maxX = window.innerWidth - minVisible;
      const minX = -(w.size?.width ?? 600) + minVisible;
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

      const maxWidth = window.innerWidth;
      const maxHeight = window.innerHeight - taskbarHeight;

      const boundedWidth = Math.max(minWidth, Math.min(width, maxWidth));
      const boundedHeight = Math.max(minHeight, Math.min(height, maxHeight));

      return { ...w, size: { width: boundedWidth, height: boundedHeight } };
    }));
  }, []);

  const hydrateWindows = useCallback((savedWindows: WindowState[]) => {
    setWindows(savedWindows);
    const maxZ = savedWindows.reduce((max, w) => Math.max(max, w.zIndex), 10);
    setMaxZIndex(maxZ);
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
