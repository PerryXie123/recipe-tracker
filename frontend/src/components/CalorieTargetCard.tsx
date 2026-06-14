import type { CSSProperties } from "react";
import { Paper, Text, Title } from "@mantine/core";
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
    <Paper className="calorie-target-card" withBorder>
      <div
        className="calorie-ring"
        style={{ "--calorie-progress": `${Math.min(percent, 100)}%` } as CSSProperties}
      >
        <strong>{target ? `${percent}%` : "-"}</strong>
        <span>target</span>
      </div>
      <div>
        <Text className="eyebrow">{title}</Text>
        <Title order={2}>{formatNumber(calories)} cal</Title>
        <Text c="dimmed" size="sm">{subtitle}</Text>
        <Text mt={8} fw={800}>
          {target ? `${formatNumber(Math.abs(remaining || 0))} cal ${remaining && remaining < 0 ? "over" : "remaining"}` : "Set a TDEE target"}
        </Text>
      </div>
    </Paper>
  );
}
