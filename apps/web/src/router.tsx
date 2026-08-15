import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppShell } from './layout/AppShell';
import { MyDayPage } from './pages/MyDayPage';
import { InitiativeListPage } from './pages/initiatives/InitiativeListPage';
import { InitiativeDetailPage } from './pages/initiatives/InitiativeDetailPage';
import { RoadmapPage } from './pages/initiatives/RoadmapPage';

const rootRoute = createRootRoute({ component: AppShell });

const myDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MyDayPage,
});

const initiativesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/initiatives',
  component: InitiativeListPage,
});

const initiativeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/initiatives/$initiativeId',
  component: InitiativeDetailPage,
});

const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roadmap',
  component: RoadmapPage,
});

const routeTree = rootRoute.addChildren([
  myDayRoute,
  initiativesRoute,
  initiativeDetailRoute,
  roadmapRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
