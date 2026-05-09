import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

function DocCard({ doc }) {
  return (
    <div className="flex-shrink-0 self-end mb-1 w-36 rounded-lg border border-accent/40 bg-accent/5 px-2.5 py-2 text-right">
      <p className="text-[10px] text-accent font-medium mb-0.5 uppercase tracking-wide">מסמך</p>
      <p className="text-xs font-bold text-foreground truncate">{doc.file_name}</p>
      {doc.file_size && (
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {doc.file_size < 1024 * 1024
            ? `${(doc.file_size / 1024).toFixed(1)} KB`
            : `${(doc.file_size / 1024 / 1024).toFixed(1)} MB`}
        </p>
      )}
    </div>
  );
}

// Styled markdown components for rich, structured assistant output
const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-foreground mt-4 mb-2 pb-1.5 border-b border-border/50 font-frank first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5 pb-1 border-b border-border/30 font-frank first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-accent mt-2.5 mb-1 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0 text-foreground">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 pr-4">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 pr-4 list-decimal list-inside">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground flex gap-2 items-start">
      <span className="text-accent mt-1 flex-shrink-0 text-xs">◆</span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-secondary/60 text-accent text-xs px-1.5 py-0.5 rounded font-mono">
        {children}
      </code>
    ) : (
      <pre className="bg-primary/5 border border-border/40 rounded-lg p-3 my-2 overflow-x-auto">
        <code className="text-xs font-mono text-foreground">{children}</code>
      </pre>
    ),
  blockquote: ({ children }) => (
    <blockquote className="border-r-2 border-accent/60 pr-3 my-2 text-muted-foreground italic text-sm">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border/40 my-3" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:text-accent/80 transition-colors">
      {children}
    </a>
  ),
};

export default function ChatMessage({ message, personaName, sideDoc }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2 ${isUser ? "justify-start" : "justify-end"} mb-3`}
    >
      {!isUser && sideDoc && <DocCard doc={sideDoc} />}

      <div
        className={`max-w-[78%] rounded-xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm shadow-sm"
        }`}
      >
        {!isUser && (
          <p className="text-[10px] font-bold text-accent mb-2 font-frank uppercase tracking-widest">
            {personaName}
          </p>
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose-custom">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && sideDoc && <DocCard doc={sideDoc} />}
    </motion.div>
  );
}