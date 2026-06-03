import Link from "next/link";
import { PARTIES, politiciansInParty } from "@/lib/fixtures";
import { FAMILY_LABELS } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { PartyLogo } from "@/components/PartyLogo";
import { getPartyDbStats } from "@/lib/db/reads";

export const metadata = {
  title: "Partis : politikar",
  description:
    "Partis politiques suivis par politikar, score moyen pondéré par membre.",
};

// Refresh every 10 min — party-level scores shift slowly.
export const revalidate = 600;

// Fixture aggregate: weighted average of significant member scores.
function fixtureAggScore(partyId: string): number | null {
  const ps = politiciansInParty(partyId).filter(
    (p) => p.stats.is_significant && p.stats.truth_score !== null,
  );
  if (ps.length === 0) return null;
  const total = ps.reduce(
    (acc, p) => {
      const w = p.tier === "P0" ? 2 : p.tier === "P1" ? 1.5 : 1;
      return {
        sum: acc.sum + (p.stats.truth_score ?? 0) * w,
        w: acc.w + w,
      };
    },
    { sum: 0, w: 0 },
  );
  return Math.round(total.sum / total.w);
}

export default async function PartiesIndex() {
  const dbStats = await getPartyDbStats();
  const dbMap = new Map(dbStats.map((s) => [s.party_slug, s]));
  const hasDbData = dbStats.length > 0;

  const partiesWithScores = PARTIES.map((p) => {
    const db = dbMap.get(p.slug);
    return {
      ...p,
      // Prefer real DB score when available
      agg: db ? db.truth_score : fixtureAggScore(p.id),
      n: politiciansInParty(p.id).length,
      n_verdicts: db?.n_verdicts ?? 0,
      is_live: !!db,
    };
  }).sort((a, b) => (b.agg ?? -1) - (a.agg ?? -1));

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-3xl">
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            Annuaire des partis
          </p>
          {hasDbData && (
            <span className="text-[10px] text-[var(--color-trust)] font-mono">
              données réelles disponibles
            </span>
          )}
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          Score moyen pondéré par parti.
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
          Score agrégé sur les politiques significatifs de chaque parti, pondéré
          par la confiance de chaque vérification. Les partis sans données
          publiées affichent des scores illustratifs.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partiesWithScores.map((p) => (
          <Link
            key={p.id}
            href={`/partis/${p.slug}`}
            className="group bg-white rounded-2xl border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
          >
            <div className="flex items-start gap-4">
              <PartyLogo party={p} size={56} />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-lg font-semibold group-hover:text-[var(--color-accent)] truncate">
                  {p.name}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  {FAMILY_LABELS[p.political_family]}
                </p>
              </div>
              <div className="relative">
                <ScoreBadge score={p.agg} size="md" />
                {p.is_live && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-trust)]" />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
              <span>
                {p.n} politique{p.n > 1 ? "s" : ""} suivi
                {p.n > 1 ? "s" : ""}
              </span>
              {p.is_live ? (
                <span className="text-[var(--color-trust)]">
                  {p.n_verdicts} verdict{p.n_verdicts > 1 ? "s" : ""} publiés
                </span>
              ) : (
                <span className="italic opacity-60">illustratif</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
