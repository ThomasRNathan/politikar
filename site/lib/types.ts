export type PoliticalFamily =
  | "far_left"
  | "left"
  | "green"
  | "center_left"
  | "center"
  | "center_right"
  | "right"
  | "far_right"
  | "regionalist"
  | "other";

export type FactualVerdict =
  | "true"
  | "mostly_true"
  | "mixed"
  | "misleading_context"
  | "mostly_false"
  | "false"
  | "unverifiable";

export type PromiseVerdict =
  | "kept"
  | "partially_kept"
  | "broken"
  | "in_progress"
  | "abandoned"
  | "too_early";

export type Verdict = FactualVerdict | PromiseVerdict;

export type ClaimType =
  | "factual_assertion"
  | "promise"
  | "opinion"
  | "rhetorical"
  | "prediction"
  | "normative_statement";

export type Topic =
  | "economy"
  | "employment"
  | "fiscal_policy"
  | "public_debt"
  | "security"
  | "justice"
  | "immigration"
  | "health"
  | "education"
  | "ecology_climate"
  | "energy"
  | "agriculture"
  | "housing"
  | "foreign_policy"
  | "europe"
  | "defense"
  | "institutions"
  | "social_protection"
  | "culture"
  | "digital"
  | "transport"
  | "research"
  | "other";

export type Tier = "P0" | "P1" | "P2";

export type Party = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  political_family: PoliticalFamily;
  color_hex: string;
  leader_politician_id: string | null;
};

export type FunctionDef = {
  id: string;
  slug: string;
  name: string;
  level:
    | "national_executive"
    | "national_legislative"
    | "european"
    | "regional"
    | "departmental"
    | "municipal"
    | "party_leadership";
};

export type Region = {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  // hex coordinates for the stylized France map (column, row)
  hex: { col: number; row: number };
};

export type TopicScore = {
  score: number;
  n: number;
  ci: [number, number];
};

export type PoliticianStats = {
  truth_score: number | null;
  factual_score: number | null;
  promise_score: number | null;
  transparency_score: number;
  ci_low: number | null;
  ci_high: number | null;
  is_significant: boolean;
  n_factual: number;
  n_promises: number;
  topic_breakdown: Partial<Record<Topic, TopicScore>>;
};

export type Politician = {
  id: string;
  slug: string;
  full_name: string;
  given_name: string;
  family_name: string;
  birth_year: number | null;
  gender: "male" | "female";
  party_id: string;
  function_id: string;
  region_id: string | null;
  tier: Tier;
  bio_short: string;
  stats: PoliticianStats;
};

export type Source = {
  id: string;
  source_type:
    | "speech"
    | "interview"
    | "tv_debate"
    | "press_conference"
    | "tweet"
    | "official_statement"
    | "parliamentary_question"
    | "parliamentary_intervention"
    | "campaign_program";
  channel: string;
  occurred_at: string; // ISO date
  url: string | null;
};

export type Evidence = {
  source_url: string;
  source_label: string;
  quote: string;
  weight: number;
  kind: "fact_checker" | "data_api" | "official_document" | "press_article";
};

export type Claim = {
  id: string;
  politician_id: string;
  source_id: string;
  claim_text: string;
  claim_type: ClaimType;
  topic_tags: Topic[];
  numeric_values?: { value: number; unit: string; period?: string }[];
  verdict: Verdict;
  confidence_score: number;
  reasoning: string;
  evidence: Evidence[];
  occurred_at: string;
  human_reviewed: boolean;
};

export const TOPIC_LABELS: Record<Topic, string> = {
  economy: "Économie",
  employment: "Emploi",
  fiscal_policy: "Fiscalité",
  public_debt: "Dette publique",
  security: "Sécurité",
  justice: "Justice",
  immigration: "Immigration",
  health: "Santé",
  education: "Éducation",
  ecology_climate: "Écologie",
  energy: "Énergie",
  agriculture: "Agriculture",
  housing: "Logement",
  foreign_policy: "Politique étrangère",
  europe: "Europe",
  defense: "Défense",
  institutions: "Institutions",
  social_protection: "Protection sociale",
  culture: "Culture",
  digital: "Numérique",
  transport: "Transports",
  research: "Recherche",
  other: "Autre",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  true: "Vrai",
  mostly_true: "Plutôt vrai",
  mixed: "Mitigé",
  misleading_context: "Contexte trompeur",
  mostly_false: "Plutôt faux",
  false: "Faux",
  unverifiable: "Non vérifiable",
  kept: "Tenue",
  partially_kept: "Partiellement tenue",
  broken: "Non tenue",
  in_progress: "En cours",
  abandoned: "Abandonnée",
  too_early: "Trop tôt",
};

export const VERDICT_COLORS: Record<Verdict, string> = {
  true: "#15803d",
  mostly_true: "#65a30d",
  mixed: "#d97706",
  misleading_context: "#ea580c",
  mostly_false: "#dc2626",
  false: "#991b1b",
  unverifiable: "#6b7280",
  kept: "#15803d",
  partially_kept: "#d97706",
  broken: "#991b1b",
  in_progress: "#1e3a8a",
  abandoned: "#525252",
  too_early: "#6b7280",
};

export const FAMILY_LABELS: Record<PoliticalFamily, string> = {
  far_left: "Gauche radicale",
  left: "Gauche",
  green: "Écologiste",
  center_left: "Centre gauche",
  center: "Centre",
  center_right: "Centre droit",
  right: "Droite",
  far_right: "Droite radicale",
  regionalist: "Régionaliste",
  other: "Autre",
};
