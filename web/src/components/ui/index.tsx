'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeMode, type ThemeMode } from '@/store/theme';

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconPosition = 'left',
     className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:   'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 shadow-sm focus-visible:outline-sky-500',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:active:bg-slate-600',
      ghost:     'text-slate-600 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:active:bg-slate-700',
      danger:    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
      outline:   'border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          iconPosition === 'left' && icon
        )}
        {children}
        {!loading && iconPosition === 'right' && icon}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, wrapperClassName, className, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full h-10 rounded-xl border text-sm transition-colors',
              'bg-white placeholder:text-slate-400 text-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:text-slate-100',
              'focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
              error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
              leftIcon ? 'pl-9' : 'pl-3',
              rightIcon ? 'pr-9' : 'pr-3',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, wrapperClassName, className, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
        {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
        <textarea
          ref={ref}
          className={clsx(
            'w-full rounded-xl border text-sm transition-colors resize-none p-3',
            'bg-white placeholder:text-slate-400 text-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:text-slate-100',
            'focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
            error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, padding = 'md', className, children, ...props }, ref) => {
    const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6', none: '' };
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-white rounded-2xl border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-800',
          paddings[padding],
          hover && 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'sm', className, children, ...props }) => {
  const variants = {
    default:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    primary:  'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    success:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning:  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    danger:   'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300',
    outline:  'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
  };
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-2.5 py-1' };

  return (
    <span className={clsx('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md', className
}) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <span
      className={clsx(
        'inline-block border-2 border-sky-200 border-t-sky-500 dark:border-sky-900 dark:border-t-sky-400 rounded-full animate-spin',
        sizes[size], className
      )}
    />
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    {icon && <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-2xl mb-1">{icon}</div>}
    <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
    {description && <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, max = 100, color = 'blue', size = 'md', showLabel, className
}) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colors = {
    blue:  'bg-sky-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red:   'bg-red-500',
  };
  const heights = { sm: 'h-1.5', md: 'h-2.5' };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden', heights[size])}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', colors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8 text-right">{pct}%</span>}
    </div>
  );
};

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, wrapperClassName, options, className, ...props }) => (
  <div className={clsx('flex flex-col gap-1.5', wrapperClassName)}>
    {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <select
      className={clsx(
        'w-full h-10 rounded-xl border text-sm px-3 bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500',
        error ? 'border-red-400' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
        className
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled }) => (
  <label className={clsx('flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative w-10 h-6 rounded-full transition-colors duration-200',
        checked ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'
      )}
    >
      <span
        className={clsx(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
    {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
  </label>
);

// ─── Theme Switch ─────────────────────────────────────────────────────────────
// Açık/Koyu/Sistem — 3'lü segment control. Simge tabanlı (dil bağımsız),
// bkz. src/store/theme.tsx. aria-label'lar bilinçli olarak İngilizce bırakıldı:
// bu genel bir UI primitive'i, merkezi 9 dilli sözlüğe (lib/i18n.tsx) burada
// dokunmuyoruz (Sidebar.tsx'teki "yerel çeviri" deseniyle aynı gerekçe).
const THEME_SWITCH_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export const ThemeSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, setMode } = useThemeMode();
  return (
    <div className={clsx('inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800', className)}>
      {THEME_SWITCH_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-label={label}
          title={label}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            mode === value
              ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
};
