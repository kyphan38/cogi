"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  getBezierPath,
  useNodesState,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import { CONNECTION_TYPE_INFO } from "@/lib/exercise/systems-labels";
import type {
  SystemsIntendedConnection,
  SystemsNodeSpec,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { SystemsNodeImpact } from "@/lib/types/exercise";

const CANVAS_W = 560;
const CANVAS_H = 360;

type FlowMode = "connect" | "shock" | "readonly";

function SystemFlowNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    description: string;
    impact: SystemsNodeImpact;
    picked?: boolean;
  };
  // Gray only (DESIGN.md): the impact is said by a word on the node, and
  // the border just backs it up (solid = direct, dashed = indirect).
  const border =
    d.impact === "direct"
      ? "border-zinc-900 bg-zinc-900/10"
      : d.impact === "indirect"
        ? "border-dashed border-zinc-900 bg-zinc-900/5"
        : "border-border bg-card";
  return (
    <>
      {/* One hidden handle per side so an edge can leave or enter from the side
          that faces the other node. Links are made by tapping nodes, not by
          dragging from handles (too small to hit on a phone). */}
      {(
        [
          ["top", Position.Top],
          ["right", Position.Right],
          ["bottom", Position.Bottom],
          ["left", Position.Left],
        ] as const
      ).map(([pos, position]) => (
        <Handle
          key={pos}
          id={pos}
          type="source"
          position={position}
          isConnectable={false}
          className="!pointer-events-none !opacity-0"
        />
      ))}
      <div
        className={cn(
          "min-w-[96px] max-w-[132px] rounded-md border px-2 py-1.5 text-left text-xs shadow-sm",
          border,
          d.picked && "ring-2 ring-zinc-900 ring-offset-2",
        )}
      >
        {d.impact !== "none" ? (
          <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">{d.impact}</div>
        ) : null}
        <div className="font-medium leading-tight">{d.label}</div>
        <div className="text-muted-foreground mt-0.5 line-clamp-3 text-[10px] leading-snug">
          {d.description}
        </div>
      </div>
    </>
  );
}

function SystemFlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isReference = Boolean(
    (data as { isReference?: boolean } | undefined)?.isReference,
  );

  return (
    <>
      {/* markerEnd renders an arrowhead at the target so the direction of the
          relationship (source -> target) is always visible; a mutual
          relationship is represented by two edges, each with its own arrow. */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={
          isReference
            ? {
                strokeDasharray: "6 4",
                stroke: "var(--muted-foreground)",
              }
            : { stroke: "var(--foreground)" }
        }
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "none",
          }}
        >
          {label ? <span>{label}</span> : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { system: SystemFlowNode };
const edgeTypes = { systemEdge: SystemFlowEdge };

function toRfNodes(
  specs: SystemsNodeSpec[],
  nodeImpact: Record<string, SystemsNodeImpact>,
): Node[] {
  return specs.map((n) => ({
    id: n.id,
    type: "system",
    position: {
      x: (n.x / 100) * CANVAS_W - 48,
      y: (n.y / 100) * CANVAS_H - 28,
    },
    data: {
      label: n.label,
      description: n.description,
      impact: nodeImpact[n.id] ?? "none",
    },
  }));
}

/** Each node exposes a "top" | "right" | "bottom" | "left" handle (see
 * SystemFlowNode). Pick whichever pair most directly faces the other node so
 * a connection visually leaves/enters from the closest side instead of
 * always funneling through the same top/bottom pair. */
function pickHandles(
  a: { x: number; y: number },
  b: { x: number; y: number },
  /** Use the other axis, so a two-way pair draws two separate curves. */
  otherAxis = false,
): { sourceHandle: string; targetHandle: string } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy) !== otherAxis) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}

function toRfEdges(
  edges: SystemsUserEdge[],
  nodesById: Map<string, { x: number; y: number }>,
  isReference = false,
): Edge[] {
  const pairs = new Set(edges.map((e) => `${e.source}>${e.target}`));
  return edges.map((e) => {
    const a = nodesById.get(e.source);
    const b = nodesById.get(e.target);
    const twoWay = pairs.has(`${e.target}>${e.source}`) && e.source > e.target;
    const handles = a && b ? pickHandles(a, b, twoWay) : undefined;
    return {
      id: e.id,
      type: "systemEdge",
      source: e.source,
      target: e.target,
      sourceHandle: handles?.sourceHandle,
      targetHandle: handles?.targetHandle,
      label: CONNECTION_TYPE_INFO[e.type]?.short ?? e.type,
      data: { type: e.type, isReference },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: isReference
          ? "var(--muted-foreground)"
          : "var(--foreground)",
      },
    };
  });
}

export function intendedConnectionsToEdges(
  connections: SystemsIntendedConnection[],
): SystemsUserEdge[] {
  return connections.map((c, i) => ({
    id: `ref-${c.from}-${c.to}-${i}`,
    source: c.from,
    target: c.to,
    type: c.type,
  }));
}

