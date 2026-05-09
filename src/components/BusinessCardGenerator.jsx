import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import html2canvas from "html2canvas";

const DOMAIN_DESIGNS = {
  // Urban & Social
  urban: {
    gradient: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
    accentColor: "#e8e8e8",
    secondaryColor: "#666666",
    patternType: "concrete",
    borderColor: "#4a4a4a",
    textColor: "#ffffff",
  },
  social: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
    accentColor: "#ffff00",
    secondaryColor: "#666666",
    patternType: "concrete",
    borderColor: "#333333",
    textColor: "#ffffff",
  },

  // Engineering & Tech
  engineering: {
    gradient: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
    accentColor: "#32cd32",
    secondaryColor: "#666666",
    patternType: "grid",
    borderColor: "#cccccc",
    textColor: "#1a1a1a",
  },
  sustainability: {
    gradient: "linear-gradient(135deg, #fafaf8 0%, #f0f0ed 100%)",
    accentColor: "#7cb342",
    secondaryColor: "#8b8b7a",
    patternType: "grid",
    borderColor: "#ddd",
    textColor: "#2a2a2a",
  },
  tech: {
    gradient: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
    accentColor: "#00ff88",
    secondaryColor: "#ff00ff",
    patternType: "grid",
    borderColor: "#333333",
    textColor: "#00ff88",
  },

  // History & Art
  history: {
    gradient: "linear-gradient(135deg, #e8dcc8 0%, #d4c5b0 100%)",
    accentColor: "#8b6f47",
    secondaryColor: "#c9a876",
    patternType: "parchment",
    borderColor: "#c9a876",
    textColor: "#3e2723",
  },
  philosophy: {
    gradient: "linear-gradient(135deg, #ebe4d9 0%, #ddd4c9 100%)",
    accentColor: "#8b7355",
    secondaryColor: "#c9a876",
    patternType: "parchment",
    borderColor: "#c9a876",
    textColor: "#4a4a4a",
  },
  art: {
    gradient: "linear-gradient(135deg, #e5ddd0 0%, #d9d1c4 100%)",
    accentColor: "#a0826d",
    secondaryColor: "#d4a574",
    patternType: "parchment",
    borderColor: "#d4a574",
    textColor: "#2a2a2a",
  },

  // Legal & Strategic
  legal: {
    gradient: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
    accentColor: "#d4af37",
    secondaryColor: "#cccccc",
    patternType: "rules",
    borderColor: "#d4af37",
    textColor: "#000033",
  },
  strategic: {
    gradient: "linear-gradient(135deg, #0a1428 0%, #0f1f3d 100%)",
    accentColor: "#d4af37",
    secondaryColor: "#666666",
    patternType: "rules",
    borderColor: "#d4af37",
    textColor: "#ffffff",
  },

  // Medical & Science
  medical: {
    gradient: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
    accentColor: "#0066cc",
    secondaryColor: "#e8f4f8",
    patternType: "grid",
    borderColor: "#ccddee",
    textColor: "#003366",
  },
  science: {
    gradient: "linear-gradient(135deg, #f8f9fa 0%, #e8eef5 100%)",
    accentColor: "#003d7a",
    secondaryColor: "#dceef5",
    patternType: "grid",
    borderColor: "#b3d9ff",
    textColor: "#003d7a",
  },
};

function getDomainStyle(domain) {
  const domainLower = domain.toLowerCase();
  const keywords = Object.keys(DOMAIN_DESIGNS);

  for (const keyword of keywords) {
    if (domainLower.includes(keyword)) {
      return DOMAIN_DESIGNS[keyword];
    }
  }

  // Default based on common patterns
  if (
    domainLower.includes("טכנולוג") ||
    domainLower.includes("תוכנ") ||
    domainLower.includes("דיגיטל")
  ) {
    return DOMAIN_DESIGNS.tech;
  }
  if (domainLower.includes("משפט") || domainLower.includes("אחריות")) {
    return DOMAIN_DESIGNS.legal;
  }
  if (
    domainLower.includes("רפוא") ||
    domainLower.includes("בריאות") ||
    domainLower.includes("רפא")
  ) {
    return DOMAIN_DESIGNS.medical;
  }

  return DOMAIN_DESIGNS.tech; // Default
}

