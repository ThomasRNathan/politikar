import Link from "next/link";

export const metadata = {
  title: "Mentions légales : politikar",
  description:
    "Éditeur, directeur de la publication et hébergeur du site politikar, conformément à la loi française (LCEN).",
  alternates: { canonical: "/mentions-legales" },
};

// ⚠️ À COMPLÉTER AVANT LA MISE EN INDEX (SITE_INDEXABLE=true).
// La loi française (LCEN, art. 6) impose l'identité de l'éditeur et du
// directeur de la publication. Les champs marqués [À COMPLÉTER] doivent
// recevoir de vraies informations. Un particulier non-professionnel peut
// ne pas publier son adresse personnelle à condition de l'avoir communiquée
// à l'hébergeur ; il doit néanmoins fournir un moyen de contact.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-soft)] space-y-2">
        {children}
      </div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
        Informations légales
      </p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
        Mentions légales
      </h1>

      <Section title="Éditeur du site">
        <p>
          <strong>[À COMPLÉTER — nom / raison sociale de l&apos;éditeur]</strong>,
          [À COMPLÉTER — statut : particulier / association / société et, le cas
          échéant, capital et numéro SIREN/RCS].
        </p>
        <p>Contact : [À COMPLÉTER — adresse e-mail de contact].</p>
      </Section>

      <Section title="Directeur de la publication">
        <p>[À COMPLÉTER — nom du directeur ou de la directrice de la publication].</p>
      </Section>

      <Section title="Hébergeur">
        <p>
          Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis —{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-accent)] underline"
          >
            vercel.com
          </a>
          .
        </p>
      </Section>

      <Section title="Propriété intellectuelle et licences">
        <p>
          Le code de politikar est publié en open source sous licence AGPL-3.0.
          Les données réutilisées le sont dans le respect de leur licence :
          communications officielles sous licence ouverte (Etalab), données
          parlementaires sous ODbL, photographies et logos via Wikimedia Commons
          (CC BY-SA). Les contenus tiers sont cités en extrait court avec lien
          vers la source d&apos;origine.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          politikar analyse des propos publics tenus par des personnalités
          politiques dans l&apos;exercice de leur mandat ou de leur vie
          publique. Pour toute demande relative à vos données ou pour signaler
          une erreur factuelle, écrivez à [À COMPLÉTER — adresse e-mail de
          contact] ; voir aussi{" "}
          <Link href="/a-propos" className="text-[var(--color-accent)] underline">
            la page À propos
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
