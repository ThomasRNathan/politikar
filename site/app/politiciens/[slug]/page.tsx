import Link from "next/link";
import { notFound } from "next/navigation";
import {
  POLITICIANS,
  claimsForPolitician,
  functionById,
  partyById,
  politicianBySlug,
  politiciansInParty,
  regionById,
} from "@/lib/fixtures";
import { TOPIC_LABELS } from "@/lib/types";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ClaimRow } from "@/components/ClaimRow";
import { VerdictPill } from "@/components/VerdictPill";
import { scoreColor, scoreColorSoft } from "@/lib/format";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return POLITICIANS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = politicianBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.full_name} : politikar`,
    description: `Profil de véracité de ${p.full_name}. ${p.bio_short}`,
  };
}

export default async function PoliticianProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = politicianBySlug(slug);
  if (!p) notFound();

  const party = partyById(p.party_id);
  const func = functionById(p.function_id);
  const region = regionById(p.region_id);

  const claims = claimsForPolitician(p.id).sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at)
  );
  const factualClaims = claims.filter((c) => c.claim_type === "factual_assertion");
  const promiseClaims = claims.filter((c) => c.claim_type === "promise");

  const peers = party
    ? politiciansInParty(party.id)
        .filter((pp) => pp.id !== p.id && pp.stats.is_significant)
        .sort((a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0))
        .slice(0, 4)
    : [];

  const sortedTopics = Object.entries(p.stats.topic_breakdown).sort(
    (a, b) => b[1]!.n - a[1]!.n
  );

  const sig = p.stats.is_significant;

  // Distribution of factual verdicts (for the dot strip)
  const verdictCounts: Record<string, number> = {};
  for (const c of factualClaims) {
    verdictCounts[c.verdict] = (verdictCounts[c.verdict] ?? 0) + 1;
  }
  const verdictOrder = ["true", "mostly_true", "mixed", "misleading_context", "mostly_false", "false", "unverifiable"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        href="/politiciens"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Tous les politiques
      </Link>

      <header className="mt-8 grid lg:grid-cols-[auto_1fr_auto] gap-8 items-start">
        <PoliticianAvatar politician={p} size={120} />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {func?.name}
            {region && ` · ${region.name}`}
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
            {p.full_name}
          </h1>
          {party && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: party.color_hex }}
              />
              <Link
                href={`/partis/${party.slug}`}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
              >
                {party.name}
              </Link>
              <span className="text-[var(--color-ink-soft)]">·</span>
              <span className="text-[var(--color-ink-soft)]">
                Tier {p.tier}
              </span>
            </div>
          )}
          <p className="mt-4 text-base text-[var(--color-ink-soft)] leading-relaxed max-w-2xl">
            {p.bio_short}
          </p>
        </div>
        <div className="text-center">
          <ScoreBadge score={sig ? p.stats.truth_score : null} size="xl" />
          {sig && (
            <p className="mt-3 text-xs text-[var(--color-ink-soft)] font-mono">
              IC95 {p.stats.ci_low}–{p.stats.ci_high}
            </p>
          )}
        </div>
      </header>

      {!sig && (
        <div className="mt-10 p-6 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-accent-soft)]">
          <p className="text-sm">
            <strong className="font-semibold">Score non significatif.</strong>{" "}
            Volume sous-jacent insuffisant ({p.stats.n_factual} affirmations
            factuelles, {p.stats.n_promises} promesses résolues). Plancher
            requis : 30 affirmations ou 5 promesses. Aucun classement public
            n&apos;inclut ce profil.
          </p>
        </div>
      )}

      <div className="mt-12 grid lg:grid-cols-[1fr_1.6fr] gap-10">
        <aside className="space-y-8">
          <section className="rounded-2xl bg-white border border-black/5 p-6">
            <h2 className="font-serif text-lg font-semibold mb-4">Décomposition</h2>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--color-ink-soft)]">Factuel</span>
                  <span className="font-medium">{p.stats.factual_score ?? "—"}</span>
                </div>
                <ConfidenceBar
                  score={p.stats.factual_score}
                  ciLow={p.stats.factual_score ? p.stats.factual_score - 4 : null}
                  ciHigh={p.stats.factual_score ? p.stats.factual_score + 4 : null}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--color-ink-soft)]">Promesses</span>
                  <span className="font-medium">{p.stats.promise_score ?? "—"}</span>
                </div>
                <ConfidenceBar
                  score={p.stats.promise_score}
                  ciLow={p.stats.promise_score ? p.stats.promise_score - 5 : null}
                  ciHigh={p.stats.promise_score ? p.stats.promise_score + 5 : null}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--color-ink-soft)]">Transparence</span>
                  <span className="font-medium">{p.stats.transparency_score}</span>
                </div>
                <ConfidenceBar
                  score={p.stats.transparency_score}
                  ciLow={p.stats.transparency_score - 3}
                  ciHigh={p.stats.transparency_score + 3}
                />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[var(--color-ink-soft)] uppercase tracking-wider">Affirmations</p>
                <p className="text-base font-serif font-semibold mt-0.5">
                  {p.stats.n_factual}
                </p>
              </div>
              <div>
                <p className="text-[var(--color-ink-soft)] uppercase tracking-wider">Promesses</p>
                <p className="text-base font-serif font-semibold mt-0.5">
                  {p.stats.n_promises}
                </p>
              </div>
            </div>
          </section>

          {sortedTopics.length > 0 && (
            <section className="rounded-2xl bg-white border border-black/5 p-6">
              <h2 className="font-serif text-lg font-semibold mb-4">Par sujet</h2>
              <ul className="space-y-3">
                {sortedTopics.map(([t, ts]) => (
                  <li key={t}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm">{TOPIC_LABELS[t as keyof typeof TOPIC_LABELS]}</span>
                      <span className="text-xs font-mono text-[var(--color-ink-soft)]">
                        {ts!.score} · n={ts!.n}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${ts!.score}%`,
                          background: scoreColor(ts!.score),
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-[var(--color-ink-soft)]">
                Les sujets avec moins de 10 claims ne sont pas affichés en
                production publique.
              </p>
            </section>
          )}

          {peers.length > 0 && (
            <section className="rounded-2xl bg-white border border-black/5 p-6">
              <h2 className="font-serif text-lg font-semibold mb-4">
                Pairs au {party?.name}
              </h2>
              <ul className="space-y-2">
                {peers.map((pp) => (
                  <li key={pp.id}>
                    <Link
                      href={`/politiciens/${pp.slug}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition"
                    >
                      <PoliticianAvatar politician={pp} size={32} />
                      <span className="text-sm flex-1 truncate">{pp.full_name}</span>
                      <ScoreBadge score={pp.stats.truth_score} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section>
          {factualClaims.length > 0 && (
            <div className="mb-10">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                Distribution des verdicts factuels
              </h2>
              <div className="rounded-2xl bg-white border border-black/5 p-5">
                <div className="flex h-6 rounded-full overflow-hidden">
                  {verdictOrder.map((v) => {
                    const n = verdictCounts[v] ?? 0;
                    if (n === 0) return null;
                    const pct = (n / factualClaims.length) * 100;
                    return (
                      <div
                        key={v}
                        title={`${v}: ${n}`}
                        style={{
                          width: `${pct}%`,
                          background: scoreColor(
                            v === "true" ? 95 :
                            v === "mostly_true" ? 78 :
                            v === "mixed" ? 50 :
                            v === "misleading_context" ? 38 :
                            v === "mostly_false" ? 30 :
                            v === "false" ? 15 :
                            null
                          ),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {verdictOrder.map((v) => {
                    const n = verdictCounts[v] ?? 0;
                    if (n === 0) return null;
                    return (
                      <div key={v} className="flex items-center gap-1.5">
                        <VerdictPill verdict={v as never} size="sm" />
                        <span className="text-[var(--color-ink-soft)]">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <h2 className="font-serif text-2xl font-semibold mb-2">
            Affirmations et promesses récentes
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-6">
            Échantillon illustratif. La plateforme MVP en couvrira plusieurs
            centaines par politique.
          </p>
          <div className="bg-white rounded-2xl border border-black/5 p-2 sm:p-4">
            {claims.length === 0 ? (
              <p className="p-4 text-sm text-[var(--color-ink-soft)]">
                Aucune affirmation  pour ce politique.
              </p>
            ) : (
              claims.map((c) => <ClaimRow key={c.id} claim={c} />)
            )}
          </div>

          {promiseClaims.length > 0 && (
            <div className="mt-10">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                Suivi des promesses
              </h2>
              <div className="space-y-3">
                {promiseClaims.map((c) => (
                  <Link
                    key={c.id}
                    href={`/claims/${c.id}`}
                    className="block bg-white rounded-2xl border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-serif text-base flex-1">
                        « {c.claim_text} »
                      </p>
                      <VerdictPill verdict={c.verdict} />
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed line-clamp-2">
                      {c.reasoning}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
