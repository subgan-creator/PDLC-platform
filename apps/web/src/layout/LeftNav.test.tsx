import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { AuthProvider } from '../auth/auth-context';
import { LeftNav } from './LeftNav';

describe('LeftNav', () => {
  it('renders a labeled navigation landmark with the My Day link', async () => {
    const rootRoute = createRootRoute({ component: LeftNav });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => null,
    });
    const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) });

    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    );

    expect(await screen.findByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Day' })).toBeInTheDocument();
  });
});
