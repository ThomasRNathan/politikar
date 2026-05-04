import Link from "next/link";
import { DOCS } from "@/lib/docs";

export const metadata = {
  title: "Documents de cadrage : politkar",
  description: "Six documents de design publiés avant tout code.",
};

export default function DocsIndex() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-4">
        Phase de design
      </p>
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
        Six documents avant tout code.
      </h1>
      <p className="mt-6 text-lg text-[var(--color-ink-soft)] leading-relaxed">
        Le master prompt utilisateur a posé une exigence simple : produire un
        cadrage rigoureux avant la première ligne de code. Voici les six
        documents qui en sortent. Chacun se termine par une section{" "}
        <em>Questions ouvertes pour relecture</em>.
      </p>
      <ul className="mt-12 divide-y divide-black/10">
        {DOCS.map((d, i) => (
          <li key={d.slug}>
            <Link
              href={`/docs/${d.slug}`}
              className="group flex items-start gap-6 py-6 hover:bg-[var(--color-bg-soft)] -mx-6 px-6 rounded-xl transition"
            >
              <span className="font-mono text-sm text-[var(--color-ink-soft)] mt-1.5 w-8">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <p className="font-serif text-2xl font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                  {d.label}
                </p>
                <p className="mt-1 text-base text-[var(--color-ink-soft)] leading-relaxed">
                  {d.description}
                </p>
                <p className="mt-2 font-mono text-xs text-[var(--color-ink-soft)]/70">
                  {d.filename}
                </p>
              </div>
              <span
                aria-hidden
                className="text-2xl text-[var(--color-ink-soft)] group-hover:text-[var(--color-accent)] mt-1"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
