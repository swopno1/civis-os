import type { ComponentChildren } from 'preact';
import './Button.css';

interface ButtonProps {
  children: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  size?: 'small' | 'medium' | 'large';
  id?: string;
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
  size = 'medium',
  id,
  className = '', 
  title,
  disabled = false,
  type = 'button',
  style
}: ButtonProps) {
  return (
    <button
      id={id}
      type={type}
      className={`civis-btn civis-btn-${variant} civis-btn-${size} ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
