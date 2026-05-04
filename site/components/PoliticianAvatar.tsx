import Image from "next/image";
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

  if (politician.photo_url) {
    return (
      <div
        className="relative rounded-full overflow-hidden ring-2 ring-white shadow-sm shrink-0"
        style={{
          height: size,
          width: size,
          background: party?.color_hex ?? "#475569",
        }}
      >
        <Image
          src={politician.photo_url}
          alt={`Photo de ${politician.full_name} (Wikimedia Commons)`}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
        {party && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white"
            style={{ background: party.color_hex }}
          />
        )}
      </div>
    );
  }

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
