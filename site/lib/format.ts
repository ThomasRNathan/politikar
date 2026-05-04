export function scoreColor(score: number | null): string {
  if (score === null) return "#9ca3af";
  if (score < 35) return "#991b1b";
  if (score < 50) return "#dc2626";
  if (score < 60) return "#ea580c";
  if (score < 70) return "#ca8a04";
  if (score < 80) return "#65a30d";
  return "#15803d";
}

export function scoreColorSoft(score: number | null): string {
  if (score === null) return "#e5e7eb";
  if (score < 35) return "#fecaca";
  if (score < 50) return "#fed7aa";
  if (score < 60) return "#fed7aa";
  if (score < 70) return "#fef08a";
  if (score < 80) return "#d9f99d";
  return "#bbf7d0";
}

export function scoreLabel(score: number | null): string {
  if (score === null) return "Non significatif";
  if (score < 35) return "Très faible";
  if (score < 50) return "Faible";
  if (score < 60) return "Moyen";
  if (score < 70) return "Correct";
  if (score < 80) return "Bon";
  return "Très bon";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRelativeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
