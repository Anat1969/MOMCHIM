import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importJson, importCsv } from "@/api/store";

const LABELS = {
  Persona: "מומחים",
  ChatSession: "שיחות",
  Message: "הודעות",
  UploadedDocument: "מסמכים",
};

/** One-click restore from a backup file or the Base44 CSV exports. */
export default function RestoreBackup({ label = "טעינת מומחים מקובץ גיבוי" }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  const onPick = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;

    setBusy(true);
    setResult(null);
    const totals = {};
    const failed = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const counts = /\.csv$/i.test(file.name)
          ? await importCsv(text, file.name)
          : await importJson(text);
        for (const [name, count] of counts) totals[name] = (totals[name] || 0) + count;
      } catch (err) {
        failed.push(`${file.name}: ${err.message}`);
      }
    }

    const loaded = Object.entries(totals).filter(([, c]) => c > 0);
    setBusy(false);
    setResult({
      ok: loaded.length > 0,
      text: loaded.length
        ? `נטענו ${loaded.map(([n, c]) => `${c} ${LABELS[n] || n}`).join(" · ")}`
        : failed.join(" · ") || "לא נמצאו נתונים בקובץ.",
    });
  };

  return (
    <div className="space-y-2">
      <Button onClick={() => input.current?.click()} disabled={busy} className="font-bold">
        <Upload size={15} className="ml-2" aria-hidden="true" />
        {busy ? "טוען…" : label}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".json,.csv"
        multiple
        hidden
        onChange={onPick}
        aria-label="בחירת קובץ גיבוי"
      />
      <div aria-live="polite">
        {result && (
          <p className={`text-sm ${result.ok ? "text-green-700" : "text-destructive"}`}>
            {result.text}
          </p>
        )}
      </div>
    </div>
  );
}
