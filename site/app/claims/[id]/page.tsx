import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CLAIMS,
  claimById,
  politicianById,
  politicianBySlug,
  sourceById,
} from "@/lib/fixtures";
import { TOPIC_LABELS } from "@/lib/types";
import { VerdictPill } from "@/components/VerdictPill";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { formatDate } from "@/lib/format";
import { getClaimById } from "@/lib/db/reads";

// ISR: claim pages revalidate every 5 min so updated verdicts appear.
// dynamicParams=true lets real DB claim UUIDs render (not just fixtures).
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Pre-render fixture claims at build time; DB claims are rendered on demand.
  return CLAIMS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fixtureClaim = claimById(id);
  if (fixtureClaim) {
    const p = politicianById(fixtureClaim.politician_id);
    return {
      title: `Vérification d'une affirmation de ${p?.full_name} : politikar`,
      description: fixtureClaim.claim_text.slice(0, 150),
    };
  }
  const dbClaim = await getClaimById(id);
  if (!dbClaim) return {};
  return {
    title: `Vérification · ${dbClaim.politician_full_name} : politikar`,
    description: dbClaim.claim_text.slice(0, 150),
  };
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // --- Fixture path (pre-seeded illustrative claims) ---
  const fixtureClaim = claimById(id);
  if (fixtureClaim) {
    const p = politicianById(fixtureClaim.politician_id)!;
    const source = sourceById(fixtureClaim.source_id);
    return (
      <ClaimDetailLayout
        claimText={fixtureClaim.claim_text}
        verdict={fixtureClaim.verdict}
        confidenceScore={fixtureClaim.confidence_score}
        humanReviewed={fixtureClaim.human_reviewed}
        topicTags={fixtureClaim.topic_tags}
        reasoning={fixtureClaim.reasoning}
        evidence={fixtureClaim.evidence}
        politicianSlug={p.slug}
        politicianFullName={p.full_name}
        politicianNode={<PoliticianAvatar politician={p} size={44} />}
        channel={source?.channel ?? null}
        occurredAt={fixtureClaim.occurred_at}
        sourceUrl={null}
        llmModel={null}
        promptVersion={null}
        isLive={false}
      />
    );
  }

  // --- DB path (real pipeline claims) ---
  const dbClaim = await getClaimById(id);
  if (!dbClaim) notFound();

  const pol = politicianBySlug(dbClaim.politician_slug);

  return (
    <ClaimDetailLayout
      claimText={dbClaim.claim_text}
      verdict={dbClaim.verdict}
      confidenceScore={dbClaim.confidence_score}
      humanReviewed={dbClaim.human_reviewed}
      topicTags={dbClaim.topic_tags}
      reasoning={dbClaim.reasoning}
      evidence={dbClaim.evidence}
      politicianSlug={dbClaim.politician_slug}
      politicianFullName={dbClaim.politician_full_name}
      politicianNode={
        pol ? (
          <PoliticianAvatar politician={pol} size={44} />
        ) : (
          <div
            className="h-11 w-11 rounded-full flex-shrink-0 flex items-center justify-center bg-[var(--color-accent)] text-white font-bold"
          >
            {dbClaim.politician_full_name[0]}
          </div>
        )
      }
      channel={dbClaim.channel}
      occurredAt={dbClaim.occurred_at}
      sourceUrl={dbClaim.source_url}
      llmModel={dbClaim.llm_model}
      promptVersion={dbClaim.prompt_version}
      isLive={true}
    />
  );
}

// ---- Shared layout component ----

type Evidence = {
  source_url: string;
  source_label: string;
  quote: string;
  weight: number;
  kind: string;
};

