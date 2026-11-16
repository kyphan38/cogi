"use client";

import { useCallback, useEffect, useState } from "react";

import { getForecasts, setForecasts } from "@/lib/db/forecasts";
import type { Forecast, ForecastInput } from "@/lib/forecasts/logic";

/** The forecast journal: loaded once, every change saved as the whole list. */
export function useForecasts() {
  const [forecasts, setList] = useState<Forecast[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getForecasts()
      .then((rows) => {
        if (!cancelled) setList(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your forecasts.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: Forecast[], previous: Forecast[]) => {
    setList(next);
    setError(null);
    try {
      await setForecasts(next);
    } catch {
      setList(previous);
      setError("Not saved. Try again.");
    }
  }, []);

  const add = (input: ForecastInput) => {
    if (!forecasts) return;
    const row: Forecast = {
      id: crypto.randomUUID(),
      question: input.question.trim(),
      probability: input.probability,
      dueDay: input.dueDay,
      createdAt: new Date().toISOString(),
      outcome: null,
      resolvedAt: null,
    };
    void save([...forecasts, row], forecasts);
  };

  const resolve = (id: string, outcome: "yes" | "no") => {
    if (!forecasts) return;
    const resolvedAt = new Date().toISOString();
    void save(
      forecasts.map((f) => (f.id === id ? { ...f, outcome, resolvedAt } : f)),
      forecasts,
    );
  };

  const remove = (id: string) => {
    if (!forecasts) return;
    void save(
      forecasts.filter((f) => f.id !== id),
      forecasts,
    );
  };

  return { forecasts, error, add, resolve, remove };
}
