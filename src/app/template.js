'use client';
import { motion, AnimatePresence } from 'framer-motion';

// template.js re-mounts on every navigation, giving us a clean
// enter animation without needing to manage AnimatePresence state.
// exit animations are handled by the outgoing template's unmount.

export default function Template({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}