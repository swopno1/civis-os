import { useState, useRef, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import './Window.css';
import { Button } from './Button';

export interface WindowProps {
  id: string;
  title: string;
  isActive: boolean;
  isMaximized?: boolean;
  zIndex?: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize?: (id: string) => void;
  onFocus: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
  children: ComponentChildren;
}

export function Window(props: WindowProps) {
  const {
    id,
    title,
    isActive,
    isMaximized,
    zIndex,
    position,
    size,
    onClose,
    onMinimize,
    onMaximize,
    onFocus,
    onMove,
    onResize,
    children
  } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const initialSize = useRef({ width: 0, height: 0 });
  const resizeStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent) => {
    onFocus(id);
    if (isMaximized) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0)
    };
  };

  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(id);
    if (isMaximized) return;

    setIsResizing(true);
    initialSize.current = {
      width: size?.width || 600,
      height: size?.height || 400
    };
    resizeStart.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && onMove) {
        onMove(id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
      } else if (isResizing && onResize) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        onResize(id, initialSize.current.width + deltaX, initialSize.current.height + deltaY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, id, onMove, onResize]);

  const style = {
    zIndex: zIndex ?? 10,
    insetBlockStart: isMaximized ? 0 : (position?.y ?? '10%'),
    insetInlineStart: isMaximized ? 0 : (position?.x ?? '10%'),
    borderRadius: isMaximized ? '0' : undefined,
    transition: (isDragging || isResizing) ? 'none' : 'inset 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, border-radius 0.2s ease-out, z-index 0s',
    width: isMaximized ? '100%' : (size?.width ?? 600),
    height: isMaximized ? 'calc(100% - 48px)' : (size?.height ?? 400),
  };

  return (
    <div 
      className={`civis-window ${isActive ? 'active' : ''} ${isMaximized ? 'maximized' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={style}
      onMouseDown={() => onFocus(id)}
    >
      <div
        className="civis-window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="civis-window-title">{title}</div>
        <div className="civis-window-controls" onMouseDown={e => e.stopPropagation()}>
          <Button variant="secondary" size="small" onClick={() => onMinimize(id)}>-</Button>
          {onMaximize && (
            <Button variant="secondary" size="small" onClick={() => onMaximize(id)}>
              {isMaximized ? '🗗' : '🗖'}
            </Button>
          )}
          <Button variant="danger" size="small" onClick={() => onClose(id)}>X</Button>
        </div>
      </div>
      <div className="civis-window-body">
        {children || <div className="module-loading">Loading module content...</div>}
      </div>
      {!isMaximized && (
        <div
          className="civis-window-resize-handle"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}
