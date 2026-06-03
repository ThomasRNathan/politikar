/**
 * FIXTURES POLITIKAR
 *
 * Données politiques (noms, partis, fonctions, régions, photos, logos)
 * issues de Wikipedia / Wikidata. Données réelles.
 *
 * Scores, claims et verdicts ci-dessous : illustrations basées sur la
 * méthode publiée. Le pipeline de fact-checking automatisé n'est pas
 * encore branché. Aucun jugement n'est porté sur les personnes citées.
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

// Logos : Wikimedia Commons via Special:FilePath ou thumbnails directs.
// Récupérés via Wikidata P154 et l'API Wikipedia pageimages.
const PARTY_LOGOS: Record<string, string> = {
  "p-ren": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Renaissance-logotype-officiel.svg/500px-Renaissance-logotype-officiel.svg.png",
  "p-rn": "https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20Rassemblement%20National.svg?width=400",
  "p-lfi": "https://upload.wikimedia.org/wikipedia/fr/thumb/0/07/La_France_insoumise_logo_2024.svg/500px-La_France_insoumise_logo_2024.svg.png",
  "p-lr": "https://upload.wikimedia.org/wikipedia/fr/thumb/2/2c/Logo_Les_R%C3%A9publicains_-_2023.svg/500px-Logo_Les_R%C3%A9publicains_-_2023.svg.png",
  "p-ps": "https://upload.wikimedia.org/wikipedia/fr/thumb/a/af/Logo_Parti_Socialiste_-_2024.svg/500px-Logo_Parti_Socialiste_-_2024.svg.png",
  "p-eelv": "https://commons.wikimedia.org/wiki/Special:FilePath/Europe%20Ecologie-Les%20Verts%20Logo.svg?width=400",
  "p-hor": "https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20Parti%20Politique%20Horizons%20-%202021.svg?width=400",
  "p-mdm": "https://commons.wikimedia.org/wiki/Special:FilePath/MoDem%20logo%202019.svg?width=400",
  "p-rec": "https://commons.wikimedia.org/wiki/Special:FilePath/Logo%20du%20parti%20Reconqu%C3%AAte.svg?width=400",
  "p-pcf": "https://upload.wikimedia.org/wikipedia/fr/thumb/6/6a/Logo_du_Parti_communiste_fran%C3%A7ais_%282018%2C_rouge%29.svg/500px-Logo_du_Parti_communiste_fran%C3%A7ais_%282018%2C_rouge%29.svg.png",
  "p-fac": "https://upload.wikimedia.org/wikipedia/fr/thumb/c/ca/Logotype_de_Femu_a_Corsica.svg/500px-Logotype_de_Femu_a_Corsica.svg.png",
};

// Photos : Wikipedia FR pageimages thumbnails (500px de large).
const POLITICIAN_PHOTOS: Record<string, string> = {
  "pol-macron": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Emmanuel_Macron_2025_%28cropped%29.jpg/500px-Emmanuel_Macron_2025_%28cropped%29.jpg",
  "pol-attal": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Gabriel_Attal_2025_%28close_crop%29.jpg/500px-Gabriel_Attal_2025_%28close_crop%29.jpg",
  "pol-le-pen": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Marine_Le_Pen_2025_%28cropped%29.jpg/500px-Marine_Le_Pen_2025_%28cropped%29.jpg",
  "pol-bardella": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/MEP_Jordan_Bardella.jpg/500px-MEP_Jordan_Bardella.jpg",
  "pol-melenchon": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/JLM_EP_2016_cropped-2.jpg/500px-JLM_EP_2016_cropped-2.jpg",
  "pol-philippe": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Edouard_Philippe_3x4_crop.jpg/500px-Edouard_Philippe_3x4_crop.jpg",
  "pol-bayrou": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Bayrou_Matignon_%28cropped%29.jpg/500px-Bayrou_Matignon_%28cropped%29.jpg",
  "pol-marechal": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Marion_Mar%C3%A9chal_MEP_%282024%29.jpg/500px-Marion_Mar%C3%A9chal_MEP_%282024%29.jpg",
  "pol-faure": "https://commons.wikimedia.org/wiki/Special:FilePath/Portrait%20d%27Olivier%20Faure.jpg?width=500",
  "pol-tondelier": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/20210819_tondelier.m-cr3.jpg/500px-20210819_tondelier.m-cr3.jpg",
  "pol-roussel": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Roussel_Fabien_1.jpg/500px-Roussel_Fabien_1.jpg",
  "pol-wauquiez": "https://upload.wikimedia.org/wikipedia/commons/2/2d/Laurent_Wauquiez_2021.jpg",
  "pol-borne": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/La_Premi%C3%A8re_ministre_fran%C3%A7aise_%C3%89lisabeth_Borne_%28cropped%29.jpg/500px-La_Premi%C3%A8re_ministre_fran%C3%A7aise_%C3%89lisabeth_Borne_%28cropped%29.jpg",
  "pol-le-maire": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/EU2024BE_240223_Informal_meeting_of_economic_and_financial_affairs_ministers_Gent_JNZT_0040_%2853545889372%29.jpg/500px-EU2024BE_240223_Informal_meeting_of_economic_and_financial_affairs_ministers_Gent_JNZT_0040_%2853545889372%29.jpg",
  "pol-aubry": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/1720623827463_20190528_AUBRY_Manon_FR_9.jpg/500px-1720623827463_20190528_AUBRY_Manon_FR_9.jpg",
  "pol-braun-pivet": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Ya%C3%ABl_Braun-Pivet_2023_%28cropped%29.jpg/500px-Ya%C3%ABl_Braun-Pivet_2023_%28cropped%29.jpg",
  // Government (5)
  "pol-retailleau": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais_%28cropped%29.jpg/500px-Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais_%28cropped%29.jpg",
  "pol-vautrin": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Portrait_officiel_de_Catherine_Vautrin_-_%C2%A9ECPAD.jpg/500px-Portrait_officiel_de_Catherine_Vautrin_-_%C2%A9ECPAD.jpg",
  "pol-dati": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Rachida_Dati_portrait.jpg/500px-Rachida_Dati_portrait.jpg",
  "pol-lecornu": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Portrait_officiel_de_S%C3%A9bastien_Lecornu_-_Ministre_des_Arm%C3%A9es_%28cropped%29.jpg/500px-Portrait_officiel_de_S%C3%A9bastien_Lecornu_-_Ministre_des_Arm%C3%A9es_%28cropped%29.jpg",
  "pol-barrot": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Jean-No%C3%ABl_Barrot_2023_cropped.jpg/500px-Jean-No%C3%ABl_Barrot_2023_cropped.jpg",
  // Mayors (10)
  "pol-hidalgo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Hidalgo2020crop.jpg/500px-Hidalgo2020crop.jpg",
  "pol-doucet": "https://upload.wikimedia.org/wikipedia/commons/e/e1/Gr%C3%A9gory_Doucet_%28cropped%29_%28cropped%29.jpg",
  "pol-payan": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Beno%C3%AEt_Payan_2025_%28cropped%29.jpg/500px-Beno%C3%AEt_Payan_2025_%28cropped%29.jpg",
  "pol-hurmic": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Portrait_Pierre_Hurmic_%28cropped%29.jpg/500px-Portrait_Pierre_Hurmic_%28cropped%29.jpg",
  "pol-rolland": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Johanna_Rolland_2019_%28cropped%29.jpg/500px-Johanna_Rolland_2019_%28cropped%29.jpg",
  "pol-barseghian": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Jeanne_Barseghian_%28cropped%29.jpg/500px-Jeanne_Barseghian_%28cropped%29.jpg",
  "pol-estrosi": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Christian_Estrosi_-_2017_%2824778920307%29_%28cropped%29.jpg/500px-Christian_Estrosi_-_2017_%2824778920307%29_%28cropped%29.jpg",
  "pol-appere": "https://upload.wikimedia.org/wikipedia/commons/f/f5/App%C3%A9r%C3%A9_2023_%28cropped%29.jpg",
  "pol-delafosse": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Micha%C3%ABl_Delafosse_en_2022_%28cropped%29.jpg/500px-Micha%C3%ABl_Delafosse_en_2022_%28cropped%29.jpg",
  "pol-lisnard": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/David_Lisnard_-_2013.jpg/500px-David_Lisnard_-_2013.jpg",
  // Regional presidents (8)
  "pol-pecresse": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Val%C3%A9rie_P%C3%A9cresse_at_a_2024_Paralympic_Games_media_conference_in_2024_3_%28cropped%29.jpg/500px-Val%C3%A9rie_P%C3%A9cresse_at_a_2024_Paralympic_Games_media_conference_in_2024_3_%28cropped%29.jpg",
  "pol-bertrand": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Xavier_Bertrand_-_2025_%28cropped%29.jpg/500px-Xavier_Bertrand_-_2025_%28cropped%29.jpg",
  "pol-delga": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Delga-Toulouse-Occitanie_%28cropped%29.jpg/500px-Delga-Toulouse-Occitanie_%28cropped%29.jpg",
  "pol-muselier": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Visit_of_Renaud_Muselier%2C_President_of_the_Regional_Council_of_Provence-Alpes-C%C3%B4te_d%27Azur%2C_to_the_EC_-_2025_%28cropped%29.jpg/500px-Visit_of_Renaud_Muselier%2C_President_of_the_Regional_Council_of_Provence-Alpes-C%C3%B4te_d%27Azur%2C_to_the_EC_-_2025_%28cropped%29.jpg",
  "pol-morancais": "https://upload.wikimedia.org/wikipedia/commons/8/83/Photo_de_CM_%28cropped%29.png",
  "pol-rousset": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Alain_Rousset_dans_les_Landes_2010.jpg/500px-Alain_Rousset_dans_les_Landes_2010.jpg",
  "pol-morin": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Herv%C3%A9_Morin_EC_2025_2_%28cropped%29.jpg/500px-Herv%C3%A9_Morin_EC_2025_2_%28cropped%29.jpg",
  "pol-simeoni": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Gilles_Simeoni_%28cropped%29.jpg/500px-Gilles_Simeoni_%28cropped%29.jpg",
  // Parliamentary leaders + Senate (7)
  "pol-panot": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Mathilde_Panot_2021-3.jpg/500px-Mathilde_Panot_2021-3.jpg",
  "pol-chatelain": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Cyrielle_Chatelain_crop.jpg/500px-Cyrielle_Chatelain_crop.jpg",
  "pol-vallaud": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Boris_Vallaud_%28cropped%29.jpg/500px-Boris_Vallaud_%28cropped%29.jpg",
  "pol-fesneau": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Marc_Fesneau_2024_%28cropped%29.jpg/500px-Marc_Fesneau_2024_%28cropped%29.jpg",
  "pol-marcangeli": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Visit_of_Laurent_Marcangeli%2C_French_Minister_for_Public_Action%2C_the_Civil_Service%2C_and_Simplification%2C_to_the_EC_-_2025.jpg/500px-Visit_of_Laurent_Marcangeli%2C_French_Minister_for_Public_Action%2C_the_Civil_Service%2C_and_Simplification%2C_to_the_EC_-_2025.jpg",
  "pol-larcher": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Portrait_G._Larcher_2014_%28cropped%29.jpg/500px-Portrait_G._Larcher_2014_%28cropped%29.jpg",
  "pol-kanner": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Patrick_Kanner_par_Claude_Truong-Ngoc_septembre_2014.jpg/500px-Patrick_Kanner_par_Claude_Truong-Ngoc_septembre_2014.jpg",
  // MEPs (4)
  "pol-bellamy": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/1718895492232_20240620_BELLAMY_Francois-Xavier_FR_012.jpg/500px-1718895492232_20240620_BELLAMY_Francois-Xavier_FR_012.jpg",
  "pol-glucksmann": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/1720448398743_20240708_GLUCKSMANN_Raphael_FR_006.jpg/500px-1720448398743_20240708_GLUCKSMANN_Raphael_FR_006.jpg",
  "pol-hayer": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Val%C3%A9rie_Hayer_at_a_Renew_Europe_meeting_in_European_Parliament_-_2024_%28P064202-298895%29_%28cropped%29.jpg/500px-Val%C3%A9rie_Hayer_at_a_Renew_Europe_meeting_in_European_Parliament_-_2024_%28P064202-298895%29_%28cropped%29.jpg",
  "pol-toussaint": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1720621117032_20240710_TOUSSAINT_Marie_FR_011.jpg/500px-1720621117032_20240710_TOUSSAINT_Marie_FR_011.jpg",
};

function withLogo(p: Omit<Party, "logo_url">): Party {
  return { ...p, logo_url: PARTY_LOGOS[p.id] ?? null };
}

export const PARTIES: Party[] = [
  withLogo({ id: "p-ren",  slug: "renaissance",                name: "Renaissance",                short_name: "RE",    political_family: "center",       color_hex: "#facc15", leader_politician_id: "pol-macron" }),
  withLogo({ id: "p-rn",   slug: "rassemblement-national",     name: "Rassemblement national",     short_name: "RN",    political_family: "far_right",    color_hex: "#0c4a6e", leader_politician_id: "pol-bardella" }),
  withLogo({ id: "p-lfi",  slug: "la-france-insoumise",        name: "La France insoumise",        short_name: "LFI",   political_family: "far_left",     color_hex: "#b91c1c", leader_politician_id: "pol-melenchon" }),
  withLogo({ id: "p-lr",   slug: "les-republicains",           name: "Les Républicains",           short_name: "LR",    political_family: "right",        color_hex: "#1e3a8a", leader_politician_id: "pol-wauquiez" }),
  withLogo({ id: "p-ps",   slug: "parti-socialiste",           name: "Parti socialiste",           short_name: "PS",    political_family: "center_left",  color_hex: "#fb7185", leader_politician_id: "pol-faure" }),
  withLogo({ id: "p-eelv", slug: "les-ecologistes",            name: "Les Écologistes",            short_name: "EELV",  political_family: "green",        color_hex: "#16a34a", leader_politician_id: "pol-tondelier" }),
  withLogo({ id: "p-hor",  slug: "horizons",                   name: "Horizons",                   short_name: "HOR",   political_family: "center_right", color_hex: "#0ea5e9", leader_politician_id: "pol-philippe" }),
  withLogo({ id: "p-mdm",  slug: "modem",                      name: "MoDem",                      short_name: "MoDem", political_family: "center",       color_hex: "#f97316", leader_politician_id: "pol-bayrou" }),
  withLogo({ id: "p-rec",  slug: "reconquete",                 name: "Reconquête",                 short_name: "REC",   political_family: "far_right",    color_hex: "#475569", leader_politician_id: "pol-marechal" }),
  withLogo({ id: "p-pcf",  slug: "parti-communiste-francais",  name: "Parti communiste français",  short_name: "PCF",   political_family: "left",         color_hex: "#dc2626", leader_politician_id: "pol-roussel" }),
  withLogo({ id: "p-cen",  slug: "les-centristes",             name: "Les Centristes",             short_name: "LC",    political_family: "center",       color_hex: "#fdba74", leader_politician_id: "pol-morin" }),
  withLogo({ id: "p-fa",   slug: "la-france-audacieuse",       name: "La France audacieuse",       short_name: "LFA",   political_family: "center_right", color_hex: "#7c3aed", leader_politician_id: "pol-bertrand" }),
  withLogo({ id: "p-fac",  slug: "femu-a-corsica",             name: "Femu a Corsica",             short_name: "FaC",   political_family: "regionalist",  color_hex: "#d97706", leader_politician_id: "pol-simeoni" }),
];

export const FUNCTIONS: FunctionDef[] = [
  { id: "f-pres", slug: "president-republique", name: "Président de la République", level: "national_executive" },
  { id: "f-pm", slug: "premier-ministre", name: "Premier ministre", level: "national_executive" },
  { id: "f-min", slug: "ministre", name: "Ministre", level: "national_executive" },
  { id: "f-dep", slug: "depute", name: "Député", level: "national_legislative" },
  { id: "f-pres-an", slug: "president-assemblee", name: "Président de l'Assemblée nationale", level: "national_legislative" },
  { id: "f-eurodep", slug: "eurodepute", name: "Eurodéputé", level: "european" },
  { id: "f-pres-reg", slug: "president-region", name: "Président de région", level: "regional" },
  { id: "f-maire", slug: "maire", name: "Maire", level: "municipal" },
  { id: "f-senateur", slug: "senateur", name: "Sénateur", level: "national_legislative" },
  { id: "f-pres-senat", slug: "president-senat", name: "Président du Sénat", level: "national_legislative" },
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
    photo_url: POLITICIAN_PHOTOS[args.id] ?? null,
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
    func: "f-dep",
    region: "r-idf",
    tier: "P0",
    bio: "Président du groupe Renaissance à l'Assemblée nationale. Ancien Premier ministre (janv.–sept. 2024).",
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
  pol({
    id: "pol-retailleau", slug: "bruno-retailleau", full: "Bruno Retailleau",
    given: "Bruno", family: "Retailleau", year: 1960, gender: "male",
    party: "p-lr", func: "f-min", region: "r-pdl", tier: "P0",
    bio: "Ministre de l'Intérieur. Ancien président du conseil régional des Pays de la Loire.",
    truth: 58, factual: 56, promise: 62, transparency: 55,
    ci: [54, 62], nF: 72, nP: 8,
    topics: { "security": [56, 22], "immigration": [48, 15], "justice": [62, 12] },
  }),
  pol({
    id: "pol-vautrin", slug: "catherine-vautrin", full: "Catherine Vautrin",
    given: "Catherine", family: "Vautrin", year: 1960, gender: "female",
    party: "p-ren", func: "f-min", region: "r-ges", tier: "P0",
    bio: "Ministre du Travail, de la Santé, des Solidarités et des Familles. Députée de la Marne.",
    truth: 64, factual: 66, promise: 60, transparency: 55,
    ci: [60, 68], nF: 58, nP: 7,
    topics: { "social_protection": [68, 16], "health": [62, 12], "employment": [65, 9] },
  }),
  pol({
    id: "pol-dati", slug: "rachida-dati", full: "Rachida Dati",
    given: "Rachida", family: "Dati", year: 1965, gender: "female",
    party: "p-lr", func: "f-min", region: "r-idf", tier: "P0",
    bio: "Ministre de la Culture. Maire du 7e arrondissement de Paris.",
    truth: 53, factual: 54, promise: null, transparency: 45,
    ci: [48, 58], nF: 44, nP: 0,
    topics: { "culture": [58, 12], "justice": [51, 9], "institutions": [54, 6] },
  }),
  pol({
    id: "pol-lecornu", slug: "sebastien-lecornu", full: "Sébastien Lecornu",
    given: "Sébastien", family: "Lecornu", year: 1986, gender: "male",
    party: "p-ren", func: "f-min", region: "r-nor", tier: "P0",
    bio: "Ministre des Armées. Plus jeune ministre de la Cinquième République à sa nomination.",
    truth: 71, factual: 73, promise: 68, transparency: 60,
    ci: [67, 75], nF: 64, nP: 8,
    topics: { "defense": [78, 18], "foreign_policy": [70, 12], "institutions": [68, 6] },
  }),
  pol({
    id: "pol-barrot", slug: "jean-noel-barrot", full: "Jean-Noël Barrot",
    given: "Jean-Noël", family: "Barrot", year: 1983, gender: "male",
    party: "p-mdm", func: "f-min", region: "r-idf", tier: "P0",
    bio: "Ministre de l'Europe et des Affaires étrangères. Député des Yvelines.",
    truth: 73, factual: 75, promise: null, transparency: 65,
    ci: [68, 77], nF: 51, nP: 0,
    topics: { "europe": [78, 16], "foreign_policy": [72, 12], "digital": [70, 8] },
  }),
  pol({
    id: "pol-hidalgo", slug: "anne-hidalgo", full: "Anne Hidalgo",
    given: "Anne", family: "Hidalgo", year: 1959, gender: "female",
    party: "p-ps", func: "f-maire", region: "r-idf", tier: "P0",
    bio: "Maire de Paris depuis 2014.",
    truth: 51, factual: 49, promise: 55, transparency: 45,
    ci: [46, 56], nF: 82, nP: 14,
    topics: { "transport": [58, 22], "ecology_climate": [56, 18], "housing": [42, 16] },
  }),
  pol({
    id: "pol-doucet", slug: "gregory-doucet", full: "Grégory Doucet",
    given: "Grégory", family: "Doucet", year: 1973, gender: "male",
    party: "p-eelv", func: "f-maire", region: "r-ara", tier: "P0",
    bio: "Maire de Lyon depuis 2020.",
    truth: 67, factual: 70, promise: 63, transparency: 60,
    ci: [62, 71], nF: 48, nP: 10,
    topics: { "ecology_climate": [78, 16], "transport": [68, 10], "housing": [60, 9] },
  }),
  pol({
    id: "pol-payan", slug: "benoit-payan", full: "Benoît Payan",
    given: "Benoît", family: "Payan", year: 1978, gender: "male",
    party: "p-ps", func: "f-maire", region: "r-pac", tier: "P0",
    bio: "Maire de Marseille depuis 2020.",
    truth: 62, factual: 63, promise: 60, transparency: 55,
    ci: [57, 67], nF: 52, nP: 11,
    topics: { "education": [66, 14], "housing": [58, 12], "security": [60, 11] },
  }),
  pol({
    id: "pol-hurmic", slug: "pierre-hurmic", full: "Pierre Hurmic",
    given: "Pierre", family: "Hurmic", year: 1956, gender: "male",
    party: "p-eelv", func: "f-maire", region: "r-naq", tier: "P0",
    bio: "Maire de Bordeaux depuis 2020.",
    truth: 65, factual: 68, promise: 61, transparency: 60,
    ci: [60, 69], nF: 44, nP: 9,
    topics: { "ecology_climate": [74, 16], "housing": [62, 9], "transport": [60, 7] },
  }),
  pol({
    id: "pol-rolland", slug: "johanna-rolland", full: "Johanna Rolland",
    given: "Johanna", family: "Rolland", year: 1979, gender: "female",
    party: "p-ps", func: "f-maire", region: "r-pdl", tier: "P0",
    bio: "Maire de Nantes depuis 2014. Présidente de Nantes Métropole.",
    truth: 70, factual: 72, promise: 68, transparency: 60,
    ci: [66, 75], nF: 52, nP: 12,
    topics: { "education": [72, 12], "housing": [68, 11], "transport": [70, 9] },
  }),
  pol({
    id: "pol-barseghian", slug: "jeanne-barseghian", full: "Jeanne Barseghian",
    given: "Jeanne", family: "Barseghian", year: 1980, gender: "female",
    party: "p-eelv", func: "f-maire", region: "r-ges", tier: "P1",
    bio: "Maire de Strasbourg depuis 2020.",
    truth: 66, factual: 68, promise: null, transparency: 60,
    ci: [61, 70], nF: 38, nP: 0,
    topics: { "ecology_climate": [72, 12], "europe": [68, 7], "justice": [64, 5] },
  }),
  pol({
    id: "pol-estrosi", slug: "christian-estrosi", full: "Christian Estrosi",
    given: "Christian", family: "Estrosi", year: 1955, gender: "male",
    party: "p-hor", func: "f-maire", region: "r-pac", tier: "P0",
    bio: "Maire de Nice. Président de la Métropole Nice Côte d'Azur.",
    truth: 58, factual: 56, promise: 63, transparency: 55,
    ci: [54, 62], nF: 68, nP: 10,
    topics: { "security": [62, 18], "transport": [60, 10], "immigration": [48, 8] },
  }),
  pol({
    id: "pol-appere", slug: "nathalie-appere", full: "Nathalie Appéré",
    given: "Nathalie", family: "Appéré", year: 1975, gender: "female",
    party: "p-ps", func: "f-maire", region: "r-bre", tier: "P1",
    bio: "Maire de Rennes depuis 2014.",
    truth: 71, factual: 73, promise: 70, transparency: 60,
    ci: [66, 75], nF: 46, nP: 9,
    topics: { "housing": [72, 12], "education": [74, 9], "ecology_climate": [68, 7] },
  }),
  pol({
    id: "pol-delafosse", slug: "michael-delafosse", full: "Michaël Delafosse",
    given: "Michaël", family: "Delafosse", year: 1977, gender: "male",
    party: "p-ps", func: "f-maire", region: "r-occ", tier: "P1",
    bio: "Maire de Montpellier depuis 2020.",
    truth: 64, factual: 65, promise: 62, transparency: 60,
    ci: [59, 68], nF: 42, nP: 8,
    topics: { "housing": [62, 11], "education": [68, 7], "security": [62, 6] },
  }),
  pol({
    id: "pol-lisnard", slug: "david-lisnard", full: "David Lisnard",
    given: "David", family: "Lisnard", year: 1969, gender: "male",
    party: "p-lr", func: "f-maire", region: "r-pac", tier: "P1",
    bio: "Maire de Cannes. Président de l'Association des maires de France.",
    truth: 60, factual: 58, promise: 64, transparency: 55,
    ci: [55, 64], nF: 51, nP: 8,
    topics: { "institutions": [66, 12], "security": [58, 10], "culture": [60, 6] },
  }),
  pol({
    id: "pol-pecresse", slug: "valerie-pecresse", full: "Valérie Pécresse",
    given: "Valérie", family: "Pécresse", year: 1967, gender: "female",
    party: "p-lr", func: "f-pres-reg", region: "r-idf", tier: "P0",
    bio: "Présidente du conseil régional d'Île-de-France depuis 2015.",
    truth: 63, factual: 62, promise: 66, transparency: 55,
    ci: [58, 67], nF: 78, nP: 12,
    topics: { "transport": [68, 20], "economy": [62, 14], "security": [60, 10] },
  }),
  pol({
    id: "pol-bertrand", slug: "xavier-bertrand", full: "Xavier Bertrand",
    given: "Xavier", family: "Bertrand", year: 1965, gender: "male",
    party: "p-fa", func: "f-pres-reg", region: "r-hdf", tier: "P0",
    bio: "Président du conseil régional des Hauts-de-France depuis 2016.",
    truth: 65, factual: 63, promise: 70, transparency: 55,
    ci: [61, 69], nF: 82, nP: 14,
    topics: { "employment": [72, 18], "security": [60, 12], "transport": [68, 11] },
  }),
  pol({
    id: "pol-delga", slug: "carole-delga", full: "Carole Delga",
    given: "Carole", family: "Delga", year: 1971, gender: "female",
    party: "p-ps", func: "f-pres-reg", region: "r-occ", tier: "P0",
    bio: "Présidente du conseil régional d'Occitanie depuis 2016.",
    truth: 70, factual: 72, promise: 68, transparency: 60,
    ci: [66, 74], nF: 68, nP: 12,
    topics: { "economy": [72, 15], "ecology_climate": [68, 12], "transport": [72, 11] },
  }),
  pol({
    id: "pol-muselier", slug: "renaud-muselier", full: "Renaud Muselier",
    given: "Renaud", family: "Muselier", year: 1959, gender: "male",
    party: "p-ren", func: "f-pres-reg", region: "r-pac", tier: "P0",
    bio: "Président du conseil régional Provence-Alpes-Côte d'Azur depuis 2017.",
    truth: 60, factual: 58, promise: 64, transparency: 55,
    ci: [55, 64], nF: 58, nP: 10,
    topics: { "transport": [64, 12], "ecology_climate": [58, 9], "security": [58, 9] },
  }),
  pol({
    id: "pol-morancais", slug: "christelle-morancais", full: "Christelle Morançais",
    given: "Christelle", family: "Morançais", year: 1976, gender: "female",
    party: "p-hor", func: "f-pres-reg", region: "r-pdl", tier: "P1",
    bio: "Présidente du conseil régional des Pays de la Loire depuis 2017.",
    truth: 66, factual: 68, promise: 65, transparency: 60,
    ci: [62, 70], nF: 44, nP: 8,
    topics: { "education": [70, 12], "transport": [68, 8], "employment": [64, 7] },
  }),
  pol({
    id: "pol-rousset", slug: "alain-rousset", full: "Alain Rousset",
    given: "Alain", family: "Rousset", year: 1951, gender: "male",
    party: "p-ps", func: "f-pres-reg", region: "r-naq", tier: "P0",
    bio: "Président du conseil régional de Nouvelle-Aquitaine depuis 1998.",
    truth: 72, factual: 74, promise: 72, transparency: 65,
    ci: [68, 76], nF: 72, nP: 14,
    topics: { "research": [78, 16], "economy": [70, 12], "ecology_climate": [68, 9] },
  }),
  pol({
    id: "pol-morin", slug: "herve-morin", full: "Hervé Morin",
    given: "Hervé", family: "Morin", year: 1961, gender: "male",
    party: "p-cen", func: "f-pres-reg", region: "r-nor", tier: "P1",
    bio: "Président du conseil régional de Normandie depuis 2016. Ancien ministre de la Défense.",
    truth: 61, factual: 60, promise: 63, transparency: 55,
    ci: [56, 65], nF: 48, nP: 10,
    topics: { "defense": [68, 12], "transport": [60, 9], "employment": [58, 7] },
  }),
  pol({
    id: "pol-simeoni", slug: "gilles-simeoni", full: "Gilles Simeoni",
    given: "Gilles", family: "Simeoni", year: 1967, gender: "male",
    party: "p-fac", func: "f-pres-reg", region: "r-cor", tier: "P1",
    bio: "Président du conseil exécutif de Corse depuis 2015.",
    truth: 67, factual: 68, promise: 66, transparency: 60,
    ci: [62, 71], nF: 42, nP: 9,
    topics: { "institutions": [70, 14], "culture": [68, 7], "ecology_climate": [64, 6] },
  }),
  pol({
    id: "pol-panot", slug: "mathilde-panot", full: "Mathilde Panot",
    given: "Mathilde", family: "Panot", year: 1989, gender: "female",
    party: "p-lfi", func: "f-dep", region: "r-idf", tier: "P0",
    bio: "Présidente du groupe LFI à l'Assemblée nationale. Députée du Val-de-Marne.",
    truth: 54, factual: 52, promise: null, transparency: 55,
    ci: [49, 58], nF: 68, nP: 0,
    topics: { "social_protection": [58, 16], "ecology_climate": [56, 12], "foreign_policy": [50, 10] },
  }),
  pol({
    id: "pol-chatelain", slug: "cyrielle-chatelain", full: "Cyrielle Chatelain",
    given: "Cyrielle", family: "Chatelain", year: 1991, gender: "female",
    party: "p-eelv", func: "f-dep", region: "r-ara", tier: "P0",
    bio: "Présidente du groupe écologiste à l'Assemblée nationale. Députée de l'Isère.",
    truth: 72, factual: 75, promise: null, transparency: 65,
    ci: [68, 77], nF: 42, nP: 0,
    topics: { "ecology_climate": [78, 14], "social_protection": [70, 9], "justice": [72, 6] },
  }),
  pol({
    id: "pol-vallaud", slug: "boris-vallaud", full: "Boris Vallaud",
    given: "Boris", family: "Vallaud", year: 1975, gender: "male",
    party: "p-ps", func: "f-dep", region: "r-naq", tier: "P0",
    bio: "Président du groupe socialiste à l'Assemblée nationale. Député des Landes.",
    truth: 68, factual: 70, promise: null, transparency: 60,
    ci: [63, 72], nF: 46, nP: 0,
    topics: { "social_protection": [72, 14], "fiscal_policy": [68, 9], "employment": [66, 8] },
  }),
  pol({
    id: "pol-fesneau", slug: "marc-fesneau", full: "Marc Fesneau",
    given: "Marc", family: "Fesneau", year: 1971, gender: "male",
    party: "p-mdm", func: "f-dep", region: "r-cvl", tier: "P0",
    bio: "Président du groupe Démocrate à l'Assemblée nationale. Ancien ministre de l'Agriculture.",
    truth: 67, factual: 68, promise: 66, transparency: 60,
    ci: [62, 71], nF: 58, nP: 9,
    topics: { "agriculture": [72, 15], "institutions": [66, 8], "economy": [64, 7] },
  }),
  pol({
    id: "pol-marcangeli", slug: "laurent-marcangeli", full: "Laurent Marcangeli",
    given: "Laurent", family: "Marcangeli", year: 1980, gender: "male",
    party: "p-hor", func: "f-dep", region: "r-cor", tier: "P1",
    bio: "Président du groupe Horizons à l'Assemblée nationale. Député de Corse-du-Sud.",
    truth: 63, factual: 64, promise: null, transparency: 55,
    ci: [58, 67], nF: 40, nP: 0,
    topics: { "economy": [66, 11], "employment": [62, 8], "institutions": [60, 5] },
  }),
  pol({
    id: "pol-larcher", slug: "gerard-larcher", full: "Gérard Larcher",
    given: "Gérard", family: "Larcher", year: 1949, gender: "male",
    party: "p-lr", func: "f-pres-senat", region: "r-idf", tier: "P0",
    bio: "Président du Sénat. Une des plus longues carrières institutionnelles en cours.",
    truth: 75, factual: 78, promise: null, transparency: 65,
    ci: [71, 79], nF: 58, nP: 0,
    topics: { "institutions": [82, 14], "defense": [74, 9], "foreign_policy": [72, 7] },
  }),
  pol({
    id: "pol-kanner", slug: "patrick-kanner", full: "Patrick Kanner",
    given: "Patrick", family: "Kanner", year: 1957, gender: "male",
    party: "p-ps", func: "f-senateur", region: "r-hdf", tier: "P1",
    bio: "Président du groupe socialiste au Sénat. Sénateur du Nord, ancien ministre.",
    truth: 66, factual: 67, promise: null, transparency: 60,
    ci: [61, 70], nF: 42, nP: 0,
    topics: { "social_protection": [70, 12], "education": [66, 8], "institutions": [62, 6] },
  }),
  pol({
    id: "pol-bellamy", slug: "francois-xavier-bellamy", full: "François-Xavier Bellamy",
    given: "François-Xavier", family: "Bellamy", year: 1985, gender: "male",
    party: "p-lr", func: "f-eurodep", region: "r-idf", tier: "P0",
    bio: "Eurodéputé. Tête de liste LR aux européennes 2019 et 2024.",
    truth: 71, factual: 74, promise: null, transparency: 60,
    ci: [66, 76], nF: 51, nP: 0,
    topics: { "europe": [78, 16], "culture": [72, 8], "education": [70, 7] },
  }),
  pol({
    id: "pol-glucksmann", slug: "raphael-glucksmann", full: "Raphaël Glucksmann",
    given: "Raphaël", family: "Glucksmann", year: 1979, gender: "male",
    party: "p-ps", func: "f-eurodep", region: "r-idf", tier: "P0",
    bio: "Eurodéputé. Co-fondateur de Place publique, allié au Parti socialiste.",
    truth: 68, factual: 70, promise: null, transparency: 60,
    ci: [63, 72], nF: 58, nP: 0,
    topics: { "europe": [74, 14], "foreign_policy": [72, 10], "social_protection": [64, 7] },
  }),
  pol({
    id: "pol-hayer", slug: "valerie-hayer", full: "Valérie Hayer",
    given: "Valérie", family: "Hayer", year: 1986, gender: "female",
    party: "p-ren", func: "f-eurodep", region: "r-pdl", tier: "P0",
    bio: "Eurodéputée. Présidente du groupe Renew Europe au Parlement européen.",
    truth: 67, factual: 68, promise: null, transparency: 60,
    ci: [62, 71], nF: 44, nP: 0,
    topics: { "europe": [72, 12], "fiscal_policy": [66, 8], "ecology_climate": [64, 6] },
  }),
  pol({
    id: "pol-toussaint", slug: "marie-toussaint", full: "Marie Toussaint",
    given: "Marie", family: "Toussaint", year: 1987, gender: "female",
    party: "p-eelv", func: "f-eurodep", region: "r-idf", tier: "P0",
    bio: "Eurodéputée. Tête de liste EELV aux européennes 2024.",
    truth: 70, factual: 73, promise: null, transparency: 65,
    ci: [65, 74], nF: 42, nP: 0,
    topics: { "ecology_climate": [78, 14], "europe": [70, 9], "justice": [68, 7] },
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
