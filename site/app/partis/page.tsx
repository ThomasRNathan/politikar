import Link from "next/link";
import { PARTIES, politiciansInParty } from "@/lib/fixtures";
import { FAMILY_LABELS } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { PartyLogo } from "@/components/PartyLogo";
import { getRealScoreMap, withRealStatsList, type DbTruthScore } from "@/lib/db/scores";

export const metadata = {
  title: "Partis : politikar",
  description: "Partis politiques suivis par politikar, score moyen pondéré par membre.",
  alternates: { canonical: "/partis" },
};

function partyAggScore(partyId: string, scoreMap: Map<string, DbTruthScore>): number | null {
  const ps = withRealStatsList(politiciansInParty(partyId), scoreMap).filter(
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
  return Math.round(total.sum / total.w);
}

export default async function PartiesIndex() {
  const scoreMap = await getRealScoreMap();
  const partiesWithScores = PARTIES.map((p) => ({
    ...p,
    agg: partyAggScore(p.id, scoreMap),
    n: politiciansInParty(p.id).length,
  })).sort((a, b) => (b.agg ?? -1) - (a.agg ?? -1));

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-12 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
          Annuaire des partis
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          Score moyen pondéré par parti.
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
          Score agrégé sur les politiques significatifs de chaque parti, pondéré
          par leur tier (P0 plus de poids que P2). Ne s&apos;affiche que si au
          moins un membre est significatif.
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
              <ScoreBadge score={p.agg} size="md" />
            </div>
            <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
              {p.n} politique{p.n > 1 ? "s" : ""} suivi{p.n > 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
