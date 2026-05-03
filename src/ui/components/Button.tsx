import type { ComponentChildren } from 'preact';
import './Button.css';

interface ButtonProps {
  children: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  className?: string;
  title?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: any;
}

export function Button({ 
  children, 
  onClick,
  variant = 'secondary',
  className = '', 
  title,
  disabled = false,
  type = 'button',
  style
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`civis-button civis-button--${variant} ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
