import { useRef } from 'react';

interface PinInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  accent?: string;
  autoFocus?: boolean;
}

export default function PinInput({ value, onChange, disabled, accent = '#10b981', autoFocus }: PinInputProps) {
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
      {refs.map((ref, i) => (
        <input
          key={i}
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ''}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            const next = [...value];
            next[i] = val;
            onChange(next);
            if (val && i < 3) refs[i + 1]?.current?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              refs[i - 1]?.current?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            if (pasted) {
              const next = pasted.split('').concat(Array(4).fill('')).slice(0, 4);
              onChange(next);
              const focusIdx = Math.min(pasted.length, 3);
              refs[focusIdx]?.current?.focus();
            }
          }}
          style={{
            width: '56px',
            height: '60px',
            background: disabled ? '#f1f5f9' : '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            color: '#1e293b',
            fontSize: '24px',
            fontWeight: 700,
            textAlign: 'center',
            outline: 'none',
            caretColor: accent,
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.target.style.borderColor = accent; }}
          onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
        />
      ))}
    </div>
  );
}
