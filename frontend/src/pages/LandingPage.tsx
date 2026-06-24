import {
  IconCalendarWeek,
  IconChevronRight,
  IconMoon,
  IconScale,
  IconSoup,
  IconSun,
  IconToolsKitchen2
} from "@tabler/icons-react";
import { BrandMark } from "../components/BrandMark";
import { Button, IconButton } from "../components/ui";

type LandingPageProps = {
  authConfigured: boolean;
  authConfigMessage: string | null;
  isAuthLoading: boolean;
  theme: "light" | "dark";
  onSignIn: () => void;
  onThemeChange: () => void;
};

const landingSteps = [
  { icon: IconToolsKitchen2, title: "Build your pantry", body: "Save foods with the units and nutrition values you actually use." },
  { icon: IconSoup, title: "Create meals", body: "Combine ingredients once, then reuse portions without recalculating." },
  { icon: IconCalendarWeek, title: "Plan the week", body: "Drop meals into calendar slots and keep calories visible as you go." }
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
    <div className="landing-shell">
      <header className="landing-nav">
        <div className="brand">
          <BrandMark />
          <strong>My Kitchen</strong>
        </div>
        <div className="topbar-actions">
          <IconButton label="Toggle colour scheme" onClick={onThemeChange}>
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </IconButton>
          <Button disabled={!authConfigured || isAuthLoading} loading={isAuthLoading} onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy-block">
            <span className="landing-kicker">Meal planning from your own ingredients</span>
            <h1 className="landing-title">My Kitchen</h1>
            <p className="landing-copy">
              Keep your ingredient library, favourite meals, portions, calories, and weekly plan in one calm workspace.
            </p>
            <div className="landing-actions">
              <Button disabled={!authConfigured || isAuthLoading} loading={isAuthLoading} onClick={onSignIn}>
                Sign in with Google
                <IconChevronRight size={17} />
              </Button>
            </div>
            {authConfigMessage ? <div className="auth-banner landing-auth-banner">{authConfigMessage}</div> : null}
          </div>

          <div className="landing-visual" aria-hidden="true">
            <div className="plate-visual">
              <span className="plate-ring" />
              <span className="plate-segment segment-greens" />
              <span className="plate-segment segment-grains" />
              <span className="plate-segment segment-protein" />
              <span className="plate-center"><IconScale size={30} /></span>
            </div>
            <div className="landing-stat stat-a">
              <span>Portions</span>
              <strong>100g</strong>
            </div>
            <div className="landing-stat stat-b">
              <span>Weekly plan</span>
              <strong>Ready</strong>
            </div>
          </div>
        </section>

        <section className="landing-step-grid" aria-label="My Kitchen workflow">
          {landingSteps.map((step) => (
            <div className="landing-step" key={step.title}>
              <step.icon size={22} />
              <div>
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
