"use client";

import { useMemo } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { EvaluativeMatrixOption, EvaluativeQuadrant } from "@/lib/types/exercise";

const QUADRANTS: EvaluativeQuadrant[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

const DROP_IDS: Record<EvaluativeQuadrant, string> = {
  "top-left": "matrix-drop-top-left",
  "top-right": "matrix-drop-top-right",
  "bottom-left": "matrix-drop-bottom-left",
  "bottom-right": "matrix-drop-bottom-right",
};

const PALETTE_ID = "matrix-drop-palette";

function OptionCard({ option }: { option: EvaluativeMatrixOption }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `matrix-card-${option.id}`,
    data: { optionId: option.id },
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 10 : undefined,
      }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full rounded-md border bg-card p-2 text-left text-xs shadow-sm",
        isDragging && "opacity-80 ring-2 ring-primary",
      )}
    >
      <p className="font-medium">{option.title}</p>
      <p className="text-muted-foreground mt-1 line-clamp-2">{option.description}</p>
    </button>
  );
}

function QuadrantDrop({
  q,
  axisX,
  axisY,
  children,
}: {
  q: EvaluativeQuadrant;
  axisX: { lowLabel: string; highLabel: string };
  axisY: { lowLabel: string; highLabel: string };
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DROP_IDS[q] });
  const corner =
    q === "top-left"
      ? `${axisY.highLabel} / ${axisX.lowLabel}`
      : q === "top-right"
        ? `${axisY.highLabel} / ${axisX.highLabel}`
        : q === "bottom-left"
          ? `${axisY.lowLabel} / ${axisX.lowLabel}`
          : `${axisY.lowLabel} / ${axisX.highLabel}`;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30",
      )}
    >
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {corner}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function PaletteDrop({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: PALETTE_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[72px] rounded-lg border-2 border-dashed p-3",
        isOver ? "border-primary bg-muted/40" : "border-muted-foreground/25",
      )}
    >
      <p className="text-muted-foreground mb-2 text-xs">Options — drag into a quadrant</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export interface EvaluativeMatrixBoardProps {
  axisX: { label: string; lowLabel: string; highLabel: string };
  axisY: { label: string; lowLabel: string; highLabel: string };
  options: EvaluativeMatrixOption[];
  placements: Partial<Record<string, EvaluativeQuadrant>>;
  onPlacementsChange: (next: Partial<Record<string, EvaluativeQuadrant>>) => void;
}

export function EvaluativeMatrixBoard({
  axisX,
  axisY,
  options,
  placements,
  onPlacementsChange,
}: EvaluativeMatrixBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const byQuadrant = useMemo(() => {
    const m: Record<EvaluativeQuadrant, EvaluativeMatrixOption[]> = {
      "top-left": [],
      "top-right": [],
      "bottom-left": [],
      "bottom-right": [],
    };
    const palette: EvaluativeMatrixOption[] = [];
    for (const o of options) {
      const p = placements[o.id];
      if (p && QUADRANTS.includes(p)) m[p].push(o);
      else palette.push(o);
    }
    return { m, palette };
  }, [options, placements]);

  const onDragEnd = (e: DragEndEvent) => {
    const optId = e.active.data.current?.optionId as string | undefined;
    if (!optId) return;
    const overId = e.over?.id?.toString();
    if (!overId) return;
    const next = { ...placements };
    if (overId === PALETTE_ID) {
      delete next[optId];
      onPlacementsChange(next);
      return;
    }
    const entry = Object.entries(DROP_IDS).find(([, v]) => v === overId);
    if (entry) {
      next[optId] = entry[0] as EvaluativeQuadrant;
      onPlacementsChange(next);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        <div className="text-center text-xs">
          <span className="text-muted-foreground">{axisY.label}: </span>
          <span className="font-medium">{axisY.lowLabel}</span>
          <span className="text-muted-foreground"> → </span>
          <span className="font-medium">{axisY.highLabel}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <div className="flex items-center justify-end pr-2">
            <div
              className="text-muted-foreground max-w-[4.5rem] text-right text-[10px] leading-tight"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {axisX.label}: {axisX.lowLabel} → {axisX.highLabel}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((q) => (
              <QuadrantDrop key={q} q={q} axisX={axisX} axisY={axisY}>
                {byQuadrant.m[q].map((o) => (
                  <OptionCard key={o.id} option={o} />
                ))}
              </QuadrantDrop>
            ))}
          </div>
        </div>
        <PaletteDrop>
          {byQuadrant.palette.map((o) => (
            <div key={o.id} className="w-[140px] shrink-0">
              <OptionCard option={o} />
            </div>
          ))}
        </PaletteDrop>
      </div>
    </DndContext>
  );
}
