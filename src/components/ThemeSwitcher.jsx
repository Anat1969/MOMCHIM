import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette } from "lucide-react";

const THEMES = [
  {
    id: "classic",
    label: "קלאסי",
    description: "כחול כהה וזהב",
    colors: {
      "--primary": "240 24% 15%",
      "--primary-foreground": "36 33% 93%",
      "--accent": "37 42% 60%",
      "--accent-foreground": "240 24% 15%",
      "--background": "0 0% 100%",
      "--foreground": "0 0% 18%",
      "--secondary": "222 30% 93%",
      "--secondary-foreground": "0 0% 18%",
      "--muted": "222 30% 93%",
      "--muted-foreground": "220 10% 45%",
      "--card": "0 0% 100%",
      "--card-foreground": "0 0% 18%",
      "--border": "220 15% 69%",
      "--ring": "37 42% 60%",
    },
    swatch: ["#1c1f3a", "#c4944a", "#eee8dd"],
  },
  {
    id: "forest",
    label: "יער",
    description: "ירוק ואדמה",
    colors: {
      "--primary": "150 30% 18%",
      "--primary-foreground": "60 30% 93%",
      "--accent": "30 50% 55%",
      "--accent-foreground": "150 30% 18%",
      "--background": "60 20% 97%",
      "--foreground": "150 20% 15%",
      "--secondary": "120 15% 88%",
      "--secondary-foreground": "150 20% 15%",
      "--muted": "120 15% 88%",
      "--muted-foreground": "150 10% 45%",
      "--card": "60 20% 97%",
      "--card-foreground": "150 20% 15%",
      "--border": "120 12% 70%",
      "--ring": "30 50% 55%",
    },
    swatch: ["#1a3326", "#b87840", "#f5f3ec"],
  },
  {
    id: "midnight",
    label: "חצות",
    description: "כהה ומסתורי",
    colors: {
      "--primary": "270 30% 70%",
      "--primary-foreground": "270 20% 12%",
      "--accent": "200 80% 65%",
      "--accent-foreground": "270 20% 12%",
      "--background": "270 20% 10%",
      "--foreground": "270 15% 90%",
      "--secondary": "270 15% 18%",
      "--secondary-foreground": "270 15% 90%",
      "--muted": "270 15% 18%",
      "--muted-foreground": "270 10% 60%",
      "--card": "270 20% 14%",
      "--card-foreground": "270 15% 90%",
      "--border": "270 12% 28%",
      "--ring": "200 80% 65%",
    },
    swatch: ["#a07ac8", "#40b8e0", "#1a1422"],
  },
];

const STORAGE_KEY = "expert-theme";

function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "classic";
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "classic";
    const theme = THEMES.find((t) => t.id === saved) || THEMES[0];
    applyTheme(theme);
  }, []);

  const selectTheme = (theme) => {
    setActiveId(theme.id);
    localStorage.setItem(STORAGE_KEY, theme.id);
    applyTheme(theme);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors"
        title="בחר ערכת צבעים"
      >
        <Palette size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-10 z-50 w-52 rounded-xl border border-border bg-card shadow-lg p-2 space-y-1"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 pb-1 font-medium">
                ערכת צבעים
              </p>
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => selectTheme(theme)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-right transition-colors ${
                    activeId === theme.id
                      ? "bg-accent/15 text-accent"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {/* Swatches */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {theme.swatch.map((color, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-border/30"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight">{theme.label}</p>
                    <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                  </div>
                  {activeId === theme.id && (
                    <span className="text-accent text-sm leading-none">✓</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}