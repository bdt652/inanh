"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type HoverCardProps = {
  children: ReactNode;
  className?: string;
  scale?: number;
  liftY?: number;
  tiltDeg?: number;
};

export default function HoverCard({
  children,
  className = "",
  scale = 1.04,
  liftY = -8,
  tiltDeg = 2,
}: HoverCardProps) {
  return (
    <motion.div
      whileHover={{
        scale,
        y: liftY,
        rotateY: tiltDeg,
        boxShadow: "0 20px 44px rgba(37, 27, 18, 0.18)",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
