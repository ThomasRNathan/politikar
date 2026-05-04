import { scoreColor } from "@/lib/format";

export function ConfidenceBar({
  score,
  ciLow,
  ciHigh,
}: {
  score: number | null;
  ciLow: number | null;
  ciHigh: number | null;
}) {
  if (score === null || ciLow === null || ciHigh === null) {
    return (
      <div className="h-2 rounded-full bg-black/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripes opacity-40" />
      </div>
    );
  }
  return (
    <div className="h-2 rounded-full bg-black/10 relative overflow-hidden">
      <div
        className="absolute top-0 h-full opacity-50"
        style={{
          left: `${ciLow}%`,
          width: `${ciHigh - ciLow}%`,
          background: scoreColor(score),
        }}
      />
      <div
        className="absolute top-0 h-full w-0.5"
        style={{ left: `${score}%`, background: scoreColor(score) }}
      />
    </div>
  );
}
