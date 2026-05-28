"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type HeroCardsProps = {
  statements: { title: string; description: string }[];
};

export default function HeroCards({ statements }: HeroCardsProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  if (statements.length === 0) return null;
  const heroStatements = statements.slice(0, 4);

  return (
    <section ref={ref} className="mb-8 md:mb-10">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="panel rounded-none px-4 py-5 md:px-6 md:py-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Ưu điểm</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--accent-strong)] md:text-2xl">
              Điểm mạnh khi in tại xưởng
            </h2>
          </div>
          <p className="text-sm text-[var(--text-soft)]">Nhanh, đúng màu, giao đúng hẹn.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {heroStatements.map((item, idx) => (
            <motion.article
              key={`${item.title}-${idx}`}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
              whileHover={{ y: -5, scale: 1.03, transition: { type: "spring", stiffness: 300, damping: 18 } }}
              className="relative rounded-none bg-white/80 p-4 cursor-default"
            >
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-none border text-xs font-semibold tracking-[0.16em]"
                style={{ borderColor: "var(--line)", color: "var(--accent-strong)" }}
              >
                {(idx + 1).toString().padStart(2, "0")}
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
