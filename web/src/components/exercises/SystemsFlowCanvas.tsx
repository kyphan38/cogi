"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  applyEdgeChanges,
  getBezierPath,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
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
  };
  const border =
    d.impact === "direct"
      ? "border-orange-500 bg-orange-500/15"
      : d.impact === "indirect"
        ? "border-red-600 bg-red-600/10"
        : "border-border bg-card";
  return (
    <>
      {/* One handle per side; each is connectable as both the start and the
          end of a drag (regardless of its declared `type`) so users can draw
          a connection from or to any side of any node, not just top/bottom. */}
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
          isConnectableStart
          isConnectableEnd
        />
      ))}
      <div
        className={cn(
          "min-w-[96px] max-w-[132px] rounded-md border px-2 py-1.5 text-left text-xs shadow-sm",
          border,
        )}
      >
        <div className="font-medium leading-tight">{d.label}</div>
        <div className="text-muted-foreground mt-0.5 line-clamp-3 text-[10px] leading-snug">
          {d.description}
        </div>
      </div>
    </>
  );
}

function SystemFlowEdge({
  id,
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

  const onDelete = (data as { onDelete?: (id: string) => void } | undefined)
    ?.onDelete;
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
                stroke: "hsl(var(--muted-foreground))",
              }
            : { stroke: "hsl(var(--foreground))" }
        }
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] shadow-sm"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {label ? <span>{label}</span> : null}
          {onDelete ? (
            <button
              className="text-muted-foreground hover:text-destructive leading-none"
              title="Delete connection"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
            >
              ×
            </button>
          ) : null}
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
): { sourceHandle: string; targetHandle: string } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
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
  onDelete: ((id: string) => void) | undefined,
  isReference = false,
): Edge[] {
  return edges.map((e) => {
    const a = nodesById.get(e.source);
    const b = nodesById.get(e.target);
    const handles = a && b ? pickHandles(a, b) : undefined;
    return {
      id: e.id,
      type: "systemEdge",
      source: e.source,
      target: e.target,
      sourceHandle: handles?.sourceHandle,
      targetHandle: handles?.targetHandle,
      label: e.type.replace(/_/g, " "),
      data: { type: e.type, onDelete, isReference },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: isReference
          ? "hsl(var(--muted-foreground))"
          : "hsl(var(--foreground))",
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

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      onUserEdgesChange(userEdges.filter((e) => e.id !== edgeId));
    },
    [userEdges, onUserEdgesChange],
  );

  const nodesById = useMemo(
    () => new Map(nodeSpecs.map((n) => [n.id, { x: n.x, y: n.y }])),
    [nodeSpecs],
  );

  const rfEdges = useMemo(
    () =>
      toRfEdges(
        displayEdges,
        nodesById,
        mode === "connect" && !showReferenceOnly ? handleDeleteEdge : undefined,
        showReferenceOnly,
      ),
    [displayEdges, nodesById, mode, showReferenceOnly, handleDeleteEdge],
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
          },
        })),
      );
    }
  }, [nodeSpecs, nodeImpact, setNodes]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (mode !== "connect") return;
      const next = applyEdgeChanges(changes, rfEdges);
      const mapped: SystemsUserEdge[] = next.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type:
          ((e.data as { type?: SystemsConnectionType } | undefined)?.type as
            | SystemsConnectionType
            | undefined) ?? "depends_on",
      }));
      onUserEdgesChange(mapped);
    },
    [mode, rfEdges, onUserEdgesChange],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (mode !== "connect") return;
      if (userEdges.length >= maxEdges) return;
      if (!params.source || !params.target) return;
      const dup = userEdges.some(
        (e) => e.source === params.source && e.target === params.target,
      );
      if (dup) return;
      const id = crypto.randomUUID();
      onUserEdgesChange([
        ...userEdges,
        {
          id,
          source: params.source,
          target: params.target,
          type: "depends_on",
        },
      ]);
    },
    [mode, userEdges, onUserEdgesChange, maxEdges],
  );

  return (
    <div
      className={cn(
        "h-[min(380px,60svh)] w-full rounded-md border bg-muted/20",
        className,
      )}
    >
      <ReactFlow
        className="h-full w-full"
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={mode === "connect"}
        nodesConnectable={mode === "connect"}
        edgesReconnectable={false}
        // All 4 handles per node are declared type="source" so any side can
        // both start and receive a drag (see SystemFlowNode). ReactFlow's
        // default "strict" connectionMode only allows source->target handle
        // pairs, which silently rejects most same-type combinations here —
        // that's what caused connections to intermittently fail (e.g. "top
        // to top") and made it look like only ~2 connections per node were
        // possible. "loose" allows any handle to connect to any other.
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
            : undefined
        }
        deleteKeyCode={mode === "connect" ? ["Backspace", "Delete"] : null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
