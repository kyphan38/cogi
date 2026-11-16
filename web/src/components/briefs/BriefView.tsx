"use client";

import Link from "next/link";

import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { briefPractiseHref, type Brief } from "@/lib/briefs/schema";
import { formatDay } from "@/lib/history";
import { cn } from "@/lib/utils";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="section-label">{title}</h3>
      {children}
    </section>
  );
}

/** One brief: read first, then three check questions, then links to practise. */
export function BriefView({ brief, onAnswer }: { brief: Brief; onAnswer: (check: number, option: number) => void }) {
  return (
    <article className="space-y-8 text-body" data-testid="brief">
      <header>
        <h2 className="text-lead font-semibold">{brief.title}</h2>
        <p className="mt-1 text-meta text-muted-foreground">
          {brief.area} · written by AI from a web search on {formatDay(brief.createdAt)}. Check important facts yourself.
        </p>
      </header>

      <Part title="Background">
        <p className="leading-[1.75]">{brief.background}</p>
      </Part>

      <Part title="Key facts">
        <ul className="border-b border-border">
          {brief.facts.map((f) => (
            <li key={f.text} className="border-t border-border py-2">
              <p>{f.text}</p>
              <p className="text-meta text-muted-foreground">{f.source}</p>
            </li>
          ))}
        </ul>
      </Part>

      <Part title="Ways to see it">
        <div className="space-y-3">
          {brief.views.map((v) => (
            <div key={v.name}>
              <p className="font-medium">{v.name}</p>
              <p className="leading-relaxed text-muted-foreground">{v.text}</p>
            </div>
          ))}
        </div>
      </Part>

      <Part title="Check">
        <div className="space-y-5">
          {brief.checks.map((c, i) => {
            const picked = brief.answers?.[i] ?? null;
            return (
              <div key={c.question} data-testid="brief-check">
                <p className="font-medium">{c.question}</p>
                <div className="mt-2 grid gap-1.5">
                  {c.options.map((o, j) => (
                    <button
                      key={o}
                      type="button"
                      disabled={picked !== null}
                      onClick={() => onAnswer(i, j)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-left transition-colors",
                        picked === null && "border-input hover:border-foreground/40",
                        picked !== null && j === c.answerIndex && "border-foreground font-medium",
                        picked !== null && j !== c.answerIndex && "border-input text-muted-foreground",
                      )}
                    >
                      {o}
                      {picked !== null && j === c.answerIndex ? <span className="ml-2 text-meta">correct</span> : null}
                      {picked === j && j !== c.answerIndex ? <span className="ml-2 text-meta">your pick</span> : null}
                    </button>
                  ))}
                </div>
                {picked !== null ? <p className="fade-in mt-2 text-muted-foreground">{c.explanation}</p> : null}
              </div>
            );
          })}
        </div>
      </Part>

      <Part title="Practise it">
        <div className="border-b border-border">
          {brief.practise.map((p) => (
            <Link key={`${p.type}:${p.domain}`} href={briefPractiseHref(p)} className="group/row flex items-center justify-between gap-4 border-t border-border py-3">
              <span className="min-w-0">
                <span className="block truncate">{p.domain}</span>
                <span className="block text-meta text-muted-foreground">{TYPE_LABEL[p.type]}</span>
              </span>
              <span className="shrink-0 text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground">Start</span>
            </Link>
          ))}
        </div>
      </Part>

      <Part title="Sources">
        <ul className="space-y-1 text-meta">
          {brief.sources.map((s) => (
            <li key={s.uri}>
              <a href={s.uri} target="_blank" rel="noreferrer noopener" className="text-muted-foreground hover:text-foreground after:ml-1 after:content-['›']">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </Part>
    </article>
  );
}
