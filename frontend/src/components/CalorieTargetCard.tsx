import type { CSSProperties } from "react";
import { formatNumber } from "../lib/format";

type CalorieTargetCardProps = {
  calories: number;
  target: number | null;
  title: string;
  subtitle: string;
  isLoading?: boolean;
};

export function CalorieTargetCard({ calories, target, title, subtitle, isLoading = false }: CalorieTargetCardProps) {
  const percent = target && target > 0 ? Math.min(140, Math.round((calories / target) * 100)) : 0;
  const remaining = target ? target - calories : null;

  return (
    <div className="panel-surface calorie-target-card">
      <div>
        <p className="eyebrow">{title}</p>
        {isLoading ? <span className="skeleton skeleton-calorie-value" aria-hidden="true" /> : <h2>{formatNumber(calories)} cal</h2>}
        <p className="muted small">{subtitle}</p>
        <div
          className="calorie-progress-bar"
          style={{ "--calorie-progress": `${Math.min(percent, 100)}%` } as CSSProperties}
          aria-label={target ? `${percent}% of calorie target` : "No calorie target set"}
        >
          <span style={isLoading ? { width: "36%" } : undefined} />
        </div>
        {isLoading ? <span className="skeleton skeleton-target-copy mt-8" aria-hidden="true" /> : <p className="strong mt-8">
          {target
            ? remaining !== null && remaining < 0
              ? `${formatNumber(Math.abs(remaining))} cal over the ${formatNumber(target)} cal limit`
              : `${formatNumber(remaining || 0)} cal remaining out of the ${formatNumber(target)} cal limit`
            : "Set a TDEE target"}
        </p>}
      </div>
    </div>
  );
}
