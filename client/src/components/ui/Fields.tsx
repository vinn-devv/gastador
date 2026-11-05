import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { parseMoney, toDecimalString } from '../../domain/money';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, hint, error, htmlFor, children, className = '' }: FieldShellProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-err`} role="alert" className="errtext">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  fieldClassName?: string;
}

export function TextField({ label, hint, error, fieldClassName, ...props }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id} className={fieldClassName}>
      <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...props} />
    </FieldShell>
  );
}

interface MoneyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
  large?: boolean;
  placeholder?: string;
  fieldClassName?: string;
}

export function MoneyField({ label, value, onChange, error, hint, autoFocus, large, placeholder = '0.00', fieldClassName }: MoneyFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id} className={fieldClassName}>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-muted ${large ? 'text-2xl' : 'text-base'}`} aria-hidden>
          ₱
        </span>
        <input
          id={id}
          className={`input num ${large ? 'min-h-[64px] pl-10 text-3xl font-semibold' : 'pl-9'}`}
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        />
      </div>
    </FieldShell>
  );
}

export function centavosToInput(value: number): string {
  return value === 0 ? '' : toDecimalString(value);
}

export function inputToCentavos(value: string): number | null {
  return parseMoney(value);
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  fieldClassName?: string;
}

export function SelectField({ label, hint, error, children, fieldClassName, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={id} className={fieldClassName}>
      <select id={id} className="input" aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
  fieldClassName?: string;
}

export function TextAreaField({ label, error, fieldClassName, ...props }: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} htmlFor={id} className={fieldClassName}>
      <textarea id={id} className="input min-h-[88px] py-3" rows={3} aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

interface ToggleProps {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  const id = useId();
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50 ${checked ? 'border-primary bg-primary' : 'border-line bg-sunken'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-all duration-200 ease-out ${checked ? 'left-[1.625rem] bg-onprimary' : 'left-0.5 bg-surface ring-1 ring-line'}`} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
  wrap?: boolean;
}

export function ChipGroup<T extends string>({ label, options, value, onChange, error, wrap = true }: ChipGroupProps<T>) {
  const id = useId();
  return (
    <div className="mb-4" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="label">
        {label}
      </span>
      <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto pb-1'}`}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="chip" onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="errtext">
          {error}
        </p>
      )}
    </div>
  );
}
