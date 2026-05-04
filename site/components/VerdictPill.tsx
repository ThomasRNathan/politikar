import { VERDICT_COLORS, VERDICT_LABELS, type Verdict } from "@/lib/types";

export function VerdictPill({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const cls =
    size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-xs px-2.5 py-1";
  return (
    <span
      className={`${cls} rounded-full font-medium text-white inline-flex items-center gap-1 whitespace-nowrap`}
      style={{ background: VERDICT_COLORS[verdict] }}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
