import type { ComponentChildren } from 'preact';
import './Window.css';
import { Button } from './Button';

export interface WindowProps {
  id: string;
  title: string;
  isActive: boolean;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  children: ComponentChildren;
}

export function Window({
  id,
  title,
  isActive,
  onClose,
  onMinimize,
  onFocus,
  children
}: WindowProps) {
  return (
    <div 
      className={`civis-window ${isActive ? 'active' : ''}`}
      onMouseDown={() => onFocus(id)}
    >
      <div className="civis-window-header">
        <div className="civis-window-title">{title}</div>
        <div className="civis-window-controls">
          <Button variant="secondary" size="small" onClick={() => onMinimize(id)}>-</Button>
          <Button variant="danger" size="small" onClick={() => onClose(id)}>X</Button>
        </div>
      </div>
      <div className="civis-window-body">
        {children}
      </div>
    </div>
  );
}
