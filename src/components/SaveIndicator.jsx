import { motion, AnimatePresence } from "framer-motion";

export default function SaveIndicator({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs text-accent font-medium"
        >
          נשמר אוטומטית
        </motion.div>
      )}
    </AnimatePresence>
  );
}