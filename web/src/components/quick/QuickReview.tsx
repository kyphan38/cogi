import type { QuickExerciseRow } from "@/lib/types/exercise";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 font-medium">{title}</h3>
      <p className="whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}

/** The feedback on a 5-minute answer. Shown right after the answer and in History. */
export function QuickFeedbackParts({ row }: { row: Pick<QuickExerciseRow, "feedback" | "delivery"> }) {
  return (
    <div className="space-y-4 text-body" data-testid="quick-feedback">
      <Part title="Strong">{row.feedback.strong}</Part>
      <Part title="Missing">{row.feedback.missing}</Part>
      <Part title="Next time, ask">{row.feedback.nextTime}</Part>
      {row.delivery ? (
        <div className="space-y-4 border-t border-border pt-4" data-testid="quick-delivery">
          <p className="section-label">How you said it</p>
          <Part title="Clear">{row.delivery.clear}</Part>
          <Part title="Try next time">{row.delivery.tip}</Part>
        </div>
      ) : null}
    </div>
  );
}

/** One finished 5-minute question in History. */
export function QuickReview({ row }: { row: QuickExerciseRow }) {
  return (
    <>
      <Part title="Situation">{row.scenario}</Part>
      <Part title="Question">{row.question}</Part>
      <Part title={row.spoken ? "Your answer (spoken)" : "Your answer"}>{row.answer}</Part>
      <QuickFeedbackParts row={row} />
    </>
  );
}
