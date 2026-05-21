// Claim extraction via AI SDK v6 + Mistral. Stable on the Mistral
// La Plateforme free tier (mistral-small-latest, ~1 req/sec rate-limit).
// Falls through to Anthropic Claude when MISTRAL_API_KEY is unset.
//
// Prompt = claim_extraction@v1.0.0 (cf. PROMPTS.md).

import { generateText, Output } from "ai";
import { mistral } from "@ai-sdk/mistral";
import { ExtractionResultSchema, type ExtractionResult } from "./schemas";

export const CLAIM_EXTRACTION_PROMPT_VERSION = "claim_extraction@v1.0.0";

export const SYSTEM_PROMPT = `\
Tu es un assistant éditorial pour politikar, une plateforme open-source d'analyse de la véracité du discours politique français. Ta tâche est d'extraire des claims (énoncés vérifiables) à partir d'un texte source produit par un homme ou une femme politique français.

Définition d'un claim :
- une assertion factuelle (chiffres, événements, citations)
- une promesse (engagement à faire, ne pas faire, ou obtenir un résultat)
- une opinion structurée
- une prédiction
- un énoncé normatif explicite

Un claim est atomique : un énoncé = une idée vérifiable. Si une phrase contient deux idées, produis deux claims.

N'extrais PAS :
- les questions rhétoriques sans contenu vérifiable
- les formules de politesse, remerciements, transitions
- les références procédurales ("je laisse la parole à")
- les énoncés purement émotionnels sans contenu vérifiable

Pour chaque claim, fournis le texte verbatim (claim_text), une version normalisée (claim_normalized), le type, les tags thématiques, les valeurs numériques mentionnées (avec unité et période), les entités nommées, le contexte (200 caractères avant et après) et une confiance d'extraction entre 0 et 1.

Garde-fous :
- neutralité partisane stricte
- jamais d'attaque personnelle, qualifie le propos uniquement
- vocabulaire contraint, pas d'invention de catégorie

Si le texte ne contient aucun claim utile, retourne { "claims": [] }.`;

export type ExtractionInput = {
  politicianFullName: string;
  politicianFunction: string;
  politicianParty: string;
  occurredAt: string;
  channel: string;
  sourceType: string;
  text: string;
};

export function buildUserPrompt(inp: ExtractionInput): string {
  return [
    `ORATEUR : ${inp.politicianFullName} (${inp.politicianFunction}, ${inp.politicianParty})`,
    `DATE : ${inp.occurredAt}`,
    `CANAL : ${inp.channel}`,
    `TYPE DE SOURCE : ${inp.sourceType}`,
    "",
    "TEXTE SOURCE :",
    '"""',
    inp.text,
    '"""',
    "",
    "Extrais les claims selon les règles ci-dessus. Si rien de vérifiable, retourne { \"claims\": [] }.",
  ].join("\n");
}

export type ExtractClaimsResult = {
  output: ExtractionResult;
  model_id: string;
  prompt_version: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

export async function extractClaims(
  inp: ExtractionInput,
  opts: { model?: string } = {},
): Promise<ExtractClaimsResult> {
  const modelId = opts.model || process.env.MISTRAL_MODEL || "mistral-small-latest";

  // Mistral is the configured provider via MISTRAL_API_KEY. The
  // @ai-sdk/mistral provider reads the key from env automatically.
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error(
      "MISTRAL_API_KEY is not set or empty. Add it via the Vercel " +
        "dashboard (Project → Settings → Environment Variables), apply " +
        "to Production+Preview+Development, then `vercel env pull " +
        ".env.local --yes`.",
    );
  }

  const { output, usage } = await generateText({
    model: mistral(modelId),
    output: Output.object({ schema: ExtractionResultSchema }),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(inp),
    maxOutputTokens: 4096,
    temperature: 0.1,
  });

  return {
    output,
    model_id: modelId,
    prompt_version: CLAIM_EXTRACTION_PROMPT_VERSION,
    usage: {
      input_tokens: usage?.inputTokens,
      output_tokens: usage?.outputTokens,
      total_tokens: usage?.totalTokens,
    },
  };
}
