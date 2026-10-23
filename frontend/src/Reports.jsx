import { useEffect, useState } from "react";
import { api, todayString } from "./api";
import MicroSummary from "./MicroSummary";
import { rangeQuery } from "./nutrition";

const weekAgo = () => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const round = (value) => Math.round(Number(value) || 0);

export default function Reports() {
  const [range, setRange] = useState({ from: weekAgo(), to: todayString() });
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const query = rangeQuery(range.from, range.to);
      const [weekly, macros, micros, comparison] = await Promise.all([
        api(`/api/reports/weekly?${query}`),
        api(`/api/reports/macros?${query}&groupBy=${groupBy}`),
        api(`/api/reports/micros?${query}`),
        api(`/api/reports/goals-vs-actual?${query}`),
      ]);
      setData({ weekly, macros, micros, comparison });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [range.from, range.to, groupBy]);

  const points = data?.weekly.points || [];
  const maxCalories = Math.max(1, ...points.map((point) => point.calories));
  const comparison = data?.comparison.comparison;

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="lede">Calories, macros, and micronutrients for the selected dates.</p>
        </div>
      </header>

      <form
        className="card toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <label>
          From
          <input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label>
          To
          <input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
        </label>
        <label>
          Macros by
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">Loading report…</p>}

      {data && (
        <>
          <div className="stat-grid">
            {["calories", "protein", "carbs", "fats"].map((key) => {
              const item = comparison[key];
              const unit = key === "calories" ? "kcal" : "g";
              return (
                <article key={key} className="card summary-card">
                  <p className="eyebrow">{key}</p>
                  <p className="stat">
                    {round(item.actual)}
                    <span>{item.target === null ? ` ${unit}` : ` / ${round(item.target)} ${unit}`}</span>
                  </p>
                  <div className={`bar ${key === "fats" ? "fat" : key}`} aria-hidden="true">
                    <span style={{ width: `${item.percent === null ? 0 : Math.min(item.percent, 100)}%` }} />
                  </div>
                  <p className="hint">
                    {item.percent === null
                      ? "No saved target"
                      : `${item.percent}% of the ${data.comparison.days}-day target`}
                  </p>
                </article>
              );
            })}
          </div>

          <article className="card">
            <div className="card-intro">
              <h3>Calorie trend</h3>
              <p className="muted">Each bar is one day in the selected range.</p>
            </div>
            {points.length === 0 ? (
              <p className="empty">No meals in this range.</p>
            ) : (
              <div className="chart" role="img" aria-label="Calorie trend">
                {points.map((point) => (
                  <div key={point.date} className="chart-col" title={`${point.date}: ${round(point.calories)} kcal`}>
                    <strong>{round(point.calories)}</strong>
                    <div className="chart-track">
                      <div className="chart-bar today" style={{ height: `${Math.max(8, (point.calories / maxCalories) * 100)}%` }} />
                    </div>
                    <span>{point.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <div className="dash-grid">
            <article className="card">
              <div className="card-intro">
                <h3>Macros</h3>
                <p className="muted">Grouped by {data.macros.groupBy}.</p>
              </div>
              {data.macros.points.length === 0 ? (
                <p className="empty">No macro data in this range.</p>
              ) : (
                <ul className="plain-list">
                  {data.macros.points.map((point) => (
                    <li key={point.period}>
                      <strong>{point.period}</strong>
                      <span>
                        P {round(point.protein)}g · C {round(point.carbs)}g · F {round(point.fats)}g
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="card">
              <div className="card-intro">
                <h3>Micronutrients</h3>
                <p className="muted">Totals from meals that stored a measurement. Blank nutrients are not counted as zero.</p>
              </div>
              <MicroSummary totals={data.micros.totals} coverage={data.micros.coverage} />
            </article>
          </div>
        </>
      )}
    </section>
  );
}
