export type Route = "home" | "ingredients" | "meals" | "favorites" | "calendar" | "tdee";

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

  if (pathname.startsWith("/calendar")) {
    return "calendar";
  }

  if (pathname.startsWith("/tdee")) {
    return "tdee";
  }

  return "home";
}

export function getPathForRoute(route: Route) {
  return route === "home" ? "/" : `/${route}`;
}