function ClaimDetailLayout({
  claimText,
  verdict,
  confidenceScore,
  humanReviewed,
  topicTags,
  reasoning,
  evidence,
  politicianSlug,
  politicianFullName,
  politicianNode,
  channel,
  occurredAt,
  sourceUrl,
  llmModel,
  promptVersion,
  isLive,
}: {
  claimText: string;
  verdict: string;
  confidenceScore: number;
  humanReviewed: boolean;
  topicTags: string[];
  reasoning: string;
  evidence: Evidence[];
  politicianSlug: string;
  politicianFullName: string;
  politicianNode: React.ReactNode;
  channel: string | null;
  occurredAt: string | null;
  sourceUrl: string | null;
  llmModel: string | null;
  promptVersion: string | null;
  isLive: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href={`/politiciens/${politicianSlug}`}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Profil de {politicianFullName}
      </Link>

      <header className="mt-8 mb-10">
        <div className="flex items-center gap-3 mb-6">
          {politicianNode}
          <div>
            <Link
              href={`/politiciens/${politicianSlug}`}
              className="text-sm font-medium hover:text-[var(--color-accent)]"
            >
              {politicianFullName}
            </Link>
            {(channel || occurredAt) && (
              <p className="text-xs text-[var(--color-ink-soft)]">
                {[channel, occurredAt ? formatDate(occurredAt) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {isLive && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-trust)] text-white font-medium uppercase tracking-wider">
              pipeline live
            </span>
          )}
        </div>
        <p className="font-serif text-3xl sm:text-4xl leading-tight font-semibold tracking-tight">
          « {claimText} »
        </p>
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <VerdictPill verdict={verdict as never} />
          <span className="text-sm text-[var(--color-ink-soft)]">
            confiance {Math.round(confidenceScore * 100)} %
          </span>
          {humanReviewed && (
            <span className="text-sm text-[var(--color-trust)]">
              ✓ revu par un humain
            </span>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {topicTags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded bg-black/5 font-medium"
              >
                {TOPIC_LABELS[t as keyof typeof TOPIC_LABELS] ?? t}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-black/5 p-6 sm:p-8 mb-8">
        <h2 className="font-serif text-xl font-semibold mb-4">Raisonnement</h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)] whitespace-pre-wrap">
          {reasoning}
        </p>
      </section>

      {evidence.length > 0 && (
        <section className="bg-white rounded-2xl border border-black/5 p-6 sm:p-8 mb-8">
          <h2 className="font-serif text-xl font-semibold mb-4">
            Sources et évidences ({evidence.length})
          </h2>
          <ul className="space-y-5">
            {evidence.map((e, i) => (
              <li key={i} className="border-l-2 border-[var(--color-accent-soft)] pl-4">
                <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                    {e.kind === "fact_checker" && "Fact-checker"}
                    {e.kind === "data_api" && "Donnée publique"}
                    {e.kind === "official_document" && "Document officiel"}
                    {e.kind === "press_article" && "Article de presse"}
                    {!["fact_checker","data_api","official_document","press_article"].includes(e.kind) && e.kind}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-ink-soft)]">
                    poids {e.weight.toFixed(2)}
                  </span>
                </div>
                <p className="font-medium text-sm">{e.source_label}</p>
                <p className="mt-1 text-sm italic text-[var(--color-ink-soft)]">
                  « {e.quote} »
                </p>
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-[var(--color-accent)] hover:underline break-all"
                >
                  {e.source_url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(llmModel || promptVersion || sourceUrl) && (
        <section className="bg-[var(--color-bg-soft)] rounded-2xl border border-black/5 p-4 mb-8 text-xs text-[var(--color-ink-soft)] font-mono">
          <p className="font-sans font-semibold text-[var(--color-ink)] mb-2">Traçabilité</p>
          {llmModel && <p>Modèle : {llmModel}</p>}
          {promptVersion && <p>Prompt : {promptVersion}</p>}
          {sourceUrl && (
            <p>
              Source :{" "}
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline break-all">
                {sourceUrl}
              </a>
            </p>
          )}
        </section>
      )}

      <section className="bg-[var(--color-bg-soft)] rounded-2xl border border-black/5 p-6 text-sm text-[var(--color-ink-soft)] leading-relaxed">
        <p>
          <strong className="text-[var(--color-ink)]">Note méthodologique.</strong>{" "}
          Le verdict ci-dessus qualifie le propos, jamais la personne. Il est
          produit selon une cascade publique : recherche dans la base interne,
          dans les fact-checkers reconnus, dans les données structurées
          publiques (INSEE, Eurostat), puis raisonnement final par modèle. Pour
          les claims des figures P0 ou de faible confiance, une revue humaine
          est obligatoire avant publication. La méthode complète est dans{" "}
          <Link href="/methode" className="text-[var(--color-accent)] hover:underline">
            la page méthodologie
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
