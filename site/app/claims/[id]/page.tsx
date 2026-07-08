import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CLAIMS,
  claimById,
  politicianById,
  sourceById,
} from "@/lib/fixtures";
import { TOPIC_LABELS } from "@/lib/types";
import { VerdictPill } from "@/components/VerdictPill";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { formatDate } from "@/lib/format";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return CLAIMS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claim = claimById(id);
  if (!claim) return {};
  const p = politicianById(claim.politician_id);
  return {
    title: `Vérification d'une affirmation de ${p?.full_name} : politikar`,
    description: claim.claim_text.slice(0, 150),
    alternates: { canonical: `/claims/${claim.id}` },
  };
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claim = claimById(id);
  if (!claim) notFound();
  const p = politicianById(claim.politician_id)!;
  const source = sourceById(claim.source_id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href={`/politiciens/${p.slug}`}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Profil de {p.full_name}
      </Link>

      <header className="mt-8 mb-10">
        <div className="flex items-center gap-3 mb-6">
          <PoliticianAvatar politician={p} size={44} />
          <div>
            <Link
              href={`/politiciens/${p.slug}`}
              className="text-sm font-medium hover:text-[var(--color-accent)]"
            >
              {p.full_name}
            </Link>
            {source && (
              <p className="text-xs text-[var(--color-ink-soft)]">
                {source.channel} · {formatDate(claim.occurred_at)}
              </p>
            )}
          </div>
        </div>
        <p className="font-serif text-3xl sm:text-4xl leading-tight font-semibold tracking-tight">
          « {claim.claim_text} »
        </p>
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <VerdictPill verdict={claim.verdict} />
          <span className="text-sm text-[var(--color-ink-soft)]">
            confiance {Math.round(claim.confidence_score * 100)} %
          </span>
          {claim.human_reviewed && (
            <span className="text-sm text-[var(--color-trust)]">
              ✓ revu par un humain
            </span>
          )}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {claim.topic_tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded bg-black/5 font-medium"
              >
                {TOPIC_LABELS[t]}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-black/5 p-6 sm:p-8 mb-8">
        <h2 className="font-serif text-xl font-semibold mb-4">Raisonnement</h2>
        <p className="text-base leading-relaxed text-[var(--color-ink)]">
          {claim.reasoning}
        </p>
      </section>

      {claim.evidence.length > 0 && (
        <section className="bg-white rounded-2xl border border-black/5 p-6 sm:p-8 mb-8">
          <h2 className="font-serif text-xl font-semibold mb-4">
            Sources et évidences ({claim.evidence.length})
          </h2>
          <ul className="space-y-5">
            {claim.evidence.map((e, i) => (
              <li key={i} className="border-l-2 border-[var(--color-accent-soft)] pl-4">
                <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                  <span className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                    {e.kind === "fact_checker" && "Fact-checker"}
                    {e.kind === "data_api" && "Donnée publique"}
                    {e.kind === "official_document" && "Document officiel"}
                    {e.kind === "press_article" && "Article de presse"}
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

      <section className="bg-[var(--color-bg-soft)] rounded-2xl border border-black/5 p-6 text-sm text-[var(--color-ink-soft)] leading-relaxed">
        <p>
          <strong className="text-[var(--color-ink)]">Note méthodologique.</strong>{" "}
          Le verdict ci-dessus qualifie le propos, jamais la personne. Il est
          produit selon une cascade publique : recherche dans la base interne,
          dans les fact-checkers reconnus, dans les données structurées
          publiques, puis raisonnement final par modèle. Pour les claims des
          figures P0 ou de faible confiance, une revue humaine est obligatoire
          avant publication. La méthode complète est dans{" "}
          <Link href="/methode" className="text-[var(--color-accent)] hover:underline">
            la page méthodologie
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
