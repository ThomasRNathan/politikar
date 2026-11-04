import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { DOCS, getAllDocSlugs, getDocBySlug } from "@/lib/docs";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllDocSlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) return {};
  return {
    title: `${doc.label} : politikar`,
    description: doc.description,
    alternates: { canonical: `/docs/${doc.slug}` },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) notFound();

  const currentIndex = DOCS.findIndex((d) => d.slug === slug);
  const prev = currentIndex > 0 ? DOCS[currentIndex - 1] : null;
  const next = currentIndex < DOCS.length - 1 ? DOCS[currentIndex + 1] : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/docs"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Tous les documents
      </Link>
      <header className="mt-8 mb-12">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent)]">
          {doc.filename}
        </p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--color-ink)]">
          {doc.label}
        </h1>
        <p className="mt-4 text-base text-[var(--color-ink-soft)] leading-relaxed">
          {doc.description}
        </p>
      </header>
      <article className="prose prose-politikar max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
        >
          {doc.content}
        </ReactMarkdown>
      </article>
      <nav className="mt-20 pt-10 border-t border-black/10 grid sm:grid-cols-2 gap-4">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="block p-5 rounded-xl border border-black/10 hover:border-[var(--color-accent)] transition group"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
              Précédent
            </p>
            <p className="mt-2 font-serif text-lg font-semibold group-hover:text-[var(--color-accent)]">
              {prev.label}
            </p>
          </Link>
        ) : (
          <div />
        )}
        {next && (
          <Link
            href={`/docs/${next.slug}`}
            className="block p-5 rounded-xl border border-black/10 hover:border-[var(--color-accent)] transition group sm:text-right"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
              Suivant
            </p>
            <p className="mt-2 font-serif text-lg font-semibold group-hover:text-[var(--color-accent)]">
              {next.label}
            </p>
          </Link>
        )}
      </nav>
    </div>
  );
}
