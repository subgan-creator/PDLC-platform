import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './auth-context';
import { DevIdentityGate } from './DevIdentityGate';
import * as devIdentitiesApi from './dev-identities-api';

describe('DevIdentityGate', () => {
  it('blocks the app behind a "Who are you?" picker until a user is chosen', async () => {
    vi.spyOn(devIdentitiesApi, 'listDevIdentities').mockResolvedValue([
      {
        tenantId: 'tenant-1',
        tenantName: 'Acme Bank',
        userId: 'user-1',
        displayName: 'Priya Patel',
        email: 'priya@acmebank.example',
        persona: 'PRODUCT_MANAGER',
      },
    ]);

    render(
      <AuthProvider>
        <DevIdentityGate>
          <p>Protected app content</p>
        </DevIdentityGate>
      </AuthProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Who are you?' })).toBeInTheDocument();
    expect(screen.queryByText('Protected app content')).not.toBeInTheDocument();

    const user = userEvent.setup();
    const option = await screen.findByRole('button', { name: /Priya Patel/ });
    await user.click(option);

    expect(await screen.findByText('Protected app content')).toBeInTheDocument();
  });
});
