"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

type CategoryCardMotionProps = {
  children: ReactNode;
  index: number;
  className?: string;
};

export default function CategoryCardMotion({ children, index, className = "" }: CategoryCardMotionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8, rotateY: -10 }}
      animate={isInView ? { opacity: 1, scale: 1, rotateY: 0 } : { opacity: 0, scale: 0.8, rotateY: -10 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      whileHover={{
        scale: 1.05,
        y: -6,
        transition: { type: "spring", stiffness: 300, damping: 18 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
