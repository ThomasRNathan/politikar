// Voyage AI embeddings. Free tier covers 50M tokens/mo — far above our
// MVP volume. We use `voyage-3-large` for its strong French performance.
//
// API : POST https://api.voyageai.com/v1/embeddings with bearer auth.
// Doc : https://docs.voyageai.com/reference/embeddings-api

const VOYAGE_API = "https://api.voyageai.com/v1/embeddings";

export type EmbedInputType = "query" | "document";

export type EmbedResult = {
  embeddings: number[][];
  total_tokens: number;
};

export async function embed(
  texts: string[],
  opts: { model?: string; inputType?: EmbedInputType } = {},
): Promise<EmbedResult> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is missing or empty.");
  const model = opts.model ?? process.env.VOYAGE_MODEL ?? "voyage-3-large";
  const inputType = opts.inputType ?? "document";

  const r = await fetch(VOYAGE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
      input_type: inputType,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(
      `Voyage embed failed (${r.status}): ${body.slice(0, 200)}`,
    );
  }
  const json = (await r.json()) as {
    data: { embedding: number[] }[];
    usage: { total_tokens: number };
  };
  return {
    embeddings: json.data.map((d) => d.embedding),
    total_tokens: json.usage.total_tokens,
  };
}

export async function embedOne(
  text: string,
  opts: { inputType?: EmbedInputType } = {},
): Promise<number[]> {
  const r = await embed([text], opts);
  return r.embeddings[0];
}

// Format a vector for direct interpolation in a Postgres `vector(N)`
// column. pgvector expects a JSON-array-like string : '[1.23, 4.56, ...]'.
export function pgVectorLiteral(v: number[]): string {
  return "[" + v.map((x) => Number(x).toFixed(6)).join(",") + "]";
}
