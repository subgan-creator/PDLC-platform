import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import * as Label from '@radix-ui/react-label';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

/**
 * Always renders a real, programmatically-associated `<label>` — `label`
 * is required, not optional, so a placeholder can never stand in for one
 * (WCAG 2.2 AA 1.3.1 / 4.1.2). `error` is exposed via `aria-describedby`
 * and `aria-invalid`, not color alone.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1">
        <Label.Root htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </Label.Root>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(hintId, errorId) || undefined}
          className={cn(
            'h-10 rounded-md border border-border bg-bg px-3 text-sm text-fg',
            'placeholder:text-muted focus-visible:outline-none',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
