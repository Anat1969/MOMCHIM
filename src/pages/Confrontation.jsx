import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Breadcrumbs from "../components/Breadcrumbs";
import EmptyState from "../components/EmptyState";

function ResponseColumn({ persona, responses, isLoading }) {
  const personaResponses = responses.filter((r) => r.persona_id === persona.id);

  return (
    <div className="flex-1 min-w-[260px] border border-border/30 rounded-xl bg-card overflow-hidden">
      <div className="p-4 border-b border-border/30 bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-frank font-bold text-sm">
              {persona.name?.[0]}
            </span>
          </div>
          <div>
            <h4 className="font-bold font-frank text-foreground text-sm">{persona.name}</h4>
            <p className="text-xs text-accent">{persona.tone}</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {personaResponses.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            ממתין לשאלה...
          </p>
        )}
        {personaResponses.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm leading-relaxed prose prose-sm max-w-none"
          >
            <ReactMarkdown>{r.response}</ReactMarkdown>
            {i < personaResponses.length - 1 && (
              <hr className="border-border/30 my-3" />
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-1.5 justify-center py-4">
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Confrontation() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const DEFAULT_QUESTION = "איך הייתם מתכננים כיכר עירונית שמחברת בין קהילות שונות?";
  const [question, setQuestion] = useState("");
  const [allResponses, setAllResponses] = useState([]);
  const [questionsAsked, setQuestionsAsked] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["personas"],
    queryFn: () => base44.entities.Persona.list("-updated_date"),
  });

  const selectedPersonas = personas.filter((p) => selectedIds.includes(p.id));

  const togglePersona = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const askQuestion = async () => {
    if (!question.trim() || selectedIds.length < 2 || isAsking) return;
    
    const currentQuestion = question.trim();
    setQuestionsAsked((prev) => [...prev, currentQuestion]);
    setQuestion("");
    setIsAsking(true);

    const previousContext = questionsAsked
      .map((q, i) => {
        const qResponses = allResponses.filter((r) => r.questionIndex === i);
        const responsesText = qResponses
          .map((r) => {
            const p = personas.find((p) => p.id === r.persona_id);
            return `${p?.name}: ${r.response}`;
          })
          .join("\n");
        return `שאלה: ${q}\n${responsesText}`;
      })
      .join("\n\n");

    const questionIndex = questionsAsked.length;

    const promises = selectedPersonas.map(async (persona) => {
      const prompt = `${persona.system_prompt || ""}\n\n${
        previousContext ? `הקשר קודם:\n${previousContext}\n\n` : ""
      }שאלה: ${currentQuestion}\n\nענה בתור ${persona.name} בעברית. תשובה ממוקדת ותמציתית.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });

      return {
        persona_id: persona.id,
        response,
        questionIndex,
      };
    });

    const results = await Promise.all(promises);
    setAllResponses((prev) => [...prev, ...results]);
    setIsAsking(false);
  };

  const exportText = () => {
    let text = "עימות מומחים\n" + "=".repeat(40) + "\n\n";
    text += `משתתפים: ${selectedPersonas.map((p) => p.name).join(", ")}\n\n`;

    questionsAsked.forEach((q, i) => {
      text += `שאלה ${i + 1}: ${q}\n` + "-".repeat(30) + "\n";
      const qResponses = allResponses.filter((r) => r.questionIndex === i);
      qResponses.forEach((r) => {
        const p = personas.find((p) => p.id === r.persona_id);
        text += `\n${p?.name}:\n${r.response}\n`;
      });
      text += "\n";
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "עימות-מומחים.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "דשבורד", href: "/" }, { label: "עימות מומחים" }]}
      />

      <h2 className="text-3xl font-black font-frank text-foreground mb-6">
        עימות מומחים
      </h2>

      {personas.length < 2 ? (
        <EmptyState
          title="צריך לפחות שני מומחים"
          description="צור עוד מומחים כדי להתחיל עימות. כל מומחה יענה על אותה שאלה מנקודת המבט שלו."
        />
      ) : (
        <>
          {/* Persona Selection */}
          {selectedIds.length < 2 && (
            <div className="mb-8">
              <p className="text-lg font-semibold text-foreground mb-3">
                בחר 2–4 מומחים לעימות
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                סמן את המומחים שישתתפו. כל אחד יענה מנקודת המבט הייחודית שלו.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePersona(p.id)}
                    className={`p-4 rounded-xl border text-right transition-all ${
                      selectedIds.includes(p.id)
                        ? "border-accent bg-accent/10"
                        : "border-border/50 bg-card hover:border-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedIds.includes(p.id)} />
                      <div>
                        <p className="font-bold font-frank">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.domain}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedIds.length === 1 && (
                <p className="text-sm text-accent mt-3">בחר עוד מומחה אחד לפחות</p>
              )}
            </div>
          )}

          {/* Active Confrontation */}
          {selectedIds.length >= 2 && (
            <>
              {/* Selected bar */}
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-secondary/50 border border-border/30">
                <p className="text-sm text-muted-foreground">משתתפים:</p>
                <div className="flex gap-2 flex-wrap flex-1">
                  {selectedPersonas.map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedIds([]);
                    setAllResponses([]);
                    setQuestionsAsked([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  בחר מחדש
                </button>
                {questionsAsked.length > 0 && (
                  <button
                    onClick={exportText}
                    className="px-3 py-1.5 text-xs rounded-lg border border-accent/50 text-accent 
                               hover:bg-accent/10 transition-colors"
                  >
                    ייצא כטקסט — שומר את כל השאלות והתשובות לקובץ
                  </button>
                )}
              </div>

              {/* Questions asked */}
              {questionsAsked.map((q, i) => (
                <div key={i} className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-accent font-bold">שאלה:</span> {q}
                  </p>
                </div>
              ))}

              {/* Response Columns */}
              <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
                {selectedPersonas.map((p) => (
                  <ResponseColumn
                    key={p.id}
                    persona={p}
                    responses={allResponses}
                    isLoading={isAsking}
                  />
                ))}
              </div>

              {/* Question Input */}
              {questionsAsked.length === 0 && (
                <button
                  onClick={() => setQuestion(DEFAULT_QUESTION)}
                  className="mb-3 text-sm text-accent hover:text-accent/80 transition-colors underline underline-offset-2 block"
                >
                  השתמש בשאלת ברירת המחדל: "{DEFAULT_QUESTION}"
                </button>
              )}
              <div className="flex gap-3">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                  placeholder={
                    questionsAsked.length === 0
                      ? "כתוב את השאלה הראשונה — כל המומחים יענו עליה"
                      : "שאלת המשך — המומחים יענו בהתבסס על ההקשר הקודם"
                  }
                  className="flex-1 h-14 text-base bg-card border-border/30 focus:border-accent"
                  disabled={isAsking}
                />
                <Button
                  onClick={askQuestion}
                  disabled={!question.trim() || isAsking}
                  className="h-14 px-8 bg-primary hover:bg-primary/90 text-base font-bold"
                >
                  {isAsking ? "שואל את המומחים..." : "שלח לכולם"}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}