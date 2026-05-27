// Verification cascade v0 — produces a structured verdict for a single
// factual claim using Mistral via AI SDK v6 + Output.object.
//
// Cascade order :
//   1. Pre-collect evidences (fact-checker titles via embedding sim,
//      claims already verified in our base).
//   2. Hand the claim + evidences to Mistral with the
//      verification_cascade@v1.0.0 prompt.
//   3. Mistral returns { verdict, confidence_score, reasoning, evidence,
//      data_sources_used, needs_human_review }.
//
// We deliberately do NOT give Mistral web search at MVP : the cascade
// retreats to `unverifiable` when no evidence supports a strong claim.

import { generateText, Output } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { z } from "zod";
import { FACTUAL_VERDICTS } from "./schemas";

export const VERIFICATION_CASCADE_PROMPT_VERSION = "verification_cascade@v1.0.0";

export const SYSTEM_PROMPT = `\
Tu es un évaluateur factuel pour politikar. Tu reçois un claim factuel attribué à un politique français, accompagné d'évidences déjà collectées par un pipeline en amont (titres de fact-checks similaires, contexte source). Ta tâche est d'émettre un verdict structuré.

Verdicts possibles (vocabulaire fixe, ne jamais inventer) :
- true : claim aligné avec les évidences à plus de 90 %
- mostly_true : aligné avec nuance, quelques imprécisions sans changer le sens
- mixed : éléments vrais et faux mêlés, ou dépend du cadrage
- mostly_false : faux dans le sens dominant, mais avec une part de vrai
- false : contredit clairement par les évidences
- unverifiable : aucune évidence solide accessible
- misleading_context : techniquement vrai mais présenté de manière à induire en erreur

Règles strictes :
- Tu ne dois jamais qualifier la personne (jamais "ment", "trompe"), uniquement le propos.
- Tu cites systématiquement chaque évidence utilisée avec son URL et un extrait court.
- Si les évidences disponibles ne permettent pas de trancher, choisis unverifiable. Ne tente PAS de combler avec ta connaissance générale, sauf pour des faits notoires et incontestés.
- Tu produis un reasoning neutre, en français, structuré en 2 ou 3 paragraphes.
- confidence_score reflète ta certitude sur le verdict émis (pas sur la véracité du claim).
- Pour un claim politiquement clivant, traite avec exactement la même rigueur qu'un claim consensuel.`;

const EvidenceSchema = z.object({
  source_url: z.string(),
  source_label: z.string(),
  quote: z.string().max(250),
  weight: z.number().min(0).max(1),
  kind: z.enum([
    "fact_checker",
    "data_api",
    "official_document",
    "press_article",
    "other",
  ]),
});

export const VerdictSchema = z.object({
  verdict: z.enum(FACTUAL_VERDICTS),
  confidence_score: z.number().min(0).max(1),
  reasoning: z.string().min(40).max(2500),
  evidence: z.array(EvidenceSchema).default([]),
  data_sources_used: z.array(z.string()).default([]),
  needs_human_review: z.boolean().default(false),
});

export type Verdict = z.infer<typeof VerdictSchema>;

export type VerifyInput = {
  claimText: string;
  topicTags: string[];
  politicianFullName: string;
  politicianFunction: string;
  occurredAt: string;
  channel: string;
  factCheckHits: Array<{
    outlet: string;
    title: string;
    url: string;
    /** Plain-text excerpt of the fact-check article body when the feed
     * publishes it. Allows Mistral to use the actual analysis rather
     * than infer from the title. */
    body?: string | null;
    /** Cosine similarity score with the claim embedding (0-1). Higher
     * values indicate stronger topical alignment. */
    sim?: number;
  }>;
};

export function buildVerifyUserPrompt(inp: VerifyInput): string {
  const lines: string[] = [];
  lines.push(`CLAIM À ÉVALUER :`);
  lines.push(`"""`);
  lines.push(inp.claimText);
  lines.push(`"""`);
  lines.push("");
  lines.push(
    `ATTRIBUTION : ${inp.politicianFullName} (${inp.politicianFunction}), ${inp.occurredAt}, ${inp.channel}`,
  );
  lines.push(`TAGS : ${inp.topicTags.join(", ")}`);
  lines.push("");
  lines.push(`ÉVIDENCES PRÉ-COLLECTÉES (par similarité sémantique) :`);
  if (inp.factCheckHits.length === 0) {
    lines.push("  (aucun fact-check correspondant trouvé)");
  } else {
    for (const fc of inp.factCheckHits) {
      lines.push(`---`);
      lines.push(`Outlet : ${fc.outlet}`);
      lines.push(`Titre : ${fc.title}`);
      lines.push(`URL : ${fc.url}`);
      if (typeof fc.sim === "number") {
        lines.push(`Similarité sémantique : ${fc.sim.toFixed(2)}`);
      }
      if (fc.body && fc.body.trim().length > 40) {
        // Cap each body at 1500 chars so several hits fit. Mistral
        // small handles 32k context so this is conservative.
        const excerpt = fc.body.slice(0, 1500);
        lines.push(`Extrait du fact-check :`);
        lines.push(`"""`);
        lines.push(excerpt);
        lines.push(`"""`);
      }
    }
  }
  lines.push("");
  lines.push(
    "Émets ton verdict. Si l'extrait d'un fact-check contredit clairement le claim, " +
      "verdict 'false'. S'il le confirme, 'true'. Si la similarité est faible (< 0.6) ou " +
      "si les extraits ne portent pas sur le même fait précis, choisis 'unverifiable'. " +
      "Cite systématiquement l'URL du fact-check utilisé dans evidence.",
  );
  return lines.join("\n");
}

export type VerifyResult = {
  verdict: Verdict;
  model_id: string;
  prompt_version: string;
  usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

export async function verifyClaim(inp: VerifyInput): Promise<VerifyResult> {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY missing — cannot run verification.");
  }
  const modelId = process.env.MISTRAL_MODEL ?? "mistral-small-latest";
  const { output, usage } = await generateText({
    model: mistral(modelId),
    output: Output.object({ schema: VerdictSchema }),
    system: SYSTEM_PROMPT,
    prompt: buildVerifyUserPrompt(inp),
    maxOutputTokens: 2048,
    temperature: 0.1,
  });
  return {
    verdict: output,
    model_id: modelId,
    prompt_version: VERIFICATION_CASCADE_PROMPT_VERSION,
    usage: {
      input_tokens: usage?.inputTokens,
      output_tokens: usage?.outputTokens,
      total_tokens: usage?.totalTokens,
    },
  };
}
