import Link from "next/link";
import { CLAIMS, POLITICIANS, FUNCTIONS, PARTIES } from "@/lib/fixtures";
import { PoliticianCard } from "@/components/PoliticianCard";
import type { Topic } from "@/lib/types";
import { TOPIC_LABELS } from "@/lib/types";

export const metadata = {
  title: "Politiques : politikar",
  description: "Annuaire des figures nationales suivies par politikar.",
};

// Revalidate so search-driven renders stay fresh alongside ISR pages.
export const revalidate = 300;

export default async function PoliticiansIndex({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  const { q, topic } = await searchParams;

  // Normalise search query
  const query = q?.trim().toLowerCase() ?? "";

  // Topic filter: find politicians who have at least one claim in that topic.
  let topicPoliticianIds: Set<string> | null = null;
  if (topic) {
    topicPoliticianIds = new Set(
      CLAIMS.filter((c) => c.topic_tags.includes(topic as Topic)).map(
        (c) => c.politician_id,
      ),
    );
  }

  const filtered = POLITICIANS.filter((p) => {
    if (query) {
      const hay = `${p.full_name} ${p.given_name} ${p.family_name}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (topicPoliticianIds && !topicPoliticianIds.has(p.id)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const sa = a.stats.is_significant ? (a.stats.truth_score ?? 0) : -1;
    const sb = b.stats.is_significant ? (b.stats.truth_score ?? 0) : -1;
    return sb - sa;
  });

  const isFiltered = !!query || !!topic;
  const topicLabel = topic
    ? (TOPIC_LABELS[topic as Topic] ?? topic)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
          Annuaire
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          {isFiltered ? (
            <>
              {sorted.length}{" "}
              {sorted.length === 1 ? "résultat" : "résultats"}
              {topicLabel && (
                <span className="text-[var(--color-accent)]"> · {topicLabel}</span>
              )}
              {query && (
                <span className="text-[var(--color-accent)]"> « {q} »</span>
              )}
            </>
          ) : (
            <>{POLITICIANS.length} figures nationales suivies.</>
          )}
        </h1>
        {!isFiltered && (
          <p className="mt-5 text-base text-[var(--color-ink-soft)] leading-relaxed">
            Top 50 figures de la politique française au MVP : Président,
            gouvernement, leaders de partis, têtes de listes principales,
            eurodéputés notables. Cliquez sur un nom pour voir le profil
            complet.
          </p>
        )}
        {isFiltered && (
          <Link
            href="/politiciens"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
          >
            <span aria-hidden>←</span> Effacer le filtre
          </Link>
        )}
      </header>

      {/* Search bar */}
      <form
        action="/politiciens"
        method="get"
        className="mb-8 flex w-full max-w-md"
      >
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Chercher par nom…"
          aria-label="Rechercher un politique"
          className="flex-1 h-10 px-4 rounded-l-full border border-black/15 bg-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          className="h-10 px-5 rounded-r-full bg-[var(--color-ink)] text-[var(--color-bg)] text-sm font-medium hover:bg-[var(--color-trust)] transition"
        >
          Rechercher
        </button>
      </form>

      {/* Function filter chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/politiciens"
          className={`px-4 py-1.5 rounded-full text-sm transition ${
            !isFiltered
              ? "bg-[var(--color-ink)] text-[var(--color-bg)]"
              : "border border-black/15 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
        >
          Tous
        </Link>
        {FUNCTIONS.filter((f) =>
          POLITICIANS.some((p) => p.function_id === f.id),
        ).map((f) => (
          <Link
            key={f.id}
            href={`/fonctions/${f.slug}`}
            className="px-4 py-1.5 rounded-full border border-black/15 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
          >
            {f.name}
          </Link>
        ))}
        {/* Topic quick-filters */}
        {(
          [
            { label: "Économie", topic: "economy" },
            { label: "Immigration", topic: "immigration" },
            { label: "Écologie", topic: "ecology_climate" },
          ] as { label: string; topic: string }[]
        ).map((t) => (
          <Link
            key={t.topic}
            href={`/politiciens?topic=${t.topic}`}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              topic === t.topic
                ? "bg-[var(--color-accent)] text-white"
                : "border border-black/15 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--color-ink-soft)] text-lg">
            Aucun résultat pour{" "}
            <em>
              {query || topicLabel}
            </em>
            .
          </p>
          <Link
            href="/politiciens"
            className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            Voir tous les politiques
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <PoliticianCard key={p.id} politician={p} />
          ))}
        </div>
      )}

      <div className="mt-16 pt-10 border-t border-black/10 grid sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
            Par parti
          </p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {PARTIES.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/partis/${p.slug}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-soft)] transition"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: p.color_hex }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
            Périmètre
          </p>
          <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
            Le périmètre actuel couvre {POLITICIANS.length} figures nationales.
            La cible MVP est de 50 politiques actifs (Président, gouvernement,
            leaders de partis, têtes de listes), avec extension prévue aux 925
            parlementaires français en post-MVP.
          </p>
        </div>
      </div>
    </div>
  );
}
