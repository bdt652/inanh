"use client";

import { ReactNode, useEffect, useRef } from "react";

type RevealSectionProps = {
  children: ReactNode;
  delay?: number;
};

export default function RevealSection({ children, delay = 0 }: RevealSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}ms` }}
      className="scroll-reveal"
    >
      {children}
    </div>
  );
}
