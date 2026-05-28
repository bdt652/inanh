"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type FloatingElementProps = {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
  rotate?: boolean;
};

export default function FloatingElement({
  children,
  className = "",
  amplitude = 12,
  duration = 6,
  delay = 0,
  rotate = false,
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [0, -amplitude, 0],
        rotate: rotate ? [-1, 1, -1] : 0,
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
