import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronLeft, Copy, Check, GripVertical, Pencil,
  Paperclip, Download, CopyPlus, X, FileText
} from "lucide-react";

const STORAGE_KEY = "expert-panel-state";
const COLLAPSED_KEY = "expert-panel-collapsed";

// ─── Storage ─────────────────────────────────────────────────────────────────

function readAllPanelData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.blocks)) {
      const migrated = { conv_legacy: { blocks: parsed.blocks } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return { _migrated: true, ...migrated };
    }
    return parsed;
  } catch { return {}; }
}

function loadConvBlocks(convId) {
  return readAllPanelData()[convId]?.blocks || [];
}

function saveConvBlocks(convId, blocks) {
  try {
    const all = readAllPanelData();
    const clean = { ...all };
    delete clean._migrated;
    clean[`conv_${convId}`] = { blocks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}

function deleteConvBlocks(convId) {
  try {
    const all = readAllPanelData();
    const clean = { ...all };
    delete clean._migrated;
    delete clean[`conv_${convId}`];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {}
}

function loadCollapsed() {
  try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
}
function saveCollapsed(v) {
  try { localStorage.setItem(COLLAPSED_KEY, String(v)); } catch {}
}

function formatDate(iso) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function deduplicateFileName(name, existingBlocks) {
  const titles = new Set(existingBlocks.map((b) => b.title));
  if (!titles.has(name)) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  return `${base}-${Date.now()}${ext}`;
}

// ─── BlockItem ────────────────────────────────────────────────────────────────

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
          className={`group relative rounded-lg border bg-card mb-1.5 transition-all ${
            snapshot.isDragging
              ? "border-accent shadow-md"
              : "border-border/60 hover:border-border hover:shadow-sm"
          }`}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center opacity-0 group-hover:opacity-30 hover:!opacity-70 cursor-grab active:cursor-grabbing transition-opacity"
          >
            <GripVertical size={12} className="text-muted-foreground" />
          </div>

          <div className="px-3 py-2.5 pr-5">
            {/* Title row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={titleVal}
                    onChange={(e) => setTitleVal(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitTitle();
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    className="w-full text-xs font-semibold bg-secondary/60 border border-accent/40 rounded px-1.5 py-0.5 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => !block.readOnly && setEditingTitle(true)}
                    className="text-xs font-semibold text-foreground text-right truncate max-w-full flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    {block.readOnly && <Paperclip size={9} className="flex-shrink-0 text-muted-foreground" />}
                    <span className="truncate">{block.title}</span>
                    {!block.readOnly && (
                      <Pencil size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={handleCopy}
                  className="relative p-1 rounded hover:bg-secondary transition-colors"
                  title="העתק"
                >
                  {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
                  <AnimatePresence>
                    {copied && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: -20 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-1 right-0 text-xs bg-foreground text-background rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-10"
                      >
                        הועתק
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <button
                  onClick={() => onDelete(block.id)}
                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  title="הסר"
                >
                  <X size={11} className="text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>

            {/* Meta */}
            <p className="text-[10px] text-muted-foreground mb-1.5">
              {formatDate(block.createdAt)}{block.content?.length > 0 ? ` · ${block.content.length} תווים` : ""}
            </p>

            {/* Content preview */}
            {block.imageUrl ? (
              <img
                src={block.imageUrl}
                alt={block.title}
                className="w-full rounded object-cover max-h-28"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : block.pdfUrl ? (
              <a href={block.pdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-accent underline underline-offset-2 flex items-center gap-1">
                <FileText size={10} />
                פתח PDF
              </a>
            ) : block.fileUrl ? (
              <a href={block.fileUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-accent underline underline-offset-2 flex items-center gap-1">
                <FileText size={10} />
                פתח קובץ
              </a>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                {block.content}
              </p>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const DocumentWorkspacePanel = forwardRef(function DocumentWorkspacePanel({ latestAnswer, personaName, conversationId }, ref) {
  const convKey = conversationId ? `conv_${conversationId}` : null;

  const [blocks, setBlocksState] = useState(() => (convKey ? loadConvBlocks(convKey) : []));
  const [collapsed, setCollapsedState] = useState(loadCollapsed);
  const [allCopied, setAllCopied] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const uploadRef = useRef(null);

  useEffect(() => {
    if (!convKey) { setBlocksState([]); return; }
    const all = readAllPanelData();
    if (all._migrated) setShowMigrationNotice(true);
    setBlocksState(all[convKey]?.blocks || []);
  }, [convKey]);

  const setBlocks = useCallback((next) => {
    setBlocksState(next);
    if (convKey) saveConvBlocks(convKey, next);
  }, [convKey]);

  const setCollapsed = (v) => { setCollapsedState(v); saveCollapsed(v); };

  const saveAnswer = () => {
    if (!latestAnswer) return;
    const firstLine = latestAnswer.split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || "תשובת מומחה";
    setBlocks([{
      id: `block-${Date.now()}`,
      title: firstLine,
      content: latestAnswer,
      createdAt: new Date().toISOString(),
      readOnly: false,
    }, ...blocks]);
  };

  const deleteBlock = (id) => setBlocks(blocks.filter((b) => b.id !== id));
  const renameTitle = (id, title) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, title } : b)));

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
    a.download = `expert-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addUploadedFileBlock = useCallback((file, serverUrl) => {
    const uniqueName = deduplicateFileName(file.name, blocks);
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name) || /^image\//.test(file.type);
    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";

    let block;
    if (isImage) {
      block = { id: `block-${Date.now()}`, title: uniqueName, content: "", imageUrl: serverUrl, createdAt: new Date().toISOString(), readOnly: true };
    } else if (isPdf) {
      block = { id: `block-${Date.now()}`, title: uniqueName, content: "[קובץ PDF]", pdfUrl: serverUrl, createdAt: new Date().toISOString(), readOnly: true };
    } else {
      block = { id: `block-${Date.now()}`, title: uniqueName, content: `[קובץ: ${file.name}]`, fileUrl: serverUrl, createdAt: new Date().toISOString(), readOnly: true };
    }
    setBlocks([block, ...blocks]);
  }, [blocks, setBlocks]);

  useImperativeHandle(ref, () => ({ addUploadedFileBlock }), [addUploadedFileBlock]);

  const handleUploadFile = (file) => {
    const allowed = /\.(txt|md|docx|pdf|jpg|jpeg|png|webp)$/i.test(file.name);
    if (!allowed) return;
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isPdf = /\.pdf$/i.test(file.name);
    const uniqueName = deduplicateFileName(file.name, blocks);

    if (isImage) {
      setBlocks([{ id: `block-${Date.now()}`, title: uniqueName, content: "", imageUrl: URL.createObjectURL(file), createdAt: new Date().toISOString(), readOnly: true }, ...blocks]);
      return;
    }
    if (isPdf) {
      setBlocks([{ id: `block-${Date.now()}`, title: uniqueName, content: "[PDF]", pdfUrl: URL.createObjectURL(file), createdAt: new Date().toISOString(), readOnly: true }, ...blocks]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setBlocks([{ id: `block-${Date.now()}`, title: uniqueName, content: e.target.result || "", createdAt: new Date().toISOString(), readOnly: true }, ...blocks]);
    };
    reader.readAsText(file);
  };

  const onDropFile = (e) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  };

  // ── Collapsed rail ───────────────────────────────────────────────────────────

  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-7 border-r border-border/40 bg-secondary/20 flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded hover:bg-secondary transition-colors"
          title="פתח לוח מסמך"
        >
          <ChevronRight size={14} className="text-muted-foreground" />
        </button>
        <span className="text-[10px] text-muted-foreground [writing-mode:vertical-rl] rotate-180 mt-2 select-none tracking-widest">
          מסמך
        </span>
        {blocks.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-accent/20 text-accent text-[9px] flex items-center justify-center font-bold">
            {blocks.length}
          </span>
        )}
      </div>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────────

  return (
    <div className="flex-shrink-0 w-72 border-r border-border/40 bg-background flex flex-col overflow-hidden">

      {/* Migration notice */}
      <AnimatePresence>
        {showMigrationNotice && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-accent/10 border-b border-accent/20 px-3 py-1.5 flex items-center justify-between gap-2 overflow-hidden"
          >
            <p className="text-[10px] text-accent">מסמכים קודמים הועברו לארכיון</p>
            <button onClick={() => setShowMigrationNotice(false)}>
              <X size={10} className="text-muted-foreground hover:text-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-secondary/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-frank text-foreground tracking-wide">מסמך</span>
          {blocks.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">
              {blocks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {blocks.length > 0 && (
            <button
              onClick={copyAll}
              className="p-1 rounded hover:bg-secondary transition-colors"
              title="העתק הכל"
            >
              {allCopied ? <Check size={12} className="text-green-500" /> : <CopyPlus size={12} className="text-muted-foreground" />}
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-secondary transition-colors"
            title="כווץ"
          >
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Save latest answer */}
      {latestAnswer && (
        <div className="px-3 pt-2.5 flex-shrink-0">
          <button
            onClick={saveAnswer}
            className="w-full py-1.5 rounded border border-accent/50 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="text-sm leading-none">+</span>
            שמור תשובה אחרונה
          </button>
        </div>
      )}

      {/* Blocks list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
              <FileText size={14} className="text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              שמור תשובות מהצ'אט<br />או גרור קובץ לאזור למטה
            </p>
          </div>
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

      {/* Footer */}
      <div className="border-t border-border/40 px-3 py-2.5 flex-shrink-0 space-y-2 bg-secondary/10">
        {/* Upload drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={onDropFile}
          onClick={() => uploadRef.current?.click()}
          className={`rounded border border-dashed text-[11px] text-center py-2 cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
            draggingOver
              ? "border-accent bg-accent/10 text-accent"
              : "border-border/50 text-muted-foreground hover:border-accent/40 hover:text-foreground"
          }`}
        >
          <Paperclip size={11} />
          גרור קובץ או לחץ להעלאה
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept=".txt,.md,.docx,.pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleUploadFile(e.target.files[0]); e.target.value = ""; }}
        />

        <button
          onClick={exportDoc}
          disabled={blocks.length === 0}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-40 transition-colors bg-card"
        >
          <Download size={12} />
          יצא Markdown
        </button>
      </div>
    </div>
  );
});

export default DocumentWorkspacePanel;
export { deleteConvBlocks };