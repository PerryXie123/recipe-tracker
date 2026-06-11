import type { ReactNode } from "react";
import { ActionIcon, Box, Group, NavLink, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import type { Health } from "../types";
import type { Route } from "../lib/routing";

type LayoutProps = {
  route: Route;
  health: Health | null;
  theme: "light" | "dark";
  onNavigate: (route: Route) => void;
  onThemeChange: () => void;
  children: ReactNode;
};

const navItems: Array<{ route: Route; label: string }> = [
  { route: "home", label: "Home" },
  { route: "ingredients", label: "Ingredients" },
  { route: "meals", label: "Meals" },
  { route: "favorites", label: "Favorites" }
];

export function Layout({ route, health, theme, onNavigate, onThemeChange, children }: LayoutProps) {
  return (
    <Box className="app-shell">
      <Box component="aside" className="sidebar">
        <Group justify="space-between" align="center" wrap="nowrap">
          <UnstyledButton className="brand" type="button" onClick={() => onNavigate("home")}>
          <span className="brand-mark">RT</span>
          <span>
            <strong>Recipe Tracker</strong>
            <small>{health?.supabaseConfigured ? "Supabase" : "Demo"}</small>
          </span>
          </UnstyledButton>

          <Tooltip label={theme === "dark" ? "Switch to light" : "Switch to dark"}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              type="button"
              onClick={onThemeChange}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <Stack gap={4} component="nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              active={route === item.route}
              label={item.label}
              onClick={() => onNavigate(item.route)}
              key={item.route}
              variant="light"
            />
          ))}
        </Stack>

        <Text c="dimmed" size="xs" mt="auto">
          {health?.supabaseConfigured ? "Connected" : "Demo mode"}
        </Text>
      </Box>

      <Box component="main" className="workspace">{children}</Box>
    </Box>
  );
}
