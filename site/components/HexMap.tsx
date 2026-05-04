"use client";

import Link from "next/link";
import { useState } from "react";
import { REGIONS } from "@/lib/fixtures";
import { scoreColor, scoreColorSoft } from "@/lib/format";

const SIZE = 32;
const SQRT3 = Math.sqrt(3);

function hexPath(s: number): string {
  // pointy-top hexagon centered at origin
  const w = (SQRT3 * s) / 2;
  return `M 0 ${-s} L ${w} ${-s / 2} L ${w} ${s / 2} L 0 ${s} L ${-w} ${s / 2} L ${-w} ${-s / 2} Z`;
}

function hexCenter(col: number, row: number): { x: number; y: number } {
  const dx = SQRT3 * SIZE;
  const x = col * dx + (row % 2 === 1 ? dx / 2 : 0);
  const y = row * 1.5 * SIZE;
  return { x, y };
}

export function HexMap({
  scores,
}: {
  scores: Record<string, { score: number; n: number } | null>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Compute viewBox bounds
  const points = REGIONS.map((r) => hexCenter(r.hex.col, r.hex.row));
  const minX = Math.min(...points.map((p) => p.x)) - SIZE * SQRT3;
  const maxX = Math.max(...points.map((p) => p.x)) + SIZE * SQRT3;
  const minY = Math.min(...points.map((p) => p.y)) - SIZE * 1.5;
  const maxY = Math.max(...points.map((p) => p.y)) + SIZE * 1.5;
  const w = maxX - minX;
  const h = maxY - minY;

  const path = hexPath(SIZE);
  const hoveredRegion = hovered ? REGIONS.find((r) => r.id === hovered) : null;
  const hoveredScore = hovered ? scores[hovered] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`${minX} ${minY} ${w} ${h}`}
        className="w-full h-auto select-none"
        aria-label="Carte de France des scores moyens par région"
      >
        {REGIONS.map((r) => {
          const c = hexCenter(r.hex.col, r.hex.row);
          const data = scores[r.id];
          const fill = data ? scoreColor(data.score) : "#e5e7eb";
          const fillSoft = data ? scoreColorSoft(data.score) : "#f3f4f6";
          const isHovered = hovered === r.id;
          return (
            <Link key={r.id} href={`/regions/${r.slug}`}>
              <g
                transform={`translate(${c.x}, ${c.y})`}
                onMouseEnter={() => setHovered(r.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-transform"
                style={{
                  transform: `translate(${c.x}px, ${c.y}px) scale(${isHovered ? 1.08 : 1})`,
                  transformOrigin: `${c.x}px ${c.y}px`,
                }}
              >
                <path
                  d={path}
                  fill={isHovered ? fill : fillSoft}
                  stroke={fill}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={isHovered ? "white" : "#1a1a2e"}
                  fontWeight={600}
                  className="pointer-events-none transition-colors"
                >
                  {r.short_name ?? r.name.slice(0, 3)}
                </text>
                {data && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={13}
                    fontFamily="serif"
                    fill={isHovered ? "white" : "#1a1a2e"}
                    fontWeight={700}
                    y={14}
                    className="pointer-events-none transition-colors"
                  >
                    {data.score}
                  </text>
                )}
              </g>
            </Link>
          );
        })}
      </svg>
      <div className="mt-4 flex items-center gap-4 text-xs text-[var(--color-ink-soft)]">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm" style={{ background: "#991b1b" }} />
          <span>Faible</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-[#991b1b] via-[#ca8a04] to-[#15803d]" />
        <div className="flex items-center gap-1">
          <span>Élevé</span>
          <span className="h-3 w-3 rounded-sm" style={{ background: "#15803d" }} />
        </div>
      </div>
      {hoveredRegion && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-[var(--color-ink)] text-white text-sm flex items-center gap-3">
          <span className="font-serif font-semibold">{hoveredRegion.name}</span>
          {hoveredScore ? (
            <>
              <span className="opacity-70">·</span>
              <span>Score moyen {hoveredScore.score}</span>
              <span className="opacity-70">·</span>
              <span className="opacity-70">{hoveredScore.n} élu(s) suivi(s)</span>
            </>
          ) : (
            <span className="opacity-70">Aucun élu suivi </span>
          )}
        </div>
      )}
    </div>
  );
}
