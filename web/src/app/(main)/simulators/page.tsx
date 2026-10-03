"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LineChart } from "@/components/sim/LineChart";
import { PredictQuestion } from "@/components/sim/PredictQuestion";
import {
  formatPercent,
  formatVnd,
  importPriceVnd,
  loanMonthlyPayment,
  loanTotalInterest,
  relativeChange,
  savingsVsInflation,
} from "@/lib/sim/finance";

function SliderRow({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="tabular-nums font-medium" data-testid={`${id}-value`}>
          {display}
        </span>
      </Label>
      <Slider
        id={id}
        thumbLabel={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v;
          if (typeof n === "number") onChange(n);
        }}
      />
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 px-3 py-2">
      <p className="text-foreground text-base font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function SimCard({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <Card id={id} data-testid={`sim-${id}`} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{intro}</p>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function LoanSim() {
  const [principal, setPrincipal] = useState(2e9);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const payment = loanMonthlyPayment(principal, rate / 100, years);
  const curve = useMemo(
    () => Array.from({ length: 21 }, (_, r) => ({ x: r, y: loanMonthlyPayment(principal, r / 100, years) })),
    [principal, years],
  );
  const low = loanMonthlyPayment(2e9, 0.08, 20);
  const high = loanMonthlyPayment(2e9, 0.12, 20);
  const change = relativeChange(low, high);
  return (
    <SimCard id="loan" title="Loan payments and interest rates" intro="How much a home loan costs each month when the interest rate changes.">
      <PredictQuestion
        question="A 2 billion VND loan over 20 years. The rate goes from 8% to 12% - that is 50% higher. How much does the monthly payment go up?"
        options={["Less than 50%", "About 50%", "More than 50%"]}
        answerIndex={change < 0.45 ? 0 : change <= 0.55 ? 1 : 2}
        explanation={`It goes from ${formatVnd(low)} to ${formatVnd(high)}, up ${formatPercent(change, 0)}. Part of each payment repays the loan itself, which the rate does not change.`}
        onReveal={() => {
          setPrincipal(2e9);
          setYears(20);
          setRate(12);
        }}
      />
      <SliderRow id="loan-principal" label="Loan" value={principal} display={formatVnd(principal)} min={5e8} max={5e9} step={1e8} onChange={setPrincipal} />
      <SliderRow id="loan-rate" label="Interest rate (per year)" value={rate} display={`${rate}%`} min={0} max={20} step={0.5} onChange={setRate} />
      <SliderRow id="loan-years" label="Years" value={years} display={`${years}`} min={5} max={30} step={1} onChange={setYears} />
      <div className="grid grid-cols-2 gap-2">
        <Result label="Each month" value={formatVnd(payment)} />
        <Result label="Total interest" value={formatVnd(loanTotalInterest(principal, rate / 100, years))} />
      </div>
      <LineChart
        title="Monthly payment at each interest rate"
        series={[{ name: "Monthly payment", points: curve }]}
        xLabel="Interest rate"
        formatX={(x) => `${x}%`}
        formatY={formatVnd}
        markerX={Math.round(rate)}
      />
    </SimCard>
  );
}

function SavingsSim() {
  const amount = 1e8;
  const [savingsRate, setSavingsRate] = useState(5);
  const [inflation, setInflation] = useState(4);
  const [years, setYears] = useState(10);
  const rows = savingsVsInflation(amount, savingsRate / 100, inflation / 100, years);
  const last = rows[rows.length - 1]!;
  const q = savingsVsInflation(amount, 0.05, 0.06, 10)[10]!;
  const qChange = relativeChange(amount, q.real);
  return (
    <SimCard id="savings" title="Savings and inflation" intro="What 100 million VND in a savings account can really buy after some years, when prices rise too.">
      <PredictQuestion
        question="You save 100 million VND at 5% a year while prices rise 6% a year. After 10 years, can the money buy more or less than today?"
        options={["More", "About the same", "Less"]}
        answerIndex={qChange > 0.02 ? 0 : qChange >= -0.02 ? 1 : 2}
        explanation={`Your balance grows to ${formatVnd(q.nominal)}, but in today's prices that buys what ${formatVnd(q.real)} buys now. When prices rise faster than your savings rate, you lose buying power.`}
        onReveal={() => {
          setSavingsRate(5);
          setInflation(6);
          setYears(10);
        }}
      />
      <SliderRow id="savings-rate" label="Savings rate (per year)" value={savingsRate} display={`${savingsRate}%`} min={0} max={12} step={0.5} onChange={setSavingsRate} />
      <SliderRow id="savings-inflation" label="Prices rise (inflation, per year)" value={inflation} display={`${inflation}%`} min={0} max={12} step={0.5} onChange={setInflation} />
      <SliderRow id="savings-years" label="Years" value={years} display={`${years}`} min={1} max={30} step={1} onChange={setYears} />
      <div className="grid grid-cols-2 gap-2">
        <Result label="In the account" value={formatVnd(last.nominal)} />
        <Result label="In today's money" value={formatVnd(last.real)} />
      </div>
      <LineChart
        title="Your savings over time"
        series={[
          { name: "In the account", points: rows.map((r) => ({ x: r.year, y: r.nominal })) },
          { name: "In today's money", points: rows.map((r) => ({ x: r.year, y: r.real })), dashed: true },
        ]}
        xLabel="Year"
        formatX={(x) => `Year ${x}`}
        formatY={formatVnd}
        markerX={years}
      />
    </SimCard>
  );
}

