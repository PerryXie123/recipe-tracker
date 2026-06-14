import { type ReactNode } from "react";
import {
  IconCalculator,
  IconCalendarWeek,
  IconChartPie,
  IconHome,
  IconLogout,
  IconMoon,
  IconSoup,
  IconStar,
  IconSun,
  IconToolsKitchen2,
  IconUsers
} from "@tabler/icons-react";
import type { Health } from "../types";
import type { Route } from "../lib/routing";
import { Button, IconButton } from "./ui";

type LayoutProps = {
  route: Route;
  health: Health | null;
  theme: "light" | "dark";
  authConfigured: boolean;
  authConfigMessage: string | null;
  isAuthLoading: boolean;
  userEmail: string | null;
  userName: string | null;
  onNavigate: (route: Route) => void;
  onThemeChange: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  children: ReactNode;
};

const navItems: Array<{ route: Route; label: string; icon: typeof IconHome }> = [
  { route: "home", label: "Dashboard", icon: IconChartPie },
  { route: "ingredients", label: "Ingredients", icon: IconToolsKitchen2 },
  { route: "meals", label: "Meals", icon: IconSoup },
  { route: "favorites", label: "Favourites", icon: IconStar },
  { route: "calendar", label: "Calendar", icon: IconCalendarWeek },
  { route: "tdee", label: "Nutrition", icon: IconCalculator }
];

const routeTitles: Record<Route, { title: string; description: string }> = {
  home: { title: "Dashboard", description: "Plan, build, and track your meals with ease." },
  ingredients: { title: "Ingredients", description: "Manage foods and nutrition values." },
  meals: { title: "Meals", description: "Build recipes from ingredients and calculate portions." },
  favorites: { title: "Favourites", description: "A focused view of meals you reach for often." },
  calendar: { title: "Calendar", description: "Plan dated weeks from Monday through Sunday." },
  tdee: { title: "Nutrition", description: "Estimate maintenance calories and set your current target." }
};

export function Layout({
  route,
  health,
  theme,
  authConfigured,
  authConfigMessage,
  isAuthLoading,
  userEmail,
  userName,
  onNavigate,
  onThemeChange,
  onSignIn,
  onSignOut,
  children
}: LayoutProps) {
  const initials = (userName || userEmail || "R").slice(0, 1).toUpperCase();

  return (
    <div className="app-shell">
      <div className="app-frame">
        <aside className="sidebar" aria-label="Recipe Tracker navigation">
          <button className="brand sidebar-brand" type="button" onClick={() => onNavigate("home")}>
            <span className="brand-mark">R</span>
            <strong>Recipe Tracker</strong>
          </button>

          <div className="sidebar-section">
            <span className="sidebar-label">Menu</span>
            <nav className="nav-list" aria-label="Primary navigation">
              {navItems.map((item) => (
                <button
                  className={route === item.route ? "nav-item active" : "nav-item"}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  key={item.route}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-section general-section">
            <span className="sidebar-label">Account</span>
            <button className="nav-item" type="button" onClick={onSignOut}>
              <IconLogout size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-actions">
              <IconButton
                label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                pressed={theme === "dark"}
                onClick={onThemeChange}
              >
                {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
              </IconButton>
              {authConfigured && userEmail ? (
                <div className="profile-chip">
                  <span className="avatar">{initials}</span>
                  <span>
                    <strong>{userName || "Recipe Tracker"}</strong>
                    <small>{userEmail}</small>
                  </span>
                </div>
              ) : (
                <Button size="sm" loading={isAuthLoading} onClick={onSignIn}>
                  Sign in
                </Button>
              )}
            </div>
          </header>

          <div className="page-title-row">
            <div>
              <h1>{routeTitles[route].title}</h1>
              <p className="muted">{routeTitles[route].description}</p>
            </div>
            <div className="inline-actions">
              <Button onClick={() => onNavigate("meals")}>Add Meal</Button>
              <Button variant="secondary" onClick={() => onNavigate("ingredients")}>Add Ingredient</Button>
            </div>
          </div>

          {!authConfigured && authConfigMessage ? (
            <div className="auth-banner">
              <IconUsers size={16} />
              <span>{authConfigMessage}</span>
            </div>
          ) : null}

          <main className="workspace" data-store={health?.supabaseConfigured ? "supabase" : "demo"}>{children}</main>
        </div>
      </div>
    </div>
  );
}
