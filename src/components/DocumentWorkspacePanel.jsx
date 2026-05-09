import { useState, useRef, useCallback, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Copy, Check, GripVertical, Pencil, Paperclip, Download, CopyPlus, X } from "lucide-react";

const STORAGE_KEY = "expert-panel-state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { collapsed: false, blocks: [] };
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function formatDate(iso) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function BlockItem({ block, index, onDelete, onRenameTitle }) {
  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(block.title);

  const handleCopy = () => {
    navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const commitTitle = () => {
    onRenameTitle(block.id, titleVal || block.title);
    setEditingTitle(false);
  };

  return (
    <Draggable draggableId={block.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative rounded-lg border bg-card p-3 mb-2 transition-colors ${
            snapshot.isDragging ? "border-accent shadow-lg" : "border-border/50 hover:border-border"
          }`}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing transition-opacity"
          >
            <GripVertical size={14} className="text-muted-foreground" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-2 pr-4 mb-1.5">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  className="w-full text-xs font-bold bg-secondary/60 border border-accent/40 rounded px-1.5 py-0.5 outline-none"
                />
              ) : (
                <button
                  onClick={() => setEditingTitle(true)}
                  className="text-xs font-bold text-foreground text-right truncate max-w-full flex items-center gap-1 hover:text-accent transition-colors"
                >
                  {block.readOnly && <Paperclip size={10} className="flex-shrink-0 text-muted-foreground" />}
                  {block.title}
                  {!block.readOnly && <Pencil size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />}
                </button>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(block.createdAt)} · {block.content.length} תווים
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleCopy} className="relative p-1 rounded hover:bg-secondary/60 transition-colors" title="העתק">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-muted-foreground" />}
                <AnimatePresence>
                  {copied && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: -20 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-1 right-0 text-xs bg-foreground text-background rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none"
                    >
                      הועתק
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <button onClick={() => onDelete(block.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="הסר">
                <X size={12} className="text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>

          {/* Content preview */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pr-4">
            {block.content}
          </p>
        </div>
      )}
    </Draggable>
  );
}

export default function DocumentWorkspacePanel({ latestAnswer, personaName }) {
  const [state, setState] = useState(loadState);
  const { collapsed, blocks } = state;
  const uploadRef = useRef(null);
  const [exportFormat, setExportFormat] = useState("md");
  const [allCopied, setAllCopied] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const setCollapsed = (v) => update({ collapsed: v });
  const setBlocks = (blocks) => update({ blocks });

  // Save latest answer as a block
  const saveAnswer = () => {
    if (!latestAnswer) return;
    const firstLine = latestAnswer.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || "תשובת מומחה";
    const block = {
      id: `block-${Date.now()}`,
      title: firstLine,
      content: latestAnswer,
      createdAt: new Date().toISOString(),
      readOnly: false,
    };
    const next = [block, ...blocks];
    update({ blocks: next });
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const renameTitle = (id, title) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, title } : b));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setBlocks(reordered);
  };

  const copyAll = () => {
    const text = blocks.map((b) => `# ${b.title}\n${b.content}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1500);
  };

  const exportDoc = () => {
    const text = blocks.map((b) => `# ${b.title}\n\n${b.content}`).join("\n\n---\n\n");
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expert-answer-${date}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadFile = (file) => {
    const allowed = /\.(txt|md|docx)$/i.test(file.name);
    if (!allowed) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const block = {
        id: `block-${Date.now()}`,
        title: file.name,
        content: typeof content === "string" ? content : "[תוכן בינארי]",
        createdAt: new Date().toISOString(),
        readOnly: true,
      };
      setBlocks([block, ...blocks]);
    };
    reader.readAsText(file);
  };

  const onDropFile = (e) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  };

  // Collapsed rail
  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-8 border-r border-border/30 bg-secondary/20 flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded hover:bg-secondary/60 transition-colors"
          title="פתח לוח מסמך"
        >
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-2 select-none">
          מסמך
        </span>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-80 border-r border-border/30 bg-secondary/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/20 flex-shrink-0">
        <span className="text-sm font-bold font-frank text-foreground">מסמך</span>
        <div className="flex items-center gap-2">
          {blocks.length > 0 && (
            <button onClick={copyAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="העתק הכל">
              {allCopied ? <Check size={13} className="text-green-500" /> : <CopyPlus size={13} />}
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-secondary/60 transition-colors"
            title="כווץ"
          >
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Save button */}
      {latestAnswer && (
        <div className="px-3 pt-3 flex-shrink-0">
          <button
            onClick={saveAnswer}
            className="w-full py-2 rounded-lg border border-accent/40 bg-accent/10 text-accent text-xs font-bold hover:bg-accent/20 transition-colors"
          >
            + שמור תשובה במסמך
          </button>
        </div>
      )}

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
            שמור תשובות מהצ'אט כאן,<br />או גרור קובץ לאזור למטה
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="panel-blocks">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {blocks.map((block, i) => (
                    <BlockItem
                      key={block.id}
                      block={block}
                      index={i}
                      onDelete={deleteBlock}
                      onRenameTitle={renameTitle}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Footer: upload + export */}
      <div className="border-t border-border/30 px-3 py-3 flex-shrink-0 space-y-2">
        {/* Upload drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={onDropFile}
          onClick={() => uploadRef.current?.click()}
          className={`rounded-lg border border-dashed text-xs text-center py-2.5 cursor-pointer transition-colors ${
            draggingOver ? "border-accent bg-accent/10 text-accent" : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          <Paperclip size={12} className="inline ml-1" />
          גרור קובץ .txt / .md / .docx
        </div>
        <input ref={uploadRef} type="file" accept=".txt,.md,.docx" className="hidden" onChange={(e) => { if (e.target.files[0]) handleUploadFile(e.target.files[0]); e.target.value = ""; }} />

        {/* Export row */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
            <button onClick={() => setExportFormat("md")} className={`px-2.5 py-1.5 transition-colors ${exportFormat === "md" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}>.md</button>
            <button onClick={() => setExportFormat("txt")} className={`px-2.5 py-1.5 transition-colors ${exportFormat === "txt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}>.txt</button>
          </div>
          <button
            onClick={exportDoc}
            disabled={blocks.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-40 transition-colors"
          >
            <Download size={12} />
            יצא מסמך
          </button>
        </div>
      </div>
    </div>
  );
}