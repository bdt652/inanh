"use client";

import { motion, type TargetAndTransition, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

type RevealVariant =
  | "fadeUp"
  | "fadeDown"
  | "fadeLeft"
  | "fadeRight"
  | "zoomIn"
  | "bounceIn"
  | "slideUp"
  | "rotateIn"
  | "flipUp";

const hiddenVariants: Record<RevealVariant, TargetAndTransition> = {
  fadeUp: { opacity: 0, y: 60 },
  fadeDown: { opacity: 0, y: -60 },
  fadeLeft: { opacity: 0, x: -80 },
  fadeRight: { opacity: 0, x: 80 },
  zoomIn: { opacity: 0, scale: 0.7 },
  bounceIn: { opacity: 0, scale: 0.3, y: 40 },
  slideUp: { opacity: 0, y: 100 },
  rotateIn: { opacity: 0, rotate: -15, scale: 0.8 },
  flipUp: { opacity: 0, rotateX: 90, y: 40 },
};

const visibleVariants: Record<RevealVariant, TargetAndTransition> = {
  fadeUp: { opacity: 1, y: 0 },
  fadeDown: { opacity: 1, y: 0 },
  fadeLeft: { opacity: 1, x: 0 },
  fadeRight: { opacity: 1, x: 0 },
  zoomIn: { opacity: 1, scale: 1 },
  bounceIn: { opacity: 1, scale: 1, y: 0 },
  slideUp: { opacity: 1, y: 0 },
  rotateIn: { opacity: 1, rotate: 0, scale: 1 },
  flipUp: { opacity: 1, rotateX: 0, y: 0 },
};

type ScrollRevealProps = {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  threshold?: number;
};

export default function ScrollReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = 0.7,
  once = true,
  className = "",
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  return (
    <motion.div
      ref={ref}
      initial={hiddenVariants[variant]}
      animate={isInView ? visibleVariants[variant] : hiddenVariants[variant]}
      transition={{
        duration,
        delay,
        ease: variant === "bounceIn" ? [0.34, 1.56, 0.64, 1] : [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
