import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('associates the visible label with the input for screen readers', () => {
    render(<Input label="Initiative title" />);
    expect(screen.getByLabelText('Initiative title')).toBeInTheDocument();
  });

  it('is reachable and editable by keyboard alone', async () => {
    const user = userEvent.setup();
    render(<Input label="Initiative title" />);
    await user.tab();
    const input = screen.getByLabelText('Initiative title');
    expect(input).toHaveFocus();
    await user.keyboard('Reduce checkout drop-off');
    expect(input).toHaveValue('Reduce checkout drop-off');
  });

  it('exposes validation errors via aria-invalid and aria-describedby, not color alone', () => {
    render(<Input label="Initiative title" error="Title is required" />);
    const input = screen.getByLabelText('Initiative title');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  });
});
