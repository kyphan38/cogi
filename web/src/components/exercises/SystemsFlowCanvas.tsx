"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
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
import type { SystemsNodeSpec, SystemsUserEdge } from "@/lib/types/exercise";
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
      <Handle type="target" position={Position.Top} />
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
      <Handle type="source" position={Position.Bottom} />
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

  return (
    <>
      <BaseEdge path={edgePath} />
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

function toRfEdges(
  edges: SystemsUserEdge[],
  onDelete: ((id: string) => void) | undefined,
): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    type: "systemEdge",
    source: e.source,
    target: e.target,
    label: e.type.replace(/_/g, " "),
    data: { type: e.type, onDelete },
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
}

export function SystemsFlowCanvas({
  nodes: nodeSpecs,
  userEdges,
  onUserEdgesChange,
  mode,
  nodeImpact,
  onToggleNodeImpact,
  maxEdges = 20,
}: SystemsFlowCanvasProps) {
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      onUserEdgesChange(userEdges.filter((e) => e.id !== edgeId));
    },
    [userEdges, onUserEdgesChange],
  );

  const rfEdges = useMemo(
    () => toRfEdges(userEdges, mode === "connect" ? handleDeleteEdge : undefined),
    [userEdges, mode, handleDeleteEdge],
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
    <div className="h-[min(380px,60svh)] w-full rounded-md border bg-muted/20">
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
