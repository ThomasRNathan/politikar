import Link from "next/link";
import { getDbTotals, getLatestPublishedVerdict } from "@/lib/db/reads";
import { VerdictPill } from "@/components/VerdictPill";

export const metadata = {
  title: "Méthodologie : politikar",
  description:
    "Comment politikar évalue les discours politiques : sources, prompts, scoring, garde-fous.",
};

// ISR : pipeline panel refreshes every 5 minutes — fast enough to
// reflect a freshly-published verdict, slow enough to keep Neon load
// negligible under public traffic.
export const revalidate = 300;

export default async function MethodPage() {
  const [totals, latest] = await Promise.all([
    getDbTotals(),
    getLatestPublishedVerdict(),
  ]);
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
        Méthodologie
      </p>
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
        Comment nous évaluons.
      </h1>
      <p className="mt-6 text-lg text-[var(--color-ink-soft)] leading-relaxed">
        Cette page résume la méthode publique de politikar. Le détail complet,
        avec les schémas, les prompts versionnés et les formules, est dans
        les six documents de cadrage.
      </p>

      <section className="mt-10 rounded-2xl border border-[var(--color-trust)]/20 bg-gradient-to-br from-[var(--color-bg-soft)] to-transparent p-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-serif text-xl font-semibold">
            Pipeline live
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-[var(--color-trust)] font-medium">
            mis à jour toutes les 5 min
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Stat label="Politiques" value={totals.politicians} />
          <Stat label="Communications" value={totals.sources} />
          <Stat label="Claims extraits" value={totals.claims} />
          <Stat
            label="Verdicts publiés"
            value={totals.verifications_published}
            accent={totals.verdicts_true > 0}
            sub={
              totals.verdicts_true > 0
                ? `dont ${totals.verdicts_true} vrais`
                : undefined
            }
          />
        </div>
        {latest ? (
          <div className="border-t border-[var(--color-trust)]/15 pt-4">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">
              Dernier verdict publié
            </p>
            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
              <VerdictPill verdict={latest.verdict as never} size="sm" />
              <span className="text-xs text-[var(--color-ink-soft)] font-mono">
                confiance {latest.confidence.toFixed(2)}
              </span>
              <Link
                href={`/politiciens/${latest.politician_slug}`}
                className="text-xs text-[var(--color-accent)] hover:underline ml-auto"
              >
                {latest.politician} →
              </Link>
            </div>
            <p className="font-serif text-sm leading-snug">
              « {latest.claim_text} »
            </p>
            {latest.source_url && (
              <a
                href={latest.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-[11px] text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] underline"
              >
                Source originale ↗
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-ink-soft)] italic">
            Aucun verdict publié pour le moment.
          </p>
        )}
      </section>

      <section className="mt-12 space-y-10">
        <Step
          n="01"
          title="Ingestion"
          body="Les sources publiques sont collectées en continu : Assemblée nationale, Sénat, Élysée, Matignon, NosDéputés, Wikidata, INSEE, Eurostat, fact-checkers reconnus (AFP Factuel, CheckNews, Décodeurs, Vrai ou Faux, Les Surligneurs). Pas d'AFP licensing, pas d'API X/Twitter payante au MVP."
          link={{ href: "/docs/sources", label: "SOURCES.md" }}
        />
        <Step
          n="02"
          title="Extraction"
          body="Chaque texte ou transcript est analysé par Claude Sonnet 4.6, qui extrait les claims atomiques (assertions factuelles, promesses, prédictions) avec un schéma structuré strict, sans free text. Les opinions et les rhétoriques sont reconnus mais exclus du score."
          link={{ href: "/docs/prompts", label: "PROMPTS.md" }}
        />
        <Step
          n="03"
          title="Cascade de vérification"
          body="Pour chaque assertion factuelle : recherche d'un claim similaire déjà vérifié dans la base, puis dans les fact-checkers, puis dans les API publiques (INSEE, Eurostat, data.gouv.fr). Raisonnement final par modèle, escalade vers Claude Opus 4.7 pour les claims sensibles ou de faible confiance."
        />
        <Step
          n="04"
          title="Revue humaine"
          body="Tout claim portant sur une figure P0 ou avec confiance < 70 % passe en file de revue humaine avant publication. Aucun verdict P0 n'est publié sans validation par au moins un éditeur."
          link={{ href: "/docs/risks", label: "RISKS.md" }}
        />
        <Step
          n="05"
          title="Scoring"
          body="Le TruthScore est une combinaison pondérée : 60 % factuel + 30 % promesses + 10 % transparence. Pondération par confiance et vérifiabilité du claim. Plancher de volume de 30 affirmations factuelles ou 5 promesses résolues. Intervalle de confiance bootstrap à 95 % affiché systématiquement."
          link={{ href: "/docs/scoring", label: "SCORING.md" }}
        />
        <Step
          n="06"
          title="Publication"
          body="Tout verdict cite ses sources. La sémantique est stricte : on qualifie le propos, jamais la personne. Aucun classement national absolu n'est exposé. Les comparaisons publiées se font entre politiques de même fonction."
        />
      </section>

      <section className="mt-16 p-6 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-accent-soft)]">
        <h2 className="font-serif text-xl font-semibold mb-3">Garde-fous éditoriaux</h2>
        <ul className="text-sm space-y-2 list-disc pl-5 text-[var(--color-ink-soft)]">
          <li>Distinction sémantique stricte : <em>jugé faux selon méthode X avec confiance Y</em>, jamais <em>X ment</em>.</li>
          <li>Aucun verdict ne porte sur une affaire judiciaire en cours.</li>
          <li>Audit annuel par panel à parité gauche, centre, droite.</li>
          <li>Procédure publique de droit de réponse, traitement sous 30 jours.</li>
          <li>Code, prompts et seuils de scoring publiés en open source.</li>
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/docs"
          className="inline-flex items-center px-5 h-11 rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] text-sm font-medium hover:bg-[var(--color-trust)] transition"
        >
          Lire les six documents complets
        </Link>
        <a
          href="https://github.com/ThomasRNathan/politikar"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center px-5 h-11 rounded-full border border-black/15 text-sm font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
        >
          Code source
        </a>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-3xl font-semibold ${accent ? "text-[var(--color-trust)]" : "text-[var(--color-ink)]"}`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--color-ink-soft)]">
          {sub}
        </p>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  body,
  link,
}: {
  n: string;
  title: string;
  body: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-6 items-start">
      <span className="font-mono text-sm text-[var(--color-accent)] mt-1.5">
        {n}
      </span>
      <div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-base text-[var(--color-ink-soft)] leading-relaxed">
          {body}
        </p>
        {link && (
          <Link
            href={link.href}
            className="mt-2 inline-block text-xs text-[var(--color-accent)] hover:underline"
          >
            Détail dans {link.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
