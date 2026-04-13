'use client';
// src/components/canvas/ModeHUD.js
// Fixed overlay banner that appears when the canvas is in pen, delete, or pan mode.

import { motion, AnimatePresence } from 'framer-motion';

export default function ModeHUD({ mode, children }) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          key="hud"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
          style={{
            position:       'fixed',
            top:            72,
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         400,
            background:     'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(12px)',
            padding:        '7px 20px',
            display:        'flex',
            alignItems:     'center',
            gap:            10,
            pointerEvents:  'none',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
