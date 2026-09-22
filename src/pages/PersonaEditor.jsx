import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/Breadcrumbs";
import SaveIndicator from "../components/SaveIndicator";
import { debounce } from "lodash";

const FIELDS = [
  { key: "name", label: "שם המומחה", placeholder: "לדוגמה: ד״ר נעמי שפירא", type: "input" },
  { key: "domain", label: "תחום ליבה", placeholder: "לדוגמה: פסיכולוגיה קוגניטיבית", type: "input" },
  { key: "age_background", label: "גיל ורקע", placeholder: "לדוגמה: בת 55, אקדמאית, גדלה בקיבוץ", type: "input" },
  { key: "tone", label: "טון דיבור (3 מילים)", placeholder: "לדוגמה: ישיר, חם, מאתגר", type: "input" },
  { key: "strength", label: "חוזקה", placeholder: "לדוגמה: חושפת הנחות סמויות בשיחה", type: "input" },
  { key: "blind_spot", label: "נקודה עיוורת", placeholder: "לדוגמה: לפעמים מזלזלת בפתרונות פשוטים", type: "input" },
  { key: "unique_expression", label: "ביטוי ייחודי", placeholder: 'לדוגמה: "בוא ננסה את זה מהכיוון השני"', type: "input" },
  { key: "wont_do", label: "מה הוא לא יעשה", placeholder: "לדוגמה: לא ייתן תשובה חד-משמעית בנושא מוסרי", type: "textarea" },
];

function generateSystemPrompt(form) {
  const parts = [];
  if (form.name) parts.push(`אתה ${form.name}`);
  if (form.domain) parts.push(`מומחה בתחום ${form.domain}`);
  if (form.age_background) parts.push(`רקע: ${form.age_background}`);
  if (form.tone) parts.push(`הטון שלך: ${form.tone}`);
  if (form.strength) parts.push(`החוזקה שלך: ${form.strength}`);
  if (form.blind_spot) parts.push(`הנקודה העיוורת שלך: ${form.blind_spot}`);
  if (form.unique_expression) parts.push(`ביטוי ייחודי שלך: "${form.unique_expression}"`);
  if (form.wont_do) parts.push(`דבר שלעולם לא תעשה: ${form.wont_do}`);
  
  if (parts.length === 0) return "";
  return parts.join(". ") + ". ענה תמיד בעברית. הישאר בדמות תמיד.";
}

export default function PersonaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id && id !== "new";
  const [form, setForm] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const saveTimerRef = useRef(null);

  const { data: persona, isLoading } = useQuery({
    queryKey: ["persona", id],
    queryFn: () => api.entities.Persona.filter({ id }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (persona && persona.length > 0) {
      setForm(persona[0]);
    }
  }, [persona]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Persona.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      navigate(`/persona/${created.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Persona.update(form.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      queryClient.invalidateQueries({ queryKey: ["persona", id] });
      setShowSaved(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    },
  });

  const debouncedSave = useCallback(
    debounce((data) => {
      if (isEdit && form.id) {
        const systemPrompt = generateSystemPrompt(data);
        updateMutation.mutate({ ...data, system_prompt: systemPrompt, last_active: new Date().toISOString() });
      }
    }, 1500),
    [isEdit, form.id]
  );

  const handleChange = (key, value) => {
    const newForm = { ...form, [key]: value };
    setForm(newForm);
    if (isEdit) {
      debouncedSave(newForm);
    }
  };

  const handleCreate = () => {
    const systemPrompt = generateSystemPrompt(form);
    createMutation.mutate({
      ...form,
      system_prompt: systemPrompt,
      last_active: new Date().toISOString(),
    });
  };

  const systemPrompt = generateSystemPrompt(form);

  if (isLoading && isEdit) {
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
          { label: isEdit ? (form.name || "עריכת מומחה") : "מומחה חדש" },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-black font-frank text-foreground">
              {isEdit ? "ערוך מומחה" : "בנה מומחה"}
            </h2>
            <SaveIndicator show={showSaved} />
          </div>

          <div className="space-y-5">
            {FIELDS.map((field) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-semibold text-foreground">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={form[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="bg-card border-border/50 focus:border-accent text-base min-h-[80px] resize-none"
                  />
                ) : (
                  <Input
                    value={form[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="bg-card border-border/50 focus:border-accent text-base h-12"
                  />
                )}
              </motion.div>
            ))}

            {!isEdit && (
              <Button
                onClick={handleCreate}
                disabled={!form.name || !form.domain || !form.tone || createMutation.isPending}
                className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 mt-4"
              >
                {createMutation.isPending ? "יוצר מומחה..." : "צור מומחה — ישמור וייפתח לעריכה"}
              </Button>
            )}

            {isEdit && (
              <>
                <Button
                  onClick={() => navigate(`/chat/${form.id}`)}
                  className="w-full h-14 text-lg font-bold bg-accent text-accent-foreground hover:bg-accent/90 mt-4"
                >
                  התחל שיחה עם {form.name || "המומחה"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* System Prompt Preview */}
        <div className="lg:w-[40%]">
          <h3 className="text-xl font-bold font-frank text-foreground mb-4">
            פרומפט מערכת
          </h3>
          <div className="p-6 rounded-xl bg-secondary/50 border border-border/30 min-h-[200px]">
            {systemPrompt ? (
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {systemPrompt}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                הפרומפט ייבנה אוטומטית תוך כדי מילוי השדות...
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            הפרומפט נבנה אוטומטית מהשדות שמילאת. הוא מגדיר למומחה את האישיות, הסגנון וגבולות ההתנהגות שלו.
          </p>
        </div>
      </div>
    </div>
  );
}