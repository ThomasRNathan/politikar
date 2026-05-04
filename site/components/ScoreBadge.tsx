import { scoreColor, scoreLabel } from "@/lib/format";

export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: { box: "h-9 w-9 text-sm", label: "text-[10px]" },
    md: { box: "h-14 w-14 text-xl", label: "text-xs" },
    lg: { box: "h-20 w-20 text-3xl", label: "text-xs" },
    xl: { box: "h-32 w-32 text-5xl", label: "text-sm" },
  } as const;
  const s = sizes[size];
  return (
    <div
      className={`${s.box} rounded-2xl flex flex-col items-center justify-center font-serif font-semibold text-white shrink-0`}
      style={{ background: scoreColor(score) }}
      aria-label={`TruthScore ${score === null ? "non significatif" : score}`}
    >
      <span>{score === null ? "—" : score}</span>
      {size === "xl" && (
        <span className={`${s.label} font-sans font-normal opacity-90 mt-1 uppercase tracking-wider`}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  );
}
