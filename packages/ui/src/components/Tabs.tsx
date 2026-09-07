import * as RadixTabs from '@radix-ui/react-tabs';
import { Fragment, type ReactNode } from 'react';
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
  /**
   * 'underline' (default) is the standard flat tab strip — correct for
   * ordinary tabbed content (e.g. an entity's detail sub-sections). Use
   * 'stepper' only for a page that's genuinely a sequential workflow
   * (e.g. Discovery Hub's Sources -> Evidence -> Insights ->
   * Opportunities) — numbered, connected steps instead of plain labels,
   * so the pipeline shape is visible instead of reading as unrelated
   * tabs. Steps stay freely clickable either way (this app doesn't lock
   * users into a linear wizard) — 'stepper' only changes the visual,
   * not the interaction model; same Radix Tabs primitives underneath,
   * so keyboard/ARIA behavior is identical between variants.
   */
  variant?: 'underline' | 'stepper';
}

/**
 * Radix Tabs implements the WAI-ARIA tabs pattern (Arrow-key roving tabindex,
 * Home/End) out of the box. `aria-label` is required on the list so screen
 * reader users get an accessible name for the tablist, not just "tab, tab, tab".
 */
export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = 'underline',
  ...props
}: TabsProps) {
  return (
    <RadixTabs.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className="flex flex-col gap-3"
    >
      <RadixTabs.List
        aria-label={props['aria-label']}
        className={variant === 'stepper' ? 'flex items-start' : 'flex gap-1 border-b border-border'}
      >
        {items.map((item, index) => (
          <Fragment key={item.value}>
            {variant === 'stepper' && index > 0 && (
              <div className="mt-4 h-px flex-1 bg-border" aria-hidden="true" />
            )}
            <RadixTabs.Trigger
              value={item.value}
              disabled={item.disabled}
              className={
                variant === 'stepper'
                  ? cn(
                      'group flex shrink-0 flex-col items-center gap-1.5 px-1 text-center',
                      'focus-visible:outline-none disabled:opacity-50',
                    )
                  : cn(
                      'px-3 py-2 text-sm font-medium text-muted',
                      'data-[state=active]:text-fg data-[state=active]:border-b-2 data-[state=active]:border-primary',
                      'focus-visible:outline-none disabled:opacity-50',
                    )
              }
            >
              {variant === 'stepper' ? (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-semibold text-muted',
                      'group-data-[state=active]:border-primary group-data-[state=active]:bg-primary group-data-[state=active]:text-white',
                      'group-focus-visible:ring-2 group-focus-visible:ring-focus group-focus-visible:ring-offset-2',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="whitespace-nowrap text-xs font-medium text-muted group-data-[state=active]:font-semibold group-data-[state=active]:text-fg">
                    {item.label}
                  </span>
                </>
              ) : (
                item.label
              )}
            </RadixTabs.Trigger>
          </Fragment>
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
