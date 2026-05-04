/**
 * FIXTURES DE DÉMONSTRATION
 *
 * Toutes les données ci-dessous sont fictives et illustratives.
 * Aucune affirmation, aucun verdict, aucun score n'a été produit
 * par le pipeline de fact-checking de politikar. Les noms réels de
 * personnalités publiques sont employés uniquement pour rendre la
 * maquette concrète. Aucun jugement, factuel ou moral, n'est porté
 * sur ces personnes par cette démonstration.
 */

import type {
  Claim,
  FunctionDef,
  Party,
  Politician,
  Region,
  Source,
  Topic,
} from "./types";

export const PARTIES: Party[] = [
  {
    id: "p-ren",
    slug: "renaissance",
    name: "Renaissance",
    short_name: "RE",
    political_family: "center",
    color_hex: "#facc15",
    leader_politician_id: "pol-macron",
  },
  {
    id: "p-rn",
    slug: "rassemblement-national",
    name: "Rassemblement national",
    short_name: "RN",
    political_family: "far_right",
    color_hex: "#0c4a6e",
    leader_politician_id: "pol-bardella",
  },
  {
    id: "p-lfi",
    slug: "la-france-insoumise",
    name: "La France insoumise",
    short_name: "LFI",
    political_family: "far_left",
    color_hex: "#b91c1c",
    leader_politician_id: "pol-melenchon",
  },
  {
    id: "p-lr",
    slug: "les-republicains",
    name: "Les Républicains",
    short_name: "LR",
    political_family: "right",
    color_hex: "#1e3a8a",
    leader_politician_id: "pol-wauquiez",
  },
  {
    id: "p-ps",
    slug: "parti-socialiste",
    name: "Parti socialiste",
    short_name: "PS",
    political_family: "center_left",
    color_hex: "#fb7185",
    leader_politician_id: "pol-faure",
  },
  {
    id: "p-eelv",
    slug: "les-ecologistes",
    name: "Les Écologistes",
    short_name: "EELV",
    political_family: "green",
    color_hex: "#16a34a",
    leader_politician_id: "pol-tondelier",
  },
  {
    id: "p-hor",
    slug: "horizons",
    name: "Horizons",
    short_name: "HOR",
    political_family: "center_right",
    color_hex: "#0ea5e9",
    leader_politician_id: "pol-philippe",
  },
  {
    id: "p-mdm",
    slug: "modem",
    name: "MoDem",
    short_name: "MoDem",
    political_family: "center",
    color_hex: "#f97316",
    leader_politician_id: "pol-bayrou",
  },
  {
    id: "p-rec",
    slug: "reconquete",
    name: "Reconquête",
    short_name: "REC",
    political_family: "far_right",
    color_hex: "#475569",
    leader_politician_id: "pol-marechal",
  },
  {
    id: "p-pcf",
    slug: "parti-communiste-francais",
    name: "Parti communiste français",
    short_name: "PCF",
    political_family: "left",
    color_hex: "#dc2626",
    leader_politician_id: "pol-roussel",
  },
];

export const FUNCTIONS: FunctionDef[] = [
  { id: "f-pres", slug: "president-republique", name: "Président de la République", level: "national_executive" },
  { id: "f-pm", slug: "premier-ministre", name: "Premier ministre", level: "national_executive" },
  { id: "f-min", slug: "ministre", name: "Ministre", level: "national_executive" },
  { id: "f-dep", slug: "depute", name: "Député", level: "national_legislative" },
  { id: "f-pres-an", slug: "president-assemblee", name: "Président de l'Assemblée nationale", level: "national_legislative" },
  { id: "f-eurodep", slug: "eurodepute", name: "Eurodéputé", level: "european" },
  { id: "f-pres-reg", slug: "president-region", name: "Président de région", level: "regional" },
  { id: "f-leader", slug: "leader-parti", name: "Leader de parti", level: "party_leadership" },
];

export const REGIONS: Region[] = [
  // hex grid roughly approximating France geography
  { id: "r-idf", slug: "ile-de-france", name: "Île-de-France", short_name: "IDF", hex: { col: 4, row: 2 } },
  { id: "r-ara", slug: "auvergne-rhone-alpes", name: "Auvergne-Rhône-Alpes", short_name: "ARA", hex: { col: 5, row: 4 } },
  { id: "r-naq", slug: "nouvelle-aquitaine", name: "Nouvelle-Aquitaine", short_name: "NAQ", hex: { col: 3, row: 4 } },
  { id: "r-occ", slug: "occitanie", name: "Occitanie", short_name: "OCC", hex: { col: 4, row: 5 } },
  { id: "r-hdf", slug: "hauts-de-france", name: "Hauts-de-France", short_name: "HDF", hex: { col: 4, row: 1 } },
  { id: "r-ges", slug: "grand-est", name: "Grand Est", short_name: "GES", hex: { col: 6, row: 2 } },
  { id: "r-pac", slug: "provence-alpes-cote-azur", name: "Provence-Alpes-Côte d'Azur", short_name: "PACA", hex: { col: 6, row: 5 } },
  { id: "r-pdl", slug: "pays-de-la-loire", name: "Pays de la Loire", short_name: "PDL", hex: { col: 2, row: 3 } },
  { id: "r-nor", slug: "normandie", name: "Normandie", short_name: "NOR", hex: { col: 3, row: 1 } },
  { id: "r-bre", slug: "bretagne", name: "Bretagne", short_name: "BRE", hex: { col: 1, row: 2 } },
  { id: "r-bfc", slug: "bourgogne-franche-comte", name: "Bourgogne-Franche-Comté", short_name: "BFC", hex: { col: 5, row: 3 } },
  { id: "r-cvl", slug: "centre-val-de-loire", name: "Centre-Val de Loire", short_name: "CVL", hex: { col: 3, row: 3 } },
  { id: "r-cor", slug: "corse", name: "Corse", short_name: "COR", hex: { col: 7, row: 6 } },
];

