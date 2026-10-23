import { useEffect, useState } from "react";
import { api, upload, toLocalInput } from "./api";
import { MICROS, collectMicros } from "./nutrition";

export default function ImportFood() {
  const [suggestion, setSuggestion] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [imports, setImports] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);

  const loadImports = () =>
    api("/api/imports?limit=5")
      .then((data) => setImports(data.items || []))
      .catch(() => setImports([]));

  useEffect(() => {
    loadImports();
  }, []);

  const extractImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setBusy("image");
    setProgress(0);
    setError("");
    setMessage("");
    const form = new FormData();
    form.append("image", file);
    try {
      const data = await upload("/api/extract/image", form, setProgress);
      setSuggestion({ ...data.suggestion, consumedAt: toLocalInput() });
      setImageFile(data.file || null);
    } catch (err) {
      setSuggestion(null);
      setImageFile(null);
      setError(err.message);
    } finally {
      setBusy("");
      setProgress(0);
    }
  };

  const extractPdf = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setBusy("pdf");
    setProgress(0);
    setError("");
    setMessage("");
    const form = new FormData();
    form.append("file", file);
    try {
      const data = await upload("/api/extract/pdf", form, setProgress);
      setEntries(
        data.entries.map((entry) => ({
          ...entry,
          consumedAt: toLocalInput(entry.consumedAt),
        }))
      );
      setPdfFile(data.file || null);
      await loadImports();
    } catch (err) {
      setEntries([]);
      setPdfFile(null);
      setError(err.message);
    } finally {
      setBusy("");
      setProgress(0);
    }
  };

  const saveMeal = async (meal) => {
    const { micros, errors } = collectMicros(meal.micros || {});
    if (Object.keys(errors).length) {
      throw new Error(Object.values(errors)[0]);
    }
    await api("/api/meals", {
      method: "POST",
      body: {
        ...meal,
        quantity: Number(meal.quantity),
        calories: Number(meal.calories),
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fats: Number(meal.fats),
        micros,
        consumedAt: new Date(meal.consumedAt).toISOString(),
      },
    });
  };

  const confirmImage = async () => {
    if (busy) return;
    setBusy("save-image");
    setError("");
    try {
      await saveMeal({
        ...suggestion,
        source: "ai_photo",
        imagePublicId: imageFile?.publicId,
        imageResourceType: imageFile?.resourceType,
      });
      setSuggestion(null);
      setImageFile(null);
      setMessage("Photo meal saved.");
    } catch (err) {
      setImageFile(null);
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const discardImage = async () => {
    if (!imageFile?.publicId || busy) return;
    setBusy("discard");
    setError("");
    try {
      await api("/api/extract/discard", {
        method: "POST",
        body: { publicId: imageFile.publicId, resourceType: imageFile.resourceType },
      });
      setSuggestion(null);
      setImageFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const confirmPdf = async () => {
    if (busy) return;
    setBusy("save-pdf");
    setError("");
    try {
      for (const entry of entries) {
        await saveMeal({ ...entry, source: "pdf_import" });
      }
      setEntries([]);
      setMessage("PDF meals saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const updateSuggestion = (event) => {
    setSuggestion((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateMicro = (event) => {
    const { name, value } = event.target;
    setSuggestion((current) => ({
      ...current,
      micros: { ...(current.micros || {}), [name]: value },
    }));
  };

  return (
    <section className="stack">
      <header className="page-head">
        <div>
          <h1>Import</h1>
          <p className="lede">Extract a preview first. The meal is saved only when you confirm.</p>
        </div>
      </header>
      <div className="split">
        <article className="card stack">
          <h3>Photo or label</h3>
          <p className="hint">JPEG, PNG, or WebP. Up to 8 MB.</p>
          <label className="file">
            {busy === "image" ? `Uploading ${progress}%` : "Choose image"}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={extractImage} disabled={Boolean(busy)} />
          </label>
          {busy === "image" && (
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          {imageFile?.secureUrl && <img className="preview" src={imageFile.secureUrl} alt="Uploaded food" />}
          {suggestion && (
            <div className="stack">
              <label>
                Food
                <input name="foodName" value={suggestion.foodName} onChange={updateSuggestion} />
              </label>
              <div className="row">
                <label>
                  Meal
                  <select name="mealType" value={suggestion.mealType} onChange={updateSuggestion}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </label>
                <label>
                  Calories
                  <input name="calories" type="number" value={suggestion.calories} onChange={updateSuggestion} />
                </label>
              </div>
              <div className="row">
                <label>
                  Protein
                  <input name="protein" type="number" value={suggestion.protein} onChange={updateSuggestion} />
                </label>
                <label>
                  Carbs
                  <input name="carbs" type="number" value={suggestion.carbs} onChange={updateSuggestion} />
                </label>
                <label>
                  Fats
                  <input name="fats" type="number" value={suggestion.fats} onChange={updateSuggestion} />
                </label>
              </div>
              <div className="form-grid">
                {MICROS.map((item) => (
                  <label key={item.key}>
                    {item.label} ({item.unit})
                    <input
                      name={item.key}
                      type="number"
                      min="0"
                      step="0.1"
                      value={suggestion.micros?.[item.key] ?? ""}
                      onChange={updateMicro}
                    />
                  </label>
                ))}
              </div>
              <p className="hint">Blank micronutrients stay untracked. Zero is saved only if you enter 0.</p>
              <div className="row">
                <button type="button" onClick={confirmImage} disabled={Boolean(busy)}>
                  {busy === "save-image" ? "Saving…" : "Save this meal"}
                </button>
                <button className="ghost" type="button" onClick={discardImage} disabled={Boolean(busy)}>
                  Discard photo
                </button>
              </div>
            </div>
          )}
        </article>

        <article className="card stack">
          <h3>Food diary PDF</h3>
          <p className="hint">Needs a table with headers like food, meal, calories, protein, carbs, fats.</p>
          <label className="file">
            {busy === "pdf" ? `Uploading ${progress}%` : "Choose PDF"}
            <input type="file" accept="application/pdf,.pdf" onChange={extractPdf} disabled={Boolean(busy)} />
          </label>
          {busy === "pdf" && (
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          {pdfFile?.secureUrl && (
            <a className="file-link" href={pdfFile.secureUrl} target="_blank" rel="noreferrer">
              Download {pdfFile.originalName || "PDF"}
            </a>
          )}
          {entries.length > 0 && (
            <>
              <ul className="plain-list">
                {entries.map((entry, index) => (
                  <li key={`${entry.foodName}-${index}`}>
                    <strong>{entry.foodName}</strong>
                    <span>
                      {entry.mealType} · {entry.calories} kcal
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={confirmPdf} disabled={Boolean(busy)}>
                {busy === "save-pdf" ? "Saving…" : `Save ${entries.length} meals`}
              </button>
            </>
          )}
          {imports.length > 0 && (
            <div>
              <h3>Recent PDFs</h3>
              <ul className="plain-list">
                {imports.map((item) => (
                  <li key={item._id}>
                    <strong>{item.filename}</strong>
                    {item.secureUrl ? (
                      <a className="file-link" href={item.secureUrl} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ) : (
                      <span>{item.importedCount} rows</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="ok">{message}</p>}
    </section>
  );
}
