import {
  IconCalendarWeek,
  IconChartPie,
  IconClock,
  IconMoon,
  IconSoup,
  IconSun,
  IconToolsKitchen2
} from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { Button, IconButton, Panel } from "../components/ui";

type LandingPageProps = {
  authConfigured: boolean;
  authConfigMessage: string | null;
  isAuthLoading: boolean;
  theme: "light" | "dark";
  onSignIn: () => void;
  onThemeChange: () => void;
};

export function LandingPage({
  authConfigured,
  authConfigMessage,
  isAuthLoading,
  theme,
  onSignIn,
  onThemeChange
}: LandingPageProps) {
  return (
    <div className="app-shell">
      <div className="app-frame landing-frame">
        <aside className="sidebar">
          <div className="brand sidebar-brand">
            <span className="brand-mark">R</span>
            <strong>Recipe Tracker</strong>
          </div>

          <div className="sidebar-section">
            <span className="sidebar-label">Menu</span>
            <div className="nav-list">
              <span className="nav-item active"><IconChartPie size={18} /> Dashboard</span>
              <span className="nav-item"><IconToolsKitchen2 size={18} /> Ingredients</span>
              <span className="nav-item"><IconSoup size={18} /> Meals</span>
              <span className="nav-item"><IconCalendarWeek size={18} /> Calendar</span>
            </div>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-actions">
              <IconButton label="Toggle colour scheme" onClick={onThemeChange}>
                {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
              </IconButton>
              <Button disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>
                Sign in
              </Button>
            </div>
          </header>

          <div className="page-title-row">
            <div>
              <h1>Dashboard</h1>
              <p className="muted">Plan, build, and track meals from ingredients you trust.</p>
            </div>
            <div className="inline-actions">
              <Button disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>Add Meal</Button>
              <Button variant="secondary" disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>Add Ingredient</Button>
            </div>
          </div>

          {authConfigMessage ? <div className="auth-banner">{authConfigMessage}</div> : null}

          <main className="workspace">
            <section className="donezo-dashboard">
              <section className="metric-grid">
                <div className="metric-card primary"><span>Recipe Preview</span><strong>24</strong><small>Example saved meals</small><i>↗</i></div>
                <div className="metric-card"><span>Food Preview</span><strong>60</strong><small>Example ingredient library</small><i>↗</i></div>
                <div className="metric-card"><span>Week Plan</span><strong>12</strong><small>Example planned meals</small><i>↗</i></div>
                <div className="metric-card"><span>Daily Target</span><strong>2k</strong><small>Example calorie target</small><i>↗</i></div>
              </section>

              <section className="dashboard-mosaic">
                <Panel className="widget analytics-widget">
                  <div className="section-header"><h3>Recipe Analytics</h3><span className="badge">Preview</span></div>
                  <div className="bar-chart">
                    {[48, 70, 82, 96, 62, 76, 88].map((height, index) => (
                      <div className={index === 1 || index === 3 ? "bar active" : index === 2 ? "bar mid" : "bar-striped"} key={index}>
                        <span style={{ height: `${height}%` }} />
                        <small>{"SMTWTFS"[index]}</small>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel className="widget reminder-widget">
                  <h3>Next Meal</h3>
                  <div className="meeting-card">
                    <IconClock size={18} />
                    <div><strong>Chicken rice bowl</strong><p>Example planned meal • 520 cal</p></div>
                  </div>
                  <Button className="full-button" disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>Open Calendar</Button>
                </Panel>

                <Panel className="widget recipe-list-widget">
                  <div className="section-header"><h3>Recipes</h3><Button variant="secondary" size="sm" disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>+ New</Button></div>
                  <div className="recipe-list">
                    {["Chicken rice bowl", "Greek yoghurt oats", "Salmon salad", "Turkey burrito", "Protein smoothie"].map((name, index) => (
                      <div className="mock-recipe-row" key={name}>
                        <span className={`recipe-dot dot-${index % 5}`} />
                        <span><strong>{name}</strong><small>Example recipe preview</small></span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel className="widget collaboration-widget">
                  <div className="section-header"><h3>Ingredient Library</h3><Button variant="secondary" size="sm" disabled={!authConfigured || isAuthLoading} onClick={onSignIn}>Add Food</Button></div>
                  <div className="collab-list">
                    {["Chicken breast", "Brown rice", "Greek yoghurt", "Avocado"].map((name, index) => (
                      <div className="mock-recipe-row" key={name}>
                        <span className="mini-avatar">{name[0]}</span>
                        <span><strong>{name}</strong><small>{index * 40 + 120} cal • flexible basis</small></span>
                        <span className="badge">per unit</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel className="widget progress-widget">
                  <h3>Nutrition Progress</h3>
                  <div className="progress-arc" style={{ "--progress": "41%" } as CSSProperties}>
                    <strong>41%</strong>
                    <span>Target Met</span>
                  </div>
                </Panel>

                <Panel className="widget schedule-widget">
                  <div className="section-header"><h3>Today’s Schedule</h3></div>
                  <div className="timeline-list">
                    {["Breakfast", "Lunch", "Snack", "Dinner"].map((name, index) => (
                      <div className="timeline-item" key={name}>
                        <span className={index < 2 ? "timeline-dot done" : "timeline-dot"} />
                        <div><small>{index + 8}:00 - {index + 9}:00</small><strong>{name}</strong><p>Recipe planning slot</p></div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
