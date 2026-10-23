import { useEffect, useState } from "react";
import { api } from "./api";
import AuthScreen from "./AuthScreen";
import Dashboard from "./Dashboard";
import Meals from "./Meals";
import Goals from "./Goals";
import Reports from "./Reports";
import ImportFood from "./ImportFood";
import Chat from "./Chat";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutIcon },
  { id: "meals", label: "Meals", icon: UtensilsIcon },
  { id: "goals", label: "Goals", icon: TargetIcon },
  { id: "reports", label: "Reports", icon: ChartIcon },
  { id: "import", label: "Import", icon: FileIcon },
  { id: "chat", label: "Chat", icon: ChatIcon },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setReady(true));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setTab("dashboard");
    setNavOpen(false);
  };

  const selectTab = (id) => {
    setTab(id);
    setNavOpen(false);
  };

  if (!ready) {
    return <p className="center-note">Loading…</p>;
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <div className={tab === "chat" ? "shell chat-mode" : "shell"}>
      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <FlameIcon />
            </span>
            <div>
              <p className="brand-title">Calorie Tracker</p>
              <p className="brand-sub">Personal wellness</p>
            </div>
          </div>
          <div className="user-card">
            <p className="user-name">{user.username}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <ul>
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={tab === item.id ? "nav-link active" : "nav-link"}
                    aria-current={tab === item.id ? "page" : undefined}
                    onClick={() => selectTab(item.id)}
                  >
                    <Icon />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <button className="nav-link logout" onClick={logout} type="button">
            <LogoutIcon />
            Log out
          </button>
        </div>
      </aside>
      {navOpen && (
        <button className="backdrop" type="button" aria-label="Close navigation menu" onClick={() => setNavOpen(false)} />
      )}
      <div className="workspace">
        <div className="mobile-bar">
          <button type="button" className="icon-button" aria-label="Open navigation menu" onClick={() => setNavOpen(true)}>
            <MenuIcon />
          </button>
          <span>Calorie Tracker</span>
          <span className="mobile-spacer" />
        </div>
        <main>
          <div className="page">
            {tab === "dashboard" && <Dashboard user={user} onNavigate={selectTab} />}
            {tab === "meals" && <Meals />}
            {tab === "goals" && <Goals onNavigate={selectTab} />}
            {tab === "reports" && <Reports />}
            {tab === "import" && <ImportFood />}
            {tab === "chat" && <Chat />}
          </div>
        </main>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s5 4 5 9a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 3 3 0-3 0-6 0-8z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6H6a2 2 0 00-2 2v8a2 2 0 002 2h3" />
      <path d="M15 16l4-4-4-4M19 12H10" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function UtensilsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 3v8M10 3v8M6 11v10M10 11v10M14 3v18M18 3c1.5 0 3 1.5 3 4v4c0 2.5-1.5 4-3 4" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 12a8 8 0 01-8 8H7l-4 3V12a8 8 0 018-8h2a8 8 0 018 8z" />
    </svg>
  );
}
