import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'danger';
}

interface ToastContextValue {
  push: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Radix Toast announces additions via `aria-live` automatically (it renders
 * a visually-hidden live region) so screen reader users hear toasts without
 * extra wiring here.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            onOpenChange={(open) => !open && remove(toast.id)}
            className={cn(
              'rounded-md border border-border bg-bg p-4 text-fg shadow-md',
              toast.variant === 'danger' && 'border-danger',
              toast.variant === 'success' && 'border-primary',
            )}
          >
            <RadixToast.Title className="text-sm font-medium">{toast.title}</RadixToast.Title>
            {toast.description && (
              <RadixToast.Description className="text-sm text-muted">
                {toast.description}
              </RadixToast.Description>
            )}
            <RadixToast.Close
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 text-muted"
            />
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 flex w-96 flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
