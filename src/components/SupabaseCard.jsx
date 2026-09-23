import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings, saveSettings } from "@/api/settings";
import { testConnection, getCounts, isSupabaseConfigured } from "@/api/supabase";

const PROJECT_REF = "ktqmwpbzcnzkhjskqisy";
const KEYS_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api-keys`;

const LABELS = {
  Persona: "מומחים",
  ChatSession: "שיחות",
  Message: "הודעות",
  UploadedDocument: "מסמכים",
};

const STEPS = [
  <>לוחצים על הכפתור למטה. נפתח דף המפתחות של הפרויקט ב-Supabase.</>,
  <>מחפשים את המפתח בשם <b dir="ltr">anon</b> או <b dir="ltr">publishable</b> — זה המפתח הציבורי, לא ה-<span dir="ltr">secret</span>.</>,
  <>מעתיקים אותו, מדביקים כאן ולוחצים <b>חיבור</b>.</>,
];

function explain(error) {
  const m = error?.message || "";
  if (/JWT|apikey|Invalid API key|401/i.test(m)) return "המפתח לא התקבל. כדאי לוודא שהעתקת את המפתח הציבורי במלואו.";
  if (/relation|does not exist|42P01/i.test(m)) return "החיבור עובד, אבל הטבלאות לא נמצאו בפרויקט הזה. כדאי לבדוק שהכתובת נכונה.";
  if (/fetch|network/i.test(m)) return "לא הצלחנו להגיע ל-Supabase. כדאי לבדוק את חיבור האינטרנט.";
  return m || "החיבור נכשל.";
}

export default function SupabaseCard() {
  const saved = getSettings();
  const [connected, setConnected] = useState(isSupabaseConfigured());
  const [editing, setEditing] = useState(!isSupabaseConfigured());
  const [counts, setCounts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => {
    if (connected) getCounts().then(setCounts).catch(() => setCounts([]));
  }, [connected]);

  const connect = async () => {
    const supabaseKey = (keyRef.current?.value || "").trim();
    const supabaseUrl = (urlRef.current?.value || "").trim();
    if (!supabaseKey) {
      setError("השדה ריק. צריך להדביק את המפתח הציבורי מ-Supabase.");
      return;
    }
    setError("");
    setBusy(true);
    saveSettings({ supabaseKey, supabaseUrl });
    try {
      await testConnection();
      setConnected(true);
      setEditing(false);
    } catch (e) {
      setConnected(false);
      setError(explain(e));
    }
    setBusy(false);
  };

  const shown = counts.filter(([, c]) => c > 0);

  return (
    <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <header className="px-6 pt-6">
        <h2 className="text-xl font-bold font-frank text-foreground">מאגר הנתונים</h2>
        <p className="text-sm text-muted-foreground mt-1">
          המומחים והשיחות נשמרים במאגר שלך ב-Supabase. כל מומחה חדש וכל הודעה נשמרים שם מיד,
          ואפשר להגיע אליהם מכל מכשיר.
        </p>
      </header>

      <div className="px-6 py-5 space-y-5">
        {connected && !editing ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3" role="status">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/15 text-green-700">
                <Check size={15} strokeWidth={3} aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="font-bold text-foreground">מחובר למאגר</p>
                {shown.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    שמורים: {shown.map(([n, c]) => `${c} ${LABELS[n] || n}`).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setEditing(true); setError(""); }}
              className="text-sm text-accent underline underline-offset-2 hover:text-accent/80"
            >
              החלפת המפתח
            </button>
          </div>
        ) : (
          <>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <Button variant="outline" asChild>
              <a href={KEYS_URL} target="_blank" rel="noopener noreferrer">
                פתיחת דף המפתחות ב-Supabase
                <ExternalLink size={14} className="mr-2" aria-hidden="true" />
              </a>
            </Button>

            <div className="space-y-3">
              <div>
                <label htmlFor="sb-key" className="block text-sm font-medium text-foreground mb-1.5">
                  הדבקת המפתח הציבורי
                </label>
                <div className="flex gap-2">
                  <Input
                    id="sb-key" ref={keyRef} type="password" dir="ltr" autoComplete="off"
                    defaultValue={saved.supabaseKey} placeholder="sb_publishable_..."
                    onKeyDown={(e) => e.key === "Enter" && connect()}
                    className="flex-1 h-11 font-mono"
                  />
                  <Button onClick={connect} disabled={busy} className="h-11 px-7 font-bold">
                    {busy ? "בודק…" : "חיבור"}
                  </Button>
                </div>
              </div>
              <div>
                <label htmlFor="sb-url" className="block text-sm font-medium text-foreground mb-1.5">
                  כתובת הפרויקט
                </label>
                <Input id="sb-url" ref={urlRef} dir="ltr" defaultValue={saved.supabaseUrl} className="font-mono" />
              </div>
            </div>
          </>
        )}

        <div aria-live="polite">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/25 px-3.5 py-3">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 bg-secondary/30 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          המפתח נשמר רק בדפדפן הזה ולא בקוד האתר — מי שמחזיק בו יכול לקרוא את המומחים והשיחות, ולכן אין לשתף אותו.
        </p>
      </footer>
    </section>
  );
}
