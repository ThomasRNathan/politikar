import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FUNCTIONS,
  functionBySlug,
  partyById,
  politiciansInFunction,
  CLAIMS,
} from "@/lib/fixtures";
import { TOPIC_LABELS, type Topic, type Politician } from "@/lib/types";
import { PoliticianCard } from "@/components/PoliticianCard";
import { ScoreBadge } from "@/components/ScoreBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { scoreColor } from "@/lib/format";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return FUNCTIONS.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = functionBySlug(slug);
  if (!f) return {};
  return {
    title: `${f.name} : politikar`,
    description: `Analyse agrégée des politiques exerçant la fonction ${f.name}.`,
    alternates: { canonical: `/fonctions/${f.slug}` },
  };
}

function aggregate(members: Politician[]) {
  const sig = members.filter(
    (p) => p.stats.is_significant && p.stats.truth_score !== null
  );
  if (sig.length === 0) return null;
  let sum = 0,
    w = 0,
    factualSum = 0,
    factualW = 0,
    promiseSum = 0,
    promiseW = 0;
  let nFactual = 0;
  let nPromises = 0;
  for (const p of sig) {
    const ww = p.tier === "P0" ? 2 : p.tier === "P1" ? 1.5 : 1;
    sum += (p.stats.truth_score ?? 0) * ww;
    w += ww;
    if (p.stats.factual_score !== null) {
      factualSum += p.stats.factual_score * ww;
      factualW += ww;
    }
    if (p.stats.promise_score !== null) {
      promiseSum += p.stats.promise_score * ww;
      promiseW += ww;
    }
    nFactual += p.stats.n_factual;
    nPromises += p.stats.n_promises;
  }
  return {
    score: Math.round(sum / w),
    factual: factualW ? Math.round(factualSum / factualW) : null,
    promise: promiseW ? Math.round(promiseSum / promiseW) : null,
    nFactual,
    nPromises,
    nSig: sig.length,
  };
}

function partyShare(members: Politician[]) {
  const map = new Map<string, { count: number; scoreSum: number }>();
  for (const m of members) {
    const e = map.get(m.party_id) ?? { count: 0, scoreSum: 0 };
    e.count += 1;
    e.scoreSum += m.stats.truth_score ?? 0;
    map.set(m.party_id, e);
  }
  return Array.from(map.entries())
    .map(([partyId, v]) => ({
      party: partyById(partyId)!,
      count: v.count,
      avg: Math.round(v.scoreSum / v.count),
    }))
    .sort((a, b) => b.count - a.count);
}

function topicAggregation(members: Politician[]) {
  const totals = new Map<Topic, { weighted: number; n: number }>();
  for (const m of members) {
    for (const [topic, ts] of Object.entries(m.stats.topic_breakdown)) {
      if (!ts) continue;
      const e = totals.get(topic as Topic) ?? { weighted: 0, n: 0 };
      e.weighted += ts.score * ts.n;
      e.n += ts.n;
      totals.set(topic as Topic, e);
    }
  }
  return Array.from(totals.entries())
    .filter(([, v]) => v.n >= 5)
    .map(([t, v]) => ({ topic: t, score: Math.round(v.weighted / v.n), n: v.n }))
    .sort((a, b) => b.n - a.n);
}

