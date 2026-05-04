// Fetches thumbnail URLs from fr.wikipedia.org for our politicians and parties.
// Outputs JSON to stdout.

const POLITICIANS = [
  ["pol-macron",       "Emmanuel Macron"],
  ["pol-attal",        "Gabriel Attal"],
  ["pol-le-pen",       "Marine Le Pen"],
  ["pol-bardella",     "Jordan Bardella"],
  ["pol-melenchon",    "Jean-Luc Mélenchon"],
  ["pol-philippe",     "Édouard Philippe"],
  ["pol-bayrou",       "François Bayrou"],
  ["pol-marechal",     "Marion Maréchal"],
  ["pol-faure",        "Olivier Faure"],
  ["pol-tondelier",    "Marine Tondelier"],
  ["pol-roussel",      "Fabien Roussel"],
  ["pol-wauquiez",     "Laurent Wauquiez"],
  ["pol-borne",        "Élisabeth Borne"],
  ["pol-le-maire",     "Bruno Le Maire"],
  ["pol-aubry",        "Manon Aubry"],
  ["pol-braun-pivet",  "Yaël Braun-Pivet"],
];

const PARTIES = [
  ["p-ren",  "Renaissance (parti politique)"],
  ["p-rn",   "Rassemblement national"],
  ["p-lfi",  "La France insoumise"],
  ["p-lr",   "Les Républicains"],
  ["p-ps",   "Parti socialiste (France)"],
  ["p-eelv", "Les Écologistes (France)"],
  ["p-hor",  "Horizons (parti politique)"],
  ["p-mdm",  "Mouvement démocrate (France)"],
  ["p-rec",  "Reconquête (parti politique)"],
  ["p-pcf",  "Parti communiste français"],
];

async function fetchThumb(title, size = 400) {
  const url = new URL("https://fr.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("format", "json");
  url.searchParams.set("pithumbsize", String(size));
  url.searchParams.set("redirects", "1");
  url.searchParams.set("formatversion", "2");
  const r = await fetch(url, {
    headers: {
      "User-Agent": "politikar/0.1 (+https://politikar.vercel.app)",
    },
  });
  const j = await r.json();
  const page = j?.query?.pages?.[0];
  return page?.thumbnail?.source ?? null;
}

const out = { politicians: {}, parties: {} };

for (const [id, title] of POLITICIANS) {
  const thumb = await fetchThumb(title, 400);
  out.politicians[id] = { title, thumb };
  await new Promise((r) => setTimeout(r, 80));
}
for (const [id, title] of PARTIES) {
  const thumb = await fetchThumb(title, 400);
  out.parties[id] = { title, thumb };
  await new Promise((r) => setTimeout(r, 80));
}

console.log(JSON.stringify(out, null, 2));
