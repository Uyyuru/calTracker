import { useState } from "react";
import { api } from "./api";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await api(path, { method: "POST", body });
      localStorage.setItem("token", data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3s5 4 5 9a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 3 3 0-3 0-6 0-8z" />
            </svg>
          </span>
          <div>
            <p className="brand-title">Calorie Tracker</p>
            <p className="brand-sub">Personal wellness</p>
          </div>
        </div>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          Log meals, set daily targets, and see how the week actually went.
        </p>
        <form onSubmit={submit} className="stack">
          {mode === "register" && (
            <label>
              Username
              <input name="username" value={form.username} onChange={onChange} minLength={3} required />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={onChange} required />
          </label>
          {mode === "register" && (
            <p className="hint">Use 8+ characters with upper, lower, a number, and a symbol.</p>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </section>
    </div>
  );
}
