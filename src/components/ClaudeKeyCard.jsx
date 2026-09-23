import { useRef, useState } from "react";
import { Check, CircleAlert, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSettings, saveSettings, getPersistError } from "@/api/settings";
import { testApiKey } from "@/api/llm";

const CONSOLE_URL = "https://console.anthropic.com/settings/keys";

const STEPS = [
  <>לוחצים על הכפתור למטה. נפתח האתר של Anthropic, ושם נרשמים או מתחברים.</>,
  <>באתר לוחצים על <b>Create Key</b>, נותנים שם כלשהו, ומעתיקים את הקוד שמופיע. הוא מתחיל ב-<code dir="ltr" className="font-mono">sk-ant-</code>.</>,
  <>חוזרים לכאן, מדביקים את הקוד בשדה, ולוחצים <b>חבר</b>.</>,
];

/** Turns any failure from the API call into something worth acting on. */
function explain(error) {
  const m = error.message || "";
  if (/401|authentication|invalid x-api-key|invalid_api_key/i.test(m)) {
    return "הקוד לא התקבל אצל Anthropic. כדאי לוודא שהעתקת אותו במלואו, ושלא נוצר קוד חדש שמחליף אותו.";
  }
  if (/402|credit|billing|quota|insufficient/i.test(m)) {
    return "הקוד תקין, אבל אין יתרה בחשבון ב-Anthropic. צריך להוסיף אמצעי תשלום באתר שלהם.";
  }
  if (/429|rate limit/i.test(m)) {
    return "יותר מדי בקשות כרגע. כדאי לנסות שוב בעוד דקה.";
  }
  if (/fetch|network|Failed to fetch|connection/i.test(m)) {
    return "לא הצלחנו להגיע ל-Anthropic. כדאי לבדוק את חיבור האינטרנט ולנסות שוב.";
  }
  return `הבדיקה נכשלה: ${m}`;
}

export default function ClaudeKeyCard() {
  const saved = getSettings();
  const [verified, setVerified] = useState(saved.keyVerified && !!saved.anthropicKey);
  const [editing, setEditing] = useState(!saved.anthropicKey);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const keyRef = useRef(null);

  const connect = async () => {
    // Read the live DOM value: a password manager can fill the field without
    // firing React's change event.
    const anthropicKey = (keyRef.current?.value || "").trim();
    if (!anthropicKey) {
      setError("השדה ריק. צריך להדביק את הקוד מהאתר של Anthropic.");
      return;
    }
    setError("");
    setBusy(true);
    saveSettings({ anthropicKey, keyVerified: false });
    try {
      await testApiKey();
      saveSettings({ keyVerified: true });
      setVerified(true);
      setEditing(false);
      setWarning(
        getPersistError()
          ? "הקוד עובד, אבל הדפדפן לא מאפשר לשמור אותו. הוא יישכח כשתסגרי את הלשונית — בדפדפן פרטי או כשחסימת נתוני אתרים מופעלת זה מה שקורה."
          : ""
      );
    } catch (e) {
      setVerified(false);
      setError(explain(e));
    }
    setBusy(false);
  };

  return (
    <section className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <header className="px-6 pt-6">
        <h2 className="text-xl font-bold font-frank text-foreground">חיבור למנוע ה-AI</h2>
        <p className="text-sm text-muted-foreground mt-1">
          המומחים שלך חושבים ועונים באמצעות Claude. כדי שזה יעבוד, צריך קוד אישי אחד מחברת Anthropic —
          משהו כמו סיסמה שמחברת בין האפליקציה שלך למנוע. הקוד נשמר רק בדפדפן הזה.
        </p>
      </header>

      <div className="px-6 py-5 space-y-5">
        {verified && !editing ? (
          <div className="flex items-start gap-3" role="status">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600/15 text-green-700">
              <Check size={15} strokeWidth={3} aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="font-bold text-foreground">מחובר ומוכן לעבודה</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                אפשר לפתוח שיחה עם כל אחד מהמומחים.
              </p>
              <button
                onClick={() => { setEditing(true); setError(""); }}
                className="mt-2 text-sm text-accent underline underline-offset-2 hover:text-accent/80"
              >
                החלפת הקוד
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
              <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                פתיחת האתר של Anthropic
                <ExternalLink size={14} className="mr-2" aria-hidden="true" />
              </a>
            </Button>

            <div className="space-y-2">
              <label htmlFor="anthropic-key" className="block text-sm font-medium text-foreground">
                הדבקת הקוד
              </label>
              <div className="flex gap-2">
                <Input
                  id="anthropic-key"
                  ref={keyRef}
                  type="password"
                  dir="ltr"
                  autoComplete="off"
                  defaultValue={saved.anthropicKey}
                  placeholder="sk-ant-..."
                  onKeyDown={(e) => e.key === "Enter" && connect()}
                  className="flex-1 h-11 font-mono"
                />
                <Button onClick={connect} disabled={busy} className="h-11 px-7 font-bold">
                  {busy ? "בודק…" : "חבר"}
                </Button>
              </div>
            </div>
          </>
        )}

        <div aria-live="polite" className="space-y-3">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/25 px-3.5 py-3">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {warning && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3.5 py-3">
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-sm text-amber-700">{warning}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="px-6 py-3 bg-secondary/30 border-t border-border/40">
        <p className="text-xs text-muted-foreground">
          התשלום על השימוש נגבה ישירות על ידי Anthropic, לפי כמות השימוש בפועל — בדרך כלל אגורות בודדות לשיחה.
        </p>
      </footer>
    </section>
  );
}
