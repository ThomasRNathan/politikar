export function DemoBanner() {
  return (
    <div className="bg-[var(--color-accent)] text-white text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 justify-center text-center">
        <span aria-hidden className="text-base">⚠</span>
        <p>
          <strong>Démo de design.</strong> Tous les chiffres, claims et verdicts
          ci-dessous sont fictifs. Aucun fact-check réel n&apos;a été produit
          par politikar. Les noms publics servent uniquement à rendre la
          maquette concrète.
        </p>
      </div>
    </div>
  );
}
