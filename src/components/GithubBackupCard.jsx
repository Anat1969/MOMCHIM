import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ExternalLink, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings, saveSettings } from "@/api/settings";
import { checkAccess } from "@/api/github";
import { syncWithGithub, getSyncStatus, onSyncStatus, getCounts } from "@/api/store";

const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

const LABELS = {
  Persona: "מומחים",
  ChatSession: "שיחות",
  Message: "הודעות",
  UploadedDocument: "מסמכים",
};

const STATUS = {
  off: { text: "כבוי", tone: "muted" },
  pending: { text: "שומר…", tone: "busy" },
  syncing: { text: "שומר…", tone: "busy" },
  synced: { text: "הכול שמור", tone: "ok" },
  error: { text: "השמירה נכשלה", tone: "bad" },
};

const STEPS = [
  <>לוחצים על הכפתור למטה. נפתח דף ביצירת קוד גישה בגיטהאב.</>,
  <>תחת <b>Repository access</b> בוחרים <b>Only select repositories</b>, ומסמנים את המאגר <b dir="ltr">MOMCHIM-data</b>.</>,
  <>תחת <b>Permissions → Repository permissions</b> מחפשים <b>Contents</b> ומשנים ל-<b dir="ltr">Read and write</b>.</>,
  <>יוצרים את הקוד, מעתיקים אותו, מדביקים כאן ולוחצים <b>הפעלה</b>.</>,
];

function explain(error) {
  const m = error.message || "";
  if (/401|bad credentials/i.test(m)) return "הקוד לא התקבל בגיטהאב. כדאי לוודא שהעתקת אותו במלואו.";
  if (/404|not found/i.test(m)) return "המאגר לא נמצא, או שלקוד אין גישה אליו. כדאי לבדוק שסימנת את MOMCHIM-data ברשימת המאגרים.";
  if (/הרשאת כתיבה|403/i.test(m)) return "לקוד אין הרשאת כתיבה. צריך להגדיר Contents: Read and write.";
  if (/fetch|network/i.test(m)) return "לא הצלחנו להגיע לגיטהאב. כדאי לבדוק את חיבור האינטרנט.";
  return m;
}

export default function GithubBackupCard() {
  const saved = getSettings();
  const [connected, setConnected] = useState(!!saved.githubToken);
  const [editing, setEditing] = useState(!saved.githubToken);
  const [status, setStatus] = useState(getSyncStatus);
  const [counts, setCounts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(null);
  const repoRef = useRef(null);

  useEffect(() => onSyncStatus(setStatus), []);
  useEffect(() => { getCounts().then(setCounts); }, [status]);

  const connect = async () => {
    const githubToken = (tokenRef.current?.value || "").trim();
    const dataRepo = (repoRef.current?.value || "").trim();
    if (!githubToken) {
      setError("השדה ריק. צריך להדביק את קוד הגישה מגיטהאב.");
      return;
    }
    setError("");
    setBusy(true);
    saveSettings({ githubToken, dataRepo });
    try {
      await checkAccess();
      await syncWithGithub();
      setConnected(true);
      setEditing(false);
    } catch (e) {
      setConnected(false);
      setError(explain(e));
    }
    setBusy(false);
  };

  const state = STATUS[status.state] || STATUS.off;
  const shown = counts.filter(([, c]) => c > 0);

  return (
    <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <header className="px-6 pt-6">
        <h2 className="text-xl font-bold font-frank text-foreground">שמירה אוטומטית</h2>
        <p className="text-sm text-muted-foreground mt-1">
          המומחים והשיחות נשמרים בדפדפן הזה. חיבור לגיטהאב שומר עותק קבוע במאגר הפרטי שלך —
          כל מומחה חדש וכל שיחה נשמרים שם מעצמם, ואפשר להגיע אליהם מכל מכשיר.
        </p>
      </header>

      <div className="px-6 py-5 space-y-5">
        {connected && !editing ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3" role="status">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                state.tone === "ok" ? "bg-green-600/15 text-green-700"
                  : state.tone === "bad" ? "bg-destructive/15 text-destructive"
                  : "bg-secondary text-muted-foreground"
              }`}>
                {state.tone === "busy"
                  ? <RefreshCw size={13} className="animate-spin" aria-hidden="true" />
                  : state.tone === "bad"
                    ? <CircleAlert size={14} aria-hidden="true" />
                    : <Check size={15} strokeWidth={3} aria-hidden="true" />}
              </span>
              <div className="flex-1">
                <p className="font-bold text-foreground">{state.text}</p>
                {shown.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    שמורים במאגר: {shown.map(([n, c]) => `${c} ${LABELS[n] || n}`).join(" · ")}
                  </p>
                )}
                {status.state === "error" && status.message && (
                  <p className="text-sm text-destructive mt-1">{status.message}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => syncWithGithub()}>
                בדיקת סנכרון עכשיו
              </Button>
              <button
                onClick={() => { setEditing(true); setError(""); }}
                className="text-sm text-accent underline underline-offset-2 hover:text-accent/80"
              >
                החלפת קוד הגישה
              </button>
            </div>
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
              <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer">
                יצירת קוד גישה בגיטהאב
                <ExternalLink size={14} className="mr-2" aria-hidden="true" />
              </a>
            </Button>

            <div className="space-y-3">
              <div>
                <label htmlFor="gh-token" className="block text-sm font-medium text-foreground mb-1.5">
                  הדבקת קוד הגישה
                </label>
                <div className="flex gap-2">
                  <Input
                    id="gh-token" ref={tokenRef} type="password" dir="ltr" autoComplete="off"
                    defaultValue={saved.githubToken} placeholder="github_pat_..."
                    onKeyDown={(e) => e.key === "Enter" && connect()}
                    className="flex-1 h-11 font-mono"
                  />
                  <Button onClick={connect} disabled={busy} className="h-11 px-7 font-bold">
                    {busy ? "מחבר…" : "הפעלה"}
                  </Button>
                </div>
              </div>
              <div>
                <label htmlFor="gh-repo" className="block text-sm font-medium text-foreground mb-1.5">
                  מאגר הנתונים
                </label>
                <Input id="gh-repo" ref={repoRef} dir="ltr" defaultValue={saved.dataRepo} className="font-mono" />
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
          המאגר פרטי — רק את רואה אותו. אפשר לעבוד גם בלי החיבור הזה, אבל אז הנתונים קיימים רק במחשב הזה.
        </p>
      </footer>
    </section>
  );
}
