import { Window } from './Window.tsx';
import type { WindowState } from '../hooks/useWindowManager.ts';

interface WindowManagerProps {
  windows: WindowState[];
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
}

export function WindowManager({
  windows,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  onResize
}: WindowManagerProps) {
  // Determine which window is active (highest z-index and not minimized)
  const activeWindowId = [...windows]
    .filter(w => w.isOpen && !w.isMinimized)
    .sort((a, b) => b.zIndex - a.zIndex)[0]?.id;

  return (
    <>
      {windows.map(win => win.isOpen && !win.isMinimized && (
        <Window
          key={win.id}
          id={win.id}
          title={win.title}
          isActive={win.id === activeWindowId}
          isMaximized={win.isMaximized}
          zIndex={win.zIndex}
          position={win.position}
          size={win.size}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
          onClose={onClose}
          onFocus={onFocus}
          onMove={onMove}
          onResize={onResize}
        >
          {win.content}
        </Window>
      ))}
    </>
  );
}
