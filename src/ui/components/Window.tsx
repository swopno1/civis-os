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
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize?: (id: string) => void;
  onFocus: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  children: ComponentChildren;
}

export function Window({
  id,
  title,
  isActive,
  isMaximized,
  zIndex,
  position,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onMove,
  children
}: WindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: MouseEvent) => {
    onFocus(id);
    if (isMaximized) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - (position?.x || 0),
      y: e.clientY - (position?.y || 0)
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && onMove) {
        onMove(id, e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, onMove]);

  const style = {
    zIndex: zIndex || 10,
    top: isMaximized ? 0 : (position?.y || '10%'),
    left: isMaximized ? 0 : (position?.x || '10%'),
    width: isMaximized ? '100%' : undefined,
    height: isMaximized ? 'calc(100% - 48px)' : undefined,
    borderRadius: isMaximized ? '0' : undefined,
    transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), z-index 0s',
  };

  return (
    <div 
      className={`civis-window ${isActive ? 'active' : ''} ${isMaximized ? 'maximized' : ''} ${isDragging ? 'dragging' : ''}`}
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
        {children}
      </div>
    </div>
  );
}
