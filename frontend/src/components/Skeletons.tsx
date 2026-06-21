import type { Route } from "../lib/routing";
import { Panel } from "./ui";

export function Bone({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

function MealCardSkeleton() {
  return (
    <Panel className="meal-card skeleton-card">
      <div className="skeleton-spread"><div><Bone className="skeleton-title" /><Bone className="skeleton-copy short" /></div><Bone className="skeleton-icon" /></div>
      <div className="badge-row"><Bone className="skeleton-pill" /><Bone className="skeleton-pill" /><Bone className="skeleton-pill" /></div>
      <div className="skeleton-two"><Bone className="skeleton-field" /><Bone className="skeleton-field" /></div>
      <div className="skeleton-two"><Bone className="skeleton-copy" /><Bone className="skeleton-copy" /></div>
    </Panel>
  );
}

export function MealGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="meal-grid" role="status" aria-label="Loading meals" aria-busy="true">
      {Array.from({ length: count }, (_, index) => <MealCardSkeleton key={index} />)}
      <span className="sr-only">Loading meals…</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section className="donezo-dashboard">
      <section className="metric-grid">
        {Array.from({ length: 4 }, (_, index) => <div className="metric-card skeleton-card" key={index}><Bone className="skeleton-copy" /><Bone className="skeleton-value" /><Bone className="skeleton-copy short" /></div>)}
      </section>
      <section className="dashboard-mosaic skeleton-mosaic">
        {Array.from({ length: 7 }, (_, index) => (
          <Panel className={`widget skeleton-widget skeleton-widget-${index + 1}`} key={index}>
            <Bone className="skeleton-title" />
            <Bone className={index < 2 ? "skeleton-chart" : index === 5 ? "skeleton-circle" : "skeleton-block"} />
            <Bone className="skeleton-copy" />
          </Panel>
        ))}
      </section>
    </section>
  );
}

export function PageSkeleton({ route }: { route: Route }) {
  const content = route === "home" ? <DashboardSkeleton /> : null;

  return <div className="page-skeleton" role="status" aria-label="Loading page content" aria-busy="true">{content}<span className="sr-only">Loading page content…</span></div>;
}
