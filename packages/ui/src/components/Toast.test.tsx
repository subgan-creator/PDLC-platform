import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function Trigger() {
  const { push } = useToast();
  return (
    <button type="button" onClick={() => push({ title: 'Story saved', variant: 'success' })}>
      Save
    </button>
  );
}

describe('Toast', () => {
  it('announces a pushed toast (Radix renders an aria-live viewport)', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Story saved')).toBeInTheDocument();
  });
});
