import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import html2canvas from "html2canvas";

const DOMAIN_STYLES = {
  urban: {
    colors: { bg: "#2a2a2a", text: "#f5f5f5", accent: "#3a3a3a", highlight: "#ffffff" },
    pattern: "concrete",
    typography: "serif",
    layout: "asymmetric",
  },
  social: {
    colors: { bg: "#1a1a1a", text: "#ffffff", accent: "#444444", highlight: "#ffff00" },
    pattern: "concrete",
    typography: "serif",
    layout: "asymmetric",
  },
  engineering: {
    colors: { bg: "#f5f5f5", text: "#333333", accent: "#a4ac86", highlight: "#32cd32" },
    pattern: "grid",
    typography: "monospace",
    layout: "precise",
  },
  sustainability: {
    colors: { bg: "#fafaf8", text: "#2a2a2a", accent: "#8b8b7a", highlight: "#7cb342" },
    pattern: "grid",
    typography: "monospace",
    layout: "precise",
  },
  history: {
    colors: { bg: "#e8dcc8", text: "#3e2723", accent: "#d4a574", highlight: "#8b6f47" },
    pattern: "parchment",
    typography: "serif",
    layout: "centered",
  },
  philosophy: {
    colors: { bg: "#ebe4d9", text: "#4a4a4a", accent: "#c9a876", highlight: "#8b7355" },
    pattern: "parchment",
    typography: "serif",
    layout: "centered",
  },
  art: {
    colors: { bg: "#e5ddd0", text: "#2a2a2a", accent: "#d4a574", highlight: "#a0826d" },
    pattern: "parchment",
    typography: "serif",
    layout: "centered",
  },
  legal: {
    colors: { bg: "#ffffff", text: "#000033", accent: "#d4af37", highlight: "#000033" },
    pattern: "rules",
    typography: "serif",
    layout: "formal",
  },
  strategic: {
    colors: { bg: "#0a1428", text: "#ffffff", accent: "#d4af37", highlight: "#d4af37" },
    pattern: "rules",
    typography: "serif",
    layout: "formal",
  },
  tech: {
    colors: { bg: "#0a0a0a", text: "#00ff00", accent: "#1a1a1a", highlight: "#ff00ff" },
    pattern: "grid",
    typography: "monospace",
    layout: "asymmetric",
  },
  digital: {
    colors: { bg: "#000000", text: "#00ff88", accent: "#111111", highlight: "#ffff00" },
    pattern: "grid",
    typography: "monospace",
    layout: "asymmetric",
  },
  medical: {
    colors: { bg: "#ffffff", text: "#003366", accent: "#e8f4f8", highlight: "#003366" },
    pattern: "whitespace",
    typography: "sans",
    layout: "precise",
  },
  science: {
    colors: { bg: "#f8f9fa", text: "#003d7a", accent: "#dceef5", highlight: "#003d7a" },
    pattern: "grid",
    typography: "sans",
    layout: "precise",
  },
};

function getDomainStyle(domain, tone) {
  const domainLower = domain.toLowerCase();

  // Try to match domain keywords
  for (const [key, style] of Object.entries(DOMAIN_STYLES)) {
    if (domainLower.includes(key)) {
      return style;
    }
  }

  // Derive from tone if no match
  if (tone) {
    const toneLower = tone.toLowerCase();
    if (toneLower.includes("חם") || toneLower.includes("טופל")) {
      return DOMAIN_STYLES.philosophy; // Warm tones
    }
    if (toneLower.includes("ניתוח") || toneLower.includes("מדויק")) {
      return DOMAIN_STYLES.engineering; // Analytical
    }
    if (toneLower.includes("פרובוק")) {
      return DOMAIN_STYLES.urban; // Provocative
    }
  }

  return DOMAIN_STYLES.tech; // Default
}

function generateDecorativeElement(style, domain) {
  const { pattern } = style;

  if (pattern === "concrete") {
    return `<div style="position: absolute; bottom: 0; left: 0; width: 200px; height: 200px; background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px; opacity: 0.3;"></div>`;
  }

  if (pattern === "grid") {
    return `<div style="position: absolute; top: 0; right: 0; width: 150px; height: 150px; border: 2px solid ${style.colors.highlight}; opacity: 0.2;"></div>`;
  }

  if (pattern === "parchment") {
    return `<div style="position: absolute; bottom: 0; right: 0; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, ${style.colors.highlight}15 0%, transparent 70%);"></div>`;
  }

  if (pattern === "rules") {
    return `<div style="position: absolute; top: 20px; right: 0; height: 2px; width: 150px; background: linear-gradient(to left, ${style.colors.highlight}, transparent);"></div>`;
  }

  if (pattern === "whitespace") {
    return `<div style="position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: ${style.colors.accent};"></div>`;
  }

  return "";
}

