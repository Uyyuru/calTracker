import { MICROS, formatAmount } from "./nutrition";

export default function MicroSummary({ totals, coverage }) {
  return (
    <div className="micro-summary">
      {MICROS.map((item) => {
        const amount = totals?.[item.key];
        const known = coverage?.[item.key]?.known;
        const meals = coverage?.[item.key]?.meals;
        const unavailable = amount === null || amount === undefined;
        return (
          <article key={item.key} className="micro-card">
            <p className="eyebrow">{item.label}</p>
            {unavailable ? (
              <>
                <p className="micro-missing">Not tracked</p>
                <p className="hint">No measured value</p>
              </>
            ) : (
              <>
                <p className="stat">
                  {formatAmount(amount)}
                  <span> {item.unit}</span>
                </p>
                {meals > 0 && known < meals ? (
                  <p className="hint">
                    {known} of {meals} meals
                  </p>
                ) : (
                  <p className="hint">Measured total</p>
                )}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
