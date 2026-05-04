import { readFile } from "node:fs/promises";
import path from "node:path";

export type DocMeta = {
  slug: string;
  filename: string;
  label: string;
  description: string;
};

export const DOCS: DocMeta[] = [
  {
    slug: "architecture",
    filename: "ARCHITECTURE.md",
    label: "Architecture",
    description:
      "Stack, topologie de déploiement, observabilité, coûts cibles, licence.",
  },
  {
    slug: "data-model",
    filename: "DATA_MODEL.md",
    label: "Modèle de données",
    description:
      "Schéma Postgres complet : 12 tables, RLS, vues matérialisées, migrations.",
  },
  {
    slug: "sources",
    filename: "SOURCES.md",
    label: "Sources",
    description:
      "Plus de 30 sources publiques avec accès, licences, fiabilité, priorité MVP.",
  },
  {
    slug: "prompts",
    filename: "PROMPTS.md",
    label: "Prompts LLM",
    description:
      "Six prompts versionnés avec JSON tool schemas pour Claude.",
  },
  {
    slug: "scoring",
    filename: "SCORING.md",
    label: "Scoring",
    description:
      "Formule du TruthScore v1, pondérations, intervalle de confiance, exemples chiffrés.",
  },
  {
    slug: "risks",
    filename: "RISKS.md",
    label: "Risques",
    description:
      "Risques juridiques, éthiques, techniques, médiatiques et leurs mitigations.",
  },
];

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

export async function getDocBySlug(slug: string) {
  const meta = DOCS.find((d) => d.slug === slug);
  if (!meta) return null;
  const content = await readFile(path.join(DOCS_DIR, meta.filename), "utf8");
  return { ...meta, content };
}

export function getAllDocSlugs() {
  return DOCS.map((d) => ({ slug: d.slug }));
}
