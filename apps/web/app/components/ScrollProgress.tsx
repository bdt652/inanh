"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const value = (window.scrollY / (doc.scrollHeight - window.innerHeight)) * 100;
      setProgress(Number.isFinite(value) ? value : 0);
    };
    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div aria-hidden="true" className="progress-container">
      <div className="progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
