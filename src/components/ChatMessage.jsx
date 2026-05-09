import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

function DocCard({ doc }) {
  return (
    <div className="flex-shrink-0 self-end mb-1 w-40 rounded-xl border border-accent/30 bg-secondary/40 px-3 py-2.5 text-right">
      <p className="text-xs text-muted-foreground mb-0.5">מסמך מצורף</p>
      <p className="text-xs font-bold text-foreground truncate">{doc.file_name}</p>
      {doc.file_size && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {doc.file_size < 1024 * 1024
            ? `${(doc.file_size / 1024).toFixed(1)} KB`
            : `${(doc.file_size / 1024 / 1024).toFixed(1)} MB`}
        </p>
      )}
    </div>
  );
}

export default function ChatMessage({ message, personaName, sideDoc }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-3 ${isUser ? "justify-start" : "justify-end"} mb-4`}
    >
      {/* Doc card appears to the LEFT of assistant bubble (which is on the right) */}
      {!isUser && sideDoc && <DocCard doc={sideDoc} />}

      <div
        className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border/50 text-foreground rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <p className="text-xs font-bold text-accent mb-1.5 font-frank">
            {personaName}
          </p>
        )}
        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>

      {/* Doc card appears to the RIGHT of user bubble (which is on the left) */}
      {isUser && sideDoc && <DocCard doc={sideDoc} />}
    </motion.div>
  );
}