// Helper to assemble a politician with stats
function pol(
  args: {
    id: string;
    slug: string;
    full: string;
    given: string;
    family: string;
    year: number | null;
    gender: "male" | "female";
    party: string;
    func: string;
    region: string | null;
    tier: "P0" | "P1" | "P2";
    bio: string;
    truth: number | null;
    factual: number | null;
    promise: number | null;
    transparency: number;
    ci: [number, number] | null;
    nF: number;
    nP: number;
    topics: Partial<Record<Topic, [number, number]>>; // [score, n]
  }
): Politician {
  return {
    id: args.id,
    slug: args.slug,
    full_name: args.full,
    given_name: args.given,
    family_name: args.family,
    birth_year: args.year,
    gender: args.gender,
    party_id: args.party,
    function_id: args.func,
    region_id: args.region,
    tier: args.tier,
    bio_short: args.bio,
    stats: {
      truth_score: args.truth,
      factual_score: args.factual,
      promise_score: args.promise,
      transparency_score: args.transparency,
      ci_low: args.ci ? args.ci[0] : null,
      ci_high: args.ci ? args.ci[1] : null,
      is_significant: args.nF >= 30 || args.nP >= 5,
      n_factual: args.nF,
      n_promises: args.nP,
      topic_breakdown: Object.fromEntries(
        Object.entries(args.topics).map(([k, v]) => [
          k,
          { score: v![0], n: v![1], ci: [Math.max(0, v![0] - 5), Math.min(100, v![0] + 5)] },
        ])
      ) as Politician["stats"]["topic_breakdown"],
    },
  };
}

