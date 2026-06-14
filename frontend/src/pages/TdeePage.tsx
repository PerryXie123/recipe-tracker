import { useMemo, useState } from "react";
import { Button, NumberInput, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { formatNumber } from "../lib/format";

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9
};

const goalAdjustments = {
  cut: -500,
  maintain: 0,
  gain: 300
};

type Sex = "male" | "female";
type Activity = keyof typeof activityMultipliers;
type Goal = keyof typeof goalAdjustments;

type TdeePageProps = {
  currentTarget: number | null;
  onSetCurrentTarget: (target: number) => void;
};

export function TdeePage({ currentTarget, onSetCurrentTarget }: TdeePageProps) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(178);
  const [weight, setWeight] = useState(80);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");

  const result = useMemo(() => {
    const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    const tdee = bmr * activityMultipliers[activity];
    const target = tdee + goalAdjustments[goal];
    const proteinLow = weight * 1.6;
    const proteinHigh = weight * 2.2;

    return { bmr, tdee, target, proteinLow, proteinHigh };
  }, [activity, age, goal, height, sex, weight]);

  return (
    <section className="page-stack">
      <section className="tdee-layout">
        <Paper className="form-panel" withBorder>
          <div>
            <Text className="eyebrow">Calculator</Text>
            <Title order={2}>Inputs</Title>
          </div>

          <SegmentedControl
            value={sex}
            onChange={(value) => setSex(value as Sex)}
            data={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" }
            ]}
          />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <NumberInput label="Age" value={age} onChange={(value) => setAge(Number(value) || 0)} min={0} />
            <NumberInput label="Height (cm)" value={height} onChange={(value) => setHeight(Number(value) || 0)} min={0} />
            <NumberInput label="Weight (kg)" value={weight} onChange={(value) => setWeight(Number(value) || 0)} min={0} />
          </SimpleGrid>

          <Select
            label="Activity"
            value={activity}
            onChange={(value) => setActivity((value || "moderate") as Activity)}
            data={[
              { value: "sedentary", label: "Sedentary" },
              { value: "light", label: "Light activity" },
              { value: "moderate", label: "Moderate activity" },
              { value: "active", label: "Very active" },
              { value: "athlete", label: "Athlete" }
            ]}
          />

          <SegmentedControl
            value={goal}
            onChange={(value) => setGoal(value as Goal)}
            data={[
              { label: "Cut", value: "cut" },
              { label: "Maintain", value: "maintain" },
              { label: "Gain", value: "gain" }
            ]}
          />
        </Paper>

        <Paper className="panel tdee-results" withBorder>
          <div>
            <Text className="eyebrow">Estimate</Text>
            <Title order={2}>{formatNumber(result.target)} cal/day</Title>
            <Text c="dimmed">Target calories based on your selected goal.</Text>
            <Button mt="md" type="button" onClick={() => onSetCurrentTarget(Math.round(result.target))}>
              Set for current period
            </Button>
            {currentTarget ? (
              <Text c="dimmed" size="sm" mt={8}>
                Current period target: {formatNumber(currentTarget)} cal/day
              </Text>
            ) : null}
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Paper className="result-tile" withBorder>
              <Text c="dimmed" size="sm" fw={800}>BMR</Text>
              <Title order={3}>{formatNumber(result.bmr)}</Title>
            </Paper>
            <Paper className="result-tile" withBorder>
              <Text c="dimmed" size="sm" fw={800}>TDEE</Text>
              <Title order={3}>{formatNumber(result.tdee)}</Title>
            </Paper>
            <Paper className="result-tile" withBorder>
              <Text c="dimmed" size="sm" fw={800}>Protein range</Text>
              <Title order={3}>{formatNumber(result.proteinLow)}-{formatNumber(result.proteinHigh)}g</Title>
            </Paper>
            <Paper className="result-tile" withBorder>
              <Text c="dimmed" size="sm" fw={800}>Goal</Text>
              <Title order={3}>{goal}</Title>
            </Paper>
          </SimpleGrid>
        </Paper>
      </section>
    </section>
  );
}
