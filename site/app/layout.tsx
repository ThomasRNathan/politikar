import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "politikar : analyse de véracité du discours politique français",
  description:
    "Plateforme open-source de fact-checking systématique des discours politiques français. Phase de design : six documents de cadrage publiés.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
        <header className="border-b border-black/5 bg-[var(--color-bg)]/80 backdrop-blur sticky top-0 z-10">
          <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="font-serif text-xl tracking-tight font-semibold text-[var(--color-ink)]"
            >
              politikar
              <span className="ml-2 text-xs uppercase tracking-widest text-[var(--color-accent)] align-middle">
                design
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/docs"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition"
              >
                Documents
              </Link>
              <a
                href="https://github.com/ThomasRNathan/politikar"
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] transition"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-black/5 mt-24">
          <div className="max-w-5xl mx-auto px-6 py-10 text-sm text-[var(--color-ink-soft)] flex flex-col sm:flex-row sm:justify-between gap-4">
            <p>
              politikar : phase de design, aucun verdict produit. Les chiffres
              affichés à titre d&apos;illustration sont fictifs.
            </p>
            <p>
              <a
                href="https://github.com/ThomasRNathan/politikar"
                className="hover:text-[var(--color-accent)] transition"
                target="_blank"
                rel="noreferrer"
              >
                Code source (privé pour le moment)
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
