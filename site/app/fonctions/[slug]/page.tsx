import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FUNCTIONS,
  functionBySlug,
  politiciansInFunction,
} from "@/lib/fixtures";
import { PoliticianCard } from "@/components/PoliticianCard";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return FUNCTIONS.map((f) => ({ slug: f.slug }));
}

export default async function FunctionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const func = functionBySlug(slug);
  if (!func) notFound();
  const members = politiciansInFunction(func.id).sort(
    (a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0)
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        href="/politiciens"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Tous les politiques
      </Link>
      <header className="mt-8 mb-10">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
          Fonction
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          {func.name}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
          {members.length} suivi{members.length > 1 ? "s" : ""} dans la démo
        </p>
      </header>
      {members.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Aucun politique pour cette fonction dans la démo.
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
