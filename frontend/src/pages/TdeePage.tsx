import { useMemo, useState } from "react";
import { Button, NumericInput, Panel, SegmentedControl, SelectInput } from "../components/ui";
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
  currentProteinTarget: number | null;
  onSetCurrentTarget: (target: number) => void;
  onSetCurrentProteinTarget: (target: number) => void;
};

export function TdeePage({
  currentTarget,
  currentProteinTarget,
  onSetCurrentTarget,
  onSetCurrentProteinTarget
}: TdeePageProps) {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(30);
  const [height, setHeight] = useState(178);
  const [weight, setWeight] = useState(80);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("maintain");
  const defaultProteinTarget = Math.round(weight * 2);
  const [proteinTarget, setProteinTarget] = useState(defaultProteinTarget);

  const result = useMemo(() => {
    const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    const tdee = bmr * activityMultipliers[activity];
    const target = tdee + goalAdjustments[goal];
    const proteinLow = weight * 1.6;
    const proteinHigh = weight * 2.2;

    return { bmr, tdee, target, proteinLow, proteinHigh, defaultProteinTarget: weight * 2 };
  }, [activity, age, goal, height, sex, weight]);

  function handleWeightChange(nextWeight: number) {
    setWeight(nextWeight);
    setProteinTarget(Math.round(nextWeight * 2));
  }

  return (
    <section className="page-stack">
      <section className="tdee-layout">
        <Panel className="form-panel">
          <div>
            <p className="eyebrow">Calculator</p>
            <h2>Inputs</h2>
          </div>

          <SegmentedControl
            value={sex}
            onChange={(value) => setSex(value as Sex)}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" }
            ]}
          />

          <div className="three-grid">
            <NumericInput label="Age" value={age} onChange={setAge} min={0} />
            <NumericInput label="Height (cm)" value={height} onChange={setHeight} min={0} />
            <NumericInput label="Weight (kg)" value={weight} onChange={handleWeightChange} min={0} />
          </div>

          <SelectInput
            label="Activity"
            value={activity}
            onChange={(value) => setActivity((value || "moderate") as Activity)}
            options={[
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
            options={[
              { label: "Cut", value: "cut" },
              { label: "Maintain", value: "maintain" },
              { label: "Gain", value: "gain" }
            ]}
          />
        </Panel>

        <Panel className="tdee-results">
          <div>
            <p className="eyebrow">Estimate</p>
            <h2>{formatNumber(result.target)} cal/day</h2>
            <p className="muted">Target calories based on your selected goal.</p>
            <div className="mt-16">
              <Button type="button" onClick={() => onSetCurrentTarget(Math.round(result.target))}>
                Set calories
              </Button>
            </div>
            {currentTarget ? (
              <p className="muted small mt-8">
                Current period target: {formatNumber(currentTarget)} cal/day
              </p>
            ) : null}
          </div>

          <div className="tdee-target-editor">
            <NumericInput
              label="Protein target (g/day)"
              value={proteinTarget}
              onChange={setProteinTarget}
              min={0}
            />
            <Button type="button" onClick={() => onSetCurrentProteinTarget(Math.round(proteinTarget))}>
              Set protein
            </Button>
            <p className="muted small">
              Default: {formatNumber(result.defaultProteinTarget)}g/day from 2g per kg body weight.
            </p>
            {currentProteinTarget ? (
              <p className="muted small">
                Current protein target: {formatNumber(currentProteinTarget)}g/day
              </p>
            ) : null}
          </div>

          <div className="result-grid">
            <ResultTile label="BMR" value={formatNumber(result.bmr)} />
            <ResultTile label="TDEE" value={formatNumber(result.tdee)} />
            <ResultTile label="Protein range" value={`${formatNumber(result.proteinLow)}-${formatNumber(result.proteinHigh)}g`} />
            <ResultTile label="Goal" value={goal} />
          </div>
        </Panel>
      </section>
    </section>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-tile">
      <span className="muted small strong">{label}</span>
      <h3>{value}</h3>
    </div>
  );
}
