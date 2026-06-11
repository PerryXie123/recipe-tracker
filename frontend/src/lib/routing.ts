export type Route = "home" | "ingredients" | "meals" | "favorites";

export function getRouteFromPath(pathname: string): Route {
  if (pathname.startsWith("/ingredients")) {
    return "ingredients";
  }

  if (pathname.startsWith("/meals")) {
    return "meals";
  }

  if (pathname.startsWith("/favorites")) {
    return "favorites";
  }

  return "home";
}

export function getPathForRoute(route: Route) {
  return route === "home" ? "/" : `/${route}`;
}
