import Image from "next/image";
import type { Party } from "@/lib/types";

export function PartyLogo({
  party,
  size = 40,
  showName = false,
}: {
  party: Party;
  size?: number;
  showName?: boolean;
}) {
  const inner = party.logo_url ? (
    <div
      className="relative shrink-0 bg-white rounded-md flex items-center justify-center p-1.5 ring-1 ring-black/5"
      style={{ height: size, width: size }}
    >
      <Image
        src={party.logo_url}
        alt={`Logo ${party.name} (Wikimedia Commons)`}
        fill
        sizes={`${size}px`}
        className="object-contain p-1.5"
        unoptimized
      />
    </div>
  ) : (
    <div
      className="rounded-full shrink-0"
      style={{
        height: size,
        width: size,
        background: party.color_hex,
      }}
      aria-label={party.name}
    />
  );

  if (!showName) return inner;
  return (
    <div className="flex items-center gap-2.5">
      {inner}
      <span className="text-sm font-medium">{party.name}</span>
    </div>
  );
}
