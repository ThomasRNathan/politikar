import { partyById } from "@/lib/fixtures";
import type { Politician } from "@/lib/types";

export function PoliticianAvatar({
  politician,
  size = 48,
}: {
  politician: Politician;
  size?: number;
}) {
  const party = partyById(politician.party_id);
  const initials = (politician.given_name[0] + politician.family_name[0]).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-serif font-semibold text-white shrink-0 ring-2 ring-white"
      style={{
        height: size,
        width: size,
        background: party?.color_hex ?? "#475569",
        fontSize: size * 0.35,
      }}
      aria-label={politician.full_name}
    >
      {initials}
    </div>
  );
}
