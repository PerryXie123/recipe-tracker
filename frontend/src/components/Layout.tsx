import { type ReactNode, useState } from "react";
import {
  IconCalculator,
  IconCalendarWeek,
  IconChartPie,
  IconHome,
  IconLogout,
  IconMenu2,
  IconMoon,
  IconPalette,
  IconX,
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
  accentColor: string;
  authConfigured: boolean;
  authConfigMessage: string | null;
  isAuthLoading: boolean;
  userEmail: string | null;
  userName: string | null;
  onNavigate: (route: Route) => void;
  onThemeChange: () => void;
  onAccentColorChange: (color: string) => void;
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

const mobileNavItems = navItems.filter((item) => ["home", "meals", "calendar"].includes(item.route));
const accentSwatches = ["#c72d74", "#6d5bd0", "#2774c8", "#198f6a", "#d46b24"];

const routeTitles: Record<Route, { title: string; description: string }> = {
  home: { title: "Dashboard", description: "Plan, build, and track your meals with ease." },
  ingredients: { title: "Ingredients", description: "Manage foods and nutrition values." },
  meals: { title: "Meals", description: "Build recipes from ingredients and calculate portions." },
  favorites: { title: "Favourites", description: "A focused view of meals you reach for often." },
  calendar: { title: "Calendar", description: "Plan dated weeks from Monday through Sunday." },
  tdee: { title: "Nutrition", description: "Estimate maintenance calories and set your current target." }
};

function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getFirstName(userName: string | null, userEmail: string | null) {
  const displayName = userName || userEmail?.split("@")[0] || "";
  return displayName.trim().split(/[\s._-]+/)[0] || "there";
}

export function Layout({
  route,
  health,
  theme,
  accentColor,
  authConfigured,
  authConfigMessage,
  isAuthLoading,
  userEmail,
  userName,
  onNavigate,
  onThemeChange,
  onAccentColorChange,
  onSignIn,
  onSignOut,
  children
}: LayoutProps) {
  const initials = (userName || userEmail || "R").slice(0, 1).toUpperCase();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
  const pageTitle =
    route === "home" ? `${getTimeGreeting()}, ${getFirstName(userName, userEmail)}` : routeTitles[route].title;

  function handleNavigate(nextRoute: Route) {
    onNavigate(nextRoute);
    setIsNavOpen(false);
  }

  return (
    <div className={isNavOpen ? "app-shell nav-open" : "app-shell"}>
      <div className="app-frame">
        <button className="nav-backdrop" type="button" aria-label="Close menu" onClick={() => setIsNavOpen(false)} />
        <aside className="sidebar" aria-label="Plateful navigation">
          <button className="brand sidebar-brand" type="button" onClick={() => handleNavigate("home")}>
            <span className="brand-mark">P</span>
            <strong>Plateful</strong>
          </button>

          <div className="sidebar-section">
            <span className="sidebar-label">Menu</span>
            <nav className="nav-list" aria-label="Primary navigation">
              {navItems.map((item) => (
                <button
                  className={route === item.route ? "nav-item active" : "nav-item"}
                  type="button"
                  onClick={() => handleNavigate(item.route)}
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
            {authConfigured && userEmail ? (
              <div className="sidebar-profile">
                <span className="avatar">{initials}</span>
                <span>
                  <strong>{userName || "Plateful"}</strong>
                  <small>{userEmail}</small>
                </span>
              </div>
            ) : null}
            <button className="nav-item" type="button" aria-pressed={theme === "dark"} onClick={onThemeChange}>
              {theme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <button
              className={isCustomizationOpen ? "nav-item active" : "nav-item"}
              type="button"
              aria-expanded={isCustomizationOpen}
              onClick={() => setIsCustomizationOpen(!isCustomizationOpen)}
            >
              <IconPalette size={18} />
              <span>Customization</span>
            </button>
            {isCustomizationOpen ? (
              <div className="customization-panel">
                <span className="muted small strong">Site colour</span>
                <div className="accent-swatches" aria-label="Preset site colours">
                  {accentSwatches.map((color) => (
                    <button
                      className="accent-swatch"
                      type="button"
                      aria-label={`Use ${color}`}
                      aria-pressed={accentColor.toLowerCase() === color}
                      style={{ backgroundColor: color }}
                      onClick={() => onAccentColorChange(color)}
                      key={color}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <button className="nav-item" type="button" onClick={onSignOut}>
              <IconLogout size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <IconButton
              className="menu-toggle"
              label={isNavOpen ? "Close menu" : "Open menu"}
              pressed={isNavOpen}
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              {isNavOpen ? <IconX size={18} /> : <IconMenu2 size={18} />}
            </IconButton>
            <button className="mobile-header-brand" type="button" onClick={() => handleNavigate("home")}>
              <span className="brand-mark">P</span>
              <strong>Plateful</strong>
            </button>
            <div className="topbar-actions">
              {!userEmail ? (
                <Button size="sm" loading={isAuthLoading} onClick={onSignIn}>
                  Sign in
                </Button>
              ) : null}
            </div>
          </header>

          <div className="page-title-row">
            <div>
              <h1>{pageTitle}</h1>
              <p className="muted">{routeTitles[route].description}</p>
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

        <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
          {mobileNavItems.map((item) => (
            <button
              className={route === item.route ? "mobile-nav-item active" : "mobile-nav-item"}
              type="button"
              aria-current={route === item.route ? "page" : undefined}
              onClick={() => handleNavigate(item.route)}
              key={item.route}
            >
              <item.icon size={22} stroke={route === item.route ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
