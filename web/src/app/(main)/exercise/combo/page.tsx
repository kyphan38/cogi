import { ComboExerciseFlow } from "@/components/exercises/ComboExerciseFlow";

export default async function ComboExercisePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const resumeId = typeof sp.resumeId === "string" ? sp.resumeId : undefined;
  return (
    <main>
      <ComboExerciseFlow resumeId={resumeId} />
    </main>
  );
}
