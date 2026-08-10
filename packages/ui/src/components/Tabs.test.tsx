import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  const items = [
    { value: 'overview', label: 'Overview', content: <p>Overview content</p> },
    { value: 'raid', label: 'RAID', content: <p>RAID content</p> },
  ];

  it('labels the tablist for assistive tech', () => {
    render(<Tabs items={items} aria-label="Initiative sections" />);
    expect(screen.getByRole('tablist', { name: 'Initiative sections' })).toBeInTheDocument();
  });

  it('moves selection with arrow keys (roving tabindex pattern)', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} aria-label="Initiative sections" />);

    await user.tab();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'RAID' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'RAID' })).toHaveAttribute('aria-selected', 'true');
  });
});
