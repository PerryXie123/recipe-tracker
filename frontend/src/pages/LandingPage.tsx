import { Box, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Button as AriaButton } from "react-aria-components";
import { IconArrowRight, IconChartBar, IconDatabase, IconLock, IconMoon, IconSun } from "@tabler/icons-react";

type LandingPageProps = {
  authConfigured: boolean;
  authConfigMessage: string | null;
  isAuthLoading: boolean;
  theme: "light" | "dark";
  onSignIn: () => void;
  onThemeChange: () => void;
};

const highlights = [
  {
    icon: IconDatabase,
    title: "Ingredient library",
    body: "Keep nutrition values consistent per 100g and build meals from your saved foods."
  },
  {
    icon: IconChartBar,
    title: "Portion maths",
    body: "Check calories and protein for the serving size you actually eat."
  },
  {
    icon: IconLock,
    title: "Private by default",
    body: "Google sign-in keeps your ingredients and meals scoped to your account."
  }
];

export function LandingPage({
  authConfigured,
  authConfigMessage,
  isAuthLoading,
  theme,
  onSignIn,
  onThemeChange
}: LandingPageProps) {
  return (
    <Box className="landing-shell">
      <header className="landing-nav">
        <Group gap={10}>
          <span className="brand-mark">RT</span>
          <div>
            <Text fw={800}>Recipe Tracker</Text>
            <Text c="dimmed" size="xs">Meals, ingredients, portions</Text>
          </div>
        </Group>

        <Group gap={8}>
          <AriaButton className="icon-aria-button" onPress={onThemeChange} aria-label="Toggle colour scheme">
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </AriaButton>
          <AriaButton
            className="aria-button secondary"
            isDisabled={!authConfigured || isAuthLoading}
            onPress={onSignIn}
          >
            Sign in
          </AriaButton>
        </Group>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <Stack gap={20}>
            <div>
              <Title className="landing-title" order={1}>Plan meals from ingredients you trust.</Title>
              <Text className="landing-copy">
                Save your foods, build recipes by weight, and keep portion nutrition easy to check.
              </Text>
            </div>
            <Group gap={10}>
              <AriaButton
                className="aria-button primary"
                isDisabled={!authConfigured || isAuthLoading}
                onPress={onSignIn}
              >
                Sign in with Google
                <IconArrowRight size={18} />
              </AriaButton>
              {authConfigMessage ? <Text c="dimmed" size="sm">{authConfigMessage}</Text> : null}
            </Group>
          </Stack>

          <Paper className="landing-preview" withBorder>
            <div className="preview-header">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-card strong">
              <Text size="xs" c="dimmed" fw={800}>TODAY</Text>
              <Title order={3}>Chicken rice bowl</Title>
              <SimpleGrid cols={2} spacing={8}>
                <Paper className="preview-metric" withBorder>
                  <Text c="dimmed" size="xs">Portion</Text>
                  <Text fw={900}>350g</Text>
                </Paper>
                <Paper className="preview-metric" withBorder>
                  <Text c="dimmed" size="xs">Protein</Text>
                  <Text fw={900}>48g</Text>
                </Paper>
              </SimpleGrid>
            </div>
            <div className="preview-list">
              <span>Chicken breast</span>
              <strong>200g</strong>
              <span>Rice</span>
              <strong>150g</strong>
              <span>Greek yoghurt</span>
              <strong>100g</strong>
            </div>
          </Paper>
        </section>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <Paper className="landing-feature" withBorder key={item.title}>
                <Icon size={22} />
                <Title order={3}>{item.title}</Title>
                <Text c="dimmed" size="sm">{item.body}</Text>
              </Paper>
            );
          })}
        </SimpleGrid>
      </main>
    </Box>
  );
}
