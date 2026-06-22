// Shared utilities for the ingestion connectors. Pure functions, no
// platform dependencies — runs identically in a Node script, an Edge
// runtime, or a Node.js Vercel Function.

export const UA =
  "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)";

const decoder = new TextDecoder("utf-8");

export type FetchOptions = {
  accept?: string;
  headers?: Record<string, string>;
};

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: opts.accept ?? "*/*",
      ...opts.headers,
    },
    // Avoid Next.js automatic caching: each ingestion run wants fresh data.
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`fetch ${url} → HTTP ${r.status}`);
  }
  const buf = await r.arrayBuffer();
  return decoder.decode(new Uint8Array(buf));
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchOptions = {},
): Promise<T> {
  const text = await fetchText(url, opts);
  return JSON.parse(text) as T;
}

// Named HTML entities we expect to encounter on Élysée / Matignon pages.
// Not exhaustive — covers French accented characters, common punctuation,
// and the typographic quotes commonly used in French presidential prose.
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  // Accented lowercase
  aacute: "á",
  acirc: "â",
  agrave: "à",
  aelig: "æ",
  atilde: "ã",
  auml: "ä",
  ccedil: "ç",
  eacute: "é",
  ecirc: "ê",
  egrave: "è",
  euml: "ë",
  iacute: "í",
  icirc: "î",
  igrave: "ì",
  iuml: "ï",
  oacute: "ó",
  ocirc: "ô",
  ograve: "ò",
  oslash: "ø",
  otilde: "õ",
  ouml: "ö",
  szlig: "ß",
  uacute: "ú",
  ucirc: "û",
  ugrave: "ù",
  uuml: "ü",
  yacute: "ý",
  yuml: "ÿ",
  // Accented uppercase
  Aacute: "Á",
  Acirc: "Â",
  Agrave: "À",
  AElig: "Æ",
  Atilde: "Ã",
  Auml: "Ä",
  Ccedil: "Ç",
  Eacute: "É",
  Ecirc: "Ê",
  Egrave: "È",
  Euml: "Ë",
  Iacute: "Í",
  Icirc: "Î",
  Igrave: "Ì",
  Iuml: "Ï",
  Oacute: "Ó",
  Ocirc: "Ô",
  Ograve: "Ò",
  Oslash: "Ø",
  Otilde: "Õ",
  Ouml: "Ö",
  Uacute: "Ú",
  Ucirc: "Û",
  Ugrave: "Ù",
  Uuml: "Ü",
  // Punctuation / typography
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  cent: "¢",
  sect: "§",
  para: "¶",
  middot: "·",
  bull: "•",
  deg: "°",
};

export function decodeEntities(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m)
    .trim();
}

export type RssItem = {
  title: string | null;
  description: string | null;
  link: string | null;
  guid: string | null;
  pubDate: string | null;
  author: string | null;
  category: string | null;
  // <content:encoded> from RSS 1.0 content module — full article body
  // when the feed publishes it (Surligneurs, Le Monde, etc.). Strip
  // HTML before persisting.
  contentEncoded: string | null;
};

/**
 * Strip HTML tags and normalise whitespace to readable plain text.
 * Used both for feed content:encoded bodies and for article body
 * scraping. Keeps paragraph breaks ; drops `<script>`, `<style>`, and
 * navigation classes.
 */
export function htmlToPlainText(html: string): string {
  let s = html;
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<(p|h\d|li|br)[^>]*>/gi, "\n");
  s = s.replace(/<\/(p|h\d|li|div)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
  return s;
}

// Tiny RSS parser : grabs <item> blocks and their child fields,
// including <content:encoded> (RSS Content module).
export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  const fieldRegex = (name: string) =>
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml))) {
    const body = m[1];
    const get = (name: string): string | null => {
      const r = body.match(fieldRegex(name));
      if (!r) return null;
      const raw = r[1].trim();
      const cdata = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
      return decodeEntities(cdata ? cdata[1].trim() : raw);
    };
    items.push({
      title: get("title"),
      description: get("description"),
      link: get("link"),
      guid: get("guid"),
      pubDate: get("pubDate"),
      author: get("author") ?? get("dc:creator"),
      category: get("category"),
      contentEncoded: get("content:encoded"),
    });
  }
  return items;
}

export function isoDate(rfc822: string | null | undefined): string | null {
  if (!rfc822) return null;
  const d = new Date(rfc822);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function sha256Short(s: string): string {
  // Deterministic short id from input. FNV-1a 32-bit variant, doubled
  // for a 12-char hex output. Not cryptographic, just stable.
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul((h1 ^ c) >>> 0, 0x01000193) >>> 0;
    h2 = Math.imul((h2 ^ c) >>> 0, 0x85ebca6b) >>> 0;
  }
  const hex1 = h1.toString(16).padStart(8, "0");
  const hex2 = h2.toString(16).padStart(8, "0");
  return (hex1 + hex2).slice(0, 12);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Case-insensitive whole-word test for a name inside free text. Plain
 * `String.includes` is unsafe for short family names ("Rist" matches
 * "touriste") ; this anchors the pattern between non-letter boundaries,
 * Unicode-aware so accented French letters count as letters.
 */
export function containsName(haystack: string, name: string): boolean {
  const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu");
  return re.test(haystack);
}
