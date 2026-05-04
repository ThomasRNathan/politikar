import { ingestionTotals } from "@/lib/realdata";

// Discreet status notice. Communicates honestly which parts of the
// platform are live:
//   - politician metadata (names, parties, photos, logos) → Wikipedia
//   - communications officielles → ingérées en continu (Élysée, Sénat)
//   - claims extraction + verdicts → pipeline LLM en construction
export function StatusNotice() {
  const totals = ingestionTotals();
  return (
    <div className="bg-[var(--color-bg-soft)] border-b border-black/5 text-xs text-[var(--color-ink-soft)]">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 justify-center text-center">
        <span aria-hidden className="text-[var(--color-accent)]">●</span>
        <p>
          Plateforme en construction. {totals.sources} communications
          officielles ingérées, {totals.factchecks} fact-checks de référence.
          L&apos;extraction de claims et la vérification automatisée
          arrivent.{" "}
          <a
            href="/methode"
            className="underline hover:text-[var(--color-accent)]"
          >
            En savoir plus
          </a>
        </p>
      </div>
    </div>
  );
}
