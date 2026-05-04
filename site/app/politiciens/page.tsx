import Link from "next/link";
import { POLITICIANS, FUNCTIONS, PARTIES } from "@/lib/fixtures";
import { PoliticianCard } from "@/components/PoliticianCard";

export const metadata = {
  title: "Politiques : politikar",
  description: "Annuaire des figures nationales suivies par politikar.",
};

export default function PoliticiansIndex() {
  const sorted = [...POLITICIANS].sort((a, b) => {
    const sa = a.stats.is_significant ? a.stats.truth_score ?? 0 : -1;
    const sb = b.stats.is_significant ? b.stats.truth_score ?? 0 : -1;
    return sb - sa;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
          Annuaire
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          {POLITICIANS.length} figures nationales suivies.
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
          Top 50 figures de la politique française au MVP : Président,
          gouvernement, leaders de partis, têtes de listes principales,
          eurodéputés notables. Cliquez sur un nom pour voir le profil
          complet.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/politiciens"
          className="px-4 py-1.5 rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] text-sm"
        >
          Tous
        </Link>
        {FUNCTIONS.filter((f) => POLITICIANS.some((p) => p.function_id === f.id)).map((f) => (
          <Link
            key={f.id}
            href={`/fonctions/${f.slug}`}
            className="px-4 py-1.5 rounded-full border border-black/15 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
          >
            {f.name}
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => (
          <PoliticianCard key={p.id} politician={p} />
        ))}
      </div>

      <div className="mt-16 pt-10 border-t border-black/10 grid sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
            Par parti
          </p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {PARTIES.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/partis/${p.slug}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: p.color_hex }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
            Périmètre
          </p>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Le périmètre actuel couvre 16 figures nationales. La cible MVP
            est de 50 politiques actifs (Président, gouvernement, leaders de
            partis, têtes de listes), avec extension prévue aux 925
            parlementaires français en post-MVP.
          </p>
        </div>
      </div>
    </div>
  );
}