export const POLITICIANS: Politician[] = [
  pol({
    id: "pol-macron",
    slug: "emmanuel-macron",
    full: "Emmanuel Macron",
    given: "Emmanuel",
    family: "Macron",
    year: 1977,
    gender: "male",
    party: "p-ren",
    func: "f-pres",
    region: "r-idf",
    tier: "P0",
    bio: "Président de la République. Élu en 2017, réélu en 2022.",
    truth: 64,
    factual: 67,
    promise: 58,
    transparency: 55,
    ci: [60, 68],
    nF: 142,
    nP: 38,
    topics: {
      economy: [72, 38],
      employment: [69, 22],
      ecology_climate: [54, 19],
      europe: [76, 24],
      security: [58, 14],
      foreign_policy: [71, 12],
      immigration: [49, 13],
    },
  }),
  pol({
    id: "pol-attal",
    slug: "gabriel-attal",
    full: "Gabriel Attal",
    given: "Gabriel",
    family: "Attal",
    year: 1989,
    gender: "male",
    party: "p-ren",
    func: "f-pm",
    region: "r-idf",
    tier: "P0",
    bio: "Premier ministre. Auparavant ministre porte-parole puis ministre de l'Éducation nationale.",
    truth: 71,
    factual: 74,
    promise: 65,
    transparency: 60,
    ci: [67, 75],
    nF: 88,
    nP: 14,
    topics: {
      education: [78, 21],
      economy: [72, 18],
      security: [69, 12],
      employment: [74, 15],
    },
  }),
  pol({
    id: "pol-le-pen",
    slug: "marine-le-pen",
    full: "Marine Le Pen",
    given: "Marine",
    family: "Le Pen",
    year: 1968,
    gender: "female",
    party: "p-rn",
    func: "f-dep",
    region: "r-hdf",
    tier: "P0",
    bio: "Députée du Pas-de-Calais. Présidente du groupe RN à l'Assemblée nationale.",
    truth: 41,
    factual: 38,
    promise: 51,
    transparency: 35,
    ci: [37, 45],
    nF: 124,
    nP: 17,
    topics: {
      immigration: [32, 41],
      security: [44, 28],
      economy: [49, 18],
      employment: [52, 14],
      europe: [38, 12],
    },
  }),
  pol({
    id: "pol-bardella",
    slug: "jordan-bardella",
    full: "Jordan Bardella",
    given: "Jordan",
    family: "Bardella",
    year: 1995,
    gender: "male",
    party: "p-rn",
    func: "f-leader",
    region: "r-idf",
    tier: "P0",
    bio: "Président du Rassemblement national. Eurodéputé.",
    truth: 47,
    factual: 44,
    promise: null,
    transparency: 40,
    ci: [43, 51],
    nF: 96,
    nP: 0,
    topics: {
      immigration: [38, 32],
      europe: [51, 24],
      economy: [49, 16],
      security: [46, 15],
    },
  }),
  pol({
    id: "pol-melenchon",
    slug: "jean-luc-melenchon",
    full: "Jean-Luc Mélenchon",
    given: "Jean-Luc",
    family: "Mélenchon",
    year: 1951,
    gender: "male",
    party: "p-lfi",
    func: "f-leader",
    region: "r-naq",
    tier: "P0",
    bio: "Fondateur de La France insoumise. Plusieurs fois candidat à l'élection présidentielle.",
    truth: 56,
    factual: 53,
    promise: null,
    transparency: 65,
    ci: [52, 60],
    nF: 135,
    nP: 0,
    topics: {
      economy: [57, 28],
      ecology_climate: [66, 19],
      europe: [44, 18],
      social_protection: [62, 22],
      immigration: [63, 16],
    },
  }),
  pol({
    id: "pol-philippe",
    slug: "edouard-philippe",
    full: "Édouard Philippe",
    given: "Édouard",
    family: "Philippe",
    year: 1970,
    gender: "male",
    party: "p-hor",
    func: "f-leader",
    region: "r-nor",
    tier: "P0",
    bio: "Ancien Premier ministre (2017-2020). Maire du Havre. Président d'Horizons.",
    truth: 73,
    factual: 75,
    promise: 70,
    transparency: 60,
    ci: [69, 77],
    nF: 78,
    nP: 12,
    topics: {
      economy: [76, 22],
      institutions: [78, 14],
      ecology_climate: [68, 11],
      housing: [72, 8],
    },
  }),
  pol({
    id: "pol-bayrou",
    slug: "francois-bayrou",
    full: "François Bayrou",
    given: "François",
    family: "Bayrou",
    year: 1951,
    gender: "male",
    party: "p-mdm",
    func: "f-leader",
    region: "r-naq",
    tier: "P0",
    bio: "Maire de Pau. Président du MoDem. Haut-commissaire au Plan.",
    truth: 68,
    factual: 70,
    promise: 64,
    transparency: 60,
    ci: [64, 72],
    nF: 64,
    nP: 8,
    topics: {
      institutions: [73, 16],
      education: [69, 12],
      fiscal_policy: [66, 11],
      europe: [71, 9],
    },
  }),
  pol({
    id: "pol-marechal",
    slug: "marion-marechal",
    full: "Marion Maréchal",
    given: "Marion",
    family: "Maréchal",
    year: 1989,
    gender: "female",
    party: "p-rec",
    func: "f-eurodep",
    region: "r-pac",
    tier: "P0",
    bio: "Eurodéputée. Tête de liste Reconquête aux européennes 2024.",
    truth: 39,
    factual: 36,
    promise: null,
    transparency: 35,
    ci: [34, 44],
    nF: 52,
    nP: 0,
    topics: {
      immigration: [29, 18],
      culture: [44, 9],
      europe: [38, 12],
    },
  }),
  pol({
    id: "pol-faure",
    slug: "olivier-faure",
    full: "Olivier Faure",
    given: "Olivier",
    family: "Faure",
    year: 1968,
    gender: "male",
    party: "p-ps",
    func: "f-leader",
    region: "r-idf",
    tier: "P0",
    bio: "Premier secrétaire du Parti socialiste. Député de Seine-et-Marne.",
    truth: 65,
    factual: 67,
    promise: 60,
    transparency: 60,
    ci: [60, 70],
    nF: 58,
    nP: 6,
    topics: {
      social_protection: [72, 14],
      economy: [62, 12],
      ecology_climate: [69, 9],
      institutions: [66, 7],
    },
  }),
  pol({
    id: "pol-tondelier",
    slug: "marine-tondelier",
    full: "Marine Tondelier",
    given: "Marine",
    family: "Tondelier",
    year: 1986,
    gender: "female",
    party: "p-eelv",
    func: "f-leader",
    region: "r-hdf",
    tier: "P0",
    bio: "Secrétaire nationale des Écologistes.",
    truth: 70,
    factual: 73,
    promise: null,
    transparency: 65,
    ci: [65, 75],
    nF: 41,
    nP: 0,
    topics: {
      ecology_climate: [82, 18],
      energy: [75, 9],
      health: [68, 6],
      housing: [64, 5],
    },
  }),
  pol({
    id: "pol-roussel",
    slug: "fabien-roussel",
    full: "Fabien Roussel",
    given: "Fabien",
    family: "Roussel",
    year: 1969,
    gender: "male",
    party: "p-pcf",
    func: "f-leader",
    region: "r-hdf",
    tier: "P0",
    bio: "Secrétaire national du Parti communiste français. Député du Nord.",
    truth: 62,
    factual: 64,
    promise: null,
    transparency: 60,
    ci: [57, 67],
    nF: 38,
    nP: 0,
    topics: {
      employment: [70, 12],
      energy: [58, 8],
      economy: [62, 11],
    },
  }),
  pol({
    id: "pol-wauquiez",
    slug: "laurent-wauquiez",
    full: "Laurent Wauquiez",
    given: "Laurent",
    family: "Wauquiez",
    year: 1975,
    gender: "male",
    party: "p-lr",
    func: "f-pres-reg",
    region: "r-ara",
    tier: "P0",
    bio: "Président de la région Auvergne-Rhône-Alpes.",
    truth: 59,
    factual: 58,
    promise: 62,
    transparency: 55,
    ci: [54, 64],
    nF: 71,
    nP: 9,
    topics: {
      transport: [66, 14],
      security: [56, 12],
      economy: [60, 11],
      immigration: [48, 9],
    },
  }),
  pol({
    id: "pol-borne",
    slug: "elisabeth-borne",
    full: "Élisabeth Borne",
    given: "Élisabeth",
    family: "Borne",
    year: 1961,
    gender: "female",
    party: "p-ren",
    func: "f-dep",
    region: "r-nor",
    tier: "P0",
    bio: "Ancienne Première ministre (2022-2024). Députée du Calvados.",
    truth: 69,
    factual: 71,
    promise: 66,
    transparency: 55,
    ci: [65, 73],
    nF: 92,
    nP: 16,
    topics: {
      transport: [76, 18],
      ecology_climate: [70, 14],
      employment: [68, 13],
      social_protection: [69, 11],
    },
  }),
  pol({
    id: "pol-le-maire",
    slug: "bruno-le-maire",
    full: "Bruno Le Maire",
    given: "Bruno",
    family: "Le Maire",
    year: 1969,
    gender: "male",
    party: "p-ren",
    func: "f-min",
    region: "r-nor",
    tier: "P0",
    bio: "Ministre de l'Économie, des Finances et de la Souveraineté industrielle (mandat fictif).",
    truth: 66,
    factual: 64,
    promise: 70,
    transparency: 60,
    ci: [62, 70],
    nF: 118,
    nP: 22,
    topics: {
      economy: [68, 41],
      fiscal_policy: [62, 24],
      public_debt: [58, 14],
      employment: [70, 12],
    },
  }),
  pol({
    id: "pol-aubry",
    slug: "manon-aubry",
    full: "Manon Aubry",
    given: "Manon",
    family: "Aubry",
    year: 1989,
    gender: "female",
    party: "p-lfi",
    func: "f-eurodep",
    region: "r-idf",
    tier: "P1",
    bio: "Eurodéputée. Co-présidente du groupe The Left au Parlement européen.",
    truth: 67,
    factual: 70,
    promise: null,
    transparency: 60,
    ci: [62, 72],
    nF: 45,
    nP: 0,
    topics: {
      europe: [72, 18],
      ecology_climate: [70, 9],
      fiscal_policy: [64, 8],
      foreign_policy: [66, 6],
    },
  }),
  pol({
    id: "pol-braun-pivet",
    slug: "yael-braun-pivet",
    full: "Yaël Braun-Pivet",
    given: "Yaël",
    family: "Braun-Pivet",
    year: 1970,
    gender: "female",
    party: "p-ren",
    func: "f-pres-an",
    region: "r-idf",
    tier: "P0",
    bio: "Présidente de l'Assemblée nationale. Députée des Yvelines.",
    truth: 75,
    factual: 78,
    promise: null,
    transparency: 65,
    ci: [70, 80],
    nF: 36,
    nP: 0,
    topics: {
      institutions: [82, 14],
      justice: [74, 8],
      social_protection: [68, 6],
    },
  }),
];

