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

export function decodeEntities(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
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
};

// Tiny RSS parser : grabs <item> blocks and their child fields.
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
