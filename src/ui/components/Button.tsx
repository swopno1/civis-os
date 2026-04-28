import type { ComponentChildren } from 'preact';
import './Button.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  children: ComponentChildren;
  className?: string;
  disabled?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'medium', 
  onClick, 
  children, 
  className = '', 
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      className={`civis-btn civis-btn-${variant} civis-btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
