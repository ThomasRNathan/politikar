import Link from "next/link";
import { functionById, partyById } from "@/lib/fixtures";
import type { Politician } from "@/lib/types";
import { PoliticianAvatar } from "./PoliticianAvatar";
import { ScoreBadge } from "./ScoreBadge";
import { ConfidenceBar } from "./ConfidenceBar";

export function PoliticianCard({
  politician,
  realScore,
  realVerdicts,
}: {
  politician: Politician;
  /** Override the fixture score with a real DB-computed TruthScore. */
  realScore?: number | null;
  /** Number of published DB verdicts (shows a live indicator when > 0). */
  realVerdicts?: number;
}) {
  const party = partyById(politician.party_id);
  const func = functionById(politician.function_id);
  const hasReal = typeof realScore === "number";
  // Use real score when available; otherwise fall back to fixture.
  const displayScore = hasReal ? realScore : (politician.stats.is_significant ? politician.stats.truth_score : null);

  return (
    <Link
      href={`/politiciens/${politician.slug}`}
      className="group block rounded-2xl bg-white border border-black/5 p-5 hover:border-[var(--color-accent)] hover:shadow-md transition"
    >
      <div className="flex items-start gap-4">
        <PoliticianAvatar politician={politician} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-serif text-lg font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)] truncate">
              {politician.full_name}
            </p>
            {hasReal && (
              <span
                className="shrink-0 h-2 w-2 rounded-full bg-[var(--color-trust)]"
                title={`${realVerdicts ?? "?"} verdicts publiés — score réel`}
              />
            )}
          </div>
          <p className="text-sm text-[var(--color-ink-soft)] truncate">
            {func?.name}
          </p>
          {party && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: party.color_hex }}
                aria-hidden
              />
              <span className="text-xs text-[var(--color-ink-soft)]">{party.name}</span>
            </div>
          )}
        </div>
        <ScoreBadge score={displayScore} size="md" />
      </div>
      <div className="mt-4">
        <ConfidenceBar
          score={displayScore}
          ciLow={hasReal ? null : (politician.stats.is_significant ? politician.stats.ci_low : null)}
          ciHigh={hasReal ? null : (politician.stats.is_significant ? politician.stats.ci_high : null)}
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-ink-soft)]">
          {hasReal ? (
            <>
              <span className="text-[var(--color-trust)]">
                {realVerdicts} verdict{(realVerdicts ?? 0) > 1 ? "s" : ""} publiés
              </span>
              <span className="italic opacity-60">score réel</span>
            </>
          ) : (
            <>
              <span>{politician.stats.n_factual} affirmations</span>
              <span>{politician.stats.n_promises} promesses</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
