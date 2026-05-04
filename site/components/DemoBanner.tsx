// Discreet status notice. Communicates honestly:
// - politician metadata (names, parties, photos, logos) is real, sourced
//   from Wikipedia / Wikidata
// - claims, verdicts and scores are illustrative because the fact-checking
//   pipeline is not yet operational
export function StatusNotice() {
  return (
    <div className="bg-[var(--color-bg-soft)] border-b border-black/5 text-xs text-[var(--color-ink-soft)]">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 justify-center text-center">
        <span aria-hidden className="text-[var(--color-accent)]">●</span>
        <p>
          Plateforme en construction. Données politiques (photos, partis,
          fonctions) issues de Wikipedia. Le pipeline de fact-checking
          automatisé n&apos;est pas encore opérationnel ; les scores et
          verdicts visibles sont illustratifs.{" "}
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