// Sources

export const SOURCES: Source[] = [
  { id: "s-1", source_type: "speech", channel: "Élysée", occurred_at: "2026-03-12", url: "https://elysee.fr/example/1" },
  { id: "s-2", source_type: "interview", channel: "France Inter, 7/9", occurred_at: "2026-04-18", url: "https://franceinter.fr/example/2" },
  { id: "s-3", source_type: "tv_debate", channel: "France 2, L'Émission politique", occurred_at: "2026-02-22", url: null },
  { id: "s-4", source_type: "parliamentary_intervention", channel: "Assemblée nationale", occurred_at: "2026-03-04", url: "https://assemblee-nationale.fr/example/4" },
  { id: "s-5", source_type: "tweet", channel: "X / Twitter", occurred_at: "2026-04-09", url: null },
  { id: "s-6", source_type: "official_statement", channel: "Matignon", occurred_at: "2026-04-02", url: "https://info.gouv.fr/example/6" },
  { id: "s-7", source_type: "press_conference", channel: "Conférence presse RN", occurred_at: "2026-04-15", url: null },
  { id: "s-8", source_type: "interview", channel: "BFM TV, Apolline Matin", occurred_at: "2026-04-21", url: null },
  { id: "s-9", source_type: "campaign_program", channel: "Programme RE 2022", occurred_at: "2022-04-01", url: null },
];

// Claims (a curated set illustrating verdicts variety)

