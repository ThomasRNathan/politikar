import Link from "next/link";
import { notFound } from "next/navigation";
import {
  POLITICIANS,
  functionById,
  partyById,
  politicianBySlug,
  politiciansInParty,
  regionById,
} from "@/lib/fixtures";
import { TOPIC_LABELS, VERDICT_LABELS } from "@/lib/types";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/seo";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { VerdictPill } from "@/components/VerdictPill";
import { scoreColor, scoreColorSoft, formatDate } from "@/lib/format";
import { realSourcesFor } from "@/lib/realdata";
import { getClaimsForPolitician } from "@/lib/db/reads";
import { getRealScoreMap } from "@/lib/db/scores";

// ISR : politician profiles regenerate at most every 5 minutes so the
// daily extraction cron's new claims appear without a redeploy.
export const revalidate = 300;
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
  const title = `${p.full_name} : politikar`;
  const description = `Profil de véracité de ${p.full_name}. ${p.bio_short}`;
  return {
    title,
    description,
    alternates: { canonical: `/politiciens/${p.slug}` },
    openGraph: { title, description, url: `/politiciens/${p.slug}`, type: "profile" },
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


  // Real TruthScore from published verdicts (replaces the illustrative seed).
  // One cached query serves this profile and its peer cards.
  const scoreMap = await getRealScoreMap();
  const real = scoreMap.get(p.slug) ?? null;
  const realScoreOf = (slug: string): number | null => {
    const r = scoreMap.get(slug);
    return r && r.is_significant ? r.truth_score : null;
  };

  const peers = party
    ? politiciansInParty(party.id)
        .filter((pp) => pp.id !== p.id)
        .sort((a, b) => (realScoreOf(b.slug) ?? -1) - (realScoreOf(a.slug) ?? -1))
        .slice(0, 4)
    : [];

  // Per-topic breakdown from real verdicts needs volume; hidden until then
  // rather than surfacing illustrative sub-scores.
  const sortedTopics: [string, { score: number; n: number }][] = [];

  const sig = real?.is_significant ?? false;
  const truth = real?.truth_score ?? null;
  const factual = real?.factual_score ?? null;
  const promise = real?.promise_score ?? null;
  const transparency = real?.transparency_score ?? null;
  const nFactual = real?.n_factual ?? 0;
  const nPromises = real?.n_promises ?? 0;
  const ciLow = real?.ci_low ?? null;
  const ciHigh = real?.ci_high ?? null;

  // Real claims extracted by the LLM pipeline and persisted in Neon.
  const dbClaims = await getClaimsForPolitician(p.slug, 20);

  // ClaimReview structured data → Google fact-check rich results.
  // Emitted ONLY for real, published, rateable verdicts, and only once the
  // site is indexable — never for illustrative scores or "unverifiable".
  const CLAIM_RATING: Record<string, number> = {
    true: 5, mostly_true: 4, mixed: 3, misleading_context: 2, mostly_false: 2, false: 1,
  };
  const claimReviews = SITE_INDEXABLE
    ? dbClaims
        .filter((c) => c.verdict_is_published && c.verdict && CLAIM_RATING[c.verdict] !== undefined)
        .map((c) => ({
          "@context": "https://schema.org",
          "@type": "ClaimReview",
          url: `${SITE_URL}/politiciens/${p.slug}`,
          datePublished: c.occurred_at ?? undefined,
          claimReviewed: c.claim_text,
          itemReviewed: {
            "@type": "Claim",
            author: { "@type": "Person", name: p.full_name },
            ...(c.source_url
              ? { appearance: { "@type": "CreativeWork", url: c.source_url } }
              : {}),
          },
          author: { "@type": "Organization", name: "politikar", url: SITE_URL },
          reviewRating: {
            "@type": "Rating",
            ratingValue: CLAIM_RATING[c.verdict!],
            bestRating: 5,
            worstRating: 1,
            alternateName:
              VERDICT_LABELS[c.verdict as keyof typeof VERDICT_LABELS] ?? c.verdict,
          },
        }))
    : [];

  // Distribution of factual verdicts (for the dot strip)
  // Real verdict distribution: published factual verdicts only.
  const publishedFactual = dbClaims.filter(
    (c) => c.claim_type === "factual_assertion" && c.verdict_is_published && c.verdict,
  );
  const verdictCounts: Record<string, number> = {};
  for (const c of publishedFactual) {
    if (c.verdict) verdictCounts[c.verdict] = (verdictCounts[c.verdict] ?? 0) + 1;
  }
  const verdictOrder = ["true", "mostly_true", "mixed", "misleading_context", "mostly_false", "false", "unverifiable"];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {claimReviews.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(claimReviews) }}
        />
      )}
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
          <ScoreBadge score={sig ? truth : null} size="xl" />
          {sig && ciLow !== null && (
            <p className="mt-3 text-xs text-[var(--color-ink-soft)] font-mono">
              IC95 {ciLow}–{ciHigh}
            </p>
          )}
        </div>
      </header>

      {!sig && (
        <div className="mt-10 p-6 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-accent-soft)]">
          <p className="text-sm">
            <strong className="font-semibold">Score non significatif.</strong>{" "}
            {nFactual} affirmations factuelles et {nPromises} promesses
            extraites à ce jour. Le score devient significatif au-delà de 30
            affirmations factuelles ou 5 promesses aux verdicts résolus.
            Aucun classement public n&apos;inclut ce profil.
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
                  <span className="font-medium">{factual ?? "—"}</span>
                </div>
                <ConfidenceBar
                  score={factual}
                  ciLow={factual ? factual - 4 : null}
                  ciHigh={factual ? factual + 4 : null}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--color-ink-soft)]">Promesses</span>
                  <span className="font-medium">{promise ?? "—"}</span>
                </div>
                <ConfidenceBar
                  score={promise}
                  ciLow={promise ? promise - 5 : null}
                  ciHigh={promise ? promise + 5 : null}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[var(--color-ink-soft)]">Transparence</span>
                  <span className="font-medium">{transparency ?? "—"}</span>
                </div>
                <ConfidenceBar
                  score={transparency}
                  ciLow={transparency !== null ? transparency - 3 : null}
                  ciHigh={transparency !== null ? transparency + 3 : null}
                />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-black/5 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[var(--color-ink-soft)] uppercase tracking-wider">Affirmations</p>
                <p className="text-base font-serif font-semibold mt-0.5">
                  {nFactual}
                </p>
              </div>
              <div>
                <p className="text-[var(--color-ink-soft)] uppercase tracking-wider">Promesses</p>
                <p className="text-base font-serif font-semibold mt-0.5">
                  {nPromises}
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
                      <ScoreBadge score={realScoreOf(pp.slug)} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        <section>
          {publishedFactual.length > 0 && (
            <div className="mb-10">
              <h2 className="font-serif text-2xl font-semibold mb-4">
                Distribution des verdicts factuels
              </h2>
              <div className="rounded-2xl bg-white border border-black/5 p-5">
                <div className="flex h-6 rounded-full overflow-hidden">
                  {verdictOrder.map((v) => {
                    const n = verdictCounts[v] ?? 0;
                    if (n === 0) return null;
                    const pct = (n / publishedFactual.length) * 100;
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

          {dbClaims.length > 0 && (
            <section className="mb-10">
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <h2 className="font-serif text-2xl font-semibold">
                  Claims extraits par le pipeline
                </h2>
                <span className="text-xs text-[var(--color-trust)] font-mono">
                  pipeline live · {dbClaims[0].llm_model}
                </span>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] mb-4">
                Affirmations atomiques extraites en temps réel à partir des
                communications officielles, via le prompt versionné{" "}
                <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-bg-soft)]">
                  {dbClaims[0].prompt_version}
                </code>
                . Verdicts produits par la cascade de vérification : les
                claims sans evidence solide retournent{" "}
                <em>unverifiable</em>{" "}plutôt qu&apos;une supposition.
              </p>
              <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
                {dbClaims.slice(0, 8).map((c) => (
                  <article key={c.id} className="p-4">
                    <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                      <span className="shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-[var(--color-trust)] text-white font-medium">
                        {c.claim_type.replace("_", " ")}
                      </span>
                      {c.verdict && c.verdict_is_published ? (
                        <VerdictPill
                          verdict={c.verdict as never}
                          size="sm"
                        />
                      ) : c.verdict ? (
                        <span
                          className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium"
                          title="Verdict produit, en attente de revue éditoriale"
                        >
                          en revue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-black/5 text-[var(--color-ink-soft)] font-medium">
                          à vérifier
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-ink-soft)] font-mono">
                        conf {(c.extraction_confidence ?? 0).toFixed(2)}
                      </span>
                      {c.occurred_at && (
                        <span className="text-xs text-[var(--color-ink-soft)] ml-auto">
                          {formatDate(c.occurred_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-base text-[var(--color-ink)] leading-snug">
                      « {c.claim_text} »
                    </p>
                    {c.verdict && c.verdict_is_published && c.verdict_reasoning && (
                      <p className="mt-2 text-xs text-[var(--color-ink-soft)] leading-relaxed italic border-l-2 border-[var(--color-accent-soft)] pl-3">
                        {c.verdict_reasoning.length > 280
                          ? c.verdict_reasoning.slice(0, 277) + "…"
                          : c.verdict_reasoning}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-soft)] flex-wrap">
                      {c.topic_tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-black/5 font-medium"
                        >
                          {TOPIC_LABELS[t as keyof typeof TOPIC_LABELS] ?? t}
                        </span>
                      ))}
                      {c.source_url && (
                        <a
                          href={c.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[var(--color-accent)] hover:underline"
                        >
                          {c.source_channel ?? "source"} ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {(() => {
            const realSources = realSourcesFor(p.id);
            if (realSources.length === 0) return null;
            return (
              <section className="mb-10">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                  <h2 className="font-serif text-2xl font-semibold">
                    Communications récentes
                  </h2>
                  <span className="text-xs text-[var(--color-ink-soft)] font-mono">
                    données réelles
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink-soft)] mb-4">
                  Ingérées en temps réel depuis les sources officielles. Le
                  pipeline d&apos;extraction de claims et de vérification
                  n&apos;est pas encore branché ; le verdict s&apos;affichera
                  ici une fois la cascade opérationnelle.
                </p>
                <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
                  {realSources.slice(0, 8).map((s) => (
                    <a
                      key={s.id}
                      href={s.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start gap-4 p-4 hover:bg-[var(--color-bg-soft)] transition"
                    >
                      <span className="shrink-0 mt-1 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                        à vérifier
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-[var(--color-accent)] leading-snug">
                          {s.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                          {s.channel}
                          {s.occurred_at && ` · ${formatDate(s.occurred_at)}`}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        className="text-[var(--color-ink-soft)] mt-1 shrink-0"
                      >
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            );
          })()}

          {dbClaims.length === 0 && (
            <div className="bg-white rounded-2xl border border-black/5 p-6">
              <p className="text-sm text-[var(--color-ink-soft)]">
                Aucune affirmation n&apos;a encore été extraite pour ce
                politique. Le pipeline analyse de nouvelles communications
                officielles chaque jour ; les claims et leurs verdicts
                apparaîtront ici automatiquement.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
