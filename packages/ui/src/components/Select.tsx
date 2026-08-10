import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from './icons';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Wraps Radix Select, which already implements the full listbox keyboard
 * pattern (Arrow keys, Home/End, type-ahead, Esc to close) and manages
 * focus. We only add the visible label + trigger/content styling.
 */
export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  disabled,
  name,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-fg" id={`${name ?? label}-label`}>
        {label}
      </span>
      <RadixSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <RadixSelect.Trigger
          aria-labelledby={`${name ?? label}-label`}
          className={cn(
            'flex h-10 items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg',
            'focus-visible:outline-none data-[placeholder]:text-muted',
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="overflow-hidden rounded-md border border-border bg-bg text-fg shadow-md"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex h-9 select-none items-center rounded-sm px-6 text-sm outline-none',
                    'data-[highlighted]:bg-primary data-[highlighted]:text-primary-fg',
                  )}
                >
                  <RadixSelect.ItemIndicator className="absolute left-1.5 inline-flex">
                    <Check />
                  </RadixSelect.ItemIndicator>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
