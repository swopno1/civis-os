import './Input.css';

export interface InputProps {
  label?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  className = '',
  disabled = false
}: InputProps) {
  return (
    <div className={`civis-input-wrapper ${className}`}>
      {label && <label className="civis-input-label">{label}</label>}
      <input
        type={type}
        className={`civis-input ${error ? 'civis-input-error' : ''}`}
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && <span className="civis-input-error-text">{error}</span>}
    </div>
  );
}
