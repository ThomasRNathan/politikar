"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { geoConicConformal, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import geojson from "@/lib/france-regions.geojson.json";
import { REGIONS } from "@/lib/fixtures";
import { scoreColor, scoreColorSoft } from "@/lib/format";

// INSEE region code → politikar region id mapping.
const CODE_TO_ID: Record<string, string> = {
  "11": "r-idf",
  "24": "r-cvl",
  "27": "r-bfc",
  "28": "r-nor",
  "32": "r-hdf",
  "44": "r-ges",
  "52": "r-pdl",
  "53": "r-bre",
  "75": "r-naq",
  "76": "r-occ",
  "84": "r-ara",
  "93": "r-pac",
  "94": "r-cor",
};

type RegionProps = { code: string; nom: string };
type RegionFeature = Feature<Geometry, RegionProps>;
type RegionFC = FeatureCollection<Geometry, RegionProps>;

const WIDTH = 580;
const HEIGHT = 560;

export function FranceMap({
  scores,
}: {
  scores: Record<string, { score: number; n: number } | null>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { paths, centroids } = useMemo(() => {
    const fc = geojson as unknown as RegionFC;
    // Lambert-93-like projection centered on metropolitan France.
    const projection = geoConicConformal()
      .rotate([-3, 0, 0])
      .center([0, 46.5])
      .parallels([44, 49])
      .fitSize([WIDTH, HEIGHT], fc);
    const pathGen = geoPath(projection);

    const paths: { code: string; d: string; centroid: [number, number] }[] = [];
    const centroids: Record<string, [number, number]> = {};
    for (const feat of fc.features) {
      const d = pathGen(feat) ?? "";
      const c = pathGen.centroid(feat) as [number, number];
      paths.push({ code: feat.properties.code, d, centroid: c });
      centroids[feat.properties.code] = c;
    }
    return { paths, centroids };
  }, []);

  const hoveredRegion = hovered
    ? REGIONS.find((r) => r.id === hovered)
    : null;
  const hoveredScore = hovered ? scores[hovered] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto select-none"
        aria-label="Carte de France métropolitaine : score moyen par région"
        role="img"
      >
        {paths.map(({ code, d, centroid }) => {
          const id = CODE_TO_ID[code];
          const region = REGIONS.find((r) => r.id === id);
          const data = id ? scores[id] : null;
          const isHovered = hovered === id;
          const fill = data ? scoreColor(data.score) : "#e5e7eb";
          const fillSoft = data ? scoreColorSoft(data.score) : "#f3f4f6";
          const stroke = isHovered ? "#1a1a2e" : "#ffffff";
          const inner = (
            <g
              key={code}
              onMouseEnter={() => id && setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <path
                d={d}
                fill={isHovered ? fill : fillSoft}
                stroke={stroke}
                strokeWidth={isHovered ? 2 : 1}
                strokeLinejoin="round"
                className="transition-colors"
              />
              {region?.short_name && (
                <text
                  x={centroid[0]}
                  y={centroid[1]}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={isHovered ? "white" : "#1a1a2e"}
                  className="pointer-events-none transition-colors"
                >
                  {region.short_name}
                </text>
              )}
              {data && (
                <text
                  x={centroid[0]}
                  y={centroid[1] + 13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="serif"
                  fontSize={13}
                  fontWeight={700}
                  fill={isHovered ? "white" : "#1a1a2e"}
                  className="pointer-events-none transition-colors"
                >
                  {data.score}
                </text>
              )}
            </g>
          );
          if (!id || !region) return inner;
          return (
            <Link key={code} href={`/regions/${region.slug}`}>
              {inner}
            </Link>
          );
        })}
      </svg>

      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--color-ink-soft)]">
        <div className="flex items-center gap-1">
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: "#991b1b" }}
          />
          <span>Faible</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-[#991b1b] via-[#ca8a04] to-[#15803d]" />
        <div className="flex items-center gap-1">
          <span>Élevé</span>
          <span
            className="h-3 w-3 rounded-sm"
            style={{ background: "#15803d" }}
          />
        </div>
      </div>

      <div className="mt-3 min-h-[3.25rem] flex items-start">
        {hoveredRegion ? (
          <div className="px-4 py-3 rounded-lg bg-[var(--color-ink)] text-white text-sm flex items-center gap-3 flex-wrap">
            <span className="font-serif font-semibold">
              {hoveredRegion.name}
            </span>
            {hoveredScore ? (
              <>
                <span className="opacity-70">·</span>
                <span>Score moyen {hoveredScore.score}</span>
                <span className="opacity-70">·</span>
                <span className="opacity-70">
                  {hoveredScore.n} élu{hoveredScore.n > 1 ? "s" : ""} suivi
                  {hoveredScore.n > 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <span className="opacity-70">Aucun élu suivi pour le moment</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-ink-soft)] italic">
            Survolez une région pour voir son score moyen pondéré. Source
            cartographique : Etalab, regions.geojson.
          </p>
        )}
      </div>
    </div>
  );
}
