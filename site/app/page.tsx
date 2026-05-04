import Link from "next/link";
import { DOCS } from "@/lib/docs";

export default function Home() {
  return (
    <div className="flex-1">
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-6">
            Phase de design : 28 avril 2026
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] tracking-tight font-semibold text-[var(--color-ink)]">
            La véracité du discours politique français,{" "}
            <span className="text-[var(--color-accent)]">mesurée</span> en
            méthode publique.
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-[var(--color-ink-soft)]">
            politkar est une plateforme open-source de fact-checking
            systématique. Pour chaque homme et femme politique, parti, fonction
            et région, des métriques agrégées sur les discours, les promesses
            et la couverture presse, traçables jusqu&apos;à la source.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center px-5 h-11 rounded-full bg-[var(--color-ink)] text-[var(--color-bg)] text-sm font-medium hover:bg-[var(--color-trust)] transition"
            >
              Lire les six documents de cadrage
            </Link>
            <a
              href="https://github.com/ThomasRNathan/politkar"
              className="inline-flex items-center px-5 h-11 rounded-full border border-black/15 text-sm font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
              target="_blank"
              rel="noreferrer"
            >
              Code source GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-bg-soft)] border-y border-black/5 py-14">
        <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-3 gap-8">
          <div>
            <p className="text-3xl font-serif font-semibold text-[var(--color-ink)]">
              3
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-[var(--color-ink-soft)]">
              Axes mesurés
            </p>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Discours factuels. Promesses de mandat. Couverture presse en
              stand-by.
            </p>
          </div>
          <div>
            <p className="text-3xl font-serif font-semibold text-[var(--color-ink)]">
              50
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-[var(--color-ink-soft)]">
              Figures nationales au MVP
            </p>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Président, gouvernement, leaders de partis, têtes de listes.
              Architecture multi-pays prête.
            </p>
          </div>
          <div>
            <p className="text-3xl font-serif font-semibold text-[var(--color-ink)]">
              100%
            </p>
            <p className="mt-2 text-sm uppercase tracking-wide text-[var(--color-ink-soft)]">
              Open source et auditable
            </p>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Code, prompts, formules de scoring et liste des sources publiés.
              Licence AGPL-3.0 proposée.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
            Six documents de cadrage
          </h2>
          <Link
            href="/docs"
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            Tout consulter
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {DOCS.map((d, i) => (
            <Link
              key={d.slug}
              href={`/docs/${d.slug}`}
              className="group block p-6 rounded-2xl bg-white border border-black/5 hover:border-[var(--color-accent)] transition"
            >
              <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
                Document {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-3 font-serif text-xl font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                {d.label}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)] leading-relaxed">
                {d.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-ink)] text-[var(--color-bg)] py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent-soft)] mb-4">
            Aperçu produit : données fictives
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
            À quoi ressemblera une fiche politique.
          </h2>
          <p className="mt-4 text-base text-white/70 max-w-2xl leading-relaxed">
            Cet exemple est un mockup à titre illustratif. Aucun politique réel
            n&apos;a encore été évalué.
          </p>
          <div className="mt-10 grid lg:grid-cols-3 gap-6">
            <MockupCard
              name="Politicien fictif A"
              role="Ministre, P0"
              score={84}
              ciLow={80}
              ciHigh={88}
              factual={50}
              promises={4}
              gradient="from-emerald-500 to-emerald-300"
            />
            <MockupCard
              name="Politicien fictif B"
              role="Présidente de groupe, P0"
              score={60}
              ciLow={55}
              ciHigh={64}
              factual={80}
              promises={6}
              gradient="from-amber-500 to-amber-300"
            />
            <MockupCard
              name="Politicien fictif C"
              role="Sénateur, P2"
              score={null}
              ciLow={null}
              ciHigh={null}
              factual={12}
              promises={0}
              gradient="from-zinc-500 to-zinc-300"
            />
          </div>
          <p className="mt-10 text-xs text-white/50">
            La méthode complète, les pondérations et les exemples chiffrés sont
            détaillés dans{" "}
            <Link
              href="/docs/scoring"
              className="underline hover:text-[var(--color-accent-soft)]"
            >
              SCORING.md
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

type MockupCardProps = {
  name: string;
  role: string;
  score: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  factual: number;
  promises: number;
  gradient: string;
};

function MockupCard({
  name,
  role,
  score,
  ciLow,
  ciHigh,
  factual,
  promises,
  gradient,
}: MockupCardProps) {
  const significant = score !== null;
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur">
      <p className="text-xs uppercase tracking-widest text-white/50">{role}</p>
      <p className="mt-2 font-serif text-xl font-semibold">{name}</p>
      <div className="mt-6">
        {significant ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className={`bg-gradient-to-br ${gradient} bg-clip-text text-transparent font-serif text-6xl font-semibold`}>
                {score}
              </span>
              <span className="text-sm text-white/50">
                intervalle {ciLow} à {ciHigh}
              </span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10 relative overflow-hidden">
              <div
                className={`absolute top-0 h-full bg-gradient-to-r ${gradient} opacity-60`}
                style={{
                  left: `${ciLow}%`,
                  width: `${(ciHigh ?? 0) - (ciLow ?? 0)}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${score}%` }}
              />
            </div>
          </>
        ) : (
          <div>
            <p className="font-serif text-2xl text-white/60">
              Score non significatif
            </p>
            <p className="mt-1 text-xs text-white/40">
              Volume sous-jacent insuffisant (N {"<"} 30 claims factuels).
            </p>
          </div>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-white/5 p-3 border border-white/5">
          <p className="text-white/50 uppercase tracking-wider">Factuels</p>
          <p className="mt-1 font-medium text-white">{factual} affirmations</p>
        </div>
        <div className="rounded-lg bg-white/5 p-3 border border-white/5">
          <p className="text-white/50 uppercase tracking-wider">Promesses</p>
          <p className="mt-1 font-medium text-white">{promises} résolues</p>
        </div>
      </div>
    </div>
  );
}
