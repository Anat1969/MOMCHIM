import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "../components/Breadcrumbs";
import { getSettings, saveSettings } from "@/api/settings";
import { testApiKey } from "@/api/llm";
import { checkAccess } from "@/api/github";
import {
  syncWithGithub, getSyncStatus, onSyncStatus, exportBackup, importJson, importCsv,
} from "@/api/store";

const MODELS = [
  { id: "claude-opus-5", label: "Claude Opus 5 — איכות מרבית (מומלץ)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 — מהיר וזול יותר" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — הכי מהיר וזול" },
];

const STATUS_TEXT = {
  off: "לא מחובר",
  pending: "ממתין לשמירה…",
  syncing: "מסנכרן…",
  synced: "מסונכרן ✓",
  error: "שגיאה",
};

function Section({ title, children }) {
  return (
    <section className="p-6 rounded-xl border border-border/50 bg-card space-y-4">
      <h2 className="text-xl font-bold font-frank text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Feedback({ result }) {
  if (!result) return null;
  return (
    <p className={`text-sm ${result.ok ? "text-green-700" : "text-destructive"}`}>{result.text}</p>
  );
}

/** Reads the field's live DOM value — a browser password manager can fill an
 *  input without firing React's change event, which would leave state empty. */
const val = (ref) => (ref.current?.value || "").trim();

export default function Settings() {
  const saved = getSettings();
  const [model, setModel] = useState(saved.model);
  const [claudeResult, setClaudeResult] = useState(null);
  const [githubResult, setGithubResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [status, setStatus] = useState(getSyncStatus);
  const [busy, setBusy] = useState("");
  const fileInput = useRef(null);
  const keyRef = useRef(null);
  const tokenRef = useRef(null);
  const repoRef = useRef(null);

  useEffect(() => onSyncStatus(setStatus), []);

  const saveClaude = async () => {
    const anthropicKey = val(keyRef);
    if (!anthropicKey) {
      setClaudeResult({ ok: false, text: "שדה המפתח ריק. הדבק את המפתח ונסה שוב." });
      return;
    }
    saveSettings({ anthropicKey, model });
    setBusy("claude");
    try {
      await testApiKey();
      setClaudeResult({ ok: true, text: "המפתח תקין ונשמר. אפשר להתחיל לשוחח." });
    } catch (e) {
      const text = /401|authentication|invalid x-api-key/i.test(e.message)
        ? "המפתח נשמר, אך Anthropic דחתה אותו. בדוק שהעתקת אותו במלואו ושהוא עדיין פעיל."
        : `המפתח נשמר, אך הבדיקה נכשלה: ${e.message}`;
      setClaudeResult({ ok: false, text });
    }
    setBusy("");
  };

  const saveGithub = async () => {
    const githubToken = val(tokenRef);
    const dataRepo = val(repoRef);
    saveSettings({ githubToken, dataRepo });
    if (!githubToken) { setGithubResult({ ok: true, text: "הסנכרון כובה." }); return; }
    setBusy("github");
    try {
      await checkAccess();
      await syncWithGithub();
      setGithubResult({ ok: true, text: "מחובר. הנתונים סונכרנו." });
    } catch (e) {
      setGithubResult({ ok: false, text: e.message });
    }
    setBusy("");
  };

  const download = async () => {
    const blob = new Blob([await exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `momchim-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    const lines = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const counts = /\.csv$/i.test(file.name) ? await importCsv(text, file.name) : await importJson(text);
        lines.push(`${file.name}: ${counts.map(([n, c]) => `${c} ${n}`).join(", ") || "אין נתונים"}`);
      } catch (err) {
        lines.push(`${file.name}: שגיאה — ${err.message}`);
      }
    }
    setImportResult({ ok: !lines.some((l) => l.includes("שגיאה")), text: lines.join(" · ") });
  };

  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={[{ label: "דשבורד", href: "/" }, { label: "הגדרות" }]} />
      <h1 className="text-3xl font-black font-frank text-foreground mb-6">הגדרות</h1>

      <div className="space-y-6">
        <Section title="מנוע ה-AI (Claude)">
          <p className="text-sm text-muted-foreground">
            המומחים עונים באמצעות Claude. צור מפתח ב-
            <a className="text-accent underline mx-1" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
              console.anthropic.com
            </a>
            והדבק אותו כאן. המפתח נשמר רק בדפדפן הזה ולא נשלח לשום מקום מלבד Anthropic.
          </p>
          <Field label="מפתח API">
            <Input ref={keyRef} type="password" dir="ltr" defaultValue={saved.anthropicKey} placeholder="sk-ant-..." />
          </Field>
          <Field label="מודל">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={saveClaude} disabled={busy === "claude"}>
              {busy === "claude" ? "בודק…" : "שמור ובדוק"}
            </Button>
            <Feedback result={claudeResult} />
          </div>
        </Section>

        <Section title="שמירת נתונים בגיטהאב">
          <p className="text-sm text-muted-foreground">
            הנתונים נשמרים תמיד בדפדפן. כדי לגבות אותם ולראות אותם גם במכשירים אחרים, הם מסונכרנים למאגר פרטי בגיטהאב.
            צור טוקן ב-
            <a className="text-accent underline mx-1" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
              GitHub → Fine-grained token
            </a>
            עם גישה למאגר הנתונים בלבד והרשאת <b>Contents: Read and write</b>.
          </p>
          <Field label="טוקן גיטהאב">
            <Input ref={tokenRef} type="password" dir="ltr" defaultValue={saved.githubToken} placeholder="github_pat_..." />
          </Field>
          <Field label="מאגר הנתונים" hint="בפורמט owner/repo. המאגר חייב להיות פרטי.">
            <Input ref={repoRef} dir="ltr" defaultValue={saved.dataRepo} />
          </Field>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={saveGithub} disabled={busy === "github"}>
              {busy === "github" ? "מתחבר…" : "שמור וסנכרן"}
            </Button>
            <span className="text-sm text-muted-foreground">
              מצב: {STATUS_TEXT[status.state]}{status.state === "error" && status.message ? ` — ${status.message}` : ""}
            </span>
          </div>
          <Feedback result={githubResult} />
        </Section>

        <Section title="גיבוי וייבוא">
          <p className="text-sm text-muted-foreground">
            ייצוא יוצר קובץ גיבוי של כל המומחים והשיחות. בייבוא אפשר לבחור קובץ גיבוי, או קובצי CSV שיוצאו מטבלאות הנתונים ב-Base44
            (Persona, ChatSession, Message, UploadedDocument). רשומות קיימות לא נמחקות.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={download}>ייצוא גיבוי</Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>ייבוא נתונים</Button>
            <input ref={fileInput} type="file" accept=".json,.csv" multiple hidden onChange={onImport} />
          </div>
          <Feedback result={importResult} />
        </Section>
      </div>
    </div>
  );
}
