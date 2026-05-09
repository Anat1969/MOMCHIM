import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function ChatMessage({ message, personaName }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-start" : "justify-end"} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
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
    </motion.div>
  );
}