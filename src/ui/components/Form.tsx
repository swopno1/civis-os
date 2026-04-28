import type { ComponentChildren } from 'preact';
import './Form.css';

export interface FormProps {
  onSubmit: (e: Event) => void;
  children: ComponentChildren;
  title?: string;
  className?: string;
}

export function Form({ onSubmit, children, title, className = '' }: FormProps) {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form className={`civis-form ${className}`} onSubmit={handleSubmit}>
      {title && <h4 className="civis-form-title">{title}</h4>}
      <div className="civis-form-content">
        {children}
      </div>
    </form>
  );
}
