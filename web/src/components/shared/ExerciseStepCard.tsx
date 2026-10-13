import type { ReactNode } from "react";
import { MinimalContainer } from "@/components/shared/MinimalContainer";

export function ExerciseStepCard({
  title,
  description,
  children,
  footer,
  bodyClassName,
  "data-testid": dataTestId,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  "data-testid"?: string;
}) {
  return (
    <MinimalContainer
      data-testid={dataTestId}
      title={title}
      description={description}
      bodyClassName={bodyClassName ?? "flex flex-col gap-4"}
      footer={footer}
    >
      {children}
    </MinimalContainer>
  );
}

/** Nordic meta badge for exercise step headers (e.g. sound-reasoning passages). */
export const EXERCISE_STEP_META_BADGE =
  "ml-2 text-[10px] font-normal uppercase tracking-wide text-muted-foreground";
