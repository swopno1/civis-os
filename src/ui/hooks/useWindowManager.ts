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
}

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10);

  const openWindow = useCallback((id: string, title: string, content: ComponentChildren) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === id);
      if (existing) {
        const newZ = maxZIndex + 1;
        setMaxZIndex(newZ);
        return prev.map(w => w.id === id ? { ...w, isMinimized: false, isOpen: true, zIndex: newZ } : w);
      }
      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);
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
      };
      return [...prev, newWindow];
    });
  }, [maxZIndex]);

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
      if (!win || win.zIndex === maxZIndex) return prev;

      const newZ = maxZIndex + 1;
      setMaxZIndex(newZ);
      return prev.map(w => w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w);
    });
  }, [maxZIndex]);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x, y } } : w));
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    toggleMinimize,
    toggleMaximize,
    focusWindow,
    updateWindowPosition,
  };
}
