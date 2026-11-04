import type { Metadata } from "next";
import { Inter, Source_Serif_4, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Suspense } from "react";
import { StatusNotice } from "@/components/DemoBanner";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/seo";

// Static fallback rendered while StatusNotice fetches live DB counts.
// Keeps the layout shell instant even on cold DB starts.
function StatusNoticeFallback() {
  return (
    <div className="bg-[var(--color-bg-soft)] border-b border-black/5 text-xs text-[var(--color-ink-soft)]">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2 justify-center text-center">
        <span aria-hidden className="text-[var(--color-accent)]">●</span>
        <p>
          Pipeline politikar — chargement des compteurs…{" "}
          <a
            href="/methode"
            className="underline hover:text-[var(--color-accent)]"
          >
            Méthode
          </a>
        </p>
      </div>
    </div>
  );
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_TITLE =
  "politikar : analyse de véracité du discours politique français";
const SITE_DESCRIPTION =
  "Plateforme open-source de fact-checking systématique des discours politiques français.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "politikar",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "politikar",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: SITE_TITLE, description: SITE_DESCRIPTION },
  // Indexing is gated on SITE_INDEXABLE (see lib/seo.ts). Kept noindex
  // until the public scores are computed from real verdicts.
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

// Site-wide structured data (Organization + WebSite). Inert while the
// site is noindex; picked up by search engines once indexing is enabled.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "politikar",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      name: "politikar",
      url: SITE_URL,
      inLanguage: "fr-FR",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Suspense fallback={<StatusNoticeFallback />}>
          <StatusNotice />
        </Suspense>
        <header className="border-b border-black/5 bg-[var(--color-bg)]/90 backdrop-blur sticky top-0 z-10">
          <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
            <Link
              href="/"
              className="font-serif text-xl tracking-tight font-semibold text-[var(--color-ink)]"
            >
              politikar
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/politiciens"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition"
              >
                Politiciens
              </Link>
              <Link
                href="/partis"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition hidden sm:inline"
              >
                Partis
              </Link>
              <Link
                href="/fonctions"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition hidden sm:inline"
              >
                Fonctions
              </Link>
              <Link
                href="/methode"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition hidden sm:inline"
              >
                Méthode
              </Link>
              <Link
                href="/docs"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition"
              >
                Docs
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-black/5 mt-24">
          <div className="max-w-6xl mx-auto px-6 py-10 text-sm text-[var(--color-ink-soft)] grid sm:grid-cols-3 gap-6">
            <div>
              <p className="font-serif font-semibold text-[var(--color-ink)]">politikar</p>
              <p className="mt-1 text-xs leading-relaxed">
                Plateforme open-source de fact-checking du discours politique
                français. Photos et logos via Wikimedia Commons (CC BY-SA).
                Pipeline de vérification automatisé en construction.
              </p>
            </div>
            <div>
              <p className="font-medium text-[var(--color-ink)]">Explorer</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li><Link href="/politiciens" className="hover:text-[var(--color-accent)]">Annuaire des politiques</Link></li>
                <li><Link href="/partis" className="hover:text-[var(--color-accent)]">Partis</Link></li>
                <li><Link href="/fonctions" className="hover:text-[var(--color-accent)]">Fonctions</Link></li>
                <li><Link href="/methode" className="hover:text-[var(--color-accent)]">Méthodologie</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-[var(--color-ink)]">Projet</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  <a
                    href="https://github.com/ThomasRNathan/politikar"
                    className="hover:text-[var(--color-accent)]"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </li>
                <li><Link href="/a-propos" className="hover:text-[var(--color-accent)]">À propos</Link></li>
                <li><Link href="/mentions-legales" className="hover:text-[var(--color-accent)]">Mentions légales</Link></li>
                <li><Link href="/docs" className="hover:text-[var(--color-accent)]">Documents de cadrage</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
