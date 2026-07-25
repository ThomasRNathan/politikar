import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REGIONS,
  regionBySlug,
  politiciansInRegion,
} from "@/lib/fixtures";
import { PoliticianCard } from "@/components/PoliticianCard";
import { ScoreBadge } from "@/components/ScoreBadge";
import { getRealScoreMap, withRealStatsList } from "@/lib/db/scores";

// ISR: refresh every 5 min so new claims/verdicts appear without a redeploy.
export const revalidate = 300;
export const dynamicParams = false;

export async function generateStaticParams() {
  return REGIONS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) return {};
  return {
    title: `${region.name} : politikar`,
    description: `Score de véracité moyen des élus de ${region.name} suivis par politikar.`,
    alternates: { canonical: `/regions/${region.slug}` },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const region = regionBySlug(slug);
  if (!region) notFound();
  const scoreMap = await getRealScoreMap();
  const elus = withRealStatsList(politiciansInRegion(region.id), scoreMap).sort(
    (a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0)
  );
  const sigElus = elus.filter(
    (p) => p.stats.is_significant && p.stats.truth_score !== null
  );
  let agg: { score: number } | null = null;
  if (sigElus.length > 0) {
    let sum = 0;
    let w = 0;
    for (const p of sigElus) {
      const ww = p.tier === "P0" ? 2 : p.tier === "P1" ? 1.5 : 1;
      sum += (p.stats.truth_score ?? 0) * ww;
      w += ww;
    }
    agg = { score: Math.round(sum / w) };
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Carte de France
      </Link>
      <header className="mt-8 mb-10 flex items-center justify-between flex-wrap gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            Région
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
            {region.name}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
            {elus.length} élu{elus.length > 1 ? "s" : ""} suivi{elus.length > 1 ? "s" : ""} 
          </p>
        </div>
        {agg && (
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">
              Score régional
            </p>
            <ScoreBadge score={agg.score} size="lg" />
          </div>
        )}
      </header>
      {elus.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Aucun politique rattaché à cette région.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {elus.map((p) => (
            <PoliticianCard key={p.id} politician={p} />
          ))}
        </div>
      )}
    </div>
  );
}
