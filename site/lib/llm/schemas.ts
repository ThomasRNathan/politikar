// Zod schemas for the LLM tool outputs. Used both by the AI SDK
// generateText({ output: Output.object({ schema }) }) calls and by the
// TypeScript types throughout the extraction pipeline.

import { z } from "zod";

export const CLAIM_TYPES = [
  "factual_assertion",
  "promise",
  "opinion",
  "rhetorical",
  "prediction",
  "normative_statement",
] as const;

export const TOPIC_TAGS = [
  "economy",
  "employment",
  "fiscal_policy",
  "public_debt",
  "security",
  "justice",
  "immigration",
  "health",
  "education",
  "ecology_climate",
  "energy",
  "agriculture",
  "housing",
  "foreign_policy",
  "europe",
  "defense",
  "institutions",
  "social_protection",
  "culture",
  "digital",
  "transport",
  "research",
  "other",
] as const;

export const FACTUAL_VERDICTS = [
  "true",
  "mostly_true",
  "mixed",
  "mostly_false",
  "false",
  "unverifiable",
  "misleading_context",
] as const;

export const NumericValueSchema = z.object({
  value: z.number(),
  unit: z.string(),
  period: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
});

export const NamedEntitySchema = z.object({
  text: z.string(),
  type: z.enum([
    "person",
    "organization",
    "location",
    "date",
    "law",
    "concept",
  ]),
});

export const ClaimSchema = z.object({
  claim_text: z.string().min(1),
  claim_normalized: z.string().min(1),
  claim_type: z.enum(CLAIM_TYPES),
  topic_tags: z.array(z.enum(TOPIC_TAGS)).min(1),
  numeric_values: z.array(NumericValueSchema).optional().default([]),
  named_entities: z.array(NamedEntitySchema).optional().default([]),
  context_window: z.string().nullable().optional(),
  extraction_confidence: z.number().min(0).max(1),
});

export const ExtractionResultSchema = z.object({
  claims: z.array(ClaimSchema),
});

export type Claim = z.infer<typeof ClaimSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
