'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from 'lucide-react';

// ==========================================
// FormField — Enhanced form field with validation UX
// ==========================================

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showSuccessState?: boolean;
  isValid?: boolean;
  charCount?: { current: number; max: number };
  icon?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, showSuccessState, isValid, charCount, icon, className, id, required, ...props }, ref) => {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    const hasError = !!error;
    const showSuccess = showSuccessState && isValid && !hasError;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor={fieldId}
            className={cn(
              hasError && 'text-destructive',
              showSuccess && 'text-green-600 dark:text-green-400'
            )}
          >
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          {charCount && (
            <span
              className={cn(
                'text-xs tabular-nums',
                charCount.current > charCount.max
                  ? 'text-destructive font-medium'
                  : charCount.current > charCount.max * 0.9
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
              )}
            >
              {charCount.current}/{charCount.max}
            </span>
          )}
        </div>

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            id={fieldId}
            className={cn(
              icon && 'pl-10',
              hasError && 'border-destructive focus-visible:ring-destructive/30',
              showSuccess && 'border-green-500 focus-visible:ring-green-500/30',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(hasError && errorId, hint && hintId)}
            required={required}
            {...props}
          />
          {/* Status icon */}
          {(hasError || showSuccess) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : showSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}
        </div>

        {/* Error message with animation */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !hasError && (
          <p id={hintId} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0" />
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// ==========================================
// PasswordField — Password input with toggle & strength
// ==========================================

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showStrength?: boolean;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, showStrength, className, id, required, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;
    const hasError = !!error;
    const passwordValue = typeof value === 'string' ? value : '';

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className={cn(hasError && 'text-destructive')}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>

        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'pr-20',
              hasError && 'border-destructive focus-visible:ring-destructive/30',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={cn(hasError && errorId, hint && hintId)}
            required={required}
            value={value}
            onChange={onChange}
            {...props}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>

        {hasError && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in duration-200"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {hint && !hasError && (
          <p id={hintId} className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0" />
            {hint}
          </p>
        )}

        {showStrength && passwordValue.length > 0 && (
          <PasswordStrengthIndicator password={passwordValue} />
        )}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

// ==========================================
// PasswordStrengthIndicator
// ==========================================

interface PasswordStrengthIndicatorProps {
  password: string;
}

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  checks: { label: string; met: boolean }[];
} {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  if (score <= 1) return { score, label: 'Very Weak', color: 'text-red-500', bgColor: 'bg-red-500', checks };
  if (score === 2) return { score, label: 'Weak', color: 'text-orange-500', bgColor: 'bg-orange-500', checks };
  if (score === 3) return { score, label: 'Fair', color: 'text-amber-500', bgColor: 'bg-amber-500', checks };
  if (score === 4) return { score, label: 'Strong', color: 'text-green-500', bgColor: 'bg-green-500', checks };
  return { score, label: 'Very Strong', color: 'text-emerald-500', bgColor: 'bg-emerald-500', checks };
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, color, bgColor, checks } = getPasswordStrength(password);

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Strength bar */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              i < score ? bgColor : 'bg-muted'
            )}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={cn('text-xs font-medium', color)}>{label}</span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-1">
        {checks.map(({ label: checkLabel, met }) => (
          <div key={checkLabel} className="flex items-center gap-1.5">
            <div
              className={cn(
                'h-3 w-3 rounded-full flex items-center justify-center transition-colors duration-200',
                met ? 'bg-green-500 text-white' : 'bg-muted'
              )}
            >
              {met && (
                <svg className="h-2 w-2" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
            <span className={cn('text-xs', met ? 'text-muted-foreground line-through' : 'text-muted-foreground')}>
              {checkLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// FormErrorSummary — Accessible error summary
// ==========================================

interface FormErrorSummaryProps {
  errors: Record<string, { message?: string }>;
  className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  const errorEntries = Object.entries(errors).filter(([_, v]) => v?.message);

  if (errorEntries.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/5 p-3 animate-in fade-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          Please fix {errorEntries.length} {errorEntries.length === 1 ? 'error' : 'errors'} below
        </p>
      </div>
      <ul className="space-y-1 pl-6">
        {errorEntries.map(([field, error]) => (
          <li key={field} className="text-xs text-destructive list-disc">
            {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// FormSuccess — Success message
// ==========================================

interface FormSuccessProps {
  message: string;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  return (
    <div
      role="status"
      className={cn(
        'rounded-lg border border-green-500/50 bg-green-500/5 p-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
      <p className="text-sm text-green-700 dark:text-green-400">{message}</p>
    </div>
  );
}
