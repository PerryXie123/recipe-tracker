import { useState, type ReactNode } from "react";
import { ActionIcon, Avatar, Box, Button, Drawer, Group, NavLink, Stack, Text, Title, Tooltip, UnstyledButton } from "@mantine/core";
import { Button as AriaButton } from "react-aria-components";
import {
  IconCalculator,
  IconCalendarWeek,
  IconChartPie,
  IconHome,
  IconMenu2,
  IconMoon,
  IconSoup,
  IconStar,
  IconSun,
  IconToolsKitchen2
} from "@tabler/icons-react";
import type { Health } from "../types";
import type { Route } from "../lib/routing";

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
  { route: "favorites", label: "Favorites", icon: IconStar },
  { route: "calendar", label: "Calendar", icon: IconCalendarWeek },
  { route: "tdee", label: "TDEE Calculator", icon: IconCalculator }
];

const routeTitles: Record<Route, { title: string; description: string }> = {
  home: { title: "Dashboard", description: "Your meal and nutrition command center." },
  ingredients: { title: "Ingredients", description: "Manage foods and per-100g nutrition values." },
  meals: { title: "Meals", description: "Build recipes from ingredients and calculate portions." },
  favorites: { title: "Favorites", description: "A focused view of meals you reach for often." },
  calendar: { title: "Calendar", description: "Plan dated weeks from Monday through Sunday." },
  tdee: { title: "TDEE Calculator", description: "Estimate maintenance calories and set your current target." }
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function navigate(route: Route) {
    onNavigate(route);
    setIsMenuOpen(false);
  }

  return (
    <Box className="app-shell">
      <header className="global-header">
        <Group gap={12} wrap="nowrap">
          <ActionIcon variant="default" size="lg" aria-label="Open navigation" onClick={() => setIsMenuOpen(true)}>
            <IconMenu2 size={20} />
          </ActionIcon>
          <UnstyledButton className="brand header-brand" type="button" onClick={() => navigate("home")}>
            <span className="brand-mark">RT</span>
            <span>
              <strong>Recipe Tracker</strong>
              <small>{health?.supabaseConfigured ? "Supabase" : "Demo"}</small>
            </span>
          </UnstyledButton>
        </Group>

        <div className="global-title">
          <Text className="eyebrow">Recipe Tracker</Text>
          <Title order={1}>{routeTitles[route].title}</Title>
          <Text c="dimmed" size="sm">{routeTitles[route].description}</Text>
        </div>

        <Group gap={8} wrap="nowrap">
          <Tooltip label={theme === "dark" ? "Switch to light" : "Switch to dark"}>
            <ActionIcon
              variant="default"
              size="lg"
              type="button"
              onClick={onThemeChange}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
            </ActionIcon>
          </Tooltip>
          <AriaButton className="aria-button header-action" onPress={() => navigate("meals")}>
            New meal
          </AriaButton>
        </Group>
      </header>

      <Drawer
        opened={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Recipe Tracker"
        padding="md"
        size="sm"
      >
        <Stack gap={18}>
          <Stack gap={4} component="nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                active={route === item.route}
                label={item.label}
                leftSection={<item.icon size={18} />}
                onClick={() => navigate(item.route)}
                key={item.route}
                variant="light"
                className="nav-item"
              />
            ))}
          </Stack>

          <Stack gap={10} className="auth-panel">
            {authConfigured ? (
              userEmail ? (
                <>
                  <Group gap={10} wrap="nowrap">
                    <Avatar size={34} radius="sm" color="teal">
                      {(userName || userEmail).slice(0, 1).toUpperCase()}
                    </Avatar>
                    <div className="account-copy">
                      <Text size="xs" fw={800}>{userName || "Signed in"}</Text>
                      <Text c="dimmed" size="xs" truncate>{userEmail}</Text>
                    </div>
                  </Group>
                  <AriaButton className="aria-button sidebar-signout" onPress={onSignOut}>
                    Sign out
                  </AriaButton>
                </>
              ) : (
                <Button size="xs" type="button" loading={isAuthLoading} onClick={onSignIn}>
                  Sign in with Google
                </Button>
              )
            ) : (
              <Text c="dimmed" size="xs">
                {authConfigMessage || "Add Supabase auth env values to enable Google sign-in."}
              </Text>
            )}
          </Stack>
        </Stack>
      </Drawer>

      <Box component="main" className="workspace">{children}</Box>
    </Box>
  );
}
