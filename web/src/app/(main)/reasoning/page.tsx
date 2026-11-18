import { AllExercises } from "@/components/dashboard/AllExercises";
import { NewExercise } from "@/components/dashboard/NewExercise";
import { PageHeader } from "@/components/shared/PageHeader";

/** New exercise on one screen (PLAN-refine R6). */
export default function ReasoningPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="New exercise" />
      <NewExercise />
      <AllExercises />
    </main>
  );
}
