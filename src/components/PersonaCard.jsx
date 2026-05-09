import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import moment from "moment";

moment.locale("he");

export default function PersonaCard({ persona, index }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const lastActive = persona.last_active
    ? moment(persona.last_active).fromNow()
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/chat/${persona.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? "#E4E4E4" : "#F0F0F0",
        border: `1px solid ${hovered ? "#999999" : "#CCCCCC"}`,
        borderRadius: "4px",
        padding: "24px",
        cursor: "pointer",
        transition: "background-color 0.15s, border-color 0.15s",
        position: "relative",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "inherit",
      }}
    >
      <div>
        <div style={{ color: "#000000", fontWeight: "700", fontSize: "20px", lineHeight: 1.3 }}>
          {persona.name}
        </div>
        <div style={{ color: "#000000", fontWeight: "400", fontSize: "14px", marginTop: "6px" }}>
          {persona.domain}
        </div>
        <div style={{ color: "#666666", fontWeight: "300", fontSize: "12px", marginTop: "8px" }}>
          {persona.tone}
        </div>
      </div>

      {lastActive && (
        <div style={{ color: "#999999", fontSize: "11px", textAlign: "left", marginTop: "16px" }}>
          {lastActive}
        </div>
      )}
    </motion.div>
  );
}