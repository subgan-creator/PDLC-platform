import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  const options = [
    { value: 'discovery', label: 'Discovery' },
    { value: 'definition', label: 'Definition' },
  ];

  it('labels the trigger for assistive tech', () => {
    render(<Select label="Phase" options={options} name="phase" />);
    expect(screen.getByRole('combobox', { name: 'Phase' })).toBeInTheDocument();
  });

  it('opens with the keyboard and reports the selected value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select label="Phase" options={options} name="phase" onValueChange={onValueChange} />);

    await user.tab();
    const trigger = screen.getByRole('combobox', { name: 'Phase' });
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    const option = await screen.findByRole('option', { name: 'Definition' });
    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith('definition');
  });
});