export default async function FunctionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const func = functionBySlug(slug);
  if (!func) notFound();

  const members = politiciansInFunction(func.id).sort(
    (a, b) => (b.stats.truth_score ?? 0) - (a.stats.truth_score ?? 0)
  );
  const agg = aggregate(members);
  const shares = partyShare(members);
  const topics = topicAggregation(members);
  const claimsCount = members.reduce(
    (acc, m) => acc + CLAIMS.filter((c) => c.politician_id === m.id).length,
    0
  );

  const sisterFunctions = FUNCTIONS.filter(
    (f) =>
      f.level === func.level &&
      f.id !== func.id &&
      politiciansInFunction(f.id).length > 0
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link
        href="/fonctions"
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)] inline-flex items-center gap-2"
      >
        <span aria-hidden>←</span> Toutes les fonctions
      </Link>

      <header className="mt-8 mb-10 flex items-start justify-between flex-wrap gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)]">
            Fonction
          </p>
          <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-semibold tracking-tight">
            {func.name}
          </h1>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
            {members.length} politique{members.length > 1 ? "s" : ""} couvert
            {members.length > 1 ? "s" : ""} · {claimsCount} affirmation
            {claimsCount > 1 ? "s" : ""} 
          </p>
        </div>
        {agg && (
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)] mb-2">
              Score moyen pondéré
            </p>
            <ScoreBadge score={agg.score} size="xl" />
            <p className="mt-2 text-[11px] text-[var(--color-ink-soft)] font-mono">
              sur {agg.nSig} politique{agg.nSig > 1 ? "s" : ""} significatif
              {agg.nSig > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </header>

      {agg && (
        <section className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
              Score factuel
            </p>
            <p className="mt-2 font-serif text-3xl font-semibold">
              {agg.factual ?? "—"}
            </p>
            <ConfidenceBar
              score={agg.factual}
              ciLow={agg.factual ? agg.factual - 4 : null}
              ciHigh={agg.factual ? agg.factual + 4 : null}
            />
            <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
              {agg.nFactual} affirmations cumulées
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
              Score promesses
            </p>
            <p className="mt-2 font-serif text-3xl font-semibold">
              {agg.promise ?? "—"}
            </p>
            <ConfidenceBar
              score={agg.promise}
              ciLow={agg.promise ? agg.promise - 5 : null}
              ciHigh={agg.promise ? agg.promise + 5 : null}
            />
            <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
              {agg.nPromises} promesses cumulées
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">
              Volume total
            </p>
            <p className="mt-2 font-serif text-3xl font-semibold">
              {agg.nFactual + agg.nPromises}
            </p>
            <p className="mt-2 text-xs text-[var(--color-ink-soft)] leading-relaxed">
              Affirmations et promesses confondues. Plancher de
              significativité par profil : 30 affirmations ou 5 promesses.
            </p>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-12">
        {shares.length > 1 && (
          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="font-serif text-xl font-semibold mb-4">
              Distribution par parti
            </h2>
            <div className="flex h-3 rounded-full overflow-hidden">
              {shares.map((s) => {
                const pct = (s.count / members.length) * 100;
                return (
                  <div
                    key={s.party.id}
                    title={`${s.party.name} : ${s.count}`}
                    style={{ width: `${pct}%`, background: s.party.color_hex }}
                  />
                );
              })}
            </div>
            <ul className="mt-5 space-y-3">
              {shares.map((s) => (
                <li key={s.party.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ background: s.party.color_hex }}
                  />
                  <Link
                    href={`/partis/${s.party.slug}`}
                    className="flex-1 hover:text-[var(--color-accent)] truncate"
                  >
                    {s.party.name}
                  </Link>
                  <span className="text-xs text-[var(--color-ink-soft)] font-mono">
                    {s.count}
                  </span>
                  <span
                    className="text-xs font-medium font-mono"
                    style={{ color: scoreColor(s.avg) }}
                  >
                    {s.avg}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {topics.length > 0 && (
          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="font-serif text-xl font-semibold mb-4">
              Sujets les plus traités
            </h2>
            <ul className="space-y-3">
              {topics.slice(0, 6).map((t) => (
                <li key={t.topic}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm">
                      {TOPIC_LABELS[t.topic as Topic]}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-ink-soft)]">
                      score {t.score} · n={t.n}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/5 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${t.score}%`,
                        background: scoreColor(t.score),
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="mb-12">
        <h2 className="font-serif text-2xl font-semibold mb-6">
          Ranking interne
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">
            Aucun politique pour cette fonction.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((p) => (
              <PoliticianCard key={p.id} politician={p} />
            ))}
          </div>
        )}
      </section>

      {sisterFunctions.length > 0 && (
        <section className="mt-16 pt-10 border-t border-black/10">
          <p className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3">
            Comparer
          </p>
          <h3 className="font-serif text-xl font-semibold mb-4">
            Autres fonctions du même niveau
          </h3>
          <div className="flex flex-wrap gap-2">
            {sisterFunctions.map((f) => (
              <Link
                key={f.id}
                href={`/fonctions/${f.slug}`}
                className="px-4 py-2 rounded-full border border-black/15 text-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition"
              >
                {f.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-xs text-[var(--color-ink-soft)] leading-relaxed max-w-3xl">
        Méthode : score moyen pondéré par tier (P0 = 2, P1 = 1.5, P2 = 1).
        Seuls les profils significatifs (≥30 affirmations ou ≥5 promesses
        résolues) entrent dans l&apos;agrégat. Détail dans{" "}
        <Link
          href="/docs/scoring"
          className="text-[var(--color-accent)] hover:underline"
        >
          SCORING.md
        </Link>
        .
      </p>
    </div>
  );
}
