"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  isAnalyticalExercise,
  isEvaluativeExercise,
  isJudgmentExercise,
  isReframeExercise,
  isCalibrationExercise,
  isGeoLabExercise,
  isQuickExercise,
  isStrategyExercise,
  isSystemsExercise,
  type Exercise,
} from "@/lib/types/exercise";
import {
  isAnalyticalCoachingStructured,
  isCoachingStructured,
} from "@/lib/types/perspective";
import { SystemsAnswerKey } from "@/components/exercises/SystemsAnswerKey";
import { EvaluativeAnswerKey } from "@/components/exercises/EvaluativeAnswerKey";
import { JudgmentAnswerKey } from "@/components/exercises/JudgmentAnswerKey";
import { StrategyAnswerKey } from "@/components/exercises/StrategyAnswerKey";
import { ReframeAnswerKey } from "@/components/exercises/ReframeAnswerKey";
import { CalibrationAnswerKey } from "@/components/exercises/CalibrationAnswerKey";
import { GeoLabHistoryCard } from "@/components/geo/GeoLabHistoryCard";
import { evaluativeResultOf } from "@/lib/exercise/evaluative-score";
import { systemsResultOf } from "@/lib/exercise/systems-score";
import { AnalyticalAnswerKey } from "@/components/exercises/AnalyticalAnswerKey";
import {
  requestAnalyticalDeepDive,
  withDeepDive,
} from "@/lib/exercise/deep-dive";
import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { LEVEL_LABELS } from "@/lib/exercise/levels";
import { USE_CHECK_LABEL } from "@/lib/exercise/use-plan";
import { perspectiveKindForExercise } from "@/lib/history";
import HistoryPerspectiveBody from "@/components/history/HistoryPerspectiveBody";
import { QuickReview } from "@/components/quick/QuickReview";

