import { inject, provide } from 'vue';
import { usePolicy } from 'dashboard/composables/usePolicy';
import { useRouter } from 'vue-router';

const SidebarControl = Symbol('SidebarControl');

export function useSidebarContext() {
  const context = inject(SidebarControl, null);
  if (context === null) {
    throw new Error(`Component is missing a parent <Sidebar /> component.`);
  }

  const router = useRouter();

  const { shouldShow } = usePolicy();

  const resolvePath = to => {
    if (!to) return '/';
    try {
      return router.resolve(to)?.path || '/';
    } catch {
      return '/';
    }
  };

  // Helper to find route definition by name without resolving
  const findRouteByName = name => {
    const routes = router.getRoutes();
    return routes.find(routeRecord => routeRecord.name === name);
  };

  const resolvePermissions = to => {
    if (!to) return [];

    // If navigationPath param exists, get the target route definition
    if (to.params?.navigationPath) {
      const targetRoute = findRouteByName(to.params.navigationPath);
      return targetRoute?.meta?.permissions ?? [];
    }

    try {
      return router.resolve(to)?.meta?.permissions ?? [];
    } catch {
      return [];
    }
  };

  const resolveFeatureFlag = to => {
    if (!to) return '';

    // If navigationPath param exists, get the target route definition
    if (to.params?.navigationPath) {
      const targetRoute = findRouteByName(to.params.navigationPath);
      return targetRoute?.meta?.featureFlag || '';
    }

    try {
      return router.resolve(to)?.meta?.featureFlag || '';
    } catch {
      return '';
    }
  };

  const resolveInstallationType = to => {
    if (!to) return [];

    // If navigationPath param exists, get the target route definition
    if (to.params?.navigationPath) {
      const targetRoute = findRouteByName(to.params.navigationPath);
      return targetRoute?.meta?.installationTypes || [];
    }

    try {
      return router.resolve(to)?.meta?.installationTypes || [];
    } catch {
      return [];
    }
  };

  const isAllowed = to => {
    const permissions = resolvePermissions(to);
    const featureFlag = resolveFeatureFlag(to);
    const installationType = resolveInstallationType(to);

    return shouldShow(featureFlag, permissions, installationType);
  };

  return {
    ...context,
    resolvePath,
    resolvePermissions,
    resolveFeatureFlag,
    isAllowed,
  };
}

export function provideSidebarContext(context) {
  provide(SidebarControl, context);
}
