"use client";

import { useState } from "react";

import { ForecastDueList, formatDueDay } from "@/components/forecasts/ForecastDueList";
import { ForecastRecord } from "@/components/forecasts/ForecastRecord";
import { useForecasts } from "@/components/forecasts/useForecasts";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, WORD_LINK } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { dueForecasts, FORECAST_QUESTION_MAX, forecastInputError, openForecasts, resolvedForecasts } from "@/lib/forecasts/logic";
import { localDay } from "@/lib/review/schedule";

function NewForecast({ onAdd }: { onAdd: (input: { question: string; probability: number; dueDay: string }) => void }) {
  const [question, setQuestion] = useState("");
  const [probability, setProbability] = useState(60);
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const input = { question, probability, dueDay };
    const problem = forecastInputError(input, localDay(new Date()));
    setError(problem);
    if (problem) return;
    onAdd(input);
    setQuestion("");
    setDueDay("");
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="forecast-form"
    >
      <div className="grid gap-2">
        <Label htmlFor="forecast-question">What will happen?</Label>
        <Input
          id="forecast-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={FORECAST_QUESTION_MAX}
          placeholder="The release ships by 30 November"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="forecast-probability">
            How likely? <span className="font-medium tabular-nums">{probability}%</span>
          </Label>
          <Slider
            id="forecast-probability"
            min={1}
            max={99}
            step={1}
            value={[probability]}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? v[0] : v;
              if (typeof n === "number") setProbability(n);
            }}
            thumbLabel="How likely, in percent"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="forecast-due">When will you know?</Label>
          <Input id="forecast-due" type="date" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
      </div>
      {error ? (
        <p className="text-meta font-medium text-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit">Add forecast</Button>
      </div>
    </form>
  );
}

/** Forecast journal: real events, a chance and a day; scored when the day comes. */
export default function ForecastsPage() {
  const { forecasts, error, add, resolve, remove } = useForecasts();
  const today = localDay(new Date());
  const due = forecasts ? dueForecasts(forecasts, today) : [];
  const open = forecasts ? openForecasts(forecasts, today) : [];
  const done = forecasts ? resolvedForecasts(forecasts) : [];

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="Forecasts" sub="Guess a real event. Check it when the day comes." />

      {error ? (
        <p className="text-body font-medium text-foreground" role="alert">
          {error}
        </p>
      ) : null}

      {due.length > 0 ? (
        <Section title="What happened?">
          <ForecastDueList due={due} onResolve={resolve} />
        </Section>
      ) : null}

      <Section title="New forecast">
        <NewForecast onAdd={add} />
      </Section>

      {open.length > 0 ? (
        <Section title="Waiting">
          <ul className="border-b border-border" data-testid="forecast-open">
            {open.map((f) => (
              <li key={f.id} className="group/item flex items-baseline justify-between gap-4 border-t border-border py-3">
                <div className="min-w-0">
                  <p className="text-body">{f.question}</p>
                  <p className="text-meta text-muted-foreground tabular-nums">
                    {f.probability}% · due {formatDueDay(f.dueDay)}
                  </p>
                </div>
                <button
                  type="button"
                  className={`${WORD_LINK} shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100`}
                  onClick={() => {
                    if (window.confirm("Delete this forecast?")) remove(f.id);
                  }}
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {forecasts && done.length > 0 ? (
        <Section title="Your record">
          <ForecastRecord forecasts={forecasts} />
        </Section>
      ) : null}

      {done.length > 0 ? (
        <Section title="Resolved">
          <ul className="border-b border-border" data-testid="forecast-resolved">
            {done.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-4 border-t border-border py-3">
                <div className="min-w-0">
                  <p className="text-body">{f.question}</p>
                  <p className="text-meta text-muted-foreground tabular-nums">
                    You said {f.probability}% · {formatDueDay(f.dueDay)}
                  </p>
                </div>
                <span className="shrink-0 text-body">{f.outcome === "yes" ? "happened" : "did not happen"}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </main>
  );
}
