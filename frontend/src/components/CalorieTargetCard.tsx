import type { CSSProperties } from "react";
import { formatNumber } from "../lib/format";

type CalorieTargetCardProps = {
  calories: number;
  target: number | null;
  title: string;
  subtitle: string;
};

export function CalorieTargetCard({ calories, target, title, subtitle }: CalorieTargetCardProps) {
  const percent = target && target > 0 ? Math.min(140, Math.round((calories / target) * 100)) : 0;
  const remaining = target ? target - calories : null;

  return (
    <div className="panel-surface calorie-target-card">
      <div
        className="calorie-ring"
        style={{ "--calorie-progress": `${Math.min(percent, 100)}%` } as CSSProperties}
      >
        <strong>{target ? `${percent}%` : "-"}</strong>
        <span>target</span>
      </div>
      <div>
        <p className="eyebrow">{title}</p>
        <h2>{formatNumber(calories)} cal</h2>
        <p className="muted small">{subtitle}</p>
        <p className="strong mt-8">
          {target ? `${formatNumber(Math.abs(remaining || 0))} cal ${remaining && remaining < 0 ? "over" : "remaining"}` : "Set a TDEE target"}
        </p>
      </div>
    </div>
  );
}
