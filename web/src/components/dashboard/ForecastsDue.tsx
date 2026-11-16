"use client";

import Link from "next/link";

import { ForecastDueList } from "@/components/forecasts/ForecastDueList";
import { useForecasts } from "@/components/forecasts/useForecasts";
import { Section, WORD_LINK } from "@/components/shared/Section";
import { dueForecasts } from "@/lib/forecasts/logic";
import { localDay } from "@/lib/review/schedule";

/** Today: forecasts whose day has come. Nothing shows until one is due. */
export function ForecastsDue() {
  const { forecasts, resolve } = useForecasts();
  const due = forecasts ? dueForecasts(forecasts, localDay(new Date())) : [];
  if (due.length === 0) return null;
  return (
    <Section
      title="Forecast due"
      action={
        <Link href="/forecasts" className={WORD_LINK}>
          All forecasts
        </Link>
      }
    >
      <ForecastDueList due={due} onResolve={resolve} />
    </Section>
  );
}