export const CLAIMS: Claim[] = [
  {
    id: "c-001",
    politician_id: "pol-macron",
    source_id: "s-1",
    claim_text: "Le chômage est passé sous la barre des 7 % pour la première fois depuis quarante ans.",
    claim_type: "factual_assertion",
    topic_tags: ["employment", "economy"],
    numeric_values: [{ value: 7, unit: "%", period: "T4 2025" }],
    verdict: "mostly_true",
    confidence_score: 0.86,
    reasoning:
      "Selon l'INSEE, le taux de chômage au sens du BIT s'établissait à 7,1 % au quatrième trimestre 2025, soit légèrement au-dessus du seuil cité. La tendance baissière sur quarante ans est en revanche bien documentée. La formulation est précise dans l'intention mais imprécise sur le seuil exact.",
    evidence: [
      {
        source_url: "https://insee.fr/exemple/serie-chomage",
        source_label: "INSEE BDM, taux de chômage BIT",
        quote: "7,1 % au T4 2025, série CNATCN",
        weight: 0.95,
        kind: "data_api",
      },
      {
        source_url: "https://factuel.afp.com/exemple/chomage-7-pct",
        source_label: "AFP Factuel",
        quote: "L'INSEE relève 7,1 % et non sous les 7 %",
        weight: 0.7,
        kind: "fact_checker",
      },
    ],
    occurred_at: "2026-03-12",
    human_reviewed: true,
  },
  {
    id: "c-002",
    politician_id: "pol-macron",
    source_id: "s-2",
    claim_text: "Nous avons doublé le budget de la transition écologique en cinq ans.",
    claim_type: "factual_assertion",
    topic_tags: ["ecology_climate", "fiscal_policy"],
    numeric_values: [{ value: 2, unit: "x", period: "2021-2026" }],
    verdict: "mixed",
    confidence_score: 0.74,
    reasoning:
      "Le périmètre budgétaire utilisé varie selon les sources. Le PLF Vert recense bien une hausse marquée des dépenses fléchées climat, de l'ordre de +60 à +80 % selon le mode de calcul, mais pas un doublement complet. Selon le périmètre retenu (mission Écologie seule vs ensemble PLF Vert), la formulation peut être défendue ou contestée.",
    evidence: [
      {
        source_url: "https://data.gouv.fr/exemple/plf-vert",
        source_label: "PLF Vert, ministère des Finances",
        quote: "Dépenses favorables à l'environnement +71 %",
        weight: 0.85,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-18",
    human_reviewed: true,
  },
  {
    id: "c-003",
    politician_id: "pol-le-pen",
    source_id: "s-3",
    claim_text: "L'immigration coûte 84 milliards d'euros par an à la France.",
    claim_type: "factual_assertion",
    topic_tags: ["immigration", "fiscal_policy"],
    numeric_values: [{ value: 84, unit: "Md€", period: "annuel" }],
    verdict: "false",
    confidence_score: 0.92,
    reasoning:
      "Le chiffre cité provient d'une étude isolée comptabilisant uniquement des dépenses, sans porter au crédit les recettes fiscales et cotisations versées par les personnes concernées. Les évaluations académiques équilibrées (OCDE, France Stratégie) concluent à un solde proche de zéro, oscillant entre -0,3 % et +0,5 % du PIB selon les hypothèses. Le chiffre brut isolé est trompeur sur le solde réel.",
    evidence: [
      {
        source_url: "https://factuel.afp.com/exemple/cout-immigration",
        source_label: "AFP Factuel",
        quote: "Le chiffre de 84 Md€ ignore les recettes correspondantes",
        weight: 0.85,
        kind: "fact_checker",
      },
      {
        source_url: "https://oecd.org/exemple/migration-fiscal-impact",
        source_label: "OCDE, Perspectives des migrations",
        quote: "Solde fiscal des migrants en France proche de l'équilibre",
        weight: 0.95,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-02-22",
    human_reviewed: true,
  },
  {
    id: "c-004",
    politician_id: "pol-le-pen",
    source_id: "s-7",
    claim_text: "L'insécurité a explosé de 30 % en cinq ans.",
    claim_type: "factual_assertion",
    topic_tags: ["security"],
    numeric_values: [{ value: 30, unit: "%", period: "2021-2026" }],
    verdict: "misleading_context",
    confidence_score: 0.82,
    reasoning:
      "Les statistiques du SSMSI montrent une hausse réelle de certains indicateurs (violences sexuelles enregistrées, coups et blessures volontaires) mais d'autres baissent (vols, cambriolages). L'agrégat unique ne peut pas être présenté comme une explosion globale sans préciser le périmètre. Une partie de la hausse s'explique par la libération de la parole et un meilleur enregistrement des plaintes, ce que les chercheurs en criminologie identifient.",
    evidence: [
      {
        source_url: "https://interieur.gouv.fr/Interstats/exemple",
        source_label: "SSMSI, bilan annuel",
        quote: "Hausse hétérogène selon les types d'infractions",
        weight: 0.9,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-15",
    human_reviewed: true,
  },
  {
    id: "c-005",
    politician_id: "pol-melenchon",
    source_id: "s-2",
    claim_text: "Un Français sur cinq saute un repas par manque d'argent.",
    claim_type: "factual_assertion",
    topic_tags: ["social_protection", "economy"],
    numeric_values: [{ value: 20, unit: "%" }],
    verdict: "mostly_true",
    confidence_score: 0.78,
    reasoning:
      "Plusieurs enquêtes, notamment du CRÉDOC et des Restos du cœur, situent cette proportion entre 16 % et 22 % selon la formulation de la question et l'année. La formulation 'un sur cinq' est donc une approximation acceptable du haut de la fourchette. La période et le périmètre exact ne sont pas précisés dans l'intervention.",
    evidence: [
      {
        source_url: "https://credoc.fr/exemple/precarite-alimentaire",
        source_label: "CRÉDOC, Précarité alimentaire 2025",
        quote: "18,4 % des Français déclarent avoir sauté un repas",
        weight: 0.85,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-18",
    human_reviewed: false,
  },
  {
    id: "c-006",
    politician_id: "pol-attal",
    source_id: "s-6",
    claim_text: "Nous avons recruté 30 000 enseignants supplémentaires depuis le début du quinquennat.",
    claim_type: "factual_assertion",
    topic_tags: ["education", "employment"],
    numeric_values: [{ value: 30000, unit: "ETP" }],
    verdict: "mostly_false",
    confidence_score: 0.84,
    reasoning:
      "Le solde net d'enseignants titulaires sur la période a été largement inférieur. La DEPP recense des recrutements bruts mais aussi des départs et un recours croissant à des contractuels. Le chiffre brut est défendable seulement en agrégeant titulaires et contractuels temporaires, ce que le contexte de l'intervention ne précise pas. Le solde net réel se situe autour de 8 000 à 12 000 selon les périmètres.",
    evidence: [
      {
        source_url: "https://education.gouv.fr/depp/exemple",
        source_label: "DEPP, panorama enseignants",
        quote: "Solde net 9 200 ETP sur la période",
        weight: 0.9,
        kind: "data_api",
      },
      {
        source_url: "https://lesdecodeurs.lemonde.fr/exemple/profs-recrutes",
        source_label: "Les Décodeurs, Le Monde",
        quote: "Le chiffre de 30 000 mêle titulaires et contractuels",
        weight: 0.75,
        kind: "fact_checker",
      },
    ],
    occurred_at: "2026-04-02",
    human_reviewed: true,
  },
  {
    id: "c-007",
    politician_id: "pol-attal",
    source_id: "s-9",
    claim_text: "Nous garantirons une école publique avec un professeur devant chaque classe à la rentrée.",
    claim_type: "promise",
    topic_tags: ["education"],
    verdict: "partially_kept",
    confidence_score: 0.76,
    reasoning:
      "À la rentrée observée, environ 6 % des classes restaient sans titulaire en début d'année selon les remontées du SNES-FSU et les chiffres officiels du ministère. La promesse était large et a été partiellement tenue grâce au recours massif aux contractuels mais reste non remplie au sens strict.",
    evidence: [
      {
        source_url: "https://education.gouv.fr/exemple/rentree",
        source_label: "Ministère de l'Éducation",
        quote: "94 % des classes pourvues à J+0",
        weight: 0.85,
        kind: "official_document",
      },
    ],
    occurred_at: "2022-04-01",
    human_reviewed: true,
  },
  {
    id: "c-008",
    politician_id: "pol-bardella",
    source_id: "s-8",
    claim_text: "L'Union européenne représente 80 % de notre droit national.",
    claim_type: "factual_assertion",
    topic_tags: ["europe", "institutions"],
    numeric_values: [{ value: 80, unit: "%" }],
    verdict: "false",
    confidence_score: 0.91,
    reasoning:
      "Cette estimation fréquemment reprise n'est étayée par aucune étude juridique sérieuse. Les analyses du Conseil d'État et de chercheurs spécialisés en droit européen situent la part du droit national d'origine européenne entre 20 % et 30 % selon la définition retenue, et seulement pour certains domaines spécifiques (agriculture, marché intérieur). Le chiffre de 80 % relève de la rumeur politique et a été démenti à plusieurs reprises.",
    evidence: [
      {
        source_url: "https://lessurligneurs.eu/exemple/80-pct-droit-eu",
        source_label: "Les Surligneurs",
        quote: "Le chiffre de 80 % est inexact, l'estimation réaliste est 20-30 %",
        weight: 0.9,
        kind: "fact_checker",
      },
    ],
    occurred_at: "2026-04-21",
    human_reviewed: true,
  },
  {
    id: "c-009",
    politician_id: "pol-philippe",
    source_id: "s-2",
    claim_text: "La dette publique atteint 113 % du PIB, son plus haut niveau historique hors période de guerre.",
    claim_type: "factual_assertion",
    topic_tags: ["public_debt", "economy"],
    numeric_values: [{ value: 113, unit: "% PIB" }],
    verdict: "true",
    confidence_score: 0.95,
    reasoning:
      "Le chiffre est conforme aux dernières données publiées par l'INSEE et la Banque de France. La comparaison historique hors période de guerre est exacte sur la base des séries longues disponibles. Le niveau de 113 % est légèrement en dessous du pic post-pandémie de 2020-2021 (115 %) mais reste effectivement parmi les plus hauts en temps de paix.",
    evidence: [
      {
        source_url: "https://insee.fr/exemple/dette-publique",
        source_label: "INSEE, dette publique au sens de Maastricht",
        quote: "112,9 % du PIB au T4 2025",
        weight: 0.98,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-18",
    human_reviewed: false,
  },
  {
    id: "c-010",
    politician_id: "pol-tondelier",
    source_id: "s-4",
    claim_text: "Les émissions de gaz à effet de serre de la France ont baissé de 5 % l'an dernier.",
    claim_type: "factual_assertion",
    topic_tags: ["ecology_climate"],
    numeric_values: [{ value: 5, unit: "%", period: "an dernier" }],
    verdict: "mostly_true",
    confidence_score: 0.87,
    reasoning:
      "Le Citepa publie une baisse de 4,8 % des émissions sur l'année, conforme à la trajectoire bas-carbone. La formulation arrondie est correcte. Une partie de la baisse provient cependant d'effets conjoncturels (météo, économie) plutôt que structurels.",
    evidence: [
      {
        source_url: "https://citepa.org/exemple/inventaire-2025",
        source_label: "Citepa, inventaire annuel",
        quote: "Baisse de 4,8 % des émissions GES",
        weight: 0.92,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-03-04",
    human_reviewed: true,
  },
  {
    id: "c-011",
    politician_id: "pol-le-maire",
    source_id: "s-9",
    claim_text: "Nous ramènerons le déficit public sous les 3 % du PIB d'ici 2027.",
    claim_type: "promise",
    topic_tags: ["fiscal_policy", "public_debt"],
    verdict: "in_progress",
    confidence_score: 0.7,
    reasoning:
      "La trajectoire budgétaire annoncée vise effectivement les 3 % en 2027 selon le programme de stabilité, mais le déficit constaté pour 2025 dépasse les prévisions initiales. La cible reste atteignable mais nécessite des ajustements. Verdict provisoire jusqu'à publication des comptes 2027.",
    evidence: [
      {
        source_url: "https://economie.gouv.fr/exemple/programme-stabilite",
        source_label: "Programme de stabilité 2025-2028",
        quote: "Trajectoire visant 2,9 % en 2027",
        weight: 0.85,
        kind: "official_document",
      },
    ],
    occurred_at: "2022-04-01",
    human_reviewed: false,
  },
  {
    id: "c-012",
    politician_id: "pol-borne",
    source_id: "s-9",
    claim_text: "Nous mettrons en place un Fonds vert d'au moins 2 milliards d'euros pour les collectivités.",
    claim_type: "promise",
    topic_tags: ["ecology_climate", "fiscal_policy"],
    verdict: "kept",
    confidence_score: 0.93,
    reasoning:
      "Le Fonds vert a été créé et doté en 2023 de 2 milliards d'euros, conforme à l'engagement. Le dispositif a été maintenu et même renforcé sur les exercices suivants.",
    evidence: [
      {
        source_url: "https://ecologie.gouv.fr/exemple/fonds-vert",
        source_label: "Ministère de la Transition écologique",
        quote: "Fonds vert doté de 2 milliards d'euros à sa création",
        weight: 0.95,
        kind: "official_document",
      },
    ],
    occurred_at: "2022-04-01",
    human_reviewed: true,
  },
  {
    id: "c-013",
    politician_id: "pol-marechal",
    source_id: "s-5",
    claim_text: "70 % des immigrés arrivant en France ne travaillent pas.",
    claim_type: "factual_assertion",
    topic_tags: ["immigration", "employment"],
    numeric_values: [{ value: 70, unit: "%" }],
    verdict: "false",
    confidence_score: 0.9,
    reasoning:
      "Les chiffres de l'INSEE et de l'OCDE montrent un taux d'emploi des immigrés en France autour de 60 %, légèrement inférieur à celui des natifs (68 %) mais loin du chiffre cité. Le taux d'inactivité varie fortement selon l'âge, le sexe et l'origine. Le pourcentage avancé n'est étayé par aucune source officielle.",
    evidence: [
      {
        source_url: "https://insee.fr/exemple/immigres-emploi",
        source_label: "INSEE, immigrés et marché du travail",
        quote: "Taux d'emploi des immigrés 60,1 %",
        weight: 0.95,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-09",
    human_reviewed: true,
  },
  {
    id: "c-014",
    politician_id: "pol-aubry",
    source_id: "s-4",
    claim_text: "Les multinationales américaines paient en moyenne 9 % d'impôt en Europe.",
    claim_type: "factual_assertion",
    topic_tags: ["fiscal_policy", "europe"],
    numeric_values: [{ value: 9, unit: "%" }],
    verdict: "mixed",
    confidence_score: 0.71,
    reasoning:
      "Les estimations varient. L'EU Tax Observatory situe le taux effectif d'imposition des multinationales américaines opérant en Europe entre 8 % et 14 % selon les secteurs et les méthodes. Le chiffre de 9 % est dans la fourchette basse mais correspond à des études spécifiques sur les GAFAM.",
    evidence: [
      {
        source_url: "https://taxobservatory.eu/exemple",
        source_label: "EU Tax Observatory",
        quote: "Taux effectif moyen 8,7 % à 13,2 %",
        weight: 0.85,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-03-04",
    human_reviewed: false,
  },
  {
    id: "c-015",
    politician_id: "pol-bayrou",
    source_id: "s-2",
    claim_text: "La France compte aujourd'hui plus d'enseignants par élève qu'il y a vingt ans.",
    claim_type: "factual_assertion",
    topic_tags: ["education"],
    verdict: "mostly_true",
    confidence_score: 0.81,
    reasoning:
      "Les ratios publiés par la DEPP confirment un encadrement légèrement plus favorable aujourd'hui qu'il y a vingt ans, malgré des variations selon les niveaux. La tendance générale est correcte, mais le primaire reste tendu sur certains territoires.",
    evidence: [
      {
        source_url: "https://education.gouv.fr/depp/exemple/encadrement",
        source_label: "DEPP, ratio élèves/enseignant",
        quote: "Ratio en légère amélioration sur 20 ans",
        weight: 0.9,
        kind: "data_api",
      },
    ],
    occurred_at: "2026-04-18",
    human_reviewed: false,
  },
  {
    id: "c-016",
    politician_id: "pol-wauquiez",
    source_id: "s-5",
    claim_text: "Notre région a réduit la dette par habitant de 40 % en six ans.",
    claim_type: "factual_assertion",
    topic_tags: ["public_debt"],
    numeric_values: [{ value: 40, unit: "%", period: "2019-2025" }],
    verdict: "unverifiable",
    confidence_score: 0.65,
    reasoning:
      "Les comptes administratifs régionaux confirment une baisse de la dette mais la base de comparaison utilisée par l'orateur n'est pas précisée. Selon le mode de calcul (dette brute, dette nette, par habitant à population constante), la baisse documentée varie de 18 % à 35 %. Sans précision méthodologique, le chiffre exact ne peut pas être tranché.",
    evidence: [],
    occurred_at: "2026-04-09",
    human_reviewed: true,
  },
];

export const TOP_STORIES = [
  { claim_id: "c-003", note: "Reprise massive sur les réseaux la semaine du 23 février." },
  { claim_id: "c-006", note: "Fact-check croisé Décodeurs / DEPP." },
  { claim_id: "c-009", note: "Donnée chiffrée précise, verdict confirmé." },
  { claim_id: "c-013", note: "Pic de viralité, 1,2 M de partages estimés." },
];

// Region scores aggregated from politicians associated to that region
export function regionAggregateScores() {
  const map = new Map<string, { sum: number; weight: number; n: number }>();
  for (const p of POLITICIANS) {
    if (!p.region_id || p.stats.truth_score == null) continue;
    if (!p.stats.is_significant) continue;
    const e = map.get(p.region_id) ?? { sum: 0, weight: 0, n: 0 };
    const w = p.tier === "P0" ? 2 : p.tier === "P1" ? 1.5 : 1;
    e.sum += p.stats.truth_score * w;
    e.weight += w;
    e.n += 1;
    map.set(p.region_id, e);
  }
  const out: Record<string, { score: number; n: number } | null> = {};
  for (const r of REGIONS) {
    const e = map.get(r.id);
    out[r.id] = e ? { score: Math.round(e.sum / e.weight), n: e.n } : null;
  }
  return out;
}

// Lookup helpers

export function partyById(id: string) {
  return PARTIES.find((p) => p.id === id);
}
export function partyBySlug(slug: string) {
  return PARTIES.find((p) => p.slug === slug);
}
export function functionById(id: string) {
  return FUNCTIONS.find((f) => f.id === id);
}
export function functionBySlug(slug: string) {
  return FUNCTIONS.find((f) => f.slug === slug);
}
export function regionById(id: string | null) {
  return id ? REGIONS.find((r) => r.id === id) : undefined;
}
export function regionBySlug(slug: string) {
  return REGIONS.find((r) => r.slug === slug);
}
export function politicianBySlug(slug: string) {
  return POLITICIANS.find((p) => p.slug === slug);
}
export function politicianById(id: string) {
  return POLITICIANS.find((p) => p.id === id);
}
export function sourceById(id: string) {
  return SOURCES.find((s) => s.id === id);
}
export function claimById(id: string) {
  return CLAIMS.find((c) => c.id === id);
}
export function claimsForPolitician(politicianId: string) {
  return CLAIMS.filter((c) => c.politician_id === politicianId);
}
export function politiciansInParty(partyId: string) {
  return POLITICIANS.filter((p) => p.party_id === partyId);
}
export function politiciansInFunction(functionId: string) {
  return POLITICIANS.filter((p) => p.function_id === functionId);
}
export function politiciansInRegion(regionId: string) {
  return POLITICIANS.filter((p) => p.region_id === regionId);
}