/** One finished exercise in History: the work, the answer key, the feedback and the notes. */
export function HistoryDetailBody({
  detailEx,
  setDetailEx,
}: {
  detailEx: Exercise;
  /** Set when "Go deeper" may add to the open exercise; omit for a read-only copy. */
  setDetailEx?: Dispatch<SetStateAction<Exercise | null>>;
}) {
  return (
    <>
    {isAnalyticalExercise(detailEx) ? (
      <>
        {detailEx.level ? (
          <p
            className="text-muted-foreground"
            data-testid="history-level"
          >
            Level: {LEVEL_LABELS[detailEx.level]}
          </p>
        ) : null}
        <AnalyticalAnswerKey
          exercise={detailEx}
          result={analyticalResultOf(detailEx)}
          coaching={
            isAnalyticalCoachingStructured(
              detailEx.aiPerspectiveStructured,
            )
              ? detailEx.aiPerspectiveStructured
              : null
          }
          deepDives={detailEx.deepDives}
          onRequestDeepDive={async (ref) => {
            const d = await requestAnalyticalDeepDive(detailEx, ref);
            setDetailEx?.((prev) =>
              prev &&
              prev.id === detailEx.id &&
              isAnalyticalExercise(prev)
                ? withDeepDive(prev, ref, d)
                : prev,
            );
          }}
        />
      </>
    ) : isSystemsExercise(detailEx) ? (
      <>
        <div>
          <h3 className="mb-1 font-medium">Scenario</h3>
          <p className="leading-relaxed">{detailEx.scenario}</p>
        </div>
        {detailEx.level ? (
          <p className="text-muted-foreground">
            Level: {LEVEL_LABELS[detailEx.level]}
          </p>
        ) : null}
        <SystemsAnswerKey
          exercise={detailEx}
          result={systemsResultOf(detailEx)}
          coaching={
            isCoachingStructured(detailEx.aiPerspectiveStructured)
              ? detailEx.aiPerspectiveStructured
              : null
          }
        />
      </>
    ) : isEvaluativeExercise(detailEx) ? (
      <>
        <div>
          <h3 className="mb-1 font-medium">Scenario</h3>
          <p className="leading-relaxed">{detailEx.scenario}</p>
        </div>
        {detailEx.level ? (
          <p className="text-muted-foreground">
            Level: {LEVEL_LABELS[detailEx.level]}
          </p>
        ) : null}
        <EvaluativeAnswerKey
          exercise={detailEx}
          result={evaluativeResultOf(detailEx)}
          coaching={
            isCoachingStructured(detailEx.aiPerspectiveStructured)
              ? detailEx.aiPerspectiveStructured
              : null
          }
        />
      </>
    ) : isJudgmentExercise(detailEx) ? (
      <>
        <div>
          <h3 className="mb-1 font-medium">Situation</h3>
          <p className="whitespace-pre-wrap leading-relaxed">
            {detailEx.scenario}
          </p>
        </div>
        <p className="text-muted-foreground">
          Level: {LEVEL_LABELS[detailEx.level]} ·{" "}
          {detailEx.context === "vietnam" ? "Vietnam" : "General"}
        </p>
        {detailEx.result ? (
          <JudgmentAnswerKey
            exercise={detailEx}
            result={detailEx.result}
            coaching={
              isCoachingStructured(detailEx.aiPerspectiveStructured)
                ? detailEx.aiPerspectiveStructured
                : null
            }
          />
        ) : null}
      </>
    ) : isCalibrationExercise(detailEx) ? (
      <>
        <p className="text-muted-foreground">
          Level: {LEVEL_LABELS[detailEx.level]} · {detailEx.domain}
        </p>
        {detailEx.result ? (
          <CalibrationAnswerKey
            exercise={detailEx}
            result={detailEx.result}
            coaching={
              isCoachingStructured(detailEx.aiPerspectiveStructured)
                ? detailEx.aiPerspectiveStructured
                : null
            }
          />
        ) : null}
      </>
    ) : isReframeExercise(detailEx) ? (
      <>
        <div>
          <h3 className="mb-1 font-medium">Situation</h3>
          <p className="whitespace-pre-wrap leading-relaxed">
            {detailEx.scenario}
          </p>
        </div>
        <p className="text-muted-foreground">
          Level: {LEVEL_LABELS[detailEx.level]} ·{" "}
          {detailEx.context === "vietnam" ? "Vietnam" : "General"}
        </p>
        {detailEx.result ? (
          <ReframeAnswerKey
            exercise={detailEx}
            result={detailEx.result}
            coaching={
              isCoachingStructured(detailEx.aiPerspectiveStructured)
                ? detailEx.aiPerspectiveStructured
                : null
            }
          />
        ) : null}
      </>
    ) : isQuickExercise(detailEx) ? (
      <QuickReview row={detailEx} />
    ) : isGeoLabExercise(detailEx) ? (
      <GeoLabHistoryCard row={detailEx} />
    ) : isStrategyExercise(detailEx) ? (
      <>
        <div>
          <h3 className="mb-1 font-medium">Story</h3>
          <p className="whitespace-pre-wrap leading-relaxed">
            {detailEx.scenario}
          </p>
        </div>
        <p className="text-muted-foreground">
          Level: {LEVEL_LABELS[detailEx.level]}
        </p>
        {detailEx.result ? (
          <StrategyAnswerKey
            exercise={detailEx}
            result={detailEx.result}
            coaching={
              isCoachingStructured(detailEx.aiPerspectiveStructured)
                ? detailEx.aiPerspectiveStructured
                : null
            }
          />
        ) : null}
      </>
    ) : null}

    {/* v3 coaching lives inside the answer key above. */}
    {isGeoLabExercise(detailEx) ||
    isQuickExercise(detailEx) ||
    isAnalyticalCoachingStructured(detailEx.aiPerspectiveStructured) ||
    isCoachingStructured(detailEx.aiPerspectiveStructured) ? null : (
      <div>
        <h3 className="mb-1 font-medium">AI perspective</h3>
        {detailEx.aiPerspectiveStructured ? (
          <HistoryPerspectiveBody
            structured={detailEx.aiPerspectiveStructured}
            kind={perspectiveKindForExercise(detailEx)}
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {detailEx.aiPerspective ?? "-"}
          </p>
        )}
      </div>
    )}

      {"takeaway" in detailEx && detailEx.takeaway ? (
        <div>
          <h3 className="mb-1 font-medium">Takeaway</h3>
          <p className="whitespace-pre-wrap leading-relaxed">{detailEx.takeaway}</p>
        </div>
      ) : null}

      {"usePlan" in detailEx && detailEx.usePlan ? (
        <div data-testid="history-use-plan">
          <h3 className="mb-1 font-medium">Where to use it</h3>
          <p className="whitespace-pre-wrap leading-relaxed">{detailEx.usePlan}</p>
          {detailEx.useCheck ? (
            <p className="mt-1 text-muted-foreground">
              A week later: {USE_CHECK_LABEL[detailEx.useCheck.result]}
              {detailEx.useCheck.note ? `. ${detailEx.useCheck.note}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
