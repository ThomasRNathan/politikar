import Link from "next/link";
import {
  CLAIMS,
  POLITICIANS,
  TOP_STORIES,
  claimById,
  politicianById,
  regionAggregateScores,
  sourceById,
} from "@/lib/fixtures";
import { HexMap } from "@/components/HexMap";
import { ClaimRow } from "@/components/ClaimRow";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatRelativeShort, formatDate } from "@/lib/format";
import {
  recentRealSources,
  recentFactchecks,
  ingestionTotals,
} from "@/lib/realdata";

export default function Home() {
  const regionScores = regionAggregateScores();

  const topPoliticians = [...POLITICIANS]
    .filter((p) => p.stats.is_significant && p.stats.truth_score !== null)
    .sort((a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0))
    .slice(0, 5);

  const recentClaims = [...CLAIMS]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, 5);

  const topStories = TOP_STORIES.map((t) => ({
    ...t,
    claim: claimById(t.claim_id)!,
    politician: politicianById(claimById(t.claim_id)!.politician_id)!,
  }));

  return (
    <div className="flex-1">
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-5">
              Plateforme open-source de fact-checking systématique
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[1.04] tracking-tight font-semibold">
              La véracité du discours politique français,{" "}
              <span className="text-[var(--color-accent)]">mesurée</span> en
              méthode publique.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--color-ink-soft)] max-w-xl">
              Pour chaque homme et femme politique, parti, fonction et région,
              des métriques traçables sur les discours factuels, les promesses
              de mandat et la couverture presse.
            </p>
            <form
              action="/politiciens"
              method="get"
              className="mt-8 flex w-full max-w-md"
            >
              <input
                type="search"
                name="q"
                placeholder="Chercher un politique, un parti, un sujet"
                aria-label="Recherche"
                className="flex-1 h-12 px-4 rounded-l-full border border-black/15 bg-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
              />
              <button
                type="submit"
                className="h-12 px-6 rounded-r-full bg-[var(--color-ink)] text-[var(--color-bg)] text-sm font-medium hover:bg-[var(--color-trust)] transition"
              >
                Explorer
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {[
                { label: "Économie", topic: "economy" },
                { label: "Immigration", topic: "immigration" },
                { label: "Écologie", topic: "ecology_climate" },
                { label: "Sécurité", topic: "security" },
                { label: "Éducation", topic: "education" },
              ].map((t) => (
                <Link
                  key={t.topic}
                  href={`/politiciens?topic=${t.topic}`}
                  className="px-3 py-1 rounded-full border border-black/15 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold">Carte des régions</h2>
              <span className="text-xs text-[var(--color-ink-soft)]">
                Score moyen pondéré des élus suivis
              </span>
            </div>
            <HexMap scores={regionScores} />
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-soft)] border-y border-black/5 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
                Top stories de la semaine
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                Ce que la cascade a vérifié.
              </h2>
            </div>
            <Link
              href="/politiciens"
              className="text-sm text-[var(--color-accent)] hover:underline hidden sm:inline"
            >
              Tous les politiques →
            </Link>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            {topStories.map((s) => {
              const source = sourceById(s.claim.source_id);
              return (
                <Link
                  key={s.claim_id}
                  href={`/claims/${s.claim_id}`}
                  className="group block bg-white rounded-2xl p-6 border border-black/5 hover:border-[var(--color-accent)] transition"
                >
                  <div className="flex items-start gap-4">
                    <PoliticianAvatar politician={s.politician} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-sm">{s.politician.full_name}</p>
                        <span className="text-[11px] text-[var(--color-ink-soft)] shrink-0">
                          {formatRelativeShort(s.claim.occurred_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-ink-soft)]">
                        {source?.channel}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 font-serif text-lg leading-snug group-hover:text-[var(--color-accent)]">
                    « {s.claim.claim_text} »
                  </p>
                  <p className="mt-3 text-xs text-[var(--color-ink-soft)] italic">
                    {s.note}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
              Classement
            </p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight mb-4">
              Top 5 par véracité.
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)] mb-6 leading-relaxed">
              Calculé sur l&apos;ensemble des claims factuels et promesses
              résolus de la période. Volume minimum requis pour entrer au
              classement : 30 affirmations factuelles ou 5 promesses résolues.
            </p>
            <ol className="space-y-2">
              {topPoliticians.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/politiciens/${p.slug}`}
                    className="group flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-soft)] transition"
                  >
                    <span className="font-mono text-sm text-[var(--color-ink-soft)] w-6">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <PoliticianAvatar politician={p} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-[var(--color-accent)]">
                        {p.full_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-soft)] truncate">
                        {p.bio_short.split(".")[0]}
                      </p>
                    </div>
                    <ScoreBadge score={p.stats.truth_score} size="sm" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
              Affirmations récentes
            </p>
            <h2 className="font-serif text-3xl font-semibold tracking-tight mb-4">
              Dernières vérifications.
            </h2>
            <div className="bg-white rounded-2xl border border-black/5 p-2 sm:p-4">
              {recentClaims.map((c) => (
                <ClaimRow key={c.id} claim={c} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {(() => {
        const realRecent = recentRealSources(8);
        const totals = ingestionTotals();
        if (realRecent.length === 0) return null;
        return (
          <section className="bg-white border-y border-black/5 py-16">
            <div className="max-w-6xl mx-auto px-6">
              <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
                    Pipeline d&apos;ingestion · {totals.sources} communications captées
                  </p>
                  <h2 className="font-serif text-3xl font-semibold tracking-tight">
                    Dernières communications officielles.
                  </h2>
                </div>
                <p className="text-xs text-[var(--color-ink-soft)] max-w-md text-right hidden sm:block">
                  Ingérées depuis Élysée et Sénat. L&apos;extraction de claims
                  et la vérification automatisée sont en construction.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {realRecent.map((s) => {
                  const p = politicianById(s.politician_id);
                  return (
                    <a
                      key={s.id}
                      href={s.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl bg-[var(--color-bg-soft)] border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {p && <PoliticianAvatar politician={p} size={28} />}
                        <span className="text-xs font-medium truncate">
                          {p?.full_name ?? "—"}
                        </span>
                      </div>
                      <p className="font-serif text-sm font-medium leading-snug group-hover:text-[var(--color-accent)] line-clamp-3">
                        {s.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-ink-soft)]">
                        <span>{s.channel.split(" ")[0]}</span>
                        <span>
                          {s.occurred_at && formatDate(s.occurred_at)}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {(() => {
        const fc = recentFactchecks(8);
        if (fc.length === 0) return null;
        return (
          <section className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex items-baseline justify-between mb-8 flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-2">
                  Corpus de fact-checks de référence
                </p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  Recent fact-checks ingérés.
                </h2>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] max-w-md text-right hidden sm:block">
                Les Décodeurs (Le Monde) et Les Surligneurs. Citation
                obligatoire ; lien direct vers l&apos;article original.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {fc.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-2xl bg-white border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
                >
                  <p className="text-[11px] uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">
                    {item.outlet}
                  </p>
                  <p className="font-serif text-base font-medium leading-snug group-hover:text-[var(--color-accent)] line-clamp-3">
                    {item.title}
                  </p>
                  {item.published_at && (
                    <p className="mt-3 text-[11px] text-[var(--color-ink-soft)]">
                      {formatDate(item.published_at)}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        );
      })()}

      <section className="bg-[var(--color-ink)] text-[var(--color-bg)] py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent-soft)] mb-4">
            Méthode
          </p>
          <h2 className="font-serif text-4xl font-semibold tracking-tight">
            Score traçable, méthode publique, code ouvert.
          </h2>
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Chaque verdict cite ses sources avec URL et extraits courts. La
            formule du TruthScore est publiée. Le code, les prompts et les
            seuils sont open source.
          </p>
          <div className="mt-10 flex justify-center gap-3 flex-wrap">
            <Link
              href="/methode"
              className="inline-flex items-center px-6 h-11 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-orange-700 transition"
            >
              Lire la méthodologie
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center px-6 h-11 rounded-full border border-white/30 text-sm font-medium hover:border-white transition"
            >
              Documents techniques
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
