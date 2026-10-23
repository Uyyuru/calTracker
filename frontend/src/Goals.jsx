import { useEffect, useState } from "react";
import { api, todayString } from "./api";
import { dateLabel, rangeQuery } from "./nutrition";

const EMPTY = {
  dailyCalories: "",
  dailyProtein: "",
  dailyCarbs: "",
  dailyFats: "",
  weightGoal: "",
};

const FIELDS = [
  ["dailyCalories", "Daily calories", "kcal"],
  ["dailyProtein", "Protein", "g"],
  ["dailyCarbs", "Carbohydrates", "g"],
  ["dailyFats", "Fat", "g"],
  ["weightGoal", "Weight goal", "lb"],
];

export default function Goals({ onNavigate }) {
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insight, setInsight] = useState(null);

  const loadInsight = () => {
    const day = todayString();
    api(`/api/reports/goals-vs-actual?${rangeQuery(day, day)}`)
      .then((data) => setInsight(describe(data.comparison)))
      .catch(() => setInsight(null));
  };

  useEffect(() => {
    api("/api/goals")
      .then(({ goals }) => {
        setForm({
          dailyCalories: goals.dailyCalories,
          dailyProtein: goals.dailyProtein,
          dailyCarbs: goals.dailyCarbs,
          dailyFats: goals.dailyFats,
          weightGoal: goals.weightGoal,
        });
        loadInsight();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  };

  const save = async (event) => {
    event.preventDefault();
    const errors = {};
    FIELDS.forEach(([key, label]) => {
      const parsed = Number(form[key]);
      if (form[key] === "" || !Number.isFinite(parsed)) {
        errors[key] = `${label} must be a valid number`;
      } else if (parsed < 0) {
        errors[key] = `${label} cannot be negative`;
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Check the highlighted fields.");
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = Object.fromEntries(FIELDS.map(([key]) => [key, Number(form[key])]));
      const { goals } = await api("/api/goals", { method: "PUT", body });
      setForm({
        dailyCalories: goals.dailyCalories,
        dailyProtein: goals.dailyProtein,
        dailyCarbs: goals.dailyCarbs,
        dailyFats: goals.dailyFats,
        weightGoal: goals.weightGoal,
      });
      setMessage("Goals saved.");
      loadInsight();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack goals-page">
      <header className="page-head">
        <div>
          <p className="date-label">{dateLabel()}</p>
          <h1>Goals</h1>
          <p className="lede">Personal targets</p>
        </div>
        <button type="button" onClick={() => onNavigate("meals")}>
          + Add meal
        </button>
      </header>

      <h2 className="section-title">Goals & preferences</h2>

      {loading ? (
        <p className="muted">Loading goals…</p>
      ) : (
        <form className="card goal-card" onSubmit={save}>
          <div className="card-intro">
            <h3>Daily nutrition goals</h3>
            <p className="muted">These targets power your dashboard and reports.</p>
          </div>
          <div className="goal-grid">
            {FIELDS.map(([key, label, unit]) => (
              <label key={key} className={key === "weightGoal" ? "span-left" : undefined}>
                {label}
                <span className="field-unit">
                  <input
                    name={key}
                    type="number"
                    min="0"
                    step={key === "weightGoal" ? "0.1" : "1"}
                    value={form[key]}
                    onChange={onChange}
                    aria-invalid={Boolean(fieldErrors[key])}
                    required
                  />
                  <span>{unit}</span>
                </span>
                {fieldErrors[key] && <span className="field-error">{fieldErrors[key]}</span>}
              </label>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          {message && <p className="ok">{message}</p>}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {insight && (
        <article className="card insight">
          <h3>{insight.title}</h3>
          <p className="muted">{insight.body}</p>
        </article>
      )}
    </section>
  );
}

function describe(comparison) {
  const calories = comparison?.calories;
  if (!calories || !calories.actual) {
    return {
      title: "Targets are ready",
      body: "No meals are logged today. Dashboard progress will use these saved goals as soon as you add food.",
    };
  }
  const rows = [
    ["protein", comparison.protein],
    ["carbohydrates", comparison.carbs],
    ["fat", comparison.fats],
  ].filter(([, item]) => item?.percent !== null);
  if (calories.percent !== null && calories.percent >= 90 && calories.percent <= 110 && rows.every(([, item]) => item.percent >= 80)) {
    return {
      title: "Today is close to your targets",
      body: "Calories and macros are near the goals saved on this page.",
    };
  }
  const lowest = rows.sort((a, b) => a[1].percent - b[1].percent)[0];
  if (lowest && lowest[1].percent < 100) {
    return {
      title: "Your goal is within reach",
      body: `Based on today's logged meals, staying consistent with your ${lowest[0]} goal will be the biggest lever for progress.`,
    };
  }
  return {
    title: "Today is above one or more targets",
    body: "The dashboard compares these saved goals with the meals logged for today.",
  };
}
