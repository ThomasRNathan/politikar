// Centralised SEO / search-indexing control.
//
// The site is deliberately kept OUT of search engines until the public
// TruthScores are computed from real verdicts (today the headline scores
// are still illustrative seed data, and indexing veracity scores about
// named politicians on placeholder data is a reputational/legal risk).
//
// Launch = set SITE_INDEXABLE="true" in the Vercel Production environment
// and redeploy. Nothing else to change. Leave it unset on previews so
// preview deployments never get indexed.

export const SITE_URL = "https://politikar.com";

/** True only when explicitly enabled. Default (unset) → not indexable. */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";
