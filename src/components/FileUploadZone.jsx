import { useRef, useState } from "react";
import { motion } from "framer-motion";

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "image/jpeg", "image/png"];
const ACCEPTED_EXT = [".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export default function FileUploadZone({ onFile, currentCount, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const validate = (file) => {
    if (currentCount >= MAX_FILES) {
      return `הגעת למגבלת 5 קבצים בשיחה. כדי להעלות קובץ נוסף, אפס את השיחה.`;
    }
    if (file.size > MAX_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return `הקובץ "${file.name}" גדול מדי (${mb}MB). הגודל המקסימלי הוא 10MB. דחס את הקובץ ונסה שוב.`;
    }
    const isValid = ACCEPTED.includes(file.type) ||
      ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isValid) {
      return `הפורמט "${file.name.split(".").pop()}" אינו נתמך. סוגים מותרים: PDF, DOCX, TXT, JPG, PNG.`;
    }
    return null;
  };

  const handleFile = (file) => {
    setError("");
    const err = validate(file);
    if (err) { setError(err); return; }
    onFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onPaste = (e) => {
    const file = e.clipboardData?.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div onPaste={onPaste}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative transition-all duration-200 ${dragging ? "ring-2 ring-accent ring-offset-1 rounded-xl" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || currentCount >= MAX_FILES}
          className="px-3 py-2 text-xs rounded-lg border border-border/50 text-muted-foreground 
                     hover:text-accent hover:border-accent/50 transition-colors whitespace-nowrap disabled:opacity-40"
          title="גרור קובץ לחלון השיחה, הדבק מהלוח (Ctrl+V), או לחץ כאן לבחירת קובץ"
        >
          העלה מסמך לניתוח
        </button>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive mt-1 max-w-xs"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}