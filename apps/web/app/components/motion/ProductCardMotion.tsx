"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

type ProductCardMotionProps = {
  children: ReactNode;
  index: number;
  className?: string;
};

export default function ProductCardMotion({ children, index, className = "" }: ProductCardMotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -10,
        scale: 1.03,
        boxShadow: "0 22px 48px rgba(37, 27, 18, 0.2)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
