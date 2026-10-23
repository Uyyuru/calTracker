import { useEffect, useState } from "react";
import { api, todayString, toLocalInput } from "./api";
import { MICROS, blankMicros, collectMicros, microsFromMeal, rangeQuery } from "./nutrition";

const emptyForm = () => ({
  foodName: "",
  mealType: "breakfast",
  quantity: 1,
  unit: "serving",
  calories: "",
  protein: "",
  carbs: "",
  fats: "",
  consumedAt: toLocalInput(),
  micros: blankMicros(),
});

const MACRO_FIELDS = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbohydrates", "g"],
  ["fats", "Fats", "g"],
];

export default function Meals() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ from: todayString(), to: todayString(), mealType: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [microsOpen, setMicrosOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async (nextPage = page) => {
    const data = await api(`/api/meals?${rangeQuery(filters.from, filters.to, { page: nextPage, limit: 8, mealType: filters.mealType })}`);
    setResult(data);
    setPage(data.page);
  };

  useEffect(() => {
    load(1).catch((err) => setError(err.message));
  }, [filters.from, filters.to, filters.mealType]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  };

  const onMicro = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, micros: { ...current.micros, [name]: value } }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
  };

  const reset = () => {
    setEditingId("");
    setForm(emptyForm());
    setFieldErrors({});
    setMicrosOpen(false);
  };

  const save = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.foodName.trim()) errors.foodName = "Food name is required";
    ["quantity", ...MACRO_FIELDS.map(([key]) => key)].forEach((key) => {
      const label = key === "quantity" ? "Quantity" : MACRO_FIELDS.find(([name]) => name === key)?.[1];
      const parsed = Number(form[key]);
      if (form[key] === "" || !Number.isFinite(parsed)) errors[key] = `${label} must be a valid number`;
      else if (parsed < 0) errors[key] = `${label} cannot be negative`;
    });
    const { micros, errors: microErrors } = collectMicros(form.micros);
    Object.assign(errors, microErrors);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Check the highlighted fields.");
      setMessage("");
      if (Object.keys(microErrors).length) setMicrosOpen(true);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const body = {
      foodName: form.foodName.trim(),
      mealType: form.mealType,
      quantity: Number(form.quantity),
      unit: form.unit,
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fats: Number(form.fats),
      micros,
      consumedAt: new Date(form.consumedAt).toISOString(),
    };
    if (!editingId) body.source = "manual";
    try {
      const wasEditing = Boolean(editingId);
      if (editingId) {
        await api(`/api/meals/${editingId}`, { method: "PATCH", body });
        setMessage("Meal updated.");
      } else {
        await api("/api/meals", { method: "POST", body });
        setMessage("Meal saved.");
      }
      reset();
      await load(wasEditing ? page : 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (meal) => {
    const micros = microsFromMeal(meal);
    setEditingId(meal._id);
    setForm({
      foodName: meal.foodName,
      mealType: meal.mealType,
      quantity: meal.quantity,
      unit: meal.unit,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
      consumedAt: toLocalInput(meal.consumedAt),
      micros,
    });
    setMicrosOpen(Object.values(micros).some((value) => value !== "" && value !== null));
    setFieldErrors({});
    setError("");
    setMessage("");
  };

  const remove = async (meal) => {
    if (!window.confirm(`Delete ${meal.foodName}? This also removes it from daily totals.`)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await api(`/api/meals/${meal._id}`, { method: "DELETE" });
      if (editingId === meal._id) reset();
      setMessage("Meal deleted.");
      await load(page);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Meals</h1>
          <p className="lede">Log food and review what you have already saved.</p>
        </div>
      </header>

      <div className="meals-layout">
        <form className="card meal-form" onSubmit={save}>
          <div className="card-intro">
            <h2>{editingId ? "Edit meal" : "Add a meal"}</h2>
            <p className="muted">Calories and macros are required. Micronutrients can stay blank.</p>
          </div>
          <label>
            Food name
            <input name="foodName" value={form.foodName} onChange={onChange} aria-invalid={Boolean(fieldErrors.foodName)} required />
            {fieldErrors.foodName && <span className="field-error">{fieldErrors.foodName}</span>}
          </label>
          <div className="form-grid">
            <label>
              Meal type
              <select name="mealType" value={form.mealType} onChange={onChange}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </label>
            <label>
              Date and time
              <input name="consumedAt" type="datetime-local" value={form.consumedAt} onChange={onChange} required />
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="0" step="0.1" value={form.quantity} onChange={onChange} aria-invalid={Boolean(fieldErrors.quantity)} required />
              {fieldErrors.quantity && <span className="field-error">{fieldErrors.quantity}</span>}
            </label>
            <label>
              Unit
              <select name="unit" value={form.unit} onChange={onChange}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="serving">serving</option>
                <option value="piece">piece</option>
              </select>
            </label>
            {MACRO_FIELDS.map(([key, label, unit]) => (
              <label key={key}>
                {label}
                <span className="field-unit">
                  <input name={key} type="number" min="0" step="0.1" value={form[key]} onChange={onChange} aria-invalid={Boolean(fieldErrors[key])} required />
                  <span>{unit}</span>
                </span>
                {fieldErrors[key] && <span className="field-error">{fieldErrors[key]}</span>}
              </label>
            ))}
          </div>

          <button
            className="disclosure"
            type="button"
            aria-expanded={microsOpen}
            onClick={() => setMicrosOpen((open) => !open)}
          >
            <span>Micronutrients (optional)</span>
            <span>{microsOpen ? "Hide" : "Show"}</span>
          </button>
          {microsOpen && (
            <div className="form-grid micro-fields">
              {MICROS.map((item) => (
                <label key={item.key}>
                  {item.label} ({item.unit})
                  <input
                    name={item.key}
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.micros[item.key]}
                    onChange={onMicro}
                    aria-invalid={Boolean(fieldErrors[item.key])}
                  />
                  {fieldErrors[item.key] && <span className="field-error">{fieldErrors[item.key]}</span>}
                </label>
              ))}
              <p className="hint span-2">Leave a nutrient blank when you do not have a measurement. Blank is not the same as zero.</p>
            </div>
          )}

          {error && <p className="error">{error}</p>}
          {message && <p className="ok">{message}</p>}
          <div className="form-actions">
            {editingId && (
              <button className="ghost" type="button" onClick={reset}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update meal" : "Save meal"}
            </button>
          </div>
        </form>

        <div className="meal-list">
          <div className="card toolbar">
            <label>
              From
              <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label>
              To
              <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
            </label>
            <label>
              Meal type
              <select value={filters.mealType} onChange={(event) => setFilters((current) => ({ ...current, mealType: event.target.value }))}>
                <option value="">All</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </label>
          </div>

          {!result ? (
            <p className="muted">Loading meals…</p>
          ) : result.items.length === 0 ? (
            <article className="card">
              <p className="empty">No meals in this range. Add one with the form, or widen the dates.</p>
            </article>
          ) : (
            <div className="meal-scroll">
              {result.items.map((meal) => (
                <article key={meal._id} className="card meal-row">
                  {meal.imageUrl && <img className="thumb" src={meal.imageUrl} alt="" />}
                  <div className="meal-copy">
                    <h3>{meal.foodName}</h3>
                    <p className="muted">
                      {meal.mealType} · {meal.quantity} {meal.unit} · {new Date(meal.consumedAt).toLocaleString()}
                    </p>
                    <p className="hint">
                      P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g
                      {microHint(meal.micros)}
                    </p>
                  </div>
                  <div className="meal-side">
                    <p className="kcal">{meal.calories} kcal</p>
                    <div className="meal-actions">
                      <button className="ghost" type="button" onClick={() => edit(meal)}>
                        Edit
                      </button>
                      <button className="danger" type="button" onClick={() => remove(meal)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {result && result.totalPages > 1 && (
            <div className="pager">
              <button className="ghost" type="button" disabled={page <= 1} onClick={() => load(page - 1)}>
                Previous
              </button>
              <span className="muted">
                Page {page} of {result.totalPages}
              </span>
              <button className="ghost" type="button" disabled={page >= result.totalPages} onClick={() => load(page + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function microHint(micros = {}) {
  const parts = MICROS.filter((item) => micros[item.key] !== null && micros[item.key] !== undefined).map(
    (item) => `${item.label} ${micros[item.key]} ${item.unit}`
  );
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}