function generateSVGPattern(patternType, accentColor, bgColor) {
  const patterns = {
    concrete: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" opacity="0.1">
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="${bgColor}" filter="url(#noise)" />
      </svg>
    `,
    grid: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" opacity="0.08">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${accentColor}" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    `,
    parchment: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" opacity="0.15">
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:0" />
            <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.3" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#vignette)" />
      </svg>
    `,
    rules: `
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" opacity="0.2">
        <line x1="0" y1="0" x2="100%" y2="0" stroke="${accentColor}" stroke-width="2"/>
        <line x1="0" y1="100%" x2="100%" y2="100%" stroke="${accentColor}" stroke-width="2"/>
      </svg>
    `,
  };

  return patterns[patternType] || patterns.grid;
}

function generateBusinessCardHTML(persona) {
  const style = getDomainStyle(persona.domain || "");
  const pattern = generateSVGPattern(
    style.patternType,
    style.accentColor,
    style.gradient
  );

  return `
    <div style="
      width: 1748px;
      height: 1004px;
      background: ${style.gradient};
      color: ${style.textColor};
      font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
      direction: rtl;
      position: relative;
      overflow: hidden;
      padding: 80px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    ">
      <!-- Pattern Background -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      ">
        ${pattern}
      </div>

      <!-- Accent Line -->
      <div style="
        position: absolute;
        top: 0;
        right: 0;
        width: 8px;
        height: 100%;
        background: ${style.accentColor};
      "></div>

      <!-- Main Content -->
      <div style="position: relative; z-index: 2;">
        <div style="
          font-size: 68px;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -1px;
          color: ${style.textColor};
        ">
          ${persona.name || ""}
        </div>

        <div style="
          font-size: 24px;
          color: ${style.accentColor};
          margin-bottom: 32px;
          opacity: 0.9;
          font-weight: 600;
          letter-spacing: 1px;
        ">
          ${persona.domain || ""}
        </div>
      </div>

      <!-- Footer Section -->
      <div style="position: relative; z-index: 2;">
        <div style="
          border-top: 2px solid ${style.accentColor};
          padding-top: 20px;
          margin-top: 20px;
        ">
          <div style="
            font-size: 18px;
            font-style: italic;
            opacity: 0.85;
            line-height: 1.6;
            max-width: 900px;
            text-align: right;
            color: ${style.secondaryColor};
          ">
            "${persona.unique_expression || ""}"
          </div>
        </div>

        <!-- Strength Badge -->
        ${
          persona.strength
            ? `
          <div style="
            margin-top: 16px;
            display: inline-block;
            padding: 8px 16px;
            background-color: ${style.accentColor}22;
            color: ${style.accentColor};
            font-size: 14px;
            border-radius: 4px;
            font-weight: 600;
          ">
            ${persona.strength}
          </div>
        `
            : ""
        }
      </div>

      <!-- Corner Decoration -->
      <div style="
        position: absolute;
        bottom: 40px;
        left: 40px;
        width: 120px;
        height: 120px;
        border: 3px solid ${style.accentColor};
        opacity: 0.15;
        transform: rotate(45deg);
      "></div>
    </div>
  `;
}

export default function BusinessCardGenerator({ persona, onSave, existingCard = null }) {
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
          logging: false,
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
    let updatedHTML = cardHTML;

    // Replace name
    updatedHTML = updatedHTML.replace(
      /(<div style="[^"]*font-size: 68px[^"]*">\s*).*?(\s*<\/div>)/s,
      `$1${editedText.name}$2`
    );

    // Replace domain
    updatedHTML = updatedHTML.replace(
      /(<div style="[^"]*font-size: 24px[^"]*">\s*).*?(\s*<\/div>)/s,
      `$1${editedText.domain}$2`
    );

    // Replace expression
    updatedHTML = updatedHTML.replace(
      /"[^"]*"/,
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

      <Dialog
        open={isOpen || showPreview}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
            setShowPreview(false);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          {!showPreview ? (
            <>
              <DialogHeader className="p-6 pb-4">
                <DialogTitle>צור כרטיס ביקור</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4">
                <p className="text-sm text-muted-foreground mb-6">
                  אנו נוצור כרטיס ביקור עם עיצוב מקצועי המותאם לתחום
                  {persona.domain && <span> "{persona.domain}"</span>}
                </p>
                <Button
                  onClick={handleGenerate}
                  className="w-full bg-primary hover:bg-primary/90 text-lg h-12"
                >
                  יצור כרטיס ביקור
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="p-6 pb-4">
                <DialogTitle>כרטיס הביקור של {persona.name}</DialogTitle>
              </DialogHeader>

              <div className="px-6 pb-6 flex justify-center bg-gray-50 rounded-lg mx-4">
                <div
                  ref={cardRef}
                  dangerouslySetInnerHTML={{ __html: cardHTML }}
                  style={{
                    maxWidth: "100%",
                    margin: "20px 0",
                  }}
                />
              </div>

              {isEditing && (
                <div className="space-y-4 mb-6 p-4 bg-secondary/50 rounded-lg mx-6">
                  <div>
                    <label className="text-sm font-medium">שם</label>
                    <Input
                      value={editedText.name}
                      onChange={(e) =>
                        setEditedText({ ...editedText, name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">תחום</label>
                    <Input
                      value={editedText.domain}
                      onChange={(e) =>
                        setEditedText({
                          ...editedText,
                          domain: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ביטוי ייחודי</label>
                    <Input
                      value={editedText.expression}
                      onChange={(e) =>
                        setEditedText({
                          ...editedText,
                          expression: e.target.value,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-row-reverse gap-2 justify-start p-6 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                >
                  שמור כרטיס
                </Button>
                <Button onClick={handleRegenerate} variant="outline">
                  שנה סגנון
                </Button>
                <Button onClick={handleExport} variant="outline">
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
                    setIsEditing(false);
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
