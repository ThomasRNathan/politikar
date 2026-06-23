import Link from "next/link";
import { notFound } from "next/navigation";
import { PARTIES, partyBySlug, politiciansInParty } from "@/lib/fixtures";
import { FAMILY_LABELS } from "@/lib/types";
import { PoliticianCard } from "@/components/PoliticianCard";
import { PartyLogo } from "@/components/PartyLogo";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return PARTIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const party = partyBySlug(slug);
  if (!party) return {};
  return {
    title: `${party.name} : politikar`,
    description: `${party.name} (${party.short_name}) : politiques suivis et score de véracité moyen pondéré par politikar.`,
    alternates: { canonical: `/partis/${party.slug}` },
  };
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const party = partyBySlug(slug);
  if (!party) notFound();
  const members = politiciansInParty(party.id).sort(
    (a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0)
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        href="/partis"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Tous les partis
      </Link>

      <header className="mt-8 mb-12 flex items-center gap-6">
        <PartyLogo party={party} size={96} />
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            {FAMILY_LABELS[party.political_family]}
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
            {party.name}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
            {members.length} politique{members.length > 1 ? "s" : ""} suivi{members.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <h2 className="font-serif text-2xl font-semibold mb-6">Membres suivis</h2>
      {members.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Aucun politique de ce parti.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((p) => (
            <PoliticianCard key={p.id} politician={p} />
          ))}
        </div>
      )}
    </div>
  );
}
