import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import moment from "moment";
import { Download, Edit3 } from "lucide-react";
import html2canvas from "html2canvas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

moment.locale("he");

const DOMAIN_COLORS = {
  urban: {
    bg: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
    accent: "#e8e8e8",
    secondary: "#666666",
    text: "#ffffff"
  },
  social: {
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
    accent: "#ffff00",
    secondary: "#666666",
    text: "#ffffff"
  },
  engineering: {
    bg: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
    accent: "#32cd32",
    secondary: "#666666",
    text: "#1a1a1a"
  },
  sustainability: {
    bg: "linear-gradient(135deg, #fafaf8 0%, #f0f0ed 100%)",
    accent: "#7cb342",
    secondary: "#8b8b7a",
    text: "#2a2a2a"
  },
  tech: {
    bg: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
    accent: "#00ff88",
    secondary: "#ff00ff",
    text: "#00ff88"
  },
  history: {
    bg: "linear-gradient(135deg, #e8dcc8 0%, #d4c5b0 100%)",
    accent: "#8b6f47",
    secondary: "#c9a876",
    text: "#3e2723"
  },
  philosophy: {
    bg: "linear-gradient(135deg, #ebe4d9 0%, #ddd4c9 100%)",
    accent: "#8b7355",
    secondary: "#c9a876",
    text: "#4a4a4a"
  },
  art: {
    bg: "linear-gradient(135deg, #e5ddd0 0%, #d9d1c4 100%)",
    accent: "#a0826d",
    secondary: "#d4a574",
    text: "#2a2a2a"
  },
  legal: {
    bg: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
    accent: "#d4af37",
    secondary: "#cccccc",
    text: "#000033"
  },
  strategic: {
    bg: "linear-gradient(135deg, #0a1428 0%, #0f1f3d 100%)",
    accent: "#d4af37",
    secondary: "#666666",
    text: "#ffffff"
  },
  medical: {
    bg: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
    accent: "#0066cc",
    secondary: "#e8f4f8",
    text: "#003366"
  },
  science: {
    bg: "linear-gradient(135deg, #f8f9fa 0%, #e8eef5 100%)",
    accent: "#003d7a",
    secondary: "#dceef5",
    text: "#003d7a"
  }
};

function getColorForDomain(domain) {
  if (!domain) return DOMAIN_COLORS.tech;

  const domainLower = domain.toLowerCase();

  for (const [key, colors] of Object.entries(DOMAIN_COLORS)) {
    if (domainLower.includes(key)) {
      return colors;
    }
  }

  const keywords = {
    urban: ["עיר", "אורבני"],
    social: ["חברתי", "סוציאל", "קהילה"],
    engineering: ["הנדסה", "טכני"],
    sustainability: ["יציבות", "ירוק", "סביבה"],
    tech: ["טכנולוגיה", "מחשב"],
    history: ["היסטוריה", "עברון"],
    philosophy: ["פילוסופיה"],
    art: ["אמנות"],
    legal: ["משפט", "חוקי"],
    strategic: ["אסטרטגיה", "ביזנס"],
    medical: ["רפואה", "בריאות"],
    science: ["מדע", "מדעי"]
  };

  for (const [key, words] of Object.entries(keywords)) {
    if (words.some((word) => domainLower.includes(word))) {
      return DOMAIN_COLORS[key];
    }
  }

  return DOMAIN_COLORS.tech;
}

export default function PersonaCard({ persona, index }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const colors = getColorForDomain(persona.domain);
  const [showHover, setShowHover] = useState(false);

  const handleExport = async (e) => {
    e.stopPropagation();
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null
        });
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${persona.name}_business_card.png`;
        link.click();
      } catch (error) {
        console.error("Export failed:", error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/chat/${persona.id}`)}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      className="relative cursor-pointer h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
      
      <div
        ref={cardRef}
        style={{ background: colors.bg }}
        className="w-full h-full p-6 flex flex-col justify-between relative overflow-hidden bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
        
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: colors.accent }}></div>

        <div className="relative z-10">
          <div style={{ color: colors.text }} className="text-2xl font-bold font-frank">
            {persona.name}
          </div>
          <div style={{ color: colors.accent }} className="text-sm font-medium mt-1">
            {persona.domain}
          </div>
        </div>

        <div className="relative z-10">
          <div style={{ color: colors.secondary }} className="text-xs mb-3">
            {persona.tone}
          </div>
          <div style={{ color: colors.text, borderColor: colors.accent }} className="text-xs italic pt-2 border-t opacity-80">
            "{persona.unique_expression || ""}"
          </div>
        </div>

        {showHover &&
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 z-20 rounded-xl">
            <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/persona/${persona.id}`);
            }}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur transition-colors"
            title="ערוך">
            
              <Edit3 size={20} className="text-white" />
            </button>
            <button
            onClick={handleExport}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur transition-colors"
            title="הורד">
            
              <Download size={20} className="text-white" />
            </button>
          </div>
        }
      </div>
    </motion.div>);

}