import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import ThemeSwitcher from "./ThemeSwitcher";
import { getSettings } from "@/api/settings";
import { getSyncStatus, onSyncStatus } from "@/api/store";

const DOT_COLORS = {
  synced: "bg-green-500",
  pending: "bg-amber-400",
  syncing: "bg-amber-400 animate-pulse",
  error: "bg-red-500",
};

function SyncDot() {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => onSyncStatus(setStatus), []);
  const color = DOT_COLORS[status.state];
  if (!color) return null;
  return <span title={`סנכרון גיטהאב: ${status.state}`} className={`w-2 h-2 rounded-full ${color}`} />;
}

function useHasApiKey() {
  const [hasKey, setHasKey] = useState(() => !!getSettings().anthropicKey);
  useEffect(() => {
    const update = () => setHasKey(!!getSettings().anthropicKey);
    window.addEventListener("momchim-settings", update);
    return () => window.removeEventListener("momchim-settings", update);
  }, []);
  return hasKey;
}

export default function AppLayout() {
  const location = useLocation();
  const hasKey = useHasApiKey();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-frank font-bold text-lg">ח</span>
            </div>
            <h1 className="text-2xl font-black font-frank text-foreground tracking-tight">
              חדר המומחים
            </h1>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              דשבורד
            </Link>
            <Link
              to="/persona/new"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith("/persona")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              מומחה חדש
            </Link>
            <Link
              to="/confrontation"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/confrontation"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              עימות
            </Link>
            <Link
              to="/settings"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                location.pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              הגדרות
              <SyncDot />
            </Link>
            <ThemeSwitcher />
          </nav>
        </div>
      </header>
      {!hasKey && location.pathname !== "/settings" && (
        <div className="bg-accent/10 border-b border-accent/30 text-sm text-foreground">
          <div className="max-w-7xl mx-auto px-6 py-2.5">
            כדי שהמומחים יוכלו לענות, צריך לחבר את האפליקציה למנוע ה-AI.{" "}
            <Link to="/settings" className="text-accent font-bold underline">חיבור עכשיו</Link>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}