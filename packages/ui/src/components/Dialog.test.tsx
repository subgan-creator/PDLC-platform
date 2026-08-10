import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('exposes an accessible name via the required title and auto-focuses the first focusable child', async () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Delete initiative">
        <button type="button">Confirm</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Delete initiative' });
    expect(dialog).toBeInTheDocument();

    // Radix Dialog moves focus into the content on open — onto the first
    // focusable descendant (our "Confirm" button, which comes before the
    // Close button in DOM order), asynchronously via an effect.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus());
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Delete initiative">
        <button type="button">Confirm</button>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
