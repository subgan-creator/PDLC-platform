import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  'aria-label': string;
}

/**
 * Radix Tabs implements the WAI-ARIA tabs pattern (Arrow-key roving tabindex,
 * Home/End) out of the box. `aria-label` is required on the list so screen
 * reader users get an accessible name for the tablist, not just "tab, tab, tab".
 */
export function Tabs({ items, defaultValue, value, onValueChange, ...props }: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className="flex flex-col gap-3"
    >
      <RadixTabs.List
        aria-label={props['aria-label']}
        className="flex gap-1 border-b border-border"
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'px-3 py-2 text-sm font-medium text-muted',
              'data-[state=active]:text-fg data-[state=active]:border-b-2 data-[state=active]:border-primary',
              'focus-visible:outline-none disabled:opacity-50',
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:outline-none"
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
