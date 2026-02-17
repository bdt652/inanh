type HeroCardsProps = {
  statements: { title: string; description: string }[];
};

export default function HeroCards({ statements }: HeroCardsProps) {
  if (statements.length === 0) {
    return null;
  }

  const heroStatements = statements.slice(0, 4);

  return (
    <section className="-mt-6 mb-8 md:-mt-8 md:mb-10">
      <div className="panel rounded-none px-4 py-5 md:px-6 md:py-6">
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
            <article key={`${item.title}-${idx}`} className="relative rounded-none bg-white/80 p-4">
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-none border text-xs font-semibold tracking-[0.16em]"
                style={{ borderColor: "var(--line)", color: "var(--accent-strong)" }}
              >
                {(idx + 1).toString().padStart(2, "0")}
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
