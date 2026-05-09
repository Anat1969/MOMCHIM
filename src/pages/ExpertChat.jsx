import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import ChatMessage from "../components/ChatMessage";
import EmptyState from "../components/EmptyState";
import FileUploadZone from "../components/FileUploadZone";
import DocumentWorkspacePanel, { deleteConvBlocks } from "../components/DocumentWorkspacePanel";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileBubble({ fileName, fileSize }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-5 py-3">
        <p className="text-xs opacity-70 mb-0.5">מסמך מצורף</p>
        <p className="font-bold text-sm">{fileName}</p>
        {fileSize && <p className="text-xs opacity-60 mt-0.5">{formatSize(fileSize)}</p>}
      </div>
    </div>
  );
}

function PersonaSidebar({ persona, isOpen, onToggle, sessionId, onReReference }) {
  const { data: documents = [] } = useQuery({
    queryKey: ["documents", sessionId],
    queryFn: () => base44.entities.UploadedDocument.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="border-r border-border/30 bg-secondary/30 overflow-hidden flex-shrink-0"
        >
          <div className="p-5 w-[300px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold font-frank text-lg">פרופיל</h3>
              <button onClick={onToggle} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                סגור
              </button>
            </div>

            {/* Persona fields */}
            <div className="space-y-3 mb-6">
              {[
                { label: "תחום", value: persona.domain },
                { label: "רקע", value: persona.age_background },
                { label: "טון", value: persona.tone },
                { label: "חוזקה", value: persona.strength },
                { label: "נקודה עיוורת", value: persona.blind_spot },
                { label: "ביטוי ייחודי", value: persona.unique_expression },
                { label: "לא יעשה", value: persona.wont_do },
              ]
                .filter((f) => f.value)
                .map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-muted-foreground font-medium">{field.label}</p>
                    <p className="text-sm text-foreground mt-0.5">{field.value}</p>
                  </div>
                ))}
            </div>

            {/* Documents section */}
            <div className="border-t border-border/30 pt-4">
              <h4 className="font-bold text-sm font-frank mb-3">מסמכים בשיחה</h4>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">לא הועלו מסמכים עדיין</p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-2.5 rounded-lg bg-card border border-border/30">
                      <p className="text-xs font-medium text-foreground truncate">{doc.file_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {doc.file_size ? formatSize(doc.file_size) : ""}
                        </p>
                        <button
                          onClick={() => onReReference(doc)}
                          className="text-xs text-accent hover:underline"
                          title="שלח הפניה חדשה למסמך זה בשיחה"
                        >
                          הפנה שוב
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ExpertChat() {
  const { personaId } = useParams();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [customInstruction, setCustomInstruction] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const messagesEndRef = useRef(null);
  const chatAreaRef = useRef(null);

  const { data: personas = [] } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: () => base44.entities.Persona.filter({ id: personaId }),
  });
  const persona = personas[0];

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", personaId],
    queryFn: () => base44.entities.ChatSession.filter({ persona_id: personaId, is_active: true }),
    enabled: !!personaId,
  });
  const sessionId = sessions[0]?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", sessionId],
    queryFn: () => base44.entities.Message.filter({ session_id: sessionId }, "created_date"),
    enabled: !!sessionId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", sessionId],
    queryFn: () => base44.entities.UploadedDocument.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  const getOrCreateSession = async () => {
    if (sessionId) return sessionId;
    const newSession = await base44.entities.ChatSession.create({
      persona_id: personaId,
      title: `שיחה עם ${persona?.name}`,
      is_active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["sessions", personaId] });
    return newSession.id;
  };

  const isImageFile = (file) => ["image/jpeg", "image/png", "image/jpg"].includes(file.type) ||
    /\.(jpg|jpeg|png)$/i.test(file.name);

  const isTextFile = (file) => ["text/plain", "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type) ||
    /\.(txt|docx|csv)$/i.test(file.name);

  const sendMessage = async (content, isSystem = false, imageFileUrl = null) => {
    const sid = await getOrCreateSession();
    await base44.entities.Message.create({ session_id: sid, role: "user", content });
    queryClient.invalidateQueries({ queryKey: ["messages", sid] });
    setIsThinking(true);

    const history = messages.slice(-10)
      .map((m) => `${m.role === "user" ? "משתמש" : persona.name}: ${m.content}`)
      .join("\n");

    const llmParams = {
      prompt: `${persona.system_prompt || ""}\n\nהיסטוריית שיחה:\n${history}\n\nמשתמש: ${content}\n\nענה בתור ${persona.name}:`,
    };
    if (imageFileUrl) {
      llmParams.file_urls = [imageFileUrl];
    }
    const response = await base44.integrations.Core.InvokeLLM(llmParams);

    await base44.entities.Message.create({ session_id: sid, role: "assistant", content: response });
    await base44.entities.Persona.update(personaId, { last_active: new Date().toISOString() });
    setIsThinking(false);
    queryClient.invalidateQueries({ queryKey: ["messages", sid] });
    queryClient.invalidateQueries({ queryKey: ["personas"] });
  };

  const handleSend = async () => {
    if (pendingFile) {
      await handleFileSubmit();
      return;
    }
    if (!input.trim() || isThinking) return;
    const msg = input.trim();
    setInput("");
    await sendMessage(msg);
  };

  const handleFileSubmit = async () => {
    if (!pendingFile || isUploading || isExtracting) return;
    setExtractError("");
    setIsUploading(true);
    const sid = await getOrCreateSession();

    // Upload file to get URL
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingFile });

    await base44.entities.UploadedDocument.create({
      session_id: sid,
      file_name: pendingFile.name,
      file_url,
      file_size: pendingFile.size,
      file_type: pendingFile.type,
    });
    queryClient.invalidateQueries({ queryKey: ["documents", sid] });
    setIsUploading(false);

    const instruction = customInstruction.trim();
    const fileName = pendingFile.name;
    const fileRef = pendingFile;
    setPendingFile(null);
    setCustomInstruction("");

    if (isImageFile(fileRef)) {
      // Images: pass directly as vision input
      const imagePrompt = `זהו שרטוט או תמונה שהועלו לניתוח. נתח אותם לפי המומחיות שלך.${instruction ? "\n\n" + instruction : ""}`;
      await sendMessage(imagePrompt, false, file_url);
    } else {
      // Text / PDF / DOCX: extract content
      setIsExtracting(true);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            text: { type: "string", description: "All extracted text content from the document" }
          }
        }
      });
      setIsExtracting(false);

      if (result.status !== "success" || !result.output?.text) {
        setExtractError("לא הצלחתי לקרוא את הקובץ — נסה פורמט אחר");
        return;
      }

      const extractedText = result.output.text;
      const prompt = `תוכן המסמך ${fileName}:\n${extractedText}\n\nהנחיית המשתמש: ${instruction || `נתח את המסמך לפי הגישה והמומחיות שלך.`}`;
      await sendMessage(prompt);
    }
  };

  const handleReReference = (doc) => {
    setPendingFile(null);
    setInput(`אני מפנה שוב למסמך: ${doc.file_name}. `);
  };

  const handleFileReady = (file) => {
    setPendingFile(file);
    setInput("");
    setExtractError("");
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (sessionId) {
        await base44.entities.ChatSession.update(sessionId, { is_active: false });
        deleteConvBlocks(`conv_${sessionId}`);
      }
      queryClient.invalidateQueries({ queryKey: ["sessions", personaId] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setPendingFile(null);
      setCustomInstruction("");
    },
  });

  // Global paste handler for the chat window
  const handlePaste = useCallback((e) => {
    const file = e.clipboardData?.files?.[0];
    if (file) handleFileReady(file);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  if (!persona) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const isBusy = isThinking || isUploading || isExtracting;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "דשבורד", href: "/" },
          { label: persona.name, href: `/persona/${persona.id}` },
          { label: "שיחה" },
        ]}
      />

      <div
        className="flex rounded-2xl border border-border/30 bg-card overflow-hidden"
        style={{ height: "calc(100vh - 200px)" }}
        onPaste={handlePaste}
      >
        {/* Document Workspace Panel (RTL: appears on left visually) */}
        <DocumentWorkspacePanel
          latestAnswer={[...messages].reverse().find((m) => m.role === "assistant")?.content || null}
          personaName={persona?.name}
          conversationId={sessionId}
        />

        {/* Sidebar */}
        <PersonaSidebar
          persona={persona}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          sessionId={sessionId}
          onReReference={handleReReference}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-frank font-bold">{persona.name?.[0]}</span>
              </div>
              <div>
                <h3 className="font-bold font-frank text-foreground">{persona.name}</h3>
                <p className="text-xs text-accent">{persona.tone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border/50 text-muted-foreground 
                           hover:text-foreground hover:border-accent/50 transition-colors"
              >
                {sidebarOpen ? "הסתר פרופיל" : "הצג פרופיל"}
                {documents.length > 0 && (
                  <span className="mr-1 bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 text-xs">
                    {documents.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                className="px-3 py-1.5 text-xs rounded-lg border border-destructive/30 text-destructive 
                           hover:bg-destructive/10 transition-colors"
              >
                אפס שיחה — המומחה נשאר, ההיסטוריה נמחקת
              </button>
            </div>
          </div>

          {/* Drag overlay */}
          <div
            className="flex-1 overflow-y-auto p-6 space-y-1 relative"
            ref={chatAreaRef}
          >
            {messages.length === 0 && !isThinking ? (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  title={`התחל שיחה עם ${persona.name}`}
                  description={`${persona.name} מחכה לשאלה הראשונה שלך. כתוב, שלח שאלה, או העלה מסמך לניתוח.`}
                />
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  // Find if the previous user message was a document analysis prompt
                  // and pair the doc with the assistant reply that follows it
                  let sideDoc = null;
                  if (msg.role === "assistant") {
                    const prevUserMsg = messages[i - 1];
                    if (prevUserMsg?.role === "user") {
                      const isDocUpload =
                        prevUserMsg.content.includes("תוכן המסמך") ||
                        prevUserMsg.content.includes("זהו שרטוט") ||
                        prevUserMsg.content.includes("לניתוח");
                      if (isDocUpload) {
                        // Find the most recently uploaded document before this message
                        sideDoc = documents[documents.length - 1] || null;
                      }
                    }
                  }
                  return (
                    <ChatMessage key={msg.id} message={msg} personaName={persona.name} sideDoc={sideDoc} />
                  );
                })}
                {isExtracting && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                    <div className="bg-secondary/60 border border-border/30 rounded-2xl px-5 py-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce inline-block" />
                        מנתח מסמך...
                      </p>
                    </div>
                  </motion.div>
                )}
                {extractError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                    <div className="bg-destructive/10 border border-destructive/30 rounded-2xl px-5 py-3">
                      <p className="text-sm text-destructive">{extractError}</p>
                    </div>
                  </motion.div>
                )}
                {isThinking && !isExtracting && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mb-4">
                    <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-5 py-4">
                      <p className="text-xs font-bold text-accent mb-1.5 font-frank">{persona.name}</p>
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending file preview */}
          <AnimatePresence>
            {pendingFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pt-3 border-t border-border/30 bg-secondary/20"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 p-3 rounded-xl bg-card border border-accent/30">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{pendingFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(pendingFile.size)}</p>
                      </div>
                      <button
                        onClick={() => { setPendingFile(null); setCustomInstruction(""); }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        הסר
                      </button>
                    </div>
                    <Input
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder="הוסף הוראה מותאמת אישית לפני שליחת המסמך (אופציונלי)"
                      className="h-9 text-sm bg-secondary/50 border-border/30 focus:border-accent"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div className="p-4 border-t border-border/30 bg-card">
            <div className="flex gap-2 items-center">
              <FileUploadZone
                onFile={handleFileReady}
                currentCount={documents.length}
                disabled={isBusy}
              />
              <Input
                value={pendingFile ? "" : input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={pendingFile ? "הוראה נוספת תוקלד בתיבה למעלה" : `כתוב הודעה ל${persona.name}...`}
                className="flex-1 h-12 text-base bg-secondary/50 border-border/30 focus:border-accent"
                disabled={isBusy || !!pendingFile}
              />
              <Button
                onClick={handleSend}
                disabled={(!input.trim() && !pendingFile) || isBusy}
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-base font-bold"
              >
                {isUploading ? "מעלה..." : isExtracting ? "מנתח..." : isThinking ? "חושב..." : "שלח"}
              </Button>
            </div>
            {documents.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {documents.length}/5 מסמכים הועלו בשיחה זו
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}