function generateBusinessCardHTML(persona) {
  const style = getDomainStyle(persona.domain || "", persona.tone || "");
  const { colors, typography } = style;

  const fontFamily = typography === "serif"
    ? "'Georgia', serif"
    : typography === "monospace"
    ? "'Courier New', monospace"
    : "'Helvetica', sans-serif";

  const decorative = generateDecorativeElement(style, persona.domain);

  return `
    <div style="
      width: 1748px;
      height: 1004px;
      background-color: ${colors.bg};
      color: ${colors.text};
      font-family: ${fontFamily};
      direction: rtl;
      position: relative;
      overflow: hidden;
      padding: 80px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    ">
      ${decorative}

      <div style="position: relative; z-index: 1;">
        <div style="
          font-size: 72px;
          font-weight: bold;
          line-height: 1.2;
          margin-bottom: 20px;
          letter-spacing: -1px;
        ">
          ${persona.name || ""}
        </div>

        <div style="
          font-size: 28px;
          color: ${colors.accent};
          margin-bottom: 40px;
          opacity: 0.8;
          font-weight: 500;
        ">
          ${persona.domain || ""}
        </div>
      </div>

      <div style="position: relative; z-index: 1;">
        <div style="
          font-size: 20px;
          font-style: italic;
          opacity: 0.7;
          line-height: 1.6;
          max-width: 800px;
          text-align: right;
        ">
          "${persona.unique_expression || ""}"
        </div>
      </div>
    </div>
  `;
}

export default function BusinessCardGenerator({ persona, onSave, onClose, existingCard = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardHTML, setCardHTML] = useState(existingCard || "");
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState({
    name: persona.name || "",
    domain: persona.domain || "",
    expression: persona.unique_expression || "",
  });
  const cardRef = useRef(null);

  const handleGenerate = () => {
    const html = generateBusinessCardHTML(persona);
    setCardHTML(html);
    setShowPreview(true);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleSave = () => {
    onSave(cardHTML);
    setShowPreview(false);
    setIsOpen(false);
  };

  const handleExport = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
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

  const handleEditSave = () => {
    const updatedHTML = cardHTML
      .replace(
        /(<div style="[^"]*font-size: 72px[^"]*">\s*).*?(\s*<\/div>)/,
        `$1${editedText.name}$2`
      )
      .replace(
        /(<div style="[^"]*font-size: 28px[^"]*">\s*).*?(\s*<\/div>)/,
        `$1${editedText.domain}$2`
      )
      .replace(
        /"\[^"]*"/,
        `"${editedText.expression}"`
      );
    setCardHTML(updatedHTML);
    setIsEditing(false);
  };

  return (
    <>
      <button
        onClick={() => {
          if (existingCard) {
            setCardHTML(existingCard);
            setShowPreview(true);
          } else {
            setIsOpen(true);
          }
        }}
        className="w-full mt-4 px-4 py-2 text-sm font-medium rounded-lg
                   bg-accent/20 text-accent-foreground hover:bg-accent/30
                   transition-colors duration-200"
      >
        {existingCard ? "ערוך כרטיס" : "צור כרטיס ביקור"}
      </button>

      <Dialog open={isOpen || showPreview} onOpenChange={(open) => {
        if (!open) {
          setIsOpen(false);
          setShowPreview(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {!showPreview ? (
            <>
              <DialogHeader>
                <DialogTitle>צור כרטיס ביקור</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                <p className="text-sm text-muted-foreground mb-4">
                  לחץ להמשך וننו ניצור כרטיס ביקור עם עיצוב ייחודי לפי תחום ההתמחות של {persona.name}
                </p>
                <Button
                  onClick={handleGenerate}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  צור כרטיס ביקור
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>כרטיס הביקור של {persona.name}</DialogTitle>
              </DialogHeader>
              <div className="py-6 flex justify-center">
                <div
                  ref={cardRef}
                  dangerouslySetInnerHTML={{ __html: cardHTML }}
                  style={{
                    maxWidth: "100%",
                    margin: "0 auto",
                    transform: "scale(0.5)",
                    transformOrigin: "top center",
                  }}
                />
              </div>

              {isEditing && (
                <div className="space-y-4 mb-6 p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium">שם</label>
                    <Input
                      value={editedText.name}
                      onChange={(e) => setEditedText({ ...editedText, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">תחום</label>
                    <Input
                      value={editedText.domain}
                      onChange={(e) => setEditedText({ ...editedText, domain: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ביטוי ייחודי</label>
                    <Input
                      value={editedText.expression}
                      onChange={(e) => setEditedText({ ...editedText, expression: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-row-reverse gap-3 justify-start">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  שמור כרטיס
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                >
                  שנה סגנון
                </Button>
                <Button
                  onClick={handleExport}
                  variant="outline"
                >
                  הורד כ-PNG
                </Button>
                <Button
                  onClick={() => {
                    if (isEditing) {
                      handleEditSave();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  variant="outline"
                >
                  {isEditing ? "שמור עריכה" : "ערוך כרטיס"}
                </Button>
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    setIsOpen(false);
                  }}
                  variant="ghost"
                >
                  ביטול
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
