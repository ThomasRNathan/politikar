import Link from "next/link";
import { sourceById } from "@/lib/fixtures";
import { formatRelativeShort } from "@/lib/format";
import type { Claim } from "@/lib/types";
import { TOPIC_LABELS } from "@/lib/types";
import { VerdictPill } from "./VerdictPill";

export function ClaimRow({ claim }: { claim: Claim }) {
  const source = sourceById(claim.source_id);
  return (
    <Link
      href={`/claims/${claim.id}`}
      className="group block py-4 border-b border-black/5 hover:bg-[var(--color-bg-soft)] -mx-3 px-3 rounded-lg transition"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 pt-1">
          <VerdictPill verdict={claim.verdict} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base text-[var(--color-ink)] group-hover:text-[var(--color-accent)] leading-snug">
            « {claim.claim_text} »
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-ink-soft)] flex-wrap">
            {source && (
              <>
                <span>{source.channel}</span>
                <span aria-hidden>·</span>
                <span>{formatRelativeShort(claim.occurred_at)}</span>
              </>
            )}
            {claim.topic_tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded bg-black/5 font-medium"
              >
                {TOPIC_LABELS[t]}
              </span>
            ))}
            {claim.human_reviewed && (
              <span className="text-[var(--color-trust)]">✓ revu</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
