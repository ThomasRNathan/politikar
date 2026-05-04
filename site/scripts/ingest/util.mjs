// Shared utilities for ingestion connectors.

export const UA =
  "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)";

const decoder = new TextDecoder("utf-8");

export async function fetchText(url, opts = {}) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: opts.accept ?? "*/*",
      ...opts.headers,
    },
  });
  if (!r.ok) {
    throw new Error(`fetch ${url} → HTTP ${r.status}`);
  }
  const buf = await r.arrayBuffer();
  return decoder.decode(new Uint8Array(buf));
}

export async function fetchJson(url, opts = {}) {
  const text = await fetchText(url, opts);
  return JSON.parse(text);
}

export function decodeEntities(s) {
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

// Tiny RSS parser: grabs <item> blocks and their child fields.
export function parseRss(xml) {
  const items = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  const fieldRegex = (name) =>
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  let m;
  while ((m = itemRegex.exec(xml))) {
    const body = m[1];
    const get = (name) => {
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

export function isoDate(rfc822) {
  if (!rfc822) return null;
  const d = new Date(rfc822);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function sha256Short(s) {
  // Deterministic short id from input.
  let h = 0n;
  for (const c of s) {
    h = (h * 1099511628211n + BigInt(c.charCodeAt(0))) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0").slice(0, 12);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