function ImportSim() {
  const [priceUsd, setPriceUsd] = useState(1000);
  const [vndPerUsd, setVndPerUsd] = useState(25000);
  const [tariff, setTariff] = useState(5);
  const price = importPriceVnd(priceUsd, vndPerUsd, tariff / 100);
  const curve = useMemo(
    () => Array.from({ length: 17 }, (_, i) => 22000 + i * 500).map((x) => ({ x, y: importPriceVnd(priceUsd, x, tariff / 100) })),
    [priceUsd, tariff],
  );
  const before = importPriceVnd(1000, 25000, 0.05);
  const after = importPriceVnd(1000, 27500, 0.15);
  const change = relativeChange(before, after);
  const choices = [0.1, 0.2, 0.25];
  const nearest = choices.reduce((b, c, i) => (Math.abs(c - change) < Math.abs(choices[b]! - change) ? i : b), 0);
  return (
    <SimCard id="import" title="Import prices, exchange rates and tariffs" intro="What a phone bought in dollars costs in a Vietnamese shop when the exchange rate or the import tax changes.">
      <PredictQuestion
        question="A $1,000 phone. The dong weakens from 25,000 to 27,500 per dollar (10%), and the import tax rises from 5% to 15%. Roughly how much more will it cost?"
        options={["About 10%", "About 20%", "About 25%"]}
        answerIndex={nearest}
        explanation={`It goes from ${formatVnd(before)} to ${formatVnd(after)}, up ${formatPercent(change, 0)}. The two changes multiply: 1.10 x (1.15 / 1.05) is about 1.20.`}
        onReveal={() => {
          setPriceUsd(1000);
          setVndPerUsd(27500);
          setTariff(15);
        }}
      />
      <SliderRow id="import-price" label="Price in dollars" value={priceUsd} display={`$${priceUsd.toLocaleString("en-US")}`} min={200} max={2000} step={50} onChange={setPriceUsd} />
      <SliderRow id="import-rate" label="Exchange rate (VND per dollar)" value={vndPerUsd} display={vndPerUsd.toLocaleString("en-US")} min={22000} max={30000} step={100} onChange={setVndPerUsd} />
      <SliderRow id="import-tariff" label="Import tax (tariff)" value={tariff} display={`${tariff}%`} min={0} max={30} step={1} onChange={setTariff} />
      <div className="grid grid-cols-2 gap-2">
        <Result label="Shop price" value={formatVnd(price)} />
        <Result label="Of which tax" value={formatVnd(price - priceUsd * vndPerUsd)} />
      </div>
      <LineChart
        title="Shop price at each exchange rate"
        series={[{ name: "Shop price", points: curve }]}
        xLabel="VND per dollar"
        formatX={(x) => x.toLocaleString("en-US")}
        formatY={formatVnd}
        markerX={Math.round(vndPerUsd / 500) * 500}
      />
    </SimCard>
  );
}

/**
 * Simulators (PLAN-learning.md L4): exact money formulas to play with, each with a
 * "guess first" question. Formulas, not forecasts.
 */
export default function SimulatorsPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Simulators</h1>
        <p className="text-muted-foreground text-sm">
          Move the sliders and watch the numbers. Answer each question before you look - guessing first helps you
          remember. These are exact formulas, not forecasts.
        </p>
      </div>
      <LoanSim />
      <SavingsSim />
      <ImportSim />
    </main>
  );
}
