import type { ComponentChildren } from 'preact';
import './Card.css';

export interface CardProps {
  children: ComponentChildren;
  title?: string;
  subtitle?: string;
  footer?: ComponentChildren;
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  title,
  subtitle,
  footer,
  className = '',
  onClick
}: CardProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={`civis-card ${isClickable ? 'clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="civis-card-header">
          {title && <h3 className="civis-card-title">{title}</h3>}
          {subtitle && <p className="civis-card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="civis-card-body">
        {children}
      </div>
      {footer && (
        <div className="civis-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}
