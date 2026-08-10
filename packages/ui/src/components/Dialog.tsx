import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from './icons';
import { cn } from '../lib/cn';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
}

/**
 * Radix Dialog already provides: focus trap, focus restore on close,
 * Esc-to-close, `aria-modal`, and labelling via `Dialog.Title`/`Description`
 * — this wrapper only supplies visual chrome. `title` is required so every
 * dialog instance is guaranteed an accessible name.
 */
export function Dialog({ open, onOpenChange, title, description, children, trigger }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-bg p-6 text-fg shadow-lg focus:outline-none',
          )}
        >
          <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-muted">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
          <RadixDialog.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-sm text-muted hover:text-fg focus-visible:outline-none"
          >
            <X />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
