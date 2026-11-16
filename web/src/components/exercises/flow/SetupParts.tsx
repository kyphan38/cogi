"use client";

import Link from "next/link";
import { DomainInput } from "@/components/shared/DomainInput";
import { TopicSuggestionPicker } from "@/components/shared/TopicSuggestionPicker";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PracticedTopicArea } from "@/lib/types/practiced-topic";
import { cn } from "@/lib/utils";

/** Pieces of the setup step (step 0) that the exercise flows share. */

export function GenerateButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button type="button" disabled={loading} onClick={onClick}>
      {loading ? (
        <>
          <InlineSpinner /> Generating…
        </>
      ) : (
        "Generate exercise"
      )}
    </Button>
  );
}

/** The "Suggested" topic list. Kept mounted while hidden so its list survives a tab switch. */
export function SuggestedTopics({
  area,
  hidden,
  onPick,
}: {
  area: PracticedTopicArea;
  hidden: boolean;
  onPick: (title: string) => void;
}) {
  return (
    <div className={cn(hidden && "hidden")}>
      <TopicSuggestionPicker area={area} kind="exercise" onPick={({ title }) => onPick(title)} />
    </div>
  );
}

/** Domain is optional with "My scenario": the scenario drives the content. */
export function DomainField({
  value,
  onChange,
  suggestions,
  optional,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  optional: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{optional ? "Domain (optional)" : "Domain"}</Label>
      <DomainInput
        value={value}
        onChange={onChange}
        suggestions={suggestions}
        placeholder={optional ? "e.g. DevOps - leave blank to let AI infer" : undefined}
      />
    </div>
  );
}

export function SourceSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label>Source</Label>
      <Select value={value} onValueChange={(v) => onChange((v as T) ?? options[0]!.value)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Settings note, Generate, and "Continue existing exercise" when one is open. */
export function SetupActions({
  loading,
  onGenerate,
  onContinue,
}: {
  loading: boolean;
  onGenerate: () => void;
  onContinue?: () => void;
}) {
  return (
    <>
      <p className="text-muted-foreground text-meta">
        Personal context for AI is read from{" "}
        <Link href="/settings" className="font-medium text-foreground">
          Settings
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <GenerateButton loading={loading} onClick={onGenerate} />
        {onContinue ? (
          <Button type="button" variant="secondary" onClick={onContinue}>
            Continue existing exercise
          </Button>
        ) : null}
      </div>
    </>
  );
}
