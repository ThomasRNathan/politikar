import Link from "next/link";
import { FUNCTIONS, POLITICIANS, politiciansInFunction } from "@/lib/fixtures";
import { ScoreBadge } from "@/components/ScoreBadge";

export const metadata = {
  title: "Fonctions : politikar",
  description: "Analyse par fonction politique : exécutif, parlementaires, européens, locaux.",
  alternates: { canonical: "/fonctions" },
};

function functionAggScore(functionId: string): { score: number; n: number } | null {
  const ps = politiciansInFunction(functionId).filter(
    (p) => p.stats.is_significant && p.stats.truth_score !== null
  );
  if (ps.length === 0) return null;
  const total = ps.reduce(
    (acc, p) => {
      const w = p.tier === "P0" ? 2 : p.tier === "P1" ? 1.5 : 1;
      return { sum: acc.sum + (p.stats.truth_score ?? 0) * w, w: acc.w + w };
    },
    { sum: 0, w: 0 }
  );
  return { score: Math.round(total.sum / total.w), n: ps.length };
}

const LEVEL_LABELS: Record<string, string> = {
  national_executive: "Exécutif national",
  national_legislative: "Parlement",
  european: "Europe",
  regional: "Régions",
  party_leadership: "Direction de parti",
};

export default function FunctionsIndex() {
  const groups = FUNCTIONS.reduce<Record<string, typeof FUNCTIONS>>((acc, f) => {
    (acc[f.level] ??= []).push(f);
    return acc;
  }, {});

  const totalCovered = POLITICIANS.length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
          Analyse par fonction
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          Comparer à fonctions équivalentes.
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
          Les classements politikar ne se font qu&apos;entre politiques de
          même fonction (un Premier ministre n&apos;est pas comparé à un
          sénateur). Chaque page de fonction agrège le score moyen pondéré,
          la distribution par parti et le ranking interne.{" "}
          <strong className="text-[var(--color-ink)]">{totalCovered} politiques</strong> couverts dans notre périmètre actuel.
        </p>
      </header>

      {Object.entries(groups).map(([level, funcs]) => (
        <section key={level} className="mb-14">
          <h2 className="font-serif text-2xl font-semibold tracking-tight mb-6">
            {LEVEL_LABELS[level] ?? level}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcs.map((f) => {
              const agg = functionAggScore(f.id);
              const n = politiciansInFunction(f.id).length;
              return (
                <Link
                  key={f.id}
                  href={`/fonctions/${f.slug}`}
                  className="group bg-white rounded-2xl border border-black/5 p-5 hover:border-[var(--color-accent)] transition flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-semibold group-hover:text-[var(--color-accent)] truncate">
                      {f.name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                      {n} {n > 1 ? "politiques suivis" : "politique suivi"}
                    </p>
                  </div>
                  <ScoreBadge score={agg?.score ?? null} size="md" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
