import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import ChatMessage from "../components/ChatMessage";
import EmptyState from "../components/EmptyState";

function PersonaSidebar({ persona, isOpen, onToggle }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="border-r border-border/30 bg-secondary/30 overflow-hidden flex-shrink-0"
        >
          <div className="p-6 w-80">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold font-frank text-lg">פרופיל</h3>
              <button
                onClick={onToggle}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                סגור
              </button>
            </div>
            <div className="space-y-4">
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: personas = [] } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: () => base44.entities.Persona.filter({ id: personaId }),
  });
  const persona = personas[0];

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", personaId],
    queryFn: () =>
      base44.entities.ChatSession.filter({ persona_id: personaId, is_active: true }),
    enabled: !!personaId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", sessions[0]?.id],
    queryFn: () => base44.entities.Message.filter({ session_id: sessions[0].id }, "created_date"),
    enabled: !!sessions[0]?.id,
  });

  const createSessionMutation = useMutation({
    mutationFn: () =>
      base44.entities.ChatSession.create({
        persona_id: personaId,
        title: `שיחה עם ${persona?.name}`,
        is_active: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions", personaId] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      let sessionId = sessions[0]?.id;
      if (!sessionId) {
        const newSession = await base44.entities.ChatSession.create({
          persona_id: personaId,
          title: `שיחה עם ${persona?.name}`,
          is_active: true,
        });
        sessionId = newSession.id;
        queryClient.invalidateQueries({ queryKey: ["sessions", personaId] });
      }

      await base44.entities.Message.create({
        session_id: sessionId,
        role: "user",
        content,
      });
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });

      setIsThinking(true);

      // Build conversation history for context
      const history = messages
        .slice(-10)
        .map((m) => `${m.role === "user" ? "משתמש" : persona.name}: ${m.content}`)
        .join("\n");

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${persona.system_prompt || ""}\n\nהיסטוריית שיחה:\n${history}\n\nמשתמש: ${content}\n\nענה בתור ${persona.name}:`,
      });

      await base44.entities.Message.create({
        session_id: sessionId,
        role: "assistant",
        content: response,
      });

      await base44.entities.Persona.update(personaId, {
        last_active: new Date().toISOString(),
      });

      setIsThinking(false);
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (sessions[0]?.id) {
        await base44.entities.ChatSession.update(sessions[0].id, { is_active: false });
      }
      queryClient.invalidateQueries({ queryKey: ["sessions", personaId] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input.trim());
    setInput("");
  };

  if (!persona) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "דשבורד", href: "/" },
          { label: persona.name, href: `/persona/${persona.id}` },
          { label: "שיחה" },
        ]}
      />

      <div className="flex rounded-2xl border border-border/30 bg-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {/* Sidebar */}
        <PersonaSidebar
          persona={persona}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-frank font-bold">
                  {persona.name?.[0]}
                </span>
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-1">
            {messages.length === 0 && !isThinking ? (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  title={`התחל שיחה עם ${persona.name}`}
                  description={`${persona.name} מחכה לשאלה הראשונה שלך. כתוב משהו למטה ולחץ שלח.`}
                />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} personaName={persona.name} />
                ))}
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end mb-4"
                  >
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

          {/* Input */}
          <div className="p-4 border-t border-border/30 bg-card">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={`כתוב הודעה ל${persona.name}...`}
                className="flex-1 h-12 text-base bg-secondary/50 border-border/30 focus:border-accent"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sendMessageMutation.isPending}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-base font-bold"
              >
                שלח
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}