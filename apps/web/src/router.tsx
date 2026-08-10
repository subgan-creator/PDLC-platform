import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './layout/AppShell';
import { MyDayPage } from './pages/MyDayPage';

const rootRoute = createRootRoute({ component: AppShell });

const myDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MyDayPage,
});

const routeTree = rootRoute.addChildren([myDayRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
