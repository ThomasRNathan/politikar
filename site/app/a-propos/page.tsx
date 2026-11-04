import Link from "next/link";

export const metadata = {
  title: "À propos : politikar",
  description:
    "Qui édite politikar, avec quelle méthode, quelles sources et quelle politique de correction. Plateforme open-source d'analyse de la véracité du discours politique français.",
  alternates: { canonical: "/a-propos" },
};

// Editorial / trust page (E-E-A-T). Content is deliberately factual and
// non-promotional. NOTE for the maintainer: French law requires separate
// "Mentions légales" (éditeur, directeur de la publication, hébergeur) for
// a public publisher — add those real details before opening to search.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-soft)] space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function AProposPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
        À propos
      </p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
        Ce qu&apos;est politikar
      </h1>
      <p className="mt-4 text-lg text-[var(--color-ink-soft)] leading-relaxed">
        politikar est une plateforme <strong>open-source</strong> qui analyse
        de façon systématique la véracité du discours politique français :
        pour chaque personnalité, parti, fonction et région, des métriques
        traçables sur les affirmations factuelles, les promesses et la
        couverture presse.
      </p>

      <Section title="Notre méthode">
        <p>
          Chaque affirmation est extraite d&apos;une source datée, puis
          évaluée par une cascade de vérification qui s&apos;appuie sur des
          fact-checks et documents cités. Le verdict, son raisonnement et les
          évidences sont publiés avec la source. La formule de score, les
          prompts (versionnés) et le schéma de données sont publics.
        </p>
        <p>
          Détails :{" "}
          <Link href="/methode" className="text-[var(--color-accent)] underline">
            méthodologie
          </Link>{" "}
          et{" "}
          <Link href="/docs" className="text-[var(--color-accent)] underline">
            documents de cadrage
          </Link>
          .
        </p>
      </Section>

      <Section title="Nos sources">
        <p>
          Communications officielles (Élysée, communiqués de partis),
          fact-checkers, et données publiques. Photos et logos via Wikimedia
          Commons (CC BY-SA). Les contenus sous licence ouverte (Etalab, ODbL)
          sont réutilisés dans le respect de leur licence ; les autres sont
          cités en extrait court avec lien vers la source.
        </p>
      </Section>

      <Section title="Neutralité et rigueur">
        <p>
          Neutralité partisane stricte : nous qualifions le propos, jamais la
          personne. Un claim politiquement clivant est traité avec exactement
          la même rigueur qu&apos;un claim consensuel. En l&apos;absence
          d&apos;évidence solide, le verdict retenu est «&nbsp;non
          vérifiable&nbsp;» plutôt qu&apos;une supposition.
        </p>
      </Section>

      <Section title="Statut du projet">
        <p>
          Le pipeline de vérification automatisé est en construction. Certains
          scores affichés sont encore illustratifs, basés sur la méthode
          publiée, et le resteront jusqu&apos;à ce qu&apos;ils soient calculés
          à partir de verdicts réels. Aucun jugement n&apos;est porté sur les
          personnes citées.
        </p>
      </Section>

      <Section title="Signaler une erreur">
        <p>
          La transparence implique la correction. Pour signaler une erreur
          factuelle ou contester un verdict, ouvrez une issue sur{" "}
          <a
            href="https://github.com/ThomasRNathan/politikar"
            className="text-[var(--color-accent)] underline"
            target="_blank"
            rel="noreferrer"
          >
            le dépôt GitHub
          </a>
          . Les corrections validées sont tracées.
        </p>
      </Section>
    </div>
  );
}
