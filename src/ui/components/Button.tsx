import type { ComponentChildren } from 'preact';
import './Button.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: MouseEvent) => void;
  children: ComponentChildren;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function Button({ 
  variant = 'primary', 
  size = 'medium',
  type = 'button',
  onClick, 
  children, 
  className = '', 
  disabled = false,
  title
}: ButtonProps) {
  return (
    <button 
      type={type}
      className={`civis-btn civis-btn-${variant} civis-btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
