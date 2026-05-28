import Link from "next/link";
import { getClassementData } from "@/lib/db/reads";
import { POLITICIANS } from "@/lib/fixtures";
import { politicianBySlug } from "@/lib/fixtures";
import { PoliticianAvatar } from "@/components/PoliticianAvatar";
import { ScoreBadge } from "@/components/ScoreBadge";
import { scoreColor } from "@/lib/format";

export const metadata = {
  title: "Classement par véracité : politikar",
  description:
    "Classement des figures politiques françaises par leur TruthScore calculé sur les vérifications publiées.",
};

// Refresh the classement every 10 minutes — slower than claim pages since
// bulk rankings change less often than individual verdicts.
export const revalidate = 600;

// Verdict bar colour stops (ordered worst to best)
const BAR_SEGMENTS: {
  key: keyof ReturnType<typeof verdictBreakdown>;
  label: string;
  color: string;
}[] = [
  { key: "n_false",        label: "Faux",              color: "#991b1b" },
  { key: "n_mostly_false", label: "Plutôt faux",       color: "#dc2626" },
  { key: "n_misleading",   label: "Contexte trompeur", color: "#ea580c" },
  { key: "n_mixed",        label: "Mitigé",             color: "#d97706" },
  { key: "n_mostly_true",  label: "Plutôt vrai",        color: "#65a30d" },
  { key: "n_true",         label: "Vrai",               color: "#15803d" },
];

type VerdictBreakdown = {
  n_true: number;
  n_mostly_true: number;
  n_mixed: number;
  n_misleading: number;
  n_mostly_false: number;
  n_false: number;
  n_unverifiable: number;
};

function verdictBreakdown(row: VerdictBreakdown) {
  return row;
}

export default async function ClassementPage() {
  const dbRows = await getClassementData(1);
  const hasDb = dbRows.length > 0;

  // Fixture fallback: politicians with significant fixture scores
  const fixtureRanked = [...POLITICIANS]
    .filter((p) => p.stats.is_significant && p.stats.truth_score !== null)
    .sort((a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0));

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-baseline gap-3 mb-3">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            Classement
          </p>
          {hasDb && (
            <span className="text-[10px] text-[var(--color-trust)] font-mono">
              {dbRows.length} politiques · données réelles
            </span>
          )}
          {!hasDb && (
            <span className="text-[10px] text-[var(--color-ink-soft)] font-mono italic">
              données illustratives
            </span>
          )}
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
          Véracité du discours politique.
        </h1>
        <p className="mt-5 text-base text-[var(--color-ink-soft)] max-w-2xl leading-relaxed">
          {hasDb
            ? "Classement calculé à partir des vérifications publiées dans la base. Le TruthScore est une moyenne pondérée par la confiance de chaque verdict."
            : "Classement illustratif basé sur des scores calculés pour la démonstration de la méthode. Le pipeline live alimentera ce classement automatiquement."}
        </p>
      </div>

      {/* Legend */}
      <div className="mb-8 flex flex-wrap gap-3 text-[11px]">
        {BAR_SEGMENTS.slice().reverse().map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#6b7280]" />
          Non vérifiable
        </span>
      </div>

      {/* Ranking list */}
      <div className="space-y-3">
        {hasDb
          ? dbRows.map((row, i) => {
              const fixPol = politicianBySlug(row.slug);
              const total = row.n_verdicts;
              return (
                <Link
                  key={row.slug}
                  href={`/politiciens/${row.slug}`}
                  className="group block bg-white rounded-2xl border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <span className="font-mono text-base text-[var(--color-ink-soft)] w-8 shrink-0 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Avatar */}
                    {fixPol ? (
                      <PoliticianAvatar politician={fixPol} size={44} />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-white font-bold"
                        style={{ background: row.party_color ?? "#94a3b8" }}
                      >
                        {row.full_name[0]}
                      </div>
                    )}

                    {/* Name + verdict bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <p className="font-medium text-sm truncate group-hover:text-[var(--color-accent)]">
                          {row.full_name}
                        </p>
                        <span className="text-[11px] text-[var(--color-ink-soft)] shrink-0">
                          {total} verdict{total > 1 ? "s" : ""}
                        </span>
                      </div>
                      {/* Stacked bar */}
                      <div className="h-2.5 rounded-full overflow-hidden flex bg-black/5">
                        {BAR_SEGMENTS.map((s) => {
                          const n =
                            row[s.key as keyof VerdictBreakdown] ?? 0;
                          const pct = total > 0 ? (n / total) * 100 : 0;
                          if (pct === 0) return null;
                          return (
                            <div
                              key={s.key}
                              title={`${s.label} : ${n}`}
                              style={{
                                width: `${pct}%`,
                                background: s.color,
                              }}
                            />
                          );
                        })}
                        {/* Unverifiable segment */}
                        {(() => {
                          const n = row.n_unverifiable;
                          const pct = total > 0 ? (n / total) * 100 : 0;
                          if (pct === 0) return null;
                          return (
                            <div
                              title={`Non vérifiable : ${n}`}
                              style={{ width: `${pct}%`, background: "#6b7280" }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Score badge */}
                    <ScoreBadge score={row.truth_score} size="sm" />
                  </div>
                </Link>
              );
            })
          : fixtureRanked.map((p, i) => (
              <Link
                key={p.id}
                href={`/politiciens/${p.slug}`}
                className="group block bg-white rounded-2xl border border-black/5 p-5 hover:border-[var(--color-accent)] transition"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-base text-[var(--color-ink-soft)] w-8 shrink-0 text-right">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <PoliticianAvatar politician={p} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="font-medium text-sm truncate group-hover:text-[var(--color-accent)]">
                        {p.full_name}
                      </p>
                      <span className="text-[11px] text-[var(--color-ink-soft)] italic shrink-0">
                        illustratif
                      </span>
                    </div>
                    {/* Fixture verdict breakdown from topic_breakdown */}
                    <FixtureVerdictBar stats={p.stats} />
                  </div>
                  <ScoreBadge score={p.stats.truth_score} size="sm" />
                </div>
              </Link>
            ))}
      </div>

      {/* Methodology note */}
      <section className="mt-16 p-6 rounded-2xl bg-[var(--color-bg-soft)] border border-black/5 text-sm text-[var(--color-ink-soft)] leading-relaxed">
        <p className="font-medium text-[var(--color-ink)] mb-2">
          Note méthodologique.
        </p>
        <p>
          Le TruthScore est une moyenne pondérée par la confiance de chaque
          vérification publiée : <em>true</em> vaut 100, <em>mostly_true</em>{" "}
          80, <em>mixed</em> 50, <em>misleading_context</em> 35,{" "}
          <em>mostly_false</em> 20, <em>false</em> 0, <em>unverifiable</em> 50
          (neutre). Un classement n&apos;est pas significatif en dessous de 30
          vérifications ; les entrées marquées comme précoces sont à
          interpréter avec précaution. La méthode complète est dans{" "}
          <Link
            href="/methode"
            className="text-[var(--color-accent)] hover:underline"
          >
            la page méthodologie
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

// Fixture politician verdict bar — approximates breakdown from topic_breakdown
function FixtureVerdictBar({
  stats,
}: {
  stats: { truth_score: number | null; n_factual: number };
}) {
  const score = stats.truth_score ?? 50;
  // Rough approximation: single gradient segment from score
  const bg = scoreColor(stats.truth_score);
  return (
    <div className="h-2.5 rounded-full overflow-hidden flex bg-black/5">
      <div
        style={{ width: `${score}%`, background: bg }}
        title={`Score ${score}`}
      />
    </div>
  );
}
