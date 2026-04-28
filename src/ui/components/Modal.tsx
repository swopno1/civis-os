import type { ComponentChildren } from 'preact';
import './Modal.css';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
}

export function Modal({ isOpen, title, onClose, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="civis-modal-overlay" onClick={onClose}>
      <div className="civis-modal-container" onClick={e => e.stopPropagation()}>
        <div className="civis-modal-header">
          <h3 className="civis-modal-title">{title}</h3>
          <button className="civis-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="civis-modal-body">
          {children}
        </div>
        {footer && (
          <div className="civis-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
