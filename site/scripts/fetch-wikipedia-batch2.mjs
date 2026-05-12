// Fetch Wikipedia thumbnails for the 34 additional politicians + 3 new
// party logos. Output JSON to stdout.

const POLITICIANS = [
  // Government
  ["pol-retailleau",       "Bruno Retailleau"],
  ["pol-vautrin",          "Catherine Vautrin"],
  ["pol-dati",             "Rachida Dati"],
  ["pol-lecornu",          "Sébastien Lecornu"],
  ["pol-barrot",           "Jean-Noël Barrot"],
  // Mayors of major cities
  ["pol-hidalgo",          "Anne Hidalgo"],
  ["pol-doucet",           "Grégory Doucet"],
  ["pol-payan",            "Benoît Payan"],
  ["pol-hurmic",           "Pierre Hurmic"],
  ["pol-rolland",          "Johanna Rolland"],
  ["pol-barseghian",       "Jeanne Barseghian"],
  ["pol-estrosi",          "Christian Estrosi"],
  ["pol-appere",           "Nathalie Appéré"],
  ["pol-delafosse",        "Michaël Delafosse"],
  ["pol-lisnard",          "David Lisnard"],
  // Regional presidents
  ["pol-pecresse",         "Valérie Pécresse"],
  ["pol-bertrand",         "Xavier Bertrand"],
  ["pol-delga",            "Carole Delga"],
  ["pol-muselier",         "Renaud Muselier"],
  ["pol-morancais",        "Christelle Morançais"],
  ["pol-rousset",          "Alain Rousset (homme politique)"],
  ["pol-morin",            "Hervé Morin"],
  ["pol-simeoni",          "Gilles Simeoni"],
  // Parliamentary group leaders + Sénat
  ["pol-panot",            "Mathilde Panot"],
  ["pol-chatelain",        "Cyrielle Chatelain"],
  ["pol-vallaud",          "Boris Vallaud"],
  ["pol-fesneau",          "Marc Fesneau"],
  ["pol-marcangeli",       "Laurent Marcangeli"],
  ["pol-larcher",          "Gérard Larcher"],
  ["pol-kanner",           "Patrick Kanner"],
  // MEPs
  ["pol-bellamy",          "François-Xavier Bellamy"],
  ["pol-glucksmann",       "Raphaël Glucksmann"],
  ["pol-hayer",            "Valérie Hayer"],
  ["pol-toussaint",        "Marie Toussaint (femme politique)"],
];

const PARTIES = [
  ["p-cen",  "Les Centristes (parti politique)"],
  ["p-fa",   "La France audacieuse"],
  ["p-fac",  "Femu a Corsica"],
];

async function fetchThumb(title, size = 500) {
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
      "User-Agent": "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)",
    },
  });
  const j = await r.json();
  const page = j?.query?.pages?.[0];
  return page?.thumbnail?.source ?? null;
}

const out = { politicians: {}, parties: {} };

for (const [id, title] of POLITICIANS) {
  try {
    const thumb = await fetchThumb(title, 500);
    out.politicians[id] = { title, thumb };
  } catch (e) {
    out.politicians[id] = { title, thumb: null, error: e.message };
  }
  await new Promise((r) => setTimeout(r, 300));
}
for (const [id, title] of PARTIES) {
  try {
    const thumb = await fetchThumb(title, 400);
    out.parties[id] = { title, thumb };
  } catch (e) {
    out.parties[id] = { title, thumb: null, error: e.message };
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.log(JSON.stringify(out, null, 2));
