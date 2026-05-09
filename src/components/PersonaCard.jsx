import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import moment from "moment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BusinessCardGenerator from "./BusinessCardGenerator";

moment.locale("he");

export default function PersonaCard({ persona, index }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCardGenerator, setShowCardGenerator] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Persona.update(persona.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
      queryClient.invalidateQueries({ queryKey: ["persona", persona.id] });
      setShowCardGenerator(false);
    },
  });

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
  };

  const handleCardSave = (cardHTML) => {
    updateMutation.mutate({ businessCard: cardHTML });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="group bg-card rounded-xl border border-border/50 p-6
                   hover:border-accent/50 hover:shadow-lg transition-all duration-300 flex flex-col"
      >
        <div
          onClick={() => navigate(`/chat/${persona.id}`)}
          className="cursor-pointer flex-1"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary-foreground font-frank">
                {getInitials(persona.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground font-frank truncate">
                {persona.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{persona.domain}</p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-accent/15 text-accent-foreground px-3 py-1 rounded-full font-medium">
                  {persona.tone}
                </span>
              </div>
            </div>
          </div>
          {persona.last_active && (
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/30">
              פעיל לאחרונה {moment(persona.last_active).fromNow()}
            </p>
          )}
          <div className="mt-3 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            לחץ לפתיחת שיחה עם {persona.name}
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <BusinessCardGenerator
            persona={persona}
            onSave={handleCardSave}
            onClose={() => setShowCardGenerator(false)}
            existingCard={persona.businessCard}
          />
        </div>
      </motion.div>
    </>
  );
}