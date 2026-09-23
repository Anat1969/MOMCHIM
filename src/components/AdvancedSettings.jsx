import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSettings, saveSettings } from "@/api/settings";
import { exportBackup, importJson, importCsv, resetLocalData } from "@/api/store";

const MODELS = [
  { id: "claude-opus-5", label: "Claude Opus 5 — איכות מרבית (מומלץ)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 — מהיר וזול יותר" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — הכי מהיר וזול" },
];

function Group({ title, description, children }) {
  return (
    <div className="px-6 py-5 border-t border-border/40 space-y-3">
      <div>
        <h3 className="font-bold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Feedback({ result }) {
  return (
    <div aria-live="polite">
      {result && (
        <p className={`text-sm ${result.ok ? "text-green-700" : "text-destructive"}`}>{result.text}</p>
      )}
    </div>
  );
}

export default function AdvancedSettings() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(getSettings().model);
  const [importResult, setImportResult] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [busy, setBusy] = useState("");
  const fileInput = useRef(null);

  const changeModel = (e) => {
    setModel(e.target.value);
    saveSettings({ model: e.target.value });
  };

  const reset = async () => {
    if (!getSettings().githubToken) {
      setResetResult({ ok: false, text: "צריך קודם להפעיל שמירה אוטומטית, אחרת אין מאיפה לטעון." });
      return;
    }
    if (!window.confirm("למחוק את הנתונים בדפדפן הזה ולטעון מחדש מגיטהאב?")) return;
    setBusy("reset");
    try {
      const counts = await resetLocalData();
      setResetResult({ ok: true, text: `נטען מחדש: ${counts.map(([n, c]) => `${c} ${n}`).join(", ")}` });
    } catch (e) {
      setResetResult({ ok: false, text: e.message });
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
    <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <h2>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="advanced-panel"
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-start hover:bg-secondary/30 transition-colors"
        >
          <span>
            <span className="block font-bold font-frank text-foreground">הגדרות מתקדמות</span>
            <span className="block text-sm text-muted-foreground mt-0.5">
              בחירת מודל, גיבוי לקובץ, ייבוא נתונים
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      {open && (
        <div id="advanced-panel">
          <Group
            title="בחירת מודל"
            description="מודל חזק יותר עונה טוב יותר אבל עולה יותר. ברירת המחדל מתאימה לרוב השימושים."
          >
            <label htmlFor="model-select" className="sr-only">מודל</label>
            <select
              id="model-select"
              value={model}
              onChange={changeModel}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Group>

          <Group
            title="גיבוי לקובץ וייבוא"
            description="ייצוא שומר את כל המומחים והשיחות לקובץ אחד במחשב. בייבוא אפשר לבחור קובץ גיבוי או קובצי CSV מ-Base44. רשומות קיימות לא נמחקות."
          >
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={download}>ייצוא לקובץ</Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>ייבוא נתונים</Button>
              <input ref={fileInput} type="file" accept=".json,.csv" multiple hidden onChange={onImport} />
            </div>
            <Feedback result={importResult} />
          </Group>

          <Group
            title="טעינה מחדש מגיטהאב"
            description="מוחק את העותק שבדפדפן הזה וטוען אותו מחדש מהמאגר. שימושי אם מופיעות כפילויות. במאגר עצמו לא נמחק דבר."
          >
            <Button variant="outline" onClick={reset} disabled={busy === "reset"}>
              {busy === "reset" ? "טוען…" : "מחיקה מקומית וטעינה מחדש"}
            </Button>
            <Feedback result={resetResult} />
          </Group>
        </div>
      )}
    </section>
  );
}
