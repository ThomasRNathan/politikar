import { ingestionTotals } from "@/lib/realdata";
import { getDbTotals } from "@/lib/db/reads";

// Live status notice rendered as an async server component. Pulls
// counts straight from Neon ; falls back to the bundled ingestion
// snapshot if the DB call fails (eg cold-start, network blip).
//
// The whole component is wrapped in <Suspense> at layout level so a
// slow DB call doesn't block the first byte ; the fallback string is
// rendered first and swapped in once the data arrives.
export async function StatusNotice() {
  const bundled = ingestionTotals();
  const db = await getDbTotals();

  // Prefer live DB counts when meaningful, otherwise display the
  // bundled snapshot so the banner is informative even before the
  // first cron run.
  const claims = db.claims > 0 ? db.claims : 0;
  const sources = db.sources > 0 ? db.sources : bundled.sources;
  const published = db.verifications_published;

  return (
    <div className="bg-[var(--color-bg-soft)] border-b border-black/5 text-xs text-[var(--color-ink-soft)]">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 justify-center text-center">
        <span aria-hidden className="text-[var(--color-accent)]">●</span>
        {claims > 0 ? (
          <p>
            Pipeline live &mdash; {sources} communications ingérées,{" "}
            {claims} claims extraits,{" "}
            <strong>{published}</strong> verdicts publiés
            {db.verdicts_true > 0 && (
              <>
                {" "}
                dont <strong>{db.verdicts_true}</strong> jugés vrais
              </>
            )}
            .{" "}
            <a
              href="/classement"
              className="underline hover:text-[var(--color-accent)]"
            >
              Classement
            </a>
            {" · "}
            <a
              href="/methode"
              className="underline hover:text-[var(--color-accent)]"
            >
              Méthode
            </a>
          </p>
        ) : (
          <p>
            Plateforme en construction. {sources} communications officielles
            ingérées, {bundled.factchecks} fact-checks de référence.
            L&apos;extraction de claims et la vérification automatisée
            arrivent.{" "}
            <a
              href="/methode"
              className="underline hover:text-[var(--color-accent)]"
            >
              En savoir plus
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
