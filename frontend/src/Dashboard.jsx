import { useEffect, useState } from "react";
import { api, todayString } from "./api";
import MicroSummary from "./MicroSummary";
import { formatAmount, greetingFor, rangeQuery } from "./nutrition";

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

const weekStart = () => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const lastSevenDays = () => {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    days.push(local.toISOString().slice(0, 10));
  }
  return days;
};

const round = (value) => Math.round(Number(value) || 0);

export default function Dashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [macroMode, setMacroMode] = useState("day");

  useEffect(() => {
    const day = todayString();
    const from = weekStart();
    Promise.all([
      api(`/api/reports/goals-vs-actual?${rangeQuery(day, day)}`),
      api(`/api/reports/micros?${rangeQuery(day, day)}`),
      api(`/api/reports/weekly?${rangeQuery(from, day)}`),
      api(`/api/reports/macros?${rangeQuery(from, day, { groupBy: "day" })}`),
      api(`/api/meals?${rangeQuery(day, day, { limit: 50 })}`),
    ])
      .then(([comparison, micros, weekly, macros, meals]) =>
        setData({ comparison, micros, weekly, macros, meals })
      )
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="error">{error}</p>;
  }
  if (!data) {
    return <p className="muted">Loading dashboard…</p>;
  }

  const comparison = data.comparison.comparison;
  const calories = comparison.calories;
  const caloriePercent = calories.percent;
  const remaining = calories.remaining;
  const days = lastSevenDays();
  const byDate = Object.fromEntries((data.weekly.points || []).map((point) => [point.date, point.calories]));
  const weekPoints = days.map((date) => ({ date, calories: byDate[date] || 0 }));
  const weekTotal = weekPoints.reduce((sum, point) => sum + point.calories, 0);
  const maxCalories = Math.max(...weekPoints.map((point) => point.calories), 1);
  const today = todayString();
  const meals = data.meals.items || [];
  const groups = MEAL_ORDER.map((type) => ({
    type,
    items: meals.filter((meal) => meal.mealType === type),
  })).filter((group) => group.items.length > 0);

  const macroSource =
    macroMode === "week"
      ? (data.macros.points || []).reduce(
          (sum, point) => ({
            protein: sum.protein + point.protein,
            carbs: sum.carbs + point.carbs,
            fats: sum.fats + point.fats,
          }),
          { protein: 0, carbs: 0, fats: 0 }
        )
      : {
          protein: comparison.protein.actual,
          carbs: comparison.carbs.actual,
          fats: comparison.fats.actual,
        };
  const macroTotal = macroSource.protein + macroSource.carbs + macroSource.fats;

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <p className="lede">
            {greetingFor()}, {user?.username || "there"}
          </p>
          <h1>Your daily snapshot</h1>
        </div>
        <div className="head-actions">
          <button className="text-button inline" type="button" onClick={() => onNavigate("meals")}>
            View all meals
          </button>
          <button type="button" onClick={() => onNavigate("meals")}>
            + Add meal
          </button>
        </div>
      </header>

      <div className="dash-grid">
        <article className="hero-card">
          <div className="hero-main">
            <div>
              <p className="hero-label">Calories consumed</p>
              <p className="hero-stat">{round(calories.actual)}</p>
              <p className="hero-sub">
                {calories.target === null ? "No calorie target set" : `of ${round(calories.target).toLocaleString()} kcal target`}
              </p>
            </div>
            <Ring percent={caloriePercent} />
          </div>
          <div className="hero-foot">
            <span>
              {remaining === null
                ? "Set a calorie goal to track remaining intake"
                : remaining >= 0
                  ? `${round(remaining).toLocaleString()} kcal remaining`
                  : `${round(Math.abs(remaining)).toLocaleString()} kcal over target`}
            </span>
            <span>{caloriePercent === null ? "No goal" : `${caloriePercent}% of goal`}</span>
          </div>
        </article>

        <article className="card">
          <div className="card-intro">
            <h3>Goal vs actual</h3>
            <p className="muted">How today is tracking</p>
          </div>
          <div className="goal-bars">
            <GoalRow label="Calories" item={comparison.calories} unit="kcal" tone="calories" />
            <GoalRow label="Protein" item={comparison.protein} unit="g" tone="protein" />
            <GoalRow label="Carbs" item={comparison.carbs} unit="g" tone="carbs" />
            <GoalRow label="Fat" item={comparison.fats} unit="g" tone="fat" />
          </div>
        </article>
      </div>

      <div className="dash-grid">
        <article className="card">
          <div className="card-intro">
            <h3>Weekly calories</h3>
            <p className="muted">Daily intake over the last 7 days</p>
          </div>
          {weekTotal === 0 ? (
            <p className="empty">No calories logged in the last 7 days.</p>
          ) : (
            <div className="chart" role="img" aria-label="Calories over the last 7 days">
              {weekPoints.map((point) => (
                <div key={point.date} className="chart-col" title={`${point.date}: ${round(point.calories)} kcal`}>
                  <strong>{point.calories ? round(point.calories) : ""}</strong>
                  <div className="chart-track">
                    <div
                      className={point.date === today ? "chart-bar today" : "chart-bar"}
                      style={{ height: `${point.calories ? Math.max(8, (point.calories / maxCalories) * 100) : 0}%` }}
                    />
                  </div>
                  <span>{new Date(`${point.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span>
                </div>
              ))}
            </div>
          )}
          <p className="hint">Daily target: {calories.target === null ? "not set" : `${round(data.comparison.goals.dailyCalories).toLocaleString()} kcal`}</p>
        </article>

        <article className="card">
          <div className="card-intro split-title">
            <div>
              <h3>Macro breakdown</h3>
              <p className="muted">{macroMode === "week" ? "Last 7 days of protein, carbs, and fat" : "Today's protein, carbs, and fat"}</p>
            </div>
            <div className="segmented" role="group" aria-label="Macro range">
              <button type="button" className={macroMode === "day" ? "active" : ""} onClick={() => setMacroMode("day")}>
                By day
              </button>
              <button type="button" className={macroMode === "week" ? "active" : ""} onClick={() => setMacroMode("week")}>
                By week
              </button>
            </div>
          </div>
          {macroTotal <= 0 ? (
            <p className="empty">{macroMode === "week" ? "No macros logged this week." : "No macros logged today."}</p>
          ) : (
            <div className="macro-list">
              <MacroLine label="Protein" grams={macroSource.protein} total={macroTotal} tone="protein" />
              <MacroLine label="Carbs" grams={macroSource.carbs} total={macroTotal} tone="carbs" />
              <MacroLine label="Fat" grams={macroSource.fats} total={macroTotal} tone="fat" />
            </div>
          )}
          <p className="hint">Total macros: {formatAmount(macroTotal) || 0}g logged {macroMode === "week" ? "this week" : "today"}</p>
        </article>
      </div>

      <div className="dash-grid">
        <article className="card">
          <div className="card-intro split-title">
            <div>
              <h3>Today's meals</h3>
              <p className="muted">Grouped by meal type</p>
            </div>
            <button className="text-button inline" type="button" onClick={() => onNavigate("meals")}>
              Add meal
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="empty">Nothing logged today. Add a meal to start the daily totals.</p>
          ) : (
            <div className="meal-groups">
              {groups.map((group) => (
                <section key={group.type}>
                  <h4>{group.type}</h4>
                  <ul className="plain-list">
                    {group.items.map((meal) => (
                      <li key={meal._id}>
                        <strong>{meal.foodName}</strong>
                        <span>
                          {meal.quantity} {meal.unit} · {round(meal.calories)} kcal
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-intro">
            <h3>Micronutrients</h3>
            <p className="muted">Today's measured iron, calcium, and vitamins. Missing values stay blank.</p>
          </div>
          <MicroSummary totals={data.micros.totals} coverage={data.micros.coverage} />
        </article>
      </div>
    </section>
  );
}

function Ring({ percent }) {
  const hasPercent = percent !== null && percent !== undefined;
  const clamped = hasPercent ? Math.max(0, Math.min(percent, 100)) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg className="ring" viewBox="0 0 72 72" role="img" aria-label={hasPercent ? `${percent} percent of calorie goal` : "No calorie goal"}>
      <circle className="ring-track" cx="36" cy="36" r={radius} />
      <circle
        className="ring-value"
        cx="36"
        cy="36"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="36" y="40" textAnchor="middle">
        {hasPercent ? `${Math.round(percent)}%` : "–"}
      </text>
    </svg>
  );
}

function GoalRow({ label, item, unit, tone }) {
  const width = item.percent === null ? 0 : Math.min(item.percent, 100);
  return (
    <div className="goal-row">
      <div className="goal-row-label">
        <span>{label}</span>
        <span>
          {item.target === null
            ? `${round(item.actual)} ${unit}`
            : `${round(item.actual)} / ${round(item.target)}${unit === "kcal" ? "kcal" : unit}`}
        </span>
      </div>
      <div className={`bar ${tone}`} aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function MacroLine({ label, grams, total, tone }) {
  const share = total > 0 ? Math.round((grams / total) * 100) : 0;
  return (
    <div className="macro-line">
      <div className="goal-row-label">
        <span className={`dot ${tone}`}>{label}</span>
        <span>
          {round(grams)}g · {share}%
        </span>
      </div>
      <div className={`bar ${tone}`} aria-hidden="true">
        <span style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