export interface SystemsFlowCanvasProps {
  nodes: SystemsNodeSpec[];
  userEdges: SystemsUserEdge[];
  onUserEdgesChange: (edges: SystemsUserEdge[]) => void;
  mode: FlowMode;
  nodeImpact: Record<string, SystemsNodeImpact>;
  onToggleNodeImpact?: (nodeId: string) => void;
  maxEdges?: number;
  /** Choices offered after tapping two nodes in "connect" mode. */
  linkTypes?: SystemsConnectionType[];
  /** When set with showReferenceOnly, renders these instead of userEdges. */
  referenceEdges?: SystemsIntendedConnection[];
  showReferenceOnly?: boolean;
  className?: string;
}

export function SystemsFlowCanvas({
  nodes: nodeSpecs,
  userEdges,
  onUserEdgesChange,
  mode,
  nodeImpact,
  onToggleNodeImpact,
  maxEdges = 20,
  linkTypes = ["increases", "decreases"],
  referenceEdges,
  showReferenceOnly = false,
  className,
}: SystemsFlowCanvasProps) {
  const displayEdges = useMemo(() => {
    if (showReferenceOnly && referenceEdges?.length) {
      return intendedConnectionsToEdges(referenceEdges);
    }
    return userEdges;
  }, [showReferenceOnly, referenceEdges, userEdges]);

  // Tap-to-link: the first tap picks the start node, the second the end node, then the
  // user chooses the link type.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pair, setPair] = useState<{ source: string; target: string } | null>(null);

  const nodesById = useMemo(
    () => new Map(nodeSpecs.map((n) => [n.id, { x: n.x, y: n.y }])),
    [nodeSpecs],
  );

  const rfEdges = useMemo(
    () =>
      toRfEdges(displayEdges, nodesById, showReferenceOnly),
    [displayEdges, nodesById, showReferenceOnly],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  const prevSpecsRef = useRef<SystemsNodeSpec[] | null>(null);

  useEffect(() => {
    if (prevSpecsRef.current !== nodeSpecs) {
      prevSpecsRef.current = nodeSpecs;
      setNodes(toRfNodes(nodeSpecs, nodeImpact));
    } else {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          data: {
            ...(n.data as Record<string, unknown>),
            impact: nodeImpact[n.id] ?? "none",
            picked: n.id === pickedId || n.id === pair?.source,
          },
        })),
      );
    }
  }, [nodeSpecs, nodeImpact, pickedId, pair, setNodes]);

  const labelOf = (id: string) => nodeSpecs.find((n) => n.id === id)?.label ?? id;

  const onTapNode = (id: string) => {
    if (pair) return;
    if (!pickedId) return setPickedId(id);
    if (pickedId === id) return setPickedId(null);
    setPair({ source: pickedId, target: id });
    setPickedId(null);
  };

  const addLink = (type: SystemsConnectionType) => {
    if (!pair) return;
    const existing = userEdges.find((e) => e.source === pair.source && e.target === pair.target);
    if (existing) {
      onUserEdgesChange(userEdges.map((e) => (e.id === existing.id ? { ...e, type } : e)));
    } else if (userEdges.length < maxEdges) {
      onUserEdgesChange([...userEdges, { id: crypto.randomUUID(), ...pair, type }]);
    }
    setPair(null);
  };

  const signed = linkTypes.every((t) => t === "increases" || t === "decreases");

  return (
    <div className={cn("space-y-2", className)}>
    <div className="h-[min(380px,60svh)] w-full rounded-md border bg-muted/20">
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable={false}
        // Every handle is type="source"; "loose" lets an edge join any two of them.
        connectionMode={ConnectionMode.Loose}
        zoomOnScroll={false}
        panOnDrag={false}
        autoPanOnConnect={false}
        autoPanOnNodeDrag={false}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        onInit={(inst) => inst.fitView({ padding: 0.12 })}
        onNodeClick={
          mode === "shock" && onToggleNodeImpact
            ? (_, n) => onToggleNodeImpact(n.id)
            : mode === "connect" && !showReferenceOnly
              ? (_, n) => onTapNode(n.id)
              : undefined
        }
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
      {mode === "connect" && pickedId ? (
        <p className="text-sm text-zinc-900" data-testid="link-picked">
          From <span className="font-medium">{labelOf(pickedId)}</span>: now tap the part it affects.
        </p>
      ) : null}
      {mode === "connect" && pair ? (
        <div className="space-y-2 rounded-md border p-3" data-testid="link-chooser">
          <p className="text-sm">
            {signed ? (
              <>
                When <span className="font-medium">{labelOf(pair.source)}</span> goes up,{" "}
                <span className="font-medium">{labelOf(pair.target)}</span>...
              </>
            ) : (
              <>
                <span className="font-medium">{labelOf(pair.source)}</span> -&gt;{" "}
                <span className="font-medium">{labelOf(pair.target)}</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {linkTypes.map((t) => (
              <Button key={t} type="button" size="sm" onClick={() => addLink(t)}>
                {t === "increases" ? "goes up" : t === "decreases" ? "goes down" : CONNECTION_TYPE_INFO[t].label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="secondary" onClick={() => setPair(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
