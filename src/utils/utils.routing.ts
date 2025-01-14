import { PLUGIN_BASE_URL, ROUTES } from '../constants';

// Prefixes the route with the base URL of the plugin AND home route clusternavigation
export function prefixRoute(route: string): string {
  return `${PLUGIN_BASE_URL}/${ROUTES.Home}/${route}`;
